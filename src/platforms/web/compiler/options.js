/* @flow */

import {
  isPreTag,
  mustUseProp,
  isReservedTag,
  getTagNamespace
} from '../util/index'

import modules from './modules/index'
import directives from './directives/index'
import { genStaticKeys } from 'shared/util'
import { isUnaryTag, canBeLeftOpenTag } from './util'

// 编译器基础参数 baseOptions
export const baseOptions: CompilerOptions = {
  expectHTML: true,
  modules,
  directives,
  isPreTag, // 查看标签名是否为pre
  isUnaryTag, // 查看标签名是否是一元的
  mustUseProp, // 一个属性在标签中是否要使用props进行绑定
  canBeLeftOpenTag, // 查看标签虽然不是一元标签，但是可以自己补全闭合
  isReservedTag, // 标签是否是保留标签
  getTagNamespace, // 获取元素标签的命名空间
  staticKeys: genStaticKeys(modules) //生成静态键字符串
}
