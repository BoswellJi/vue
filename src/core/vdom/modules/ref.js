/* @flow */

import { remove, isDef } from 'shared/util'

export default {
  // 添加vnode
  create (_: any, vnode: VNodeWithData) {
    registerRef(vnode)
  },
  // 删除vnode，再添加新的vnode(更新vnode)
  update (oldVnode: VNodeWithData, vnode: VNodeWithData) {
    if (oldVnode.data.ref !== vnode.data.ref) {
      registerRef(oldVnode, true)
      registerRef(vnode)
    }
  },
  // 销毁vnode
  destroy (vnode: VNodeWithData) {
    registerRef(vnode, true)
  }
}

/**
 * 注册引用
 * @param {*} vnode 
 * @param {*} isRemoval 
 */
export function registerRef (vnode: VNodeWithData, isRemoval: ?boolean) {
  // 组件中ref属性
  const key = vnode.data.ref
  // 属性中没有定义这个ref
  if (!isDef(key)) return

  // 获取组件实例
  const vm = vnode.context
  // 组件的
  const ref = vnode.componentInstance || vnode.elm
  // 获取组件的节点引用数组
  const refs = vm.$refs
  // 删除组件中的引用节点
  if (isRemoval) {
    // 查看组件引用（命名）节点是否是数组
    if (Array.isArray(refs[key])) {
      // 从数组中移除指定元素
      remove(refs[key], ref)
    } else if (refs[key] === ref) {
      // 将对应的属性设置为undefined
      refs[key] = undefined
    }
  } else {
    if (vnode.data.refInFor) {
      // 判断指定的引用对象是否为数组
      if (!Array.isArray(refs[key])) {
        // 不是设置为数组（vnode列表
        refs[key] = [ref]
      } else if (refs[key].indexOf(ref) < 0) { // 再指定vnode查找当前ref,没有添加，不重复添加
        // $flow-disable-line
        // 添加到数组
        refs[key].push(ref)
      }
    } else {
      refs[key] = ref
    }
  }
}
