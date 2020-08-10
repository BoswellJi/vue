/* @flow */

import { isDef } from 'shared/util'
import { isAsyncPlaceholder } from './is-async-placeholder'

/**
 * 有一个是组件就返回组件的vnode
 * @param {*} children 
 */
export function getFirstComponentChild (children: ?Array<VNode>): ?VNode {
  // vnode需要是数组
  if (Array.isArray(children)) {
    // 遍历vnode
    for (let i = 0; i < children.length; i++) {
      // 获取vnode实例
      const c = children[i]
      // 被定义 && componentOptions被定义 || 是异步占位符,
      if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
        return c
      }
    }
  }
}
