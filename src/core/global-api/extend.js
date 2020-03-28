/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   * @param {Object} extendOptions 子类
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {} // 子类属性
    const Super = this // 构造函数
    const SuperId = Super.cid // 构造函数的静态属性cid
    // 给子类添加 _Ctor 属性
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {}) 
    // 缓存构造函数
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }
    // 获取实例的name属性
    const name = extendOptions.name || Super.options.name
    // 非生产环境进程，进行组件名称验证
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }

    // 子类
    const Sub = function VueComponent (options) {
      this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype) // 原型继承，Vue.prototype
    Sub.prototype.constructor = Sub // 纠正子类的构造函数指向
    Sub.cid = cid++  // 新增子类id(每个子类都一个id)
    // Vue子类的options
    // 不是子类实例组件的options
    // 实例组件的opions在 init.js中进行处理
    Sub.options = mergeOptions(
      Super.options, // 父构造函数的静态属性options
      extendOptions // 自身options
    )
    Sub['super'] = Super //子类指向父类的索引

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    // 子类存在props属性
    if (Sub.options.props) {
      initProps(Sub)
    }
    // 子类存在computed属性
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    // 子类也具备继承，混合，插件
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    // 子类也具有父类的资产类型
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    // 将父类的options给子类的superOptions
    Sub.superOptions = Super.options
    // 子类自身的options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    // 父类的cid保存子类
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
