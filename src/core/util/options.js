/* @flow */

import config from '../config'
import { warn } from './debug'
import { set } from '../observer/index'
import { unicodeRegExp } from './lang'
import { nativeWatch, hasSymbol } from './env'

import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS
} from 'shared/constants'

import {
  extend,
  hasOwn,
  camelize,
  toRawType,
  capitalize,
  isBuiltInTag,
  isPlainObject
} from 'shared/util'

/**
 * Option重写策略是处理如何合并一个父(构造函数的options)option值和一个子option值到最终值得函数
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
const strats = config.optionMergeStrategies

/**
 * options的限制
 * Options with restrictions
 */
if (process.env.NODE_ENV !== 'production') {
  /**
   * el
   * propsData
   * 只能在new Vue({
   *  el:'#app',
   * propsData:{}
   * })实例化的时候才能使用
   */
  strats.el = strats.propsData = function (parent, child, vm, key) {
    // 没有vm实例
    if (!vm) {
      // option的key只能被使用,在实例使用new关键字创建期间
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    // 返回默认策略
    return defaultStrat(parent, child)
  }
}


/**
 * 合并options中的各项的策略，  (合并父类的静态options和自身实例的options)
 * 
 data,beforeCreate,created,beforeMount,mounted,beforeUpdate,updated,beforeDestroy,destroyed,activated,deactivated,errorCaptured,serverPrefetch,filter,directive,component,watch,props,methods,inject,computed,provide
 */

/**
 * Helper that recursively merges two data objects together.
 */
function mergeData(to: Object, from: ?Object): Object {
  if (!from) return to
  let key, toVal, fromVal

  const keys = hasSymbol
    ? Reflect.ownKeys(from)
    : Object.keys(from)  // 获取对象那个key，返回数组 ['a','b']

  for (let i = 0; i < keys.length; i++) {
    key = keys[i]
    // in case the object is already observed...
    if (key === '__ob__') continue

    toVal = to[key]
    fromVal = from[key]
    // to 对象没有此实例属性
    if (!hasOwn(to, key)) {
      set(to, key, fromVal)
    } else if (
      toVal !== fromVal &&
      isPlainObject(toVal) && // 纯对象
      isPlainObject(fromVal)  // 纯对象
    ) {
      mergeData(toVal, fromVal)
    }
  }
  return to
}

/**
 * Data
 */
export function mergeDataOrFn(
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn() {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    return function mergedInstanceDataFn() {
      // instance merge
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}

strats.data = function (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  // 子组件中没有vm，global-api/extend.js中调用的options合并方法
  // 组件的data必须是函数
  if (!vm) {
    if (childVal && typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )

      return parentVal
    }
    return mergeDataOrFn(parentVal, childVal)
  }

  return mergeDataOrFn(parentVal, childVal, vm)
}

/**
 * Hooks and props are merged as arrays.
 */
function mergeHook(
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  const res = childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
  return res
    ? dedupeHooks(res)
    : res
}

function dedupeHooks(hooks) {
  const res = []
  for (let i = 0; i < hooks.length; i++) {
    if (res.indexOf(hooks[i]) === -1) {
      res.push(hooks[i])
    }
  }
  return res
}

LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 * 
 * components,filters,directives的合并策略，值必须是纯对象
 */
function mergeAssets(
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): Object {
  const res = Object.create(parentVal || null)
  if (childVal) {
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm)
    // 进行继承
    return extend(res, childVal)
  } else {
    return res
  }
}

ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 * watch 必须是纯对象
 */
strats.watch = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  // work around Firefox's Object.prototype.watch...
  if (parentVal === nativeWatch) parentVal = undefined
  if (childVal === nativeWatch) childVal = undefined
  /* istanbul ignore if */
  if (!childVal) return Object.create(parentVal || null)
  if (process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal
  const ret = {}
  extend(ret, parentVal)
  for (const key in childVal) {
    let parent = ret[key]
    const child = childVal[key]
    // 父实例中的option存在不是数组，规范化为数组
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    // watch key可以为数组
    ret[key] = parent
      ? parent.concat(child)
      : Array.isArray(child) ? child : [child]
  }
  return ret
}

/**
 * Other object hashes.
 * props,methods,inject，computed 的值必须是纯对象
 */
strats.props =
  strats.methods =
  strats.inject =
  strats.computed = function (
    parentVal: ?Object,
    childVal: ?Object,
    vm?: Component,
    key: string
  ): ?Object {
    // 
    if (childVal && process.env.NODE_ENV !== 'production') {
      assertObjectType(key, childVal, vm)
    }
    // 判断是否存在继承父类，否则直接返回组件本身定义
    if (!parentVal) return childVal
    const ret = Object.create(null)
    extend(ret, parentVal)
    if (childVal) extend(ret, childVal)
    return ret
  }
strats.provide = mergeDataOrFn

/**
 * 默认策略
 * Default strategy.
 * @param {} parentVal 组件构造函数的options的指定key的值
 * @param {} childVal 组件的options的指定key的值
 */
const defaultStrat = function (parentVal: any, childVal: any): any {
  // 组件的option，值，不存在，返回父级的
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * 验证组件名称是否合法
 * Validate component names
 * @param {} options
 */
function checkComponents(options: Object) {
  // 遍历选项中components属性（注册组件集合
  /**
   * 根组件中没有注册组件
   */
  for (const key in options.components) {
    // 验证组件名称
    validateComponentName(key)
  }
}

/**
 * 组件名称规则
 * @param {*} name 
 */
export function validateComponentName(name: string) {
  if (!new RegExp(`^[a-zA-Z][\\-\\.0-9_${unicodeRegExp.source}]*$`).test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'should conform to valid custom element name in html5 specification.'
    )
  }
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    )
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 * props值需要时数组或者对象
 */
function normalizeProps(options: Object, vm: ?Component) {
  // 获取属性对象
  const props = options.props
  if (!props) return

  const res = {}
  let i, val, name
  // 数组
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
    // 对象
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  options.props = res
}

/**
 * Normalize all injections into Object-based format
 */
function normalizeInject(options: Object, vm: ?Component) {
  const inject = options.inject
  if (!inject) return
  const normalized = options.inject = {}
  if (Array.isArray(inject)) {
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] }
    }
  } else if (isPlainObject(inject)) {
    for (const key in inject) {
      const val = inject[key]
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
}

/**
 * Normalize raw function directives into object format.
 */
function normalizeDirectives(options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}

// 是否为原生对象类型 object
function assertObjectType(name: string, value: any, vm: ?Component) {
  if (!isPlainObject(value)) {
    warn(
      `Invalid value for option "${name}": expected an Object, ` +
      `but got ${toRawType(value)}.`,
      vm
    )
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
/**
 * 对组件的各个option参数有这合并策略，将继承过来的，Vue构造函数的，都统统合并到当前组件实例下面 vm.$options = {...parent,...child}
 * @param {*} parent 组件的构造函数的option, 在global-api/index.js
 * @param {*} child 组件的option
 * @param {*} vm Vue实例，子实例
 */
export function mergeOptions(
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  // 不是生产环境下
  if (process.env.NODE_ENV !== 'production') {
    // 检查组件的options选项
    checkComponents(child)
  }

  // 函数式组件
  if (typeof child === 'function') {
    child = child.options
  }

  // 正规化 props inject directive
  normalizeProps(child, vm)
  normalizeInject(child, vm)
  normalizeDirectives(child)

  // 在子options中使用继承和混合
  // Apply extends and mixins on the child options,
  // 但是如果他只是一个原生的options对象不是另一个合并调用的结果
  // but only if it is a raw options object that isn't
  // the result of another mergeOptions call.
  // 只合并options有_base属性的
  // Only merged options has the _base property.

  // 非Vue构造函数
  if (!child._base) {
    // 组件继承的父组件
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm)
    }
    // 组件混合的组件配置
    if (child.mixins) {
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm)
      }
    }
  }

  const options = {}
  let key

  // 当前组件的构造函数对象的options
  for (key in parent) {
    // 合并字段
    mergeField(key)
  }
  /**
   * 组件本身的options
   * parent 上没有的options配置参数
   */
  for (key in child) {
    // 构造函数中没有
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  /**
   * 合并字段
   * @param {*} key options中的key
   */
  function mergeField(key) {
    // 根据options的key进行获取合并策略，没在vue options中的key,使用默认的策略
    // 获取策略函数
    const strat = strats[key] || defaultStrat
    // 调用策略进行合并
    /**
     * parent[key] 主要是组件的继承组件或者组件的混合元素
     * child[key]组件本身的options参数
     * vm组件实例
     * key组件的options以及Vue的options
     */
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 * 解析资产（ component,directive,filter
 * @param {} options 组件的配置项
 * @param {}  type 资产类型 
 * @param {} id 资产名称
 * @param {} warnMissing 警告缺失
 */
export function resolveAsset(
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  // 资产名称不是字符串，直接返回
  if (typeof id !== 'string') {
    return
  }
  // 获取组件中的资产
  const assets = options[type]
  // check local registration variations first
  /**
   * 1. id为tag，为components对象的key,如果组件的components对象有这个key，说明，他是一个组件
   * 2. 调整组件名，再次查找，找到就返回这个组件实例
   */

  //  判断资产中指定名称的属性是否存在，存在直接返回指令对象
  if (hasOwn(assets, id)) return assets[id]
  // 不存在，整理资产名称，再次匹配，返回资产引用

  // 小驼峰化tag名
  const camelizedId = camelize(id)
  // 再次进行判断
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  // 大驼峰化tag名
  const PascalCaseId = capitalize(camelizedId)
  // 再进行验证
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // fallback to prototype chain
  // 组件对象实例 export default 到处对象
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
