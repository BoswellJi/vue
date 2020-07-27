/* @flow */

import {
  warn,
  nextTick,
  emptyObject,
  handleError,
  defineReactive
} from '../util/index'

import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import { resolveSlots } from './render-helpers/resolve-slots'
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots'
import VNode, { createEmptyVNode } from '../vdom/vnode'

import { isUpdatingChildComponent } from './lifecycle'

/**
 * 初始化渲染
 * @param {*} vm 组件实例
 */
export function initRender (vm: Component) {
  // 组件添加虚拟节点属性
  vm._vnode = null // the root of the child tree 
  // 组件添加静态树属性
  vm._staticTrees = null // v-once cached trees
  // 获取组件的配置
  const options = vm.$options  
  // 父虚拟节点
  const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree
  // 父节点上下文，即父组件
  const renderContext = parentVnode && parentVnode.context
  // 解析组件的插槽
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
  // 组件的作用域插槽（冻结对象，不再被改变
  vm.$scopedSlots = emptyObject

  // 绑定createElement 函数到这个组件实例，以至于我们在他的内部获取合适的渲染上下文
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // 参数排序： 标签，数据，子元素，规范化类型，总是规范化
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // 被用来从模板编译到渲染函数的内部版本
  // internal version is used by render functions compiled from templates
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)

  // 规范化一直被应用在公共版本，在用户写的渲染函数中使用
  // normalization is always applied for the public version, used inComponent
  // user-written render functions.
  // 将组件创建为虚拟节点（vdom == all vnode）
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)

  // $attrs & $listeners 被暴露来更容易创建 高阶组件 High Order Component
  // 他们需要被响应，以至于hocs使用他们一直被更新
  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  const parentData = parentVnode && parentVnode.data

  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
    // 将$attrs对象定义为响应式对象
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
    }, true)
    // 将$listeners对象定义为响应式对象
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
    }, true)
  } else {
    // 定义响应式属性
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
  }
}

// 当前渲染中的实例（组件实例
export let currentRenderingInstance: Component | null = null

// for testing only
export function setCurrentRenderingInstance (vm: Component) {
  currentRenderingInstance = vm
}

export function renderMixin (Vue: Class<Component>) {
  // install runtime convenience helpers
  // 添加
  installRenderHelpers(Vue.prototype)

  /**
   * 下周期执行：
   * 当前同步任务执行完成，但是不包括渲染也完成（虚拟节点添加进了真实节点）
   */
  Vue.prototype.$nextTick = function (fn: Function) {
    return nextTick(fn, this)
  }

  /**
   * 渲染方法，将组件生成虚拟节点
   * @return 组件的vnode
   */
  Vue.prototype._render = function (): VNode {
    // 组件实例
    const vm: Component = this
    // 组件实例的render函数和父虚拟节点
    const { render, _parentVnode } = vm.$options

    // 父虚拟节点
    if (_parentVnode) {
      // 作用域插槽
      vm.$scopedSlots = normalizeScopedSlots(
        _parentVnode.data.scopedSlots,
        vm.$slots,
        vm.$scopedSlots
      )
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    // 将父虚拟节点添加到组件的$vnode属性
    vm.$vnode = _parentVnode
    // render self
    let vnode
    try {
      // There's no need to maintain a stack because all render fns are called
      // separately from one another. Nested component's render fns are called
      // when parent component is patched.
      // 保存当前组件的引用
      currentRenderingInstance = vm
      /**
       * 调用了组件的render函数，render函数的第一个参数为  
       * vm.$createElement 这个方法很重要 ，创建组件的虚拟节点
       */
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      // 错误处理 错误实例，组件实例，错误信息
      handleError(e, vm, `render`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      // 开发环境中，组件选项中有renderErrorf配置
      if (process.env.NODE_ENV !== 'production' && vm.$options.renderError) {
        try {
          // 调用渲染错误方法
          vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
        } catch (e) {
          // 处理错误
          handleError(e, vm, `renderError`)
          // 组件实例的_vnode属性
          vnode = vm._vnode
        }
      } else {
        vnode = vm._vnode
      }
    } finally {
      // 清掉保存的组件引用
      currentRenderingInstance = null
    }
    // if the returned array contains only a single node, allow it
    // vnode是数组
    if (Array.isArray(vnode) && vnode.length === 1) {
      // 获取第一个虚拟节点
      vnode = vnode[0]
    }
    // return empty vnode in case the render function errored out
    // 返回空节点
    if (!(vnode instanceof VNode)) {
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      // 给一个空的vnode
      vnode = createEmptyVNode()
    }
    // set parent
    vnode.parent = _parentVnode
    return vnode
  }
}
