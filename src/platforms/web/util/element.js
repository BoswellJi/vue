/* @flow */

import { inBrowser } from 'core/util/env'
import { makeMap } from 'shared/util'

// 创建标记的命名空间(svg,html)
export const namespaceMap = {
  svg: 'http://www.w3.org/2000/svg',
  math: 'http://www.w3.org/1998/Math/MathML'
}

// html标签
export const isHTMLTag = makeMap(
  'html,body,base,head,link,meta,style,title,' +
  'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
  'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
  'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
  's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
  'embed,object,param,source,canvas,script,noscript,del,ins,' +
  'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
  'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
  'output,progress,select,textarea,' +
  'details,dialog,menu,menuitem,summary,' +
  'content,element,shadow,template,blockquote,iframe,tfoot'
)

// this map is intentionally selective, only covering SVG elements that may
// contain child elements.
// 可用的svg标签
export const isSVG = makeMap(
  'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
  'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
  'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
  true
)

// 保留格式标签
export const isPreTag = (tag: ?string): boolean => tag === 'pre'

// 被保留的标签(自定义组件不能使用)(w3c规范)
export const isReservedTag = (tag: string): ?boolean => {
  // 判断标签是html还是svg
  return isHTMLTag(tag) || isSVG(tag)
}

// 获取命名空间,svg标签,根节点为svg
export function getTagNamespace (tag: string): ?string {
  // 是svg标签(是一种描述图形的标签)
  if (isSVG(tag)) {
    return 'svg'
  }
  // basic support for MathML
  // note it doesn't support other MathML elements being component roots
  // math数学公式,数学根节点为math(用于描述数学公式,符号的一种xml标记)
  if (tag === 'math') {
    return 'math'
  }
}

// 未知的元素缓存
const unknownElementCache = Object.create(null)
export function isUnknownElement (tag: string): boolean {
  /* istanbul ignore if */
  // 非浏览器直接返回true
  if (!inBrowser) {
    return true
  }
  // 是保留标签,直接返回
  if (isReservedTag(tag)) {
    return false
  }
  // 将标签名改为小写
  tag = tag.toLowerCase()
  /* istanbul ignore if */
  // 位置元素标签是否存在
  if (unknownElementCache[tag] != null) {
    // 存在就直接返回
    return unknownElementCache[tag]
  }
  // 创建标签元素(html)
  const el = document.createElement(tag)
  // 标签中是否存在 - 
  if (tag.indexOf('-') > -1) {
    // http://stackoverflow.com/a/28210364/1070244
    // dom对象的构造函数是否为未知元素或者html元素,将结果保存到未知对象的对应标签下
    return (unknownElementCache[tag] = (
      el.constructor === window.HTMLUnknownElement ||
      el.constructor === window.HTMLElement
    ))
  } else {
    // dom对象调用toString,会返回对象的类型,判断dom对象是否是 HTMLUnknownElement 类型,将结果保存到标签下
    return (unknownElementCache[tag] = /HTMLUnknownElement/.test(el.toString()))
  }
}

// 判断判断标签是否为当前输入框中的一种
export const isTextInputType = makeMap('text,number,password,search,email,tel,url')
