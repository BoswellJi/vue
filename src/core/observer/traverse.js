/* @flow */

import { _Set as Set, isObject } from '../util/index'
import type { SimpleSet } from '../util/index'
import VNode from '../vdom/vnode'

// 缓存之前的对象集合,值是唯一的
const seenObjects = new Set()

/**
 * 递归遍历一个对象来调用所有的转换过的getter
 * Recursively traverse an object to evoke all converted
 * 以至于对象的内部的每个嵌套属性被收集作为一个深入依赖
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
export function traverse (val: any) {
  // 响应式对象 唯一集合
  _traverse(val, seenObjects)
  seenObjects.clear()
}

/**
 * 遍历对象
 * @param {*} val 
 * @param {*} seen 
 */
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
    // 已经缓存过了,直接返回
    if (seen.has(depId)) {
      return
    }
    // 第一个加入
    seen.add(depId)
  }
  // 将每一个元素都进行遍历检查
  // 数组
  if (isA) {
    // 长度
    i = val.length
    // 遍历数组每个元素
    while (i--) _traverse(val[i], seen)
  } else {
    // 获取对象的key集合
    keys = Object.keys(val)
    // 获取件的长度
    i = keys.length
    // 遍历对象的键,值,
    while (i--) _traverse(val[keys[i]], seen)
  }
}
