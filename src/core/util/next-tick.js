/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

// 是正在使用微任务
export let isUsingMicroTask = false

// nextTick的回调函数数组
const callbacks = []
// 当前状态
let pending = false

/**
 * 刷新回调函数
 */
function flushCallbacks () {
  // 不在等待，因为现在正在直接执行
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    // 顺序执行
    copies[i]()
  }
}

// 这里我们使用微任务使用异步延时包裹器
// Here we have async deferring wrappers using microtasks.
// 在2.5版本我们使用任务（宏）与微任务结合
// In 2.5 we used (macro) tasks (in combination with microtasks).
// 但是当重绘之前状态被改变正确，它会有微妙的问题
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// 还有使用宏任务在事件处理器中，将会导致一些不能被规避的奇怪行为
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// 所以我们在每一个地方都是用微任务
// So we now use microtasks everywhere, again.
// 这个权衡的一个主要负担是有一些微任务有太高的优先级和触发在顺序事件之间或者甚至在相同事件之间冒泡
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
let timerFunc

// nextTick行为覆盖了微任务队列，能够既能够通过Promise.then访问，又能通过MutationObserver访问
// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver（突变观察者）广泛的支持了，但是当在在ios大于9.3.3的UIwebview中触发touch事件处理器，有严重的bug
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// 触发几次后它完全停止工作，所以，如果promise可以使用的话，我们将使用它
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */


// 处理异步的兼容性

// 1. Promise对象是否存在
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  // 成功状态的Promise实例
  const p = Promise.resolve()
  timerFunc = () => {
    // 刷新nextTick中的回调函数
    p.then(flushCallbacks)
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    if (isIOS) setTimeout(noop)
  }
  // 是微任务
  isUsingMicroTask = true

  // 2. MutationObserver
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  let counter = 1
  // 异步执行
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  // 观察者，观察textNode节点
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true

  // 3. setImmediate
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  // 4. setTimeout
  timerFunc = () => {
    // 异步
    setTimeout(flushCallbacks, 0)
  }
}

/**
 * 下个周期（执行的回调函数
 * @param {*} cb 回调函数
 * @param {*} ctx 回调函数的上下文
 */
export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  // 将每个回调函数进行包装后，放入callbacks数组
  // 通过闭包，获取ctx
  callbacks.push(() => {
    // 执行回调函数的处理
    if (cb) {
      try {
        // nextTick的回调函数中可以拿到上下文对象，通过call的调用
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  // true
  if (!pending) {
    pending = true
    timerFunc()
  }
  // $flow-disable-line
  // 没有回调函数 && Promise对象存在
  if (!cb && typeof Promise !== 'undefined') {
    // 返回
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
