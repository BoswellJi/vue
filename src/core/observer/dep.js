/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * 一个依赖是一个能够有多个指令订阅它的可观察对象
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  /**
   * 给属性的依赖对象添加监听器
   * 1. 组件的Watcher
   * 2. 属性自身定义的Watch监听 ($watch,watch option)
   * @param {*} sub 
   */
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  /**
   * 添加依赖
   */
  depend () {
    // Dep的静态属性target存在，值为 Dep的实例
    if (Dep.target) {
      // 依赖的实例（对象属性中创建的依赖容器）
      // 把依赖对象添加到组件的Watcher中，（每个属性的依赖对象
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// 正在被计算的当前目标观察者
// The current target watcher being evaluated.
// 这个是全局唯一的，因为一次只能有一个观察者能够被计算
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

// 监听器
export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

// 后进先出
export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
