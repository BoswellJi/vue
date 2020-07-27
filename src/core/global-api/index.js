/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI(Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 给Vue添加config属性，并修改为只读属性
  Object.defineProperty(Vue, 'config', configDef)
  /**
   * Vue.config.performance
   */

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 显式的可观察api
  // 2.6 explicit observable API
  /**
   * 显式的
   * 将对象改变为响应式对象
   */
  Vue.observable = (obj) => {
    observe(obj)
    return obj
  }

  // Vue的配置对象 === vm.constructor.options
  Vue.options = Object.create(null)
  // 给options添加  components filters directive  组件，过滤器，指令
  //组件中的注册组件，局部过滤器，局部指令
  /**
    {
      components:{},
      filters:{},
      directives:{}
    }
   */
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  // 指向自己的_base
  Vue.options._base = Vue

  // 内置组件添加到到全局配置
  /**
   * keep-alive
   * transition
   * transitin-group
   */
  extend(Vue.options.components, builtInComponents)

  initUse(Vue)
  initMixin(Vue)
  initExtend(Vue)
  initAssetRegisters(Vue)
}
