/* @flow */

import VNode from './vnode'
import { resolveConstructorOptions } from 'core/instance/init'
import { queueActivatedComponent } from 'core/observer/scheduler'
import { createFunctionalComponent } from './create-functional-component'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject
} from '../util/index'

import {
  resolveAsyncComponent,
  createAsyncPlaceholder,
  extractPropsFromVNodeData
} from './helpers/index'

import {
  callHook,
  activeInstance,
  updateChildComponent,
  activateChildComponent,
  deactivateChildComponent
} from '../instance/lifecycle'

import {
  isRecyclableComponent,
  renderRecyclableComponentTemplate
} from 'weex/runtime/recycle-list/render-component-template'

// inline hooks to be invoked on component VNodes during patch
// vnode暴露的钩子函数，给vdom进行patch的时候进行调用
/**
 * 子组件的产生流程：
 * vnode节点暴露的钩子事件init
 * 组件的vnode的钩子函数
 * 1. 进行组件的实例化，Sub Vue的构造函数的子类，进行_init
 * 2. 组件进行安装$mount
 * 3. 调用mountComponent方法
 * 4. 进行将组件生成vnode操作  vm._render
 * 5. vm._update
 * 6. vm._patch 中进行diff ,并生成真实dom,并插入父节点
 */
const componentVNodeHooks = {
  init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
      // 创建子组件实例
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      )

      // 调用 mountComponent , vm._render() ,vm.__patch__
      // 这里有组件本身初始化时进行安装，不在Vue.prototype._init函数中进行安装
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  },

  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    const options = vnode.componentOptions
    const child = vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },

  insert (vnode: MountedComponentVNode) {
    const { context, componentInstance } = vnode
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
      // 子组件的安装完成生命周期
      callHook(componentInstance, 'mounted')
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance)
      } else {
        activateChildComponent(componentInstance, true /* direct */)
      }
    }
  },

  destroy (vnode: MountedComponentVNode) {
    const { componentInstance } = vnode
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy()
      } else {
        deactivateChildComponent(componentInstance, true /* direct */)
      }
    }
  }
}

// 获取组件vnode的钩子函数
const hooksToMerge = Object.keys(componentVNodeHooks)

//  Ctor vue组件可以时new Vue，可以时根据子类，使用继承vue的全局继承方式创建组件
export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  // 
  if (isUndef(Ctor)) {
    return
  }

  // 这里为Vue构造函数context在合并options时候获得
  const baseCtor = context.$options._base

  // plain options object: turn it into a constructor
  // 不为null的object
  if (isObject(Ctor)) {
    // 使用extend继承的方式创建子类构造函数，用来创建子组件
    Ctor = baseCtor.extend(Ctor)
  }

  // if at this stage it's not a constructor or an async component factory,
  // reject.
  if (typeof Ctor !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      warn(`Invalid Component definition: ${String(Ctor)}`, context)
    }
    return
  }

  // async component
  let asyncFactory
  // 组件没有定义过
  if (isUndef(Ctor.cid)) {
    // 保存组件实例
    asyncFactory = Ctor
    // 解析异步组件
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor)
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }

  data = data || {}

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  // 解析构造函数选项
  resolveConstructorOptions(Ctor)

  // transform component v-model data into props & events
  // data.model是否被定义
  if (isDef(data.model)) {
    transformModel(Ctor.options, data)
  }

  // extract props
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)

  // functional component
  // 组件的选项对象中有functional属性
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  // vnode上绑定的事件
  const listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  // 组件上绑定的原生事件
  data.on = data.nativeOn

  // 是抽象组件
  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    // 获取组件中的插槽
    const slot = data.slot
    data = {}
    if (slot) {
      data.slot = slot
    }
  }

  // install component management hooks onto the placeholder node
  // 安装组件管理钩子再占位的节点
  installComponentHooks(data)

  // return a placeholder vnode
  // 获取组件的名称
  const name = Ctor.options.name || tag
  // 根据组件实例的信息，创建组件的vnode
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

  // Weex specific: invoke recycle-list optimized @render function for
  // extracting cell-slot template.
  // https://github.com/Hanks10100/weex-native-directive/tree/master/component
  /* istanbul ignore if */
  if (__WEEX__ && isRecyclableComponent(vnode)) {
    return renderRecyclableComponentTemplate(vnode)
  }

  // 返回组件最后的vnode
  return vnode
}

/**
 * 给虚拟节点创建组件实例
 * @param {*} vnode 虚拟节点
 * @param {*} parent 父组件实例
 */
export function createComponentInstanceForVnode (
  // we know it's MountedComponentVNode but flow doesn't
  vnode: any,
  // activeInstance in lifecycle state
  parent: any
): Component {
  // 内部组件配置
  const options: InternalComponentOptions = {
    // 是否是组件属性
    _isComponent: true, 
    // 父虚拟节点属性
    _parentVnode: vnode,
    // 父组件实例
    parent
  }
  // check inline-template render functions
  // 获取虚拟节点的 行内模板
  const inlineTemplate = vnode.data.inlineTemplate
  // 是否被定义
  if (isDef(inlineTemplate)) {
    // 获取行内模板的render函数
    options.render = inlineTemplate.render
    // 获取行内模板的静态渲染函数
    options.staticRenderFns = inlineTemplate.staticRenderFns
  }
  // 子组件实例化开始 vnode.componentOptions.Ctor == Sub 子组件的构造函数
  // 实例化内部进行_init调用  Vue.prototype._init方法的初始化
  // vm.$options进行初始化

  // 组件实例化
  return new vnode.componentOptions.Ctor(options)
}

/**
 * 安装组件钩子函数
 * @param {*} data 
 */
function installComponentHooks (data: VNodeData) {
  // 获取组件的hook信息（组件的生命周期钩子函数信息）
  const hooks = data.hook || (data.hook = {})
  // 遍历组件vnode的钩子函数
  for (let i = 0; i < hooksToMerge.length; i++) {
    // hookds的key
    const key = hooksToMerge[i]
    // 查看组件vnode中时候设置hook函数
    const existing = hooks[key]
    // 获取vnode的钩子函数
    const toMerge = componentVNodeHooks[key]
    // 不是同一个hook函数,是否是已经合并的hook
    if (existing !== toMerge && !(existing && existing._merged)) {
      // 获取合并后（自定义和内置的钩子函数
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge
    }
  }
}

/**
 * 合并钩子函数
 * @param {*} f1 vnode内置钩子函数
 * @param {*} f2 vnode自定义钩子函数
 */
function mergeHook (f1: any, f2: any): Function {
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b)
    f2(a, b)
  }
  // 标识合并完成
  merged._merged = true
  return merged
}

// transform component v-model info (value and callback) into
// prop and event handler respectively.
// 转换双向数据绑定
function transformModel (options, data: any) {
  // 选项有model属性， model有prop属性
  const prop = (options.model && options.model.prop) || 'value'
  // 选项有event
  const event = (options.model && options.model.event) || 'input'
  // 
  ;(data.attrs || (data.attrs = {}))[prop] = data.model.value
  // 获取事件
  const on = data.on || (data.on = {})
  // 获取组件的事件
  const existing = on[event]
  // 获取组件的回调
  const callback = data.model.callback
  // 存在
  if (isDef(existing)) {
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      on[event] = [callback].concat(existing)
    }
  } else {
    on[event] = callback
  }
}
