/* @flow */

import config from '../config'
import { warn } from './debug'
import { inBrowser, inWeex } from './env'
import { isPromise } from 'shared/util'
import { pushTarget, popTarget } from '../observer/dep'

export function handleError (err: Error, vm: any, info: string) {
  // Deactivate deps tracking while processing error handler to avoid possible infinite rendering.
  // See: https://github.com/vuejs/vuex/issues/1505
  // 在处理错误处理的时候，为了避免可能会无限渲染，所以废弃依赖追踪功能
  pushTarget()
  try {
    // 组件实例
    if (vm) {
      // 保存组件实例的引用
      let cur = vm
      // 遍历查找组件的父组件，知道最顶层
      while ((cur = cur.$parent)) {
        // 父组件的选项中获取错误捕获方法
        const hooks = cur.$options.errorCaptured
        // 存在错误捕获钩子函数
        if (hooks) {
          // 遍历钩子函数
          for (let i = 0; i < hooks.length; i++) {
            try {
              // 调用钩子函数
              const capture = hooks[i].call(cur, err, vm, info) === false
              if (capture) return
            } catch (e) {
              // 兜底错误处理
              globalHandleError(e, cur, 'errorCaptured hook')
            }
          }
        }
      }
    }
    globalHandleError(err, vm, info)
  } finally {
    // 启用依赖追踪
    popTarget()
  }
}

/**
 * 
 * @param {*} handler 函数
 * @param {*} context 上下文
 * @param {*} args 参数
 * @param {*} vm 组件实例
 * @param {*} info 钩子函数
 */
export function invokeWithErrorHandling (
  handler: Function,
  context: any,
  args: null | any[],
  vm: any,
  info: string
) {
  let res
  try {
    // 调用函数获取返回值
    res = args ? handler.apply(context, args) : handler.call(context)
    // 返回的不是Vue对象是Promise对象，并且没有被处理过
    if (res && !res._isVue && isPromise(res) && !res._handled) {
      // 添加异常捕获
      res.catch(e => handleError(e, vm, info + ` (Promise/async)`))
      // issue #9511
      // avoid catch triggering multiple times when nested calls
      // 标记为已处理
      res._handled = true
    }
  } catch (e) {
    handleError(e, vm, info)
  }
  return res
}

/**
 * 全局异常处理
 * @param {Error} err 错误对象
 * @param {*} vm 组件实例
 * @param {*} info 自定义错误信息
 */
function globalHandleError (err, vm, info) {
  // 开启了错误处理
  if (config.errorHandler) {
    try {
      // 调用错误处理
      return config.errorHandler.call(null, err, vm, info)
    } catch (e) {
      // if the user intentionally throws the original error in the handler,
      // do not log it twice
      if (e !== err) {
        logError(e, null, 'config.errorHandler')
      }
    }
  }
  logError(err, vm, info)
}

/**
 * 错误日志
 * @param {*} err 错误对象
 * @param {*} vm 组件实例
 * @param {*} info 自定义错误信息
 */
function logError (err, vm, info) {
  // 开发环境中
  if (process.env.NODE_ENV !== 'production') {
    // 输出警告信息
    warn(`Error in ${info}: "${err.toString()}"`, vm)
  }
  /* istanbul ignore else */
  // 在浏览器或者weex中并且console对象不为undefined
  if ((inBrowser || inWeex) && typeof console !== 'undefined') {
    // 打印错误日志
    console.error(err)
  } else {
    // 其他环境直接抛出错误给到js引擎
    throw err
  }
}
