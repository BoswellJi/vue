/* @flow */

/**
 * 进制转换
 * 2进制小数,转换为10进制, 小数点开始,从左向右,第一位乘上 1/2, 第二位乘上 1/4 ...
 * 每个数都计算下去,相加,就是小数部分的十进制的值;
 *
 * 10进制的小数,转换为2进制,小数部分乘以2,每次取整数部分,一直乘下去,知道结果为1(每次取结果的小数继续乘
 */

/**
 * vnode 种类
 * html
 * svg
 * 普通有状态组件
 * 需要被keepAlive的有状态组件
 * 已经被keepAlive的有状态组件
 * 函数式
 * 纯文本
 * Fragment
 * Portal
 *
 * create/createElement vnode -> diff->  patch （vnode-> dom
 */
export default class VNode {
  tag: string | void; // 标签
  data: VNodeData | void; // 相关数据：属性，事件，样式等
  children: ?Array<VNode>; // 子节点
  text: string | void;  // 文本节点的文本
  elm: Node | void; // 真实DOM对象
  ns: string | void; // 元素的命名空间
  context: Component | void; // rendered in this component's scope，
  key: string | number | void; // 节点的key，value
  componentOptions: VNodeComponentOptions | void; // 组件options
  componentInstance: Component | void; // component instance
  parent: VNode | void; // component placeholder node

  // strictly internal
  raw: boolean; // contains raw HTML? (server only)
  isStatic: boolean; // hoisted static node
  isRootInsert: boolean; // necessary for enter transition check
  isComment: boolean; // empty comment placeholder?
  isCloned: boolean; // is a cloned node?
  isOnce: boolean; // is a v-once node?
  asyncFactory: Function | void; // async component factory function
  asyncMeta: Object | void; // 异步元数据
  isAsyncPlaceholder: boolean; // 是否为异步占位符
  fnContext: Component | void; // real context vm for functional nodes
  fnOptions: ?ComponentOptions; // for SSR caching
  devtoolsMeta: ?Object; // used to store functional render context for devtools
  fnScopeId: ?string; // functional scope id support

  constructor(
    tag?: string,
    data?: VNodeData,
    children?: ?Array<VNode>,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined
    this.context = context
    this.fnContext = undefined
    this.fnOptions = undefined
    this.fnScopeId = undefined
    this.key = data && data.key
    this.componentOptions = componentOptions
    this.componentInstance = undefined
    this.parent = undefined
    this.raw = false
    this.isStatic = false
    this.isRootInsert = true
    this.isComment = false
    this.isCloned = false
    this.isOnce = false
    this.asyncFactory = asyncFactory
    this.asyncMeta = undefined
    this.isAsyncPlaceholder = false
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child(): Component | void {
    return this.componentInstance
  }
}

export const createEmptyVNode = (text: string = '') => {
  const node = new VNode()
  node.text = text
  node.isComment = true
  return node
}

export function createTextVNode(val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
export function cloneVNode(vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    // #7975
    // clone children array to avoid mutating original in case of cloning
    // a child.
    vnode.children && vnode.children.slice(),
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isComment
  cloned.fnContext = vnode.fnContext
  cloned.fnOptions = vnode.fnOptions
  cloned.fnScopeId = vnode.fnScopeId
  cloned.asyncMeta = vnode.asyncMeta
  cloned.isCloned = true
  return cloned
}


// function anonymous(
// ) {
//   with (this) {
//     return _c('div', _l(
//       [1, 2, 2],
//       function (item, index) {
//         return _c('div', { key: index }, [_v("\n" + _s(item) + "\n")])
//       }
//     ), 0)
//   }
// }
