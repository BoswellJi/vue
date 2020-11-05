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

// 记录组件的数量
let uid = 0

export function initMixin(Vue: Class<Component>) {
  /**
   * 组件初始化
   * @param {Object} options 组件配置选项
   */
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // 合并选项
    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      // 这里慢
      /**
       * {
       *  _isVue: true,
       *  _uid: n
       * }
       */
      vm.$options = mergeOptions(
        // 组件构造函数及其父构造函数的 选项
        resolveConstructorOptions(vm.constructor),
        // 组件自身选项
        options || {},
        vm
      )
    }

    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      // 代理组件对象，验证属性是否正确
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
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props  
    initState(vm)
    initProvide(vm) // resolve provide after data/props   
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      // 格式化组件name
      vm._name = formatComponentName(vm, false)
      // 组件结尾标记
      mark(endTag)
      // 测量
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // dom节点
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

/**
 * 子组件没有进行参数合并，
 * 提示：只有框架初始化的时候，回进行一次合并 （new Vue()
 * 
 * 方法的意义也是在于处理组件的options参数
 * @param {*} vm 组件实例
 * @param {*} options 配置选项
 */
export function initInternalComponent(vm: Component, options: InternalComponentOptions) {
  // vm.constructor.options ===  Sub.options
  // 就是在global-api.js中的Sub.options合并的过程中产生的options
  // vm.$options.prototype = Vue.options
  // 组件中也可以访问到Vue 构造函数的options参数
  // 组件的$options还是使用mergeOptions 方法合并过来的 
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.

  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode
  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}


/**
 * 解析构造函数以及父构造函数选项
 * @param {*} Ctor 构造函数
 */
export function resolveConstructorOptions(Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    // Vue的子类上获取配置选项
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
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
      // 将superOptions与extendOptions进行合并
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

/**
 * 找出被修改过的配置选项
 * @param {*} Ctor 构造函数
 */
function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
  let modified
  // options
  const latest = Ctor.options
  // sealedOptions
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  // 找出options被修改的部分
  return modified
}
