/* @flow */

import { inBrowser } from 'core/util/index'

// check whether current browser encodes a char inside attribute values
let div
/**
 * get请求
 * @param {*} href 
 */
function getShouldDecode (href: boolean): boolean {
  // 创建一个div节点
  div = div || document.createElement('div')
  // 给节点添加一个a节点, 或者带有a属性的div元素
  div.innerHTML = href ? `<a href="\n"/>` : `<div a="\n"/>`
  // 
  return div.innerHTML.indexOf('&#10;') > 0
}
// 不同浏览器对于属性值中的\n编码问题
// ie编码，其他不编码
// chrome编码href属性
// ie编码 属性值中的 \n 符号,同时其他浏览器不会这样做
// #3663: IE encodes newlines inside attribute values while other browsers don't
export const shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false
// chrome编码在 a标签中的href属性值
// #6828: chrome encodes content in a[href]
export const shouldDecodeNewlinesForHref = inBrowser ? getShouldDecode(true) : false
