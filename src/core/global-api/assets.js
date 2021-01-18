/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * 创建资产注册方法
   * Create asset registration methods.
   * filter
   * directive
   * component
   */
  ASSET_TYPES.forEach(type => {
    /**
     * 全局定义
     * id 名称
     * definition 函数
     */
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        // Vue.options中的配置
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        if (type === 'component' && isPlainObject(definition)) {
          // 自定义组件名优先，选选项为普通对象
          definition.name = definition.name || id
          // Vue === this.options._base
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // {components:{ appCom: function(){  } }}
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
