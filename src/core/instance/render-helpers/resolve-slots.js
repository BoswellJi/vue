/* @flow */

import type VNode from 'core/vdom/vnode'

/**
 * 解析插槽，用来解析原生子vnode到一个slot对象的运行时助手
 * Runtime helper for resolving raw children VNodes into a slot object.
 */
export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  // 没有vnode
  if (!children || !children.length) {
    return {}
  }
  const slots = {}
  for (let i = 0, l = children.length; i < l; i++) {
    // 获取vnode
    const child = children[i]
    // 获取vnode的data,属性与属性值
    const data = child.data
    // 如果节点被解析为一个vue 插槽节点， 删除插槽属性
    // remove slot attribute if the node is resolved as a Vue slot node
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot
    }
    //  如果vnode被渲染在相同上下文，命名的插槽应该指被重视
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    if ((child.context === context || child.fnContext === context) &&
    // slot设置组件名称
      data && data.slot != null
    ) {
      // 获取插槽名称
      const name = data.slot
      // 给每个 相同name的插槽，放到一个数组中
      const slot = (slots[name] || (slots[name] = []))
      // 是否是虚拟组件
      if (child.tag === 'template') {
        // template不算做节点
        slot.push.apply(slot, child.children || [])
      } else {
        slot.push(child)
      }
    } else {
      // 获取默认插槽
      (slots.default || (slots.default = [])).push(child)
    }
  }
  // ignore slots that contains only whitespace
  for (const name in slots) {
    // 插槽的名称是白名单， 删除这个插槽
    if (slots[name].every(isWhitespace)) {
      delete slots[name]
    }
  }
  // 返回插槽vnode
  return slots
}

function isWhitespace (node: VNode): boolean {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}
