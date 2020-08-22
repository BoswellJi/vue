/* @flow */

import VNode from '../vnode'
import { createFnInvoker } from './update-listeners'
import { remove, isDef, isUndef, isTrue } from 'shared/util'

/**
 * 合并vnode钩子函数
 * @param {*} def 普通对象，vnode的data对象
 * @param {*} hookKey 钩子键
 * @param {*} hook 钩子函数
 */
export function mergeVNodeHook (def: Object, hookKey: string, hook: Function) {
//  def 为 Vnode 实例
  if (def instanceof VNode) {
    // 获取他的钩子函数，有返回，没有初始化空对象
    def = def.data.hook || (def.data.hook = {})
  }
  // 调用者
  let invoker
  // 获取指定的钩子函数
  const oldHook = def[hookKey]

  // 包装钩子函数
  function wrappedHook () {
    // 调用钩子函数
    hook.apply(this, arguments)
    // 重要：删除合并钩子来保证它只被调用一次以及组织内存泄露
    // important: remove merged hook to ensure it's called only once
    // and prevent memory leak
    remove(invoker.fns, wrappedHook)
  }

  // 钩子函数没有被定义
  if (isUndef(oldHook)) {
    // no existing hook 不存在钩子
    invoker = createFnInvoker([wrappedHook])
  } else {
    /* istanbul ignore if */
    // 是否是被定义 ** 是否是真值
    if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
      // 一个被合并的调用者
      // already a merged invoker
      invoker = oldHook
      invoker.fns.push(wrappedHook)
    } else {
      // existing plain hook
      invoker = createFnInvoker([oldHook, wrappedHook])
    }
  }

  invoker.merged = true
  def[hookKey] = invoker
}
