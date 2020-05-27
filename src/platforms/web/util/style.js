/* @flow */

import { cached, extend, toObject } from 'shared/util'

/**
 * 解析样式文本
 * @param {String} cssText css样式文本
 */
export const parseStyleText = cached(function (cssText) {
  const res = {}
  const listDelimiter = /;(?![^(]*\))/g
  const propertyDelimiter = /:(.+)/
  // 根据规则分割样式文本
  cssText.split(listDelimiter).forEach(function (item) {
    if (item) {
      // 
      const tmp = item.split(propertyDelimiter)
      // 获取样式的值添加给 res对象，res对象以样式的key作为res对象的key
      tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim())
    }
  })
  return res
})

// merge static and dynamic style data on the same vnode
// 合并静态和动态的样式数据到相同的vnode上
function normalizeStyleData (data: VNodeData): ?Object {
  const style = normalizeStyleBinding(data.style)
  // static style is pre-processed into an object during compilation
  // and is always a fresh object, so it's safe to merge into it
  // 编译期间,静态样式被预处理到一个对象上,并且总是一个新对象,所以合并他总是安全的
  return data.staticStyle
  // 继承
    ? extend(data.staticStyle, style)
    : style
}

// normalize possible array / string values into Object
export function normalizeStyleBinding (bindingStyle: any): ?Object {
  // 样式也是数组
  if (Array.isArray(bindingStyle)) {
    // 将样式转换位对象
    return toObject(bindingStyle)
  }
  // 样式是字符串
  if (typeof bindingStyle === 'string') {
    // 解析样式
    return parseStyleText(bindingStyle)
  }
  return bindingStyle
}

/**
 * 父组件样式应该在子组件样式之后应用，这样父组件的样式被覆盖
 * parent component style should be after child's
 * so that parent component's style could override it
 * 
 * 父组件样式生成在子组件之后,所以父组件样式会被覆盖
 */
export function getStyle (vnode: VNodeWithData, checkChild: boolean): Object {
  const res = {}
  let styleData

  // 检查子节点
  if (checkChild) {
    // 将节点赋值给子节点
    let childNode = vnode
    // 获取子节点得组件实例
    while (childNode.componentInstance) {
      // 
      childNode = childNode.componentInstance._vnode
      // 子节点存在 && 子节点得data属性 && 
      if (
        childNode && childNode.data &&
        (styleData = normalizeStyleData(childNode.data))
      ) {
        extend(res, styleData)
      }
    }
  }

  // 规范化样式数据
  if ((styleData = normalizeStyleData(vnode.data))) {
    // 将样式数据 目标对象 复制给res对象
    extend(res, styleData)
  }

  // 将当前节点赋值给父节点变量
  let parentNode = vnode
  // 获取父节点得父节点，到不存在为止
  while ((parentNode = parentNode.parent)) {
    // 父节点得data属性存在 && 正规化父节点得data数据
    if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
      // 让res 继承styleData对象
      extend(res, styleData)
    }
  }
  // 返回继承后得res对象
  return res
}
