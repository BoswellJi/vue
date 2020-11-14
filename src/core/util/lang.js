/* @flow */

/**
 * unicode字母用于解析html标签,组件名,和属性路径
 * unicode letters used for parsing html tags, component names and property paths.
 * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
 * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
 */
// unioncode 正则表达式,匹配unioncode数值字符的模式
export const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/

/**
 * Check if a string starts with $ or _
 * 查看字符串中是否存在保留的字符 $ _ 不能是这两个数
 */
export function isReserved (str: string): boolean {
  // 获取字符的编码
  const c = (str + '').charCodeAt(0)
  // 16进制数值
  return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 * 给对象定义一个属性,使用defineProperty
 * 对象, 属性, 值, 可枚举
 * 设置是否可枚举类型属性（突出枚举
 */
export function def (obj: Object, key: string, val: any, enumerable?: boolean) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

/**
 * Parse simple path.
 * 正则表达式的 source ,获取的是正则的源文本
 */
const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`)

export function parsePath (path: string): any {
  if (bailRE.test(path)) {
    return
  }
  // 使用 . 分隔符将字符串进行分割,因为 $watch方法只能传， a,a.b,来监听对象的某个属性
  const segments = path.split('.')
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}
