/* @flow */

import VNode from '../vnode'
import { createFnInvoker } from './update-listeners'
import { remove, isDef, isUndef, isTrue } from 'shared/util'

/**
 * 合并vnode钩子函数
 * @param {*} def 
 * @param {*} hookKey 
 * @param {*} hook 
 */
export function mergeVNodeHook (def: Object, hookKey: string, hook: Function) {
//  def为vnode的话
  if (def instanceof VNode) {
    // 获取他的钩子函数
    def = def.data.hook || (def.data.hook = {})
  }
  let invoker
  // 获取指定的钩子
  const oldHook = def[hookKey]

  // 包装钩子函数
  function wrappedHook () {
    // 调用钩子函数
    hook.apply(this, arguments)
    // important: remove merged hook to ensure it's called only once
    // and prevent memory leak
    remove(invoker.fns, wrappedHook)
  }

  // 老钩子没有定义
  if (isUndef(oldHook)) {
    // no existing hook
    invoker = createFnInvoker([wrappedHook])
  } else {
    /* istanbul ignore if */
    if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
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
