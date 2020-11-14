/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving(value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
/**
 * 观察者
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor(value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 数组
      this.observeArray(value)
    } else {
      // 对象
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk(obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray(items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * 通过使用__proto__拦截原型链，来扩充目标对象或者数组
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment(target, src: Object) {
  /* eslint-disable no-proto */
  // 将对象的内部原型属性指向新对象(原型继承)
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * 通过定义隐藏属性，来扩充目标对象或者数组
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
/**
 * 拷贝参数
 * @param {*} target 目标对象
 * @param {*} src 源对象
 * @param {*} keys key集合
 */
function copyAugment(target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    // 给对象定义指定属性,将src上的属性定义到目标对象上(需要观察的对象)
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
/**
 * 1. 依赖收集
 * 2. 避免重复收集依赖
 * 3. 特殊情况的处理， 数组变更怎么触发依赖更新
 * 
 * 1. $watch(观察者是知道正在观察的是哪个字段的)
 * 
 * 观察，在初始化vue的响应式数据系统
 * @param {*} value 组件实例的data属性的值
 * @param {*} asRootData 作为根数据
 */
export function observe(value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    // 对象可以监听的条件
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * obj js对象
 * key 对象属性
 * val 对象值
 * customSetter 自定义set
 * shallow 深浅定义
 */
export function defineReactive(
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 响应式对象的属性,添加依赖对象,通过闭包缓存依赖
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set

  /**
   * 存在getter访问器属性，就不会获取 对象的属性
   * 之后的val就会使undefined
   * 
   * 为什么属性拥有自己的getter时，就不会对其进行深度观测：
   * 1.属性存在getter时，在深度观测之前不会取值，所以，在深度观测语句执行之前取不到属性值，无法深度观测；
   * 2. 之所以在深度观测之前不取值，是因为属性原本的getter是用户定义，用户可能在getter中做任何想不到的事情；
   * 
   * 1.当数据属性只有getter访问器时，在个属性不会被深度检测，但是defineReactive函数处理之后，该属性将拥有get,set，新值将会被观测，这时候就矛盾了
   * 2.拥有setter的属性，即使拥有getter也要获取属性值并观测之
   */
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 属性值为对象，进行观察 shallow（浅的）表示对象是否是深度观测的
  // 子集下的观察者对象
  let childOb = !shallow && observe(val)

  // 重新定义对象属性的描述符，设置 getter setter访问器
  // 在get获取的是否收集依赖（这个对象的属性的依赖）
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    /**
     * 1. 正确的返回属性值
     * 2. 收集这个数据字段下的依赖
     */
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val
      // 依赖的目标，观察者对象（组件的监听器实例， 是否开启依赖收集的开关
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    /**
     * 1. 正确给属性设置新值
     * 2. 触发对应的依赖
     * @param {*} newVal 
     */
    set: function reactiveSetter(newVal) {
      // 获取原值来判断是否值被更改
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        // watch
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 新值是否需要深度观测
      childOb = !shallow && observe(newVal)
      // 通知这个属性的监听器
      dep.notify()
    }
  })
}

/**
 * 设置一个属性给对象，如果这个属性已经不存在，添加新属性并且触发变更通知
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set(target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * 删除一个属性并且在必要时触发变更
 * Delete a property and trigger change if necessary.
 */
export function del(target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray(value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
