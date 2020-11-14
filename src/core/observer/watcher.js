/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component; // 组件实例
  expression: string; // 表达式
  cb: Function; // 回调函数
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean; // 是否活跃
  deps: Array<Dep>; // 
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function; // 执行修改之前
  getter: Function; // 获取表达式值
  value: any; // getter返回的值

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    // this: 监听器实例，当前new的watcher
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb // 数据改变后的回调函数
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers 
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      // $watch('a',function(){  }) => a
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * 执行getter,进行依赖收集，读取对象属性的get
   * Evaluate the getter, and re-collect dependencies.
   * 
   * （手动情况下）
   * 给属性定义的监听器
   * 1. 所以，模板编译时，会将每个数据绑定变量，定义为属性监听器
   * 2. 每一个绑定的属性，都会创建一个监听器
   * 3. 想要收集绑定属性的依赖，就要先创建一个监听器，触发这个属性的getter，收集这个监听器
   * 
   * （自动情况下）
   * 给每个组件定义一个监听器
   * 1. 当前监听器就是当前组件的监听器
   * 2. 调用getter,安装装组件，触发组件中依赖绑定数据的getter，进行依赖收集
   * 3. 组件中的所有响应式属性的监听器都是，这个组件监听器
   */
  get () {
    // 开始设置依赖目标，即开启依赖收集（this: Watcher）
    pushTarget(this)
    let value
    // 获取当前监听器绑定的组件
    const vm = this.vm
    try {
      // 调用的时lifecycle.js中的updateComponent，开始安装组件,调用响应式对象的getter
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      // 关闭依赖收集
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   * @param dep 依赖实例(defineReactive中实例化的Dep对象)
   */
  addDep (dep: Dep) {
    const id = dep.id
    // 因为当组件中，使用watch option，$watch来定义属性监听时，同一个属性多个监听器
    // 每个对象上的属性的依赖实例都有唯一的id，防止不会重复添加依赖实例
    if (!this.newDepIds.has(id)) {
      // 将dep设置到当前的watcher下，同一个属性的dep相同
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      // console.log(this.newDepIds,'newDep');
      if (!this.depIds.has(id)) {
        dep.addSub(this)
        console.log(dep,'dep');
      }
    } 
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) { 
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    // 将收集到的依赖存储起来，清空newDep
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      // 监听器异步运行（nextTick） this: dep
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    // 当前监听器是否活跃
    if (this.active) {
      // 重新渲染组件，重新调用响应式对象，进行更新
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value  
        const oldValue = this.value
        this.value = value
        // 用户自定义的监听器
        if (this.user) {
          try {
            // 这里就是监听器的callback(newVal,oldVal)
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
