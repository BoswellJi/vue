/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  /**
   * @param {} mixin
   */
  Vue.mixin = function (mixin: Object) {
    // 将混合对象混到Vue构造函数对象上去，之后的组件初始化，会执行自己的options合并，会将Vue的options合到自己的组件实例上；
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
