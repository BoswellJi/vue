/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  // Vue构造函数中的初始化
  /**
   * 配置参数
   */
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid，给实例化的vm 添加一个唯一id
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    // 子组件
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      // Vue实例的$options属性， 对构造函数配置进行策略合并
      // 这里只会走一次 new Vue({...})
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),  //vm.constructor === Vue 
        options || {},
        vm
      )
    }

    // 给Vue实例,子类实例添加_renderProxy属性
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    /**
     * events lifecycle
     * render
     * beforeCreate
     * injections state(reactivity)
     * provide
     * created
     * 
     */
    // 给Vue实例,子类实例添加_self属性: 自身
    vm._self = vm
    // 初始化生命周期
    initLifecycle(vm)
    // 初始化事件
    initEvents(vm)
    // 初始化渲染
    initRender(vm)
    // 回调钩子函数
    callHook(vm, 'beforeCreate')
    // 初始化注入
    initInjections(vm) // resolve injections before data/props
    // 初始化响应式系统
    initState(vm)
    // 初始化提供者
    initProvide(vm) // resolve provide after data/props
    // 使用vm.$emit进行事件触发
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 安装组件，
    // 这个为了script脚本引入用的
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

/**
 * 子组件没有进行参数合并，
 * 提示：只有框架初始化的时候，回进行一次合并 （new Vue()
 * 组件都属于都会走这一步
 * 
 * 方法的意义也是在于处理组件的options参数
 * @param {*} vm 
 * @param {*} options 
 */
// 初始化内部组件，（子组件 vm Vue的子类实例  options 子组件的配置
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // vm.constructor.options ===  Sub.options
  // 就是在global-api.js中的Sub.options合并的过程中产生的options
  // vm.$options.prototype = Vue.options
  // 组件中也可以访问到Vue 构造函数的options参数
  // 组件的$options还是使用mergeOptions 方法合并过来的 
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.

  // 给组件的option上添加属性

  // 组件的父vnode（父组件
  const parentVnode = options._parentVnode
  // 组件的父Vue类
  opts.parent = options.parent
  // 父vnode实例
  opts._parentVnode = parentVnode
  /**
   * 父vnode实例的组件配置参数
   */
  const vnodeComponentOptions = parentVnode.componentOptions
  // 父vnode中的propsData属性
  opts.propsData = vnodeComponentOptions.propsData
  // 父vnode中的listeners
  opts._parentListeners = vnodeComponentOptions.listeners
  // 父vnode中的子vnode
  opts._renderChildren = vnodeComponentOptions.children
  // 父vnode配置的标签
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}


// 传入的参数为 Vue（以及子类  Vue.extend() 创建Vue子类
export function resolveConstructorOptions (Ctor: Class<Component>) {
  // options
  let options = Ctor.options
  // 构造函数为Vue构造函数的子类
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super) //Vue 父类
    const cachedSuperOptions = Ctor.superOptions //父类配置参数
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  // 没有直接返回Vue.options
  return options
}

/**
 * 找出子类的options上与之前不同的配置参数
 * @param {*} Ctor 
 */
function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  // 子类的options
  const latest = Ctor.options
  // 子类sealedOptions
  const sealed = Ctor.sealedOptions 
  for (const key in latest) {
    // 找出与之前options不同的部分
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
