/* @flow */

import { _Set as Set, isObject } from '../util/index'
import type { SimpleSet } from '../util/index'
import VNode from '../vdom/vnode'

const seenObjects = new Set()

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
export function traverse (val: any) {
  // 响应式对象 唯一集合
  _traverse(val, seenObjects)
  seenObjects.clear()
}

function _traverse (val: any, seen: SimpleSet) {
  let i, keys
  // 是否是数组
  const isA = Array.isArray(val)
  // 非数组 && 非对象 || 对象被冻结 || 对象继承自虚拟节点
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  // 已经存在观察者
  if (val.__ob__) {
    // 存在依赖id
    const depId = val.__ob__.dep.id

    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  // 数组
  if (isA) {
    // 长度
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}
