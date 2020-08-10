/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools,
  inBrowser,
  isIE
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * 种植调度器的状态
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
  // 将队列都清空
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

// 异步边缘案例当事件监听器被粘合时，需要保存时间戳
// Async edge case #6566 requires saving the timestamp when event listeners are
// 但是，如果这个页面又上百个事件监听器，调用performance.now()会一个特别高的性能
// attached. However, calling performance.now() has a perf overhead especially
// 相反，我们每次传递一个时间戳， 
// if the page has thousands of event listeners. Instead, we take a timestamp
// 每次调度程序刷新时，我们取一个时间戳，并将其用于所有事件侦听器在冲平的时候连接上
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
export let currentFlushTimestamp = 0

// 异步边缘案例修复需要存储一个时间监听器得连接时间戳
// Async edge case fix requires storing an event listener's attach timestamp.
let getNow: () => number = Date.now // 获取当前时间

// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res (relative to page load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
// All IE versions use low-res event timestamps, and have problematic clock
// implementations (#9632)
// 在浏览器中 && 不是IE的浏览器
if (inBrowser && !isIE) {
  const performance = window.performance
  // 宿主环境直至performance对象
  if (
    performance &&
    // now属性时函数
    typeof performance.now === 'function' &&
    // 当前时间>创建的事件的时间戳
    getNow() > document.createEvent('Event').timeStamp
  ) {
    // 如果这个事件时间戳，尽管执行Date.now,比它更小，意味着事件是正在使用 hi-res时间戳
    // if the event timestamp, although evaluated AFTER the Date.now(), is
    // smaller than it, it means the event is using a hi-res timestamp,
    // 但是我们需要给时间监听器时间戳，使用hi-res版本更好
    // and we need to use the hi-res version for event listener timestamps as
    // well.
    getNow = () => performance.now()
  }
}

/**
 * 即刷新队列又，运行观察者
 * Flush both queues and run the watchers.
 */
// 刷新调度器队列
function flushSchedulerQueue () {
  currentFlushTimestamp = getNow() // 当前时间
  flushing = true // 正在刷新队列
  let watcher, id

  // 刷新之前排序
  // Sort queue before flush.
  // 这是为了确保
  // This ensures that:
  // 1. 组件从父到子都被更新，因为父总是在子之前被创建
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. 在它的渲染观察者之前，一个组件的用户观者这被运行， 因为在渲染观察者之前，用户观察者被创建
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. 如果在一个父组件的观察者运行期间，一个组件被销毁，他的观察者会被跳过
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  // 任务队列排序,从大到小
  queue.sort((a, b) => a.id - b.id)

  // 没有缓存长度，因为更多的监听者可能被推
  // do not cache length because more watchers might be pushed
  // 当我们运行现存的监听器的时候
  // as we run existing watchers
  // 遍历监听器队列
  for (index = 0; index < queue.length; index++) {
    // 获取当前的监听器
    watcher = queue[index]
    // 获取监听器的before方法，并执行,状态更新之前，执行
    if (watcher.before) {
      watcher.before()
    }
    // 获取监听器的id
    id = watcher.id
    // 清空has对象上，当前id的监听器
    has[id] = null
    // 运行监听器，重新渲染
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // 重置状态之前拷贝post 队列
  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  // 重置调度器状态
  resetSchedulerState()

  // 调用组件的update和active钩子函数
  // call component updated and activated hooks
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    // 更新完成
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * 放一个监听器到监听器队列中
 * Push a watcher into the watcher queue.
 * 当任务正在被刷新时，使用重复id的job将被跳过，除非他被推
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 * 
 */
export function queueWatcher (watcher: Watcher) {
  // 当前更新的组件的监听器
  const id = watcher.id
  // null undefined
  if (has[id] == null) {
    // 设置为true
    has[id] = true
    // 没有正在刷新中
    if (!flushing) {
      // 监听器添加到队列
      queue.push(watcher)
    } else {
      // 如果已经正在刷新，在id的基础上分割监听器
      // if already flushing, splice the watcher based on its id
      // 如果已经通过他的id,他将在下一次被立即执行
      // if already past its id, it will be run next immediately.
      // 
      let i = queue.length - 1
      // 遍历监听者队列 && 队列中的监听者的id > 当前这个监听者的id
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      // [4,3,1] 2 => [4,3,1,2]
      queue.splice(i + 1, 0, watcher)
    }
    // queue the flush
    // 刷新队列
    // 没有在等待中
    if (!waiting) {
      // 开始等待
      waiting = true

      if (process.env.NODE_ENV !== 'production' && !config.async) {
        // 刷新调度器队列
        flushSchedulerQueue()
        return
      }
      // 开始刷新调度器队列
      nextTick(flushSchedulerQueue)
    }
  }
}
