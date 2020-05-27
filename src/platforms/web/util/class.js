/* @flow */

import { isDef, isObject } from 'shared/util'

/**
 * 生成vnode的class
 * @param {*} vnode 
 */
export function genClassForVnode(vnode: VNodeWithData): string {
  // vnode的信息
  let data = vnode.data
  // 设置vnode为父vnode
  let parentNode = vnode
  // 设置vnode为子vnode
  let childNode = vnode
  // 子vnode的组件实例是否被定义,知道没有被定义为止
  while (isDef(childNode.componentInstance)) {
    // 获取子vnode组件实例的vnode
    childNode = childNode.componentInstance._vnode
    if (childNode && childNode.data) {
      data = mergeClassData(childNode.data, data)
    }
  }
  while (isDef(parentNode = parentNode.parent)) {
    if (parentNode && parentNode.data) {
      data = mergeClassData(data, parentNode.data)
    }
  }
  return renderClass(data.staticClass, data.class)
}

/**
 * 
 * @param {*} child 
 * @param {*} parent 
 */
function mergeClassData(child: VNodeData, parent: VNodeData): {
  staticClass: string,
  class: any
} {
  return {
    staticClass: concat(child.staticClass, parent.staticClass),
    class: isDef(child.class)
      ? [child.class, parent.class]
      : parent.class
  }
}

/**
 * 渲染节点的样式class
 * @param {*} staticClass 静态类
 * @param {*} dynamicClass 动态类
 */
export function renderClass(
  staticClass: ?string,
  dynamicClass: any
): string {
  // 静态类被定义 或者动态类被定义
  if (isDef(staticClass) || isDef(dynamicClass)) {
    // 连接类返回给元素
    return concat(staticClass, stringifyClass(dynamicClass))
  }
  /* istanbul ignore next */
  return ''
}

export function concat(a: ?string, b: ?string): string {
  // a存在返回b,b存在返回a连接b
  return a ? (b ? (a + ' ' + b) : a) : (b || '')
}

export function stringifyClass(value: any): string {
  // class设置为数组
  if (Array.isArray(value)) {
    // 序列化数组
    return stringifyArray(value)
  }
  // class设置为对象
  if (isObject(value)) {
    // 序列化对象
    return stringifyObject(value)
  }
  // value为字符串
  if (typeof value === 'string') {
    // 直接返回
    return value
  }
  /* istanbul ignore next */
  return ''
}

/**
 * 序列化数组
 * @param {*} value 
 */
function stringifyArray(value: Array<any>): string {
  let res = ''
  let stringified
  for (let i = 0, l = value.length; i < l; i++) {
    // 数组中的元素进行再次序列化,
    if (isDef(stringified = stringifyClass(value[i])) && stringified !== '') {
      if (res) res += ' '
      res += stringified
    }
  }
  return res
}

/**
 * 序列化对象
 * {name:'df',age:23} => "name age"
 * @param {*} value 
 */
function stringifyObject(value: Object): string {
  let res = ''
  for (const key in value) {
    if (value[key]) {
      if (res) res += ' '
      // 将key进行相加
      res += key
    }
  }
  return res
}
