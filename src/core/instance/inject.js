/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'

/**
 * 初始化组件提供
 * @param {*} vm 组件实例
 */
export function initProvide (vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    // 添加到_provided属性
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}

/**
 * 初始化注射器
 * @param {*} vm 
 */
export function initInjections (vm: Component) {
  // 解析注射器，组件的inject选项，组件实例
  const result = resolveInject(vm.$options.inject, vm)
  // 存在注射器
  if (result) {
    // 切换观察者
    toggleObserving(false)
    // 遍历所有注射器成员
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        // 设置注射其中属性为响应式属性
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
    toggleObserving(true)
  }
}

export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    // 创建对象
    const result = Object.create(null)
    // 获取注射器选项的key数组
    const keys = hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)

      // 遍历key数组
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // #6574 in case the inject object is observed...
      // 属性__ob__
      if (key === '__ob__') continue
      // 获取注射器中的属性（当注射器中是一个对象的时候有from属性，default属性
      const provideKey = inject[key].from
      // 保存当前组件实例的引用
      let source = vm
      // 组件实例
      while (source) {
        // 组件有_provided属性，属性是provideKey自身的
        if (source._provided && hasOwn(source._provided, provideKey)) {
          // 添加到结果对象中
          result[key] = source._provided[provideKey]
          break
        }
        // 获取组件的父组件
        source = source.$parent
      }
      // 非组件
      if (!source) {
        // 注射器中有default属性
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
