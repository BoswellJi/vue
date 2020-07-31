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
 * 一个监听器解析一个表达式，收集依赖，并且当表达式值改变时触发回调，这个被用来在$watch api和指令
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    // 更新组件函数
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    // 初始化组件实例
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    // 当前组件中的监听器容器（vm._watchers = [];
    // this:监听器实例
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
    this.cb = cb
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
    // 解析getter表达式
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      // $watch('a',function(){
      // 
      //})
      this.getter = parsePath(expOrFn)
      // 没有解析出来，提示报错
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
    // 懒加载
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
    // 添加一个监听对像，new Watcher()，针对某个数据属性的监听
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 调用updateComponent方法,更新组件，同步
      /**
       * 组件初始化安装时，
       * 1. 调用的时lifecycle.js中的updateComponent，回调函数
       */
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // 触达每一个属性所以他们都被追踪
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   * 依赖
   */
  addDep (dep: Dep) {
    const id = dep.id
    // 因为当组件中，使用watch option，$watch来定义属性监听时，同一个属性多个监听器
    // 依赖实例没有id,不重复添加依赖
    // 每个对象上的属性的依赖实例都有唯一的id，防止不会重复添加依赖实例
    if (!this.newDepIds.has(id)) {
      // 存储新的依赖id
      this.newDepIds.add(id)
      // 存储新的依赖实例
      this.newDeps.push(dep)
      // 依赖id中没有当前依赖实例
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * 清空监听器依赖
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
    // 监测器的配置参数
    // 
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      // 监听器同步运行
      this.run()
    } else {
      // 监听器异步运行（nextTick）
      queueWatcher(this)
    }
  }

  /**
   * 定时任务接口
   * Scheduler job interface.
   * 将被通过定时器调用
   * Will be called by the scheduler.
   */
  run () {
    // 当前监听器活跃
    if (this.active) {
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
   * 从所有依赖的订阅者列表中移除
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      // 组件被删除
      if (!this.vm._isBeingDestroyed) {
        // 删除监听器
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      // 设置这个监听器不活跃
      this.active = false
    }
  }
}
