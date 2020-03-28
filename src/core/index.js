import Vue from './instance/index'  // Vue
import { initGlobalAPI } from './global-api/index' //全局api初始化
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

/**
 * 给Vue构造函数添加静态方法和属性
 */
initGlobalAPI(Vue)

// 给Vue构造函数添加原型属性
// 只读
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

// 只读类型原型属性
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

Vue.version = '__VERSION__'

export default Vue
