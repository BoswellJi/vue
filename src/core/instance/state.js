/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

/**
 * 
 * @param {*} target 组件实例
 * @param {*} sourceKey _data,_prop,私有属性,保存正真的值,通过代理进行 返回
 * @param {*} key 对象属性
 */
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/**
 * 初始化状态
 * @param {*} vm 组件实例
 */
export function initState (vm: Component) {
  // 给组件添加_watchers属性（数组，watcher对象
  vm._watchers = []
  // 组件的配置参数
  const opts = vm.$options
  // 配置参数有输入属性 （props的初始化早于data，所以可以使用props来初始化data的值
  if (opts.props) initProps(vm, opts.props)
  // 配置参数有方法
  if (opts.methods) initMethods(vm, opts.methods)
  // 配置参数有data
  if (opts.data) {
    // data的初始化在，props，methods之后，在computed,watch之前
    // 有用户定义的data,就需要做统一化处理,(最终需要得到，普通对象)
    initData(vm)
  } else {
    // 没有data数据，给一个初始化的空对象
    observe(vm._data = {}, true /* asRootData */)
  }
  // 计算属性
  if (opts.computed) initComputed(vm, opts.computed)
  // 监听属性， watch不能是原生对象
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }
  // 遍历每一个prop属性
  for (const key in propsOptions) {

    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      // 定义响应式数据
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

/**
 * 初始化data方法
 * @param {*} vm 组件实例
 */
function initData (vm: Component) {
  // 选项合并策略中，最终data会成为function,返回值才是真正的data
  let data = vm.$options.data
  // 这个typeof data的检查是有必要的，因为在beforeCreated钩子函数中可以， this.$options.data = {} 修改data的值
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)  // 获取子组件的data
    : data || {}
    // 原生对象，是函数的 非普通对象
  if (!isPlainObject(data)) { 
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  // 获取data的key
  const keys = Object.keys(data)
  // 获取实例中的属性props
  const props = vm.$options.props
  // 获取实例中的方法methods
  const methods = vm.$options.methods
  // 获取data的成员的数量
  let i = keys.length
  // 遍历成员
  while (i--) {
    // 缓存当前成员
    const key = keys[i]
    //以下判断，是为了检查是否重复定义字段

    // 开发阶段屏蔽定义data,字段与method一样
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    // 开发阶段屏蔽定义data,字段与props一样
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) { //开头不是_ &的,_ &这些属于框架保留字符
      // 将data属性代理到vm实例上
      proxy(vm, `_data`, key)
    }
  }
  // observe data 对data 数据进行观察
  // data 对象 
  observe(data, true /* asRootData */)
}

export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    // data 为函数
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

/**
 * 初始化计算属性
 * @param {*} vm 组件实例
 * @param {*} computed 计算属性对象
 */
function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  // 给组件实例添加_computedWatchers属性为{}
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  for (const key in computed) {
    // 获取计算对象的属性值 （getter）
    const userDef = computed[key]
    /**
     * computed:{
     *    attr1:{
     *        get(){}
     *    },
     *    attr2:(){}
     * }
     */
    // 获取计算属性的值为函数， 直接返回， 不为函数，返回get方法
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {
      // 给计算属性创建内部观察者
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // 组件定义的计算属性已经被定义在组件原型上，我们只需要定义实例化时，定义计算属性在
    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    // 组件实例没有定义
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      // 判断是否被定义过
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

/**
 * 代理computed属性到组件实例上
 * @param {*} target 目标对象
 * @param {*} key 键
 * @param {*} userDef 属性的getter
 */
export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  // 是函数
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

function initMethods (vm: Component, methods: Object) {
  // 获取输入属性
  const props = vm.$options.props
  // 遍历定义方法
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    // 将定义的方法添加到组件实例上,绑定this指向
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}

/**
 * 初始化监听器（对像上的每个属性的监听器）
 * @param {*} vm  组件实例
 * @param {*} watch 观察属性
 */
function initWatch (vm: Component, watch: Object) {
  for (const key in watch) {
    /**
     * watch:{
     *  a(val,oldVal){
     *     
     *  },
     *  b:[
     *    ()=>{},
     *  ],
     *  c:{
     *    handler:()=>{}
     *  },
     *  d:'b'
     * }
     */
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

/**
 * 创建监听器
 * @param {*} vm 组件实例
 * @param {*} expOrFn key(观察的key
 * @param {*} handler 观察后的处理函数
 * @param {*} options 
 */
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  // 原生对象
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    //组件实例上的method
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}

export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  // 定义的是Vue实例的原型对象的get  set 方法
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  // 给Vue实例的原型对象 添加 属性
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  /**
   * vm的观察方法
   * 手动添加监听器
   */
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    // 组件 
    const watcher = new Watcher(vm, expOrFn, cb, options)
    // 这里是立即调用watch函数一次
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    // 拆除监听器
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}


/**
 * Vue中添加监听器的几种情况：
 * 
 * 1. 组件实例化时候
 * 2. 手动watch:{name(){}}
 * 3. 组件原型方法$watch方法
 */