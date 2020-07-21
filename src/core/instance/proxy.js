/* not type checking this file because flow doesn't play well with Proxy */

import config from 'core/config'
import { warn, makeMap, isNative } from '../util/index'

let initProxy

if (process.env.NODE_ENV !== 'production') {
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' // for Webpack/Browserify
  )

  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    )
  }

  const warnReservedPrefix = (target, key) => {
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      'prevent conflicts with Vue internals. ' +
      'See: https://vuejs.org/v2/api/#data',
      target
    )
  }

  // 是否存在Proxy原生对象
  const hasProxy =
    typeof Proxy !== 'undefined' && isNative(Proxy)

  if (hasProxy) {
    // 内置修饰符
    const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact')
    config.keyCodes = new Proxy(config.keyCodes, {
      set (target, key, value) {
        // 如果使用的key是内置的修饰符
        if (isBuiltInModifier(key)) {
          // 警告提示
          warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
          return false
        } else {
          target[key] = value
          return true
        }
      }
    })
  }

  const hasHandler = {

    /**
        属性查询: foo in proxy
        继承属性查询: foo in Object.create(proxy)
        with 检查: with(proxy) { (foo); }
        Reflect.has()
     * @param {*} target 
     * @param {*} key 
     */
    // 主要是在with语句中触发，with是 编译后的render function中获取 实例属性时候触发
    // 手写的render function 不会被包裹在with语句中
    has (target, key) {
      // 属性是否存在目标对象上 （实例，原型链）
      const has = key in target
      // key是否存在定义的全局对象中，也就是说，全局对象也是允许在模板中访问的 
      const isAllowed = allowedGlobals(key) ||
      // key为字符串 && 第一个字符为_ && 不能存在Vue实例的的$data对象上
        (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data))
        // 没有 && 不允许
      if (!has && !isAllowed) {
        // 警告提示
        if (key in target.$data) warnReservedPrefix(target, key) 
        else warnNonPresent(target, key)
      }
      return has || !isAllowed
    }
  }

  const getHandler = {
    /**
     * 获取属性值
     * @param {*} target 目标对象
     * @param {*} key 属性
     */
    get (target, key) {
      if (typeof key === 'string' && !(key in target)) {
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }
      return target[key]
    }
  }

  initProxy = function initProxy (vm) {
    // Proxy对象是否可以使用
    if (hasProxy) {
      // determine which proxy handler to use 决定使用哪个代理处理器
      const options = vm.$options
      // 存在用户render函数， _withStripped 这个属性为true
      const handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler
        // 创建代理对象
      vm._renderProxy = new Proxy(vm, handlers)
    } else {
      vm._renderProxy = vm
    }
  }
}

export { initProxy }
