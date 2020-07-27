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

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * 观察者类，被依附到每一个被观察者对象
 * Observer class that is attached to each observed
 * 一旦依附，观察者转换目标对象的属性key到getter/setter收集依赖和触发更新
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  // vms的数量，有这些对象作为根数据
  vmCount: number; // number of vms that have this object as root $data

  // 需要转变为响应式对象的对象
  constructor (value: any) {
    // 数组或者对象
    this.value = value
    //对象或者数组的依赖
    this.dep = new Dep()
    this.vmCount = 0
    // 给对象定义__ob__属性标记
    def(value, '__ob__', this)
    // 这个对象是数组,非数组
    if (Array.isArray(value)) {
      // 对象上有__proto__原型属性
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 观测数组
      this.observeArray(value)
    } else {
      // 对象
      this.walk(value)
    }
  }

  /**
   * 遍历所有属性，并且转换他们到getter/setter
   * Walk through all properties and convert them into
   * 只有当值是Object类型时，方法才应该被调用
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    // 每个键， 响应式对象都会生成一个依赖数据对象
    for (let i = 0; i < keys.length; i++) {
      // 给对象的属性定义访问器属性
      defineReactive(obj, keys[i])
    }
  }

  /**
   * 观察数组项目列表
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
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
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
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
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    // 给对象定义指定属性
    def(target, key, src[key])
  }
}

/**
 * 尝试给一个值创建一个观察者实例
 * Attempt to create an observer instance for a value,
 * 如果成功观察，返回新的观察者
 * returns the new observer if successfully observed,
 * 或者如果一个值已经是的化，返回现存的观察者
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
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 不是(非null的对象) || 是VNode
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 有__ob__属性,已经是响应式对象 && __ob__ 属性值为 Observer 实例
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    // 获取观察者对象
    ob = value.__ob__
  } else if (
    // 是否可观测的开关
    shouldObserve &&
    // 非服务端渲染
    !isServerRendering() &&
    // 数组 || 普通对象
    (Array.isArray(value) || isPlainObject(value)) &&
    // 可扩展对象
    Object.isExtensible(value) &&
    // 不是Vue实例，_isVue为Vue实例属性
    !value._isVue
  ) {
    // 创建一个观察者
    // 组件的 data 对象
    ob = new Observer(value)
  }
  // 观察者对象
  if (asRootData && ob) {
    ob.vmCount++
  }
  // 观察者对象
  return ob
}

/**
 * Define a reactive property on an Object.
 * 对象的响应式原理是：设置对象属性的 get set,对对象的属性进行监听
 * 给对象的属性设置get set，这个是可观察者，会有依赖进行监听
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,  // 用户自定义的setter访问器
  shallow?: boolean
) {
  // 给这个响应式对象属性,添加依赖对象,通过闭包缓存依赖
  // 每个数据字段都会有一个 依赖 的框
  const dep = new Dep()

  // 获取当前这个属性描述
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 属性必须是可配置的，否则不可作为响应式属性
  if (property && property.configurable === false) {
    return
  }

  // 保存当前属性的get set 访问器
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
   * 
   * 1.当数据属性只有getter访问器时，在个属性不会被深度检测，但是defineReactive函数处理之后，该属性将拥有get,set，新值将会被观测，这时候就矛盾了
   * 2.拥有setter的属性，即使拥有getter也要获取属性值并观测之
   * 
   */
  // 没有getter 或者只有setter 当前函数参数只有2个，将对象属性值赋给val
  if ((!getter || setter) && arguments.length === 2) {
    // 没有直接传入val,所以需要从对象的属性上进行获取
    val = obj[key]
  }

  // 属性值为对象，进行观察 shallow（浅的）表示对象是否是深度观测的
  // 子集下的观察者对象
  let childOb = !shallow && observe(val)

  // 重新定义对象属性的描述符  ，设置 getter setter访问器
  // 在get获取的是否收集依赖（这个对象的属性的依赖）
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    /**
     * 1. 正确的返回属性值
     * 2. 收集这个数据字段下的依赖
     */
    get: function reactiveGetter () {
      // 获取之前访问器中的值， 不能存在的，直接返回当前值
      const value = getter ? getter.call(obj) : val
      // 依赖的目标，观察者对象（组件的监听器
      if (Dep.target) {
        // 添加依赖，将观察者添加到依赖中
        dep.depend()
        // 子观察者
        if (childOb) {
          // 子观察者中的依赖 dep属性
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
    set: function reactiveSetter (newVal) {
      // 获取旧值
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 新值等于旧值 || 新值不等于新值 && 旧值不等于旧值
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // 这个属性没有setter访问器，
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      // 存在setter
      if (setter) {
        // watch
        // 调用
        setter.call(obj, newVal)
      } else {
        // 不存在，直接赋值
        val = newVal
      }
      // 新值是否需要深度观测
      childOb = !shallow && observe(newVal)
      // 对应响应式属性的依赖容器
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
export function set (target: Array<any> | Object, key: any, val: any): any {
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
export function del (target: Array<any> | Object, key: any) {
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
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
