/* @flow */

import { warn } from 'core/util/index'

export * from './attrs'
export * from './class'
export * from './element'

/**
 * Query an element selector if it's not an element already.
 */
export function query (el: string | Element): Element {
  // 字符串选择器
  if (typeof el === 'string') {
    // 先获取dom对象
    const selected = document.querySelector(el)
    // dom对象不存在
    if (!selected) {
      // 开发环境中,警告,不能找到元素
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      // 创建一个div元素节点
      return document.createElement('div')
    }
    // dom对象存在,直接返回
    return selected
  } else {
    // 直接是dom对象，直接返回
    return el
  }
}
