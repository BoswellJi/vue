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
  // 遍历资产类型数组
  ASSET_TYPES.forEach(type => {
    /**
     * 全局定义
     * id 名称
     * definition 
     */
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      // 没有定义参数
      if (!definition) {
        // 返回Vue.options上对应资产的调用
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        // 组件的化，要验证组件名称
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        // 组件
        if (type === 'component' && isPlainObject(definition)) {
          // definition参数为普通对象
          definition.name = definition.name || id
          // Vue === this.options._base
          definition = this.options._base.extend(definition)
        }
        // 指令
        if (type === 'directive' && typeof definition === 'function') {
          // 将definition重新定义
          definition = { bind: definition, update: definition }
        }
        // {components:{ appCom: function(){  } }}
        // 添加到Vue的options对象上
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
