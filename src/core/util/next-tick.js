/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

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

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
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
  callbacks.push(() => {
    // 执行回调函数的处理
    if (cb) {
      try {
        // nextTick的回调函数中可以拿到上下文对象
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
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
