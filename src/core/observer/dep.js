/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0


/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  // 依赖的目标对象，当前的监听器
  static target: ?Watcher;
  id: number;
  // 一个属性会有多个监听器
  // 1. vm.$watch('name')
  // 2. watch:{ name(){} }
  // 种形式添加监听器
  subs: Array<Watcher>;

  constructor() {
    this.id = uid++
    this.subs = []
  }

  /**
   * 给属性的依赖对象添加监听器,每次有新属性收集依赖时
   * 1. 组件的Watcher
   * 2. 属性自身定义的Watch监听 ($watch,watch option)
   * @param {*} sub 
   */
  addSub(sub: Watcher) {
    this.subs.push(sub)
    // console.log(this.subs, 'watcher');
  }

  removeSub(sub: Watcher) {
    remove(this.subs, sub)
  }

  /**
   * 添加依赖
   */
  depend() {
    // Watcher实例，将对象属性的依赖收集对象dep添加到watcher中
    if (Dep.target) {
      // 每个属性的依赖对象
      // this是defineReactive中实例化的对象
      Dep.target.addDep(this)
    }
  }

  notify() {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    // 调用订阅者更新函数 Watcher实例
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

export function pushTarget(target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget() {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
