/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  /**
   * 混合对象
   * @param {} mixin 
   */
  Vue.mixin = function (mixin: Object) {
    // Vue.options的选项混入指定的对象
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
