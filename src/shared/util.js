/* @flow */

// 创建一个冻结对象
export const emptyObject = Object.freeze({})

// These helpers produce better VM code in JS engines due to their
// explicitness and function inlining.
// 判断变量是否是undefined和null值
export function isUndef (v: any): boolean %checks {
  return v === undefined || v === null
}

// 判断变量是否不是undefined和null值
export function isDef (v: any): boolean %checks {
  return v !== undefined && v !== null
}

// 判断变量是否为true 值
export function isTrue (v: any): boolean %checks {
  return v === true
}

// 判断变量是否为false 值
export function isFalse (v: any): boolean %checks {
  return v === false
}

/**
 * Check if value is primitive.
 * 判断变量是否为原始数据类型 string number symbol boolean
 */
export function isPrimitive (value: any): boolean %checks {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    // $flow-disable-line
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  )
}

/**
 * Quick object check - this is primarily used to tell
 * Objects from primitive values when we know the value
 * is a JSON-compliant type.
 */
// 判断变量是否为对象,但非null
export function isObject (obj: mixed): boolean %checks {
  return obj !== null && typeof obj === 'object'
}

/**
 * Get the raw type string of a value, e.g., [object Object].
 */
// 保存toString方法的引用
const _toString = Object.prototype.toString

//[object Object]. -》 Object
/**
 * 获取值的数据类型
 * @param {*} value 
 */
export function toRawType (value: any): string {
  // value 改变toString方法中的上下文
  return _toString.call(value).slice(8, -1)
}

/**
 * 严格的对象类型检查，对于普通的js对象，只返回true
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 */
// 判断变量是否为原生对象类型
export function isPlainObject (obj: any): boolean {
  return _toString.call(obj) === '[object Object]'
}

// 判断变量是否为正则类型
export function isRegExp (v: any): boolean {
  return _toString.call(v) === '[object RegExp]'
}

/**
 * Check if val is a valid array index.
 */
// 是否为有效的数组索引
export function isValidArrayIndex (val: any): boolean {
  // 将变量强制转换为字符串类型,在强制转换为浮点数类型
  const n = parseFloat(String(val))
  // n大于等于0 ,向下取整后相等,是有限数值
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}

/**
 * 判断变量类型是否为Promise类型
 * @param {*} val 
 */
export function isPromise (val: any): boolean {
  // 不是undefined不是null bingqie 有then函数，catch函数
  return (
    isDef(val) &&
    typeof val.then === 'function' &&
    typeof val.catch === 'function'
  )
}

/**
 * Convert a value to a string that is actually rendered.
 */
export function toString (val: any): string {
  return val == null
    ? ''
    : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
      ? JSON.stringify(val, null, 2)
      : String(val)
}

/**
 * Convert an input value to a number for persistence.
 * If the conversion fails, return original string.
 */
// 将字符串转换为数值类型
export function toNumber (val: string): number | string {
  // 将字符串强制转换为浮点数
  const n = parseFloat(val)
  // val不能转换为数值的,返回原值,则返回n
  return isNaN(n) ? val : n
}

/**
 * 创造一个map，返回一个函数用来检查key是否在map中
 * Make a map and return a function for checking if a key
 * is in that map.
 */
export function makeMap (
  str: string,
  expectsLowerCase?: boolean
): (key: string) => true | void {
  // 创建一个没有上层原型的对象
  const map = Object.create(null)
  // 将字符串分割为数组
  const list: Array<string> = str.split(',')
  // 将数组元素添加到map的属性上
  for (let i = 0; i < list.length; i++) {
    // list中的每个元素都当作属性
    map[list[i]] = true
  }
  // 是否获取的属性为小写(js 区分变量名大小写)
  return expectsLowerCase
    ? val => map[val.toLowerCase()]
    : val => map[val]
}

/**
 * Check if a tag is a built-in tag.
 * 框架内置的标签
 */
// vue内建的组件
export const isBuiltInTag = makeMap('slot,component', true)

/**
 * Check if an attribute is a reserved attribute.
 */
// 保留的属性
export const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is')

/**
 * 从数组中移除一个元素
 * Remove an item from an array.
 * @param {Array} 数组
 * @param {any} item 数组元素
 */
export function remove (arr: Array<any>, item: any): Array<any> | void {
  // 数组中有元素
  if (arr.length) {
    // 找到元素在数组中的位置
    const index = arr.indexOf(item)
    if (index > -1) {
      // 删除元素
      return arr.splice(index, 1)
    }
  }
}

/**
 * Check whether an object has the property.
 */
// 保存方法的引用,缩短原型链查找带来的开销
const hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwn (obj: Object | Array<*>, key: string): boolean {
  return hasOwnProperty.call(obj, key)
}

/**
 * Create a cached version of a pure function.
 */

export function cached<F: Function> (fn: F): F {
  // 创建一个哈希表,用来缓存属性
  const cache = Object.create(null)
  // 
  return (function cachedFn (str: string) {
    // 缓存中有就取出,没有就添加到缓存
    const hit = cache[str]
    // 缓存的是否函数的返回值(省去函数调用开销)
    return hit || (cache[str] = fn(str))
  }: any)
}

/**
 * Camelize a hyphen-delimited string.
 */
// 获取 aaa-baa 中的 -b =>  B,将连接线风格转换为小驼峰写法
const camelizeRE = /-(\w)/g
export const camelize = cached((str: string): string => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '')
})

/**
 * Capitalize a string.
 */
// 大写开头
export const capitalize = cached((str: string): string => {
  // 将第一个字符取出,改为大写,连接剩余部分字符
  return str.charAt(0).toUpperCase() + str.slice(1)
})

/**
 * Hyphenate a camelCase string.
 */
// 将小驼峰写法改为 - 连接
const hyphenateRE = /\B([A-Z])/g
export const hyphenate = cached((str: string): string => {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
})

/**
 * Simple bind polyfill for environments that do not support it,
 * e.g., PhantomJS 1.x. Technically, we don't need this anymore
 * since native bind is now performant enough in most browsers.
 * But removing it would mean breaking code that was able to run in
 * PhantomJS 1.x, so this must be kept for backward compatibility.
 */

/* istanbul ignore next */
function polyfillBind (fn: Function, ctx: Object): Function {
  function boundFn (a) {
    const l = arguments.length
    return l
      ? l > 1
        ? fn.apply(ctx, arguments)
        : fn.call(ctx, a)
      : fn.call(ctx)
  }

  boundFn._length = fn.length
  return boundFn
}

function nativeBind (fn: Function, ctx: Object): Function {
  return fn.bind(ctx)
}

export const bind = Function.prototype.bind
  ? nativeBind
  : polyfillBind

/**
 * Convert an Array-like object to a real Array.
 */
export function toArray (list: any, start?: number): Array<any> {
  start = start || 0
  let i = list.length - start
  const ret: Array<any> = new Array(i)
  while (i--) {
    ret[i] = list[i + start]
  }
  return ret
}

/**
 * Mix properties into target object.
 */
// 混合式继承,潜复制
export function extend (to: Object, _from: ?Object): Object {
  // 遍历对象
  for (const key in _from) {
    // 将目标对象的属性复制给源对象上
    to[key] = _from[key]
  }
  return to
}

/**
 * Merge an Array of Objects into a single Object.
 */
// 合并Object类型的数组,到一个对象中去
export function toObject (arr: Array<any>): Object {
  const res = {}
  // 遍历数组
  for (let i = 0; i < arr.length; i++) {
    // 元素存在时
    if (arr[i]) {
      // 将对象继承res
      extend(res, arr[i])
    }
  }
  return res
}

/* eslint-disable no-unused-vars */

/**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
 */
export function noop (a?: any, b?: any, c?: any) {}

/**
 * Always return false.
 */
// 总是say no
export const no = (a?: any, b?: any, c?: any) => false

/* eslint-enable no-unused-vars */

/**
 * Return the same value.
 */
// 总是返回本身
export const identity = (_: any) => _

/**
 * Generate a string containing static keys from compiler modules.
 */
// 生成一个静态的属性
export function genStaticKeys (modules: Array<ModuleOptions>): string {
  // 模块中静态属性和合并到一个数组中,并使用,连接
  return modules.reduce((keys, m) => {
    return keys.concat(m.staticKeys || [])
  }, []).join(',')
}

/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 */
// 宽松的变量比较，外形像，那就是了
export function looseEqual (a: any, b: any): boolean {
  // 两个变量全等
  if (a === b) return true
  // 都是对象 typeof 下的
  const isObjectA = isObject(a)
  const isObjectB = isObject(b)
  if (isObjectA && isObjectB) {
    try {
      // 都是数组
      const isArrayA = Array.isArray(a)
      const isArrayB = Array.isArray(b)
      if (isArrayA && isArrayB) {
        // 长度都一样,每个元素都相等
        return a.length === b.length && a.every((e, i) => {
          return looseEqual(e, b[i])
        })
        // 都是Date的类型
      } else if (a instanceof Date && b instanceof Date) {
        // 根据时间戳来判断
        return a.getTime() === b.getTime()
        // 都不是数组
      } else if (!isArrayA && !isArrayB) {
        // 对象Object对象
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        // key的长度相等,每个属性值都相等
        return keysA.length === keysB.length && keysA.every(key => {
          return looseEqual(a[key], b[key])
        })
      } else {
        /* istanbul ignore next */
        return false
      }
    } catch (e) {
      /* istanbul ignore next */
      return false
    }
    // 都不是Object对象
  } else if (!isObjectA && !isObjectB) {
    // 原始类型,转换为字符串
    return String(a) === String(b)
  } else {
    // 不等
    return false
  }
}

/**
 * Return the first index at which a loosely equal value can be
 * found in the array (if value is a plain object, the array must
 * contain an object of the same shape), or -1 if it is not present.
 */
// 宽松的变量比较
export function looseIndexOf (arr: Array<mixed>, val: mixed): number {
  // 数组中是否存在这个数（外形像那就是了
  for (let i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) return i
  }
  return -1
}

/**
 * Ensure a function is called only once.
 */
// 只执行一次
export function once (fn: Function): Function {
  // 初始化为false，意为可以执行
  let called = false
  return function () {
    // 开始执行
    if (!called) {
      // 设置为true
      called = true
      // 调用函数（之后不会再执行这个函数，这个once方法
      fn.apply(this, arguments)
    }
  }
}
