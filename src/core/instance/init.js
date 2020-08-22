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
  // Vue构造函数中的初始化
  /**
   * 组件初始化
   * @param {Object} options 组件配置数据
   */
  Vue.prototype._init = function (options?: Object) {
    // 定义组件实例的引用
    const vm: Component = this
    // 给组件实例添加一个唯一id
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    // 组件初始化性能测量
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // 标识对象是组件实例，避免被观察
    vm._isVue = true
    // merge options
    // 为内部组件
    if (options && options._isComponent) {
      // 优化组件内部实例化
      // optimize internal component instantiation
      // 因为动态选项的合并非常慢，
      // since dynamic options merging is pretty slow, and none of the
      // 内部组件没有选项需要特殊处理
      // internal component options needs special treatment.
      // 初始化内部组件（Vue框架内置组件）
      initInternalComponent(vm, options)
    } else {
      // 合并选项，当前组件实例的options和组件父类的options（变动的地方
      vm.$options = mergeOptions(
        // 解析组件实例的构造函数的选项参数（options
        resolveConstructorOptions(vm.constructor),  //vm.constructor === Vue
        // 组件选项 
        options || {},
        // 组件实例
        /**
         * {
         *  _isVue: true,
         *  _uid: n
         * }
         */
        vm
      )
    }

    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      // 给组件实例添加_renderProxy属性，值为自身的引用
      initProxy(vm)
    } else {
      // 给组件实例添加 自身的引用
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
    // 触发生命周期钩子函数，组件创建之前时期
    callHook(vm, 'beforeCreate')
    // 初始化注入
    initInjections(vm) // resolve injections before data/props 数据/属性后，解析注入
    // 初始化响应式系统
    initState(vm)
    // 初始化提供者
    initProvide(vm) // resolve provide after data/props  数据/属性后，解析提供
    // 触发生命周期钩子函数，组件创建完成时期
    callHook(vm, 'created')

    // 以上过程结束，组件创建完成

    /* istanbul ignore if */
    // 开发中，开启配置了性能和标记
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      // 格式化组件name
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 安装组件，
    if (vm.$options.el) {
      // 调用安装， dom节点
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
export function initInternalComponent(vm: Component, options: InternalComponentOptions) {
  // vm.constructor.options ===  Sub.options
  // 就是在global-api.js中的Sub.options合并的过程中产生的options
  // vm.$options.prototype = Vue.options
  // 组件中也可以访问到Vue 构造函数的options参数
  // 组件的$options还是使用mergeOptions 方法合并过来的 
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.

  // 组件的父vnode（父组件
  const parentVnode = options._parentVnode
  // 组件的父Vue类
  opts.parent = options.parent
  // 父vnode实例
  opts._parentVnode = parentVnode
  // 父vnode实例的组件配置参数
  const vnodeComponentOptions = parentVnode.componentOptions
  // 父vnode中的propsData属性
  opts.propsData = vnodeComponentOptions.propsData
  // 父vnode中的listeners
  opts._parentListeners = vnodeComponentOptions.listeners
  // 父vnode中的子vnode
  opts._renderChildren = vnodeComponentOptions.children
  // 父vnode配置的标签
  opts._componentTag = vnodeComponentOptions.tag

  // 组件有 render函数
  if (options.render) {
    // 获取组件的 render()
    opts.render = options.render
    // 获取组件上的 staticRenderFns()
    opts.staticRenderFns = options.staticRenderFns
  }
}


/**
 * 解析构造函数options选项参数
 * @param {*} Ctor 构造函数（组件类）
 */
export function resolveConstructorOptions(Ctor: Class<Component>) {
  // 获取构造函数选项
  let options = Ctor.options
  // 组件类 的 父类
  if (Ctor.super) {
    // 解析父类的选项options
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 获取父类的superOptions属性
    const cachedSuperOptions = Ctor.superOptions
    // 父类的option !== 父类的superOptions属性
    if (superOptions !== cachedSuperOptions) {
      // 父类options改变
      // super option changed,
      // 需要解析新options
      // need to resolve new options.
      // 将其进行修改
      Ctor.superOptions = superOptions
      // 检查是否有任何后期修改/附加的 options
      // check if there are any late-modified/attached options (#4976)
      // 获取新的options与原始的options对比的差异部分
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // 更新基础继承options
      // update base extend options
      // 有差异的options
      if (modifiedOptions) {
        // 添加到拓展options上
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 合并选项，将所有组件层级的options进行合并
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      // 获取组件名称
      if (options.name) {
        // 给组件选项中components属性值中的命名组件进行设置实例
        options.components[options.name] = Ctor
      }
    }
  }
  // 没有直接返回 组件类的 options
  return options
}

/**
 * 找出子类的options上与之前不同的配置参数
 * @param {*} Ctor 父类
 */
function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
  let modified
  // options
  const latest = Ctor.options
  // 密封 sealedOptions
  const sealed = Ctor.sealedOptions
  // 使用最新的options与最原始的options对比
  for (const key in latest) {
    // 找出与之前options不同的部分
    if (latest[key] !== sealed[key]) {
      // 将不同的属性保存到modified对象中
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  // 找出options被修改的部分
  return modified
}
