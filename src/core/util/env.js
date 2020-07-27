/* @flow */

// can we use __proto__?
export const hasProto = '__proto__' in {}

// Browser environment sniffing（嗅探）
// 是否在浏览器中
export const inBrowser = typeof window !== 'undefined'
// weex平台
export const inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform
export const weexPlatform = inWeex && WXEnvironment.platform.toLowerCase()
// 浏览器的用户代理
export const UA = inBrowser && window.navigator.userAgent.toLowerCase()
// ie
export const isIE = UA && /msie|trident/.test(UA)
// ie9
export const isIE9 = UA && UA.indexOf('msie 9.0') > 0
// edge
export const isEdge = UA && UA.indexOf('edge/') > 0
// android
export const isAndroid = (UA && UA.indexOf('android') > 0) || (weexPlatform === 'android')
// ios
export const isIOS = (UA && /iphone|ipad|ipod|ios/.test(UA)) || (weexPlatform === 'ios')
// chrome
export const isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge
// phantomjs
export const isPhantomJS = UA && /phantomjs/.test(UA)
// firefox
export const isFF = UA && UA.match(/firefox\/(\d+)/)

// Firefox has a "watch" function on Object.prototype...
export const nativeWatch = ({}).watch

export let supportsPassive = false
if (inBrowser) {
  try {
    const opts = {}
    Object.defineProperty(opts, 'passive', ({
      get () {
        /* istanbul ignore next */
        supportsPassive = true
      }
    }: Object)) // https://github.com/facebook/flow/issues/285
    window.addEventListener('test-passive', null, opts)
  } catch (e) {}
}

// 这个需要延迟执行，因为vue-server-renderer能设置VUE_ENV之前，vue可能需要
// this needs to be lazy-evaled because vue may be required before
// vue-server-renderer can set VUE_ENV
let _isServer
export const isServerRendering = () => {
  // _isServer变量没有被初始化
  if (_isServer === undefined) {
    /* istanbul ignore if */
    // 非浏览器 && 非wexx && global不为undefined（node的global为对象）
    if (!inBrowser && !inWeex && typeof global !== 'undefined') {
      // detect presence of vue-server-renderer and avoid
      // Webpack shimming the process
      _isServer = global['process'] && global['process'].env.VUE_ENV === 'server'
    } else {
      _isServer = false
    }
  }
  return _isServer
}

// detect devtools
// 在浏览器中 && 浏览器有vue devtools插件工具
export const devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__

/* istanbul ignore next */
export function isNative (Ctor: any): boolean {
  return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
}

export const hasSymbol =
  typeof Symbol !== 'undefined' && isNative(Symbol) &&
  typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys)

let _Set
/* istanbul ignore if */ // $flow-disable-line
if (typeof Set !== 'undefined' && isNative(Set)) {
  // use native Set when available.
  _Set = Set
} else {
  // a non-standard Set polyfill that only works with primitive keys.
  _Set = class Set implements SimpleSet {
    set: Object;
    constructor () {
      this.set = Object.create(null)
    }
    has (key: string | number) {
      return this.set[key] === true
    }
    add (key: string | number) {
      this.set[key] = true
    }
    clear () {
      this.set = Object.create(null)
    }
  }
}

export interface SimpleSet {
  has(key: string | number): boolean;
  add(key: string | number): mixed;
  clear(): void;
}

export { _Set }
