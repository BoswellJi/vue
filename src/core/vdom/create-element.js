/* @flow */

import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset
} from '../util/index'

import {
  normalizeChildren,
  simpleNormalizeChildren
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// 用于提供一个更灵活的接口的包裹函数
// wrapper function for providing a more flexible interface
// without getting yelled at by flow
/**
 * Vue 组件的创建虚拟dom的函数，可以将组件模板编译为虚拟dom
 * @param {*} context vnode（组件）的上下文
 * @param {*} tag 标签
 * @param {*} data vnode的数据(编译后的vnode信息)
 * @param {*} children 当前vnode的子节点
 * @param {*} normalizationType 子节点规范的类型
 * @param {*} alwaysNormalize 是否总是规范化
 */
export function createElement(
  context: Component,
  tag: any,
  data: any,
  children: any,
  normalizationType: any,
  alwaysNormalize: boolean
): VNode | Array<VNode> {
  // 数组或者原始,children本身就是规范化的类型
  if (Array.isArray(data) || isPrimitive(data)) {
    // 子vnode
    normalizationType = children
    // children本身就是数据
    children = data
    data = undefined
  }
  // boolean类型
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  const vnode = _createElement(context, tag, data, children, normalizationType)
  console.log(vnode);
  return vnode;
}


/**
 * 1. tag为空，创建一个空的 vnode
 * 2. 创建一个标签vnode
 * 3. 创建一个组件vnode
 * 
 * @param {*} context 整个组件实例
 * @param {*} tag 组件的vnode 1. 标签节点  2. 文本节点  3. 组件节点（组件实例
 * @param {*} data vnode的data
 * @param {*} children vnode的子vnode
 * @param {*} normalizationType 
 */
export function _createElement(
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  // 定义了data && data是响应式对象，返回空vnode
  if (isDef(data) && isDef((data: any).__ob__)) {
    // 避免使用被观察数据对象作为vnode data,总是在每一次渲染中创建新鲜的vnode数据对象
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    // 创建空vnode
    return createEmptyVNode()
  }
  // object syntax in v-bind 使用v-bind语法的对象
  // 定义了data && data.is也是被定义的
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }
  // 没有tag,返回空vnode
  if (!tag) {
    // 在组件案例中
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  // warn against non-primitive key
  // 开发环境中。避免使用非原始值作为key
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }
  // 支持单个函数子节点作为默认作用域插槽
  // support single function children as default scoped slot
  // 子vnode为数组，并且第一个元素是函数
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    // 获取节点的信息
    data = data || {}
    // 设置节点的作用域插槽
    data.scopedSlots = { default: children[0] }
    // 设置子vnode长度为0
    children.length = 0
  }
  // 规范化vnode的子vnode 总是规范化
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children)
    // 简单规范化
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children)
  }
  let vnode, ns
  // 字符串为标签节点
  if (typeof tag === 'string') {
    let Ctor

    // 获取标签元素的命名空间 || 获取标签的名称空间
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)

    //保留tag，平台内置(例如html tag)
    if (config.isReservedTag(tag)) {
      // platform built-in elements 平台内置元素
      if (process.env.NODE_ENV !== 'production' && isDef(data) && isDef(data.nativeOn)) {
        warn(
          `The .native modifier for v-on is only valid on components but it was used on <${tag}>.`,
          context
        )
      }

      // 创建vnode，节点信息，子vnode, 组件实例
      vnode = new VNode(
        // 标签
        config.parsePlatformTagName(tag),
        // 节点属性，事件，样式
        data,
        // 子节点
        children,
        // 文本
        undefined,
        // vnode真实dom node
        undefined,
        // 组件本身
        context
      )

      /**
       * resolveAsset对tag进行判断，并进行组件tag名的正规化，再进行判断
       * 组件节点没有data属性
       */
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component
      // 组件实例 
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // 未知 或者 未列出的 名称空间 元素
      // unknown or unlisted namespaced elements
      // 查看运行时因为当他父组件正规化子组件它可能赋值给一个名称空间
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      // 文本节点
      vnode = new VNode(
        tag, 
        data, 
        children,
        undefined, 
        undefined, 
        context
      )
    }
  } else {
    // 直接组件选项/构造函数
    // direct component options / constructor
    // 创建组件的vnode
    vnode = createComponent(tag, data, context, children)
  }
  // vnode为数组
  if (Array.isArray(vnode)) {
    // 直接返回
    return vnode

    // 节点被定义
  } else if (isDef(vnode)) {

    // 名称空间被定义
    if (isDef(ns)) applyNS(vnode, ns)

    // vnode 信息被定义, 注册深度绑定给data
    if (isDef(data)) registerDeepBindings(data)

    return vnode
  } else {
    // 创建一个空的vnode
    return createEmptyVNode()
  }
}

/**
 * 应用命名空间
 * @param {*} vnode 
 * @param {*} ns 
 * @param {*} force 
 */
function applyNS(vnode, ns, force) {
  // 虚拟节点ns属性赋值
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings(data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}
