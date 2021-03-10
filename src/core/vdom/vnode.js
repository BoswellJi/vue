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
 */
export default class VNode {
  tag: string | void; // 标签
  data: VNodeData | void; // vnode的相关数据，标签属性，vnode的事件，样式等
  children: ?Array<VNode>; 
  text: string | void; 
  elm: Node | void; // vnode的真实dom对象的引用(根据这个属性，子vnode确定创建的真实dom插入到哪里)
  ns: string | void; // 元素的命名空间
  context: Component | void; // rendered in this component's scope， 
  key: string | number | void;
  componentOptions: VNodeComponentOptions | void; 
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
  asyncMeta: Object | void;  
  isAsyncPlaceholder: boolean;
  fnContext: Component | void; // real context vm for functional nodes 
  fnOptions: ?ComponentOptions; // for SSR caching 
  devtoolsMeta: ?Object; // used to store functional render context for devtools 
  fnScopeId: ?string; // functional scope id support 
  /**
   * @param {*} tag 标签
   * @param {*} data 标签数据（属性
   * @param {*} children 节点的子虚拟节点
   * @param {*} text 虚拟节点中的文本
   * @param {*} elm 
   * @param {*} context 虚拟节点的
   * @param {*} componentOptions 虚拟节点的配置对象
   * @param {*} asyncFactory 
   */
  constructor (
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
  get child (): Component | void {
    return this.componentInstance
  }
}

// 创建一个空vnode
export const createEmptyVNode = (text: string = '') => {
  const node = new VNode()
  // 给注释节点添加文本
  node.text = text
  // 标记为注释节点
  node.isComment = true
  return node
}

// 创建一个文本虚拟节点
export function createTextVNode (val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
// 克隆vnode
export function cloneVNode (vnode: VNode): VNode {
  // 根据vnode重新实例化一个vnode
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
  // 添加
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
