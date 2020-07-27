import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

/**
 * Vue构造函数
 * @param {Object} options 构造函数参数
 */
function Vue (options) {
  // 进程环境变量，this 不是Vue实例，抛异常
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    // Vue是一个构造函数 并且 必须使用new关键字调用
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}


// 给Vue添加原型方法

/**
 * 定义_init 
 */
initMixin(Vue)
/**
 * 给Vue.prototype 定义方法,属性  $data,$props,$set,$delete,$watch
 */
stateMixin(Vue)
/**
 * 定义自定义事件系统, $on $once $off $emit
 */
eventsMixin(Vue)
/**
 * 定义组件更新,强迫更新,销毁方法
 */
lifecycleMixin(Vue)
/**
 * $nextTick _render
 */
renderMixin(Vue)

export default Vue
