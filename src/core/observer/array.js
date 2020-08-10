/*
 * 这个文件没有类型检查,因为flow不能处理的很好在数组原型上的动态访问的方法
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

// 可以触发数组变更检测的方法
// 修改数组本身的方法
const methodsToPatch = [
          // 返回值
  'push', // 添加的元素
  'pop',  // 删除的元素
  'shift', // 删除的头部元素
  'unshift', // 添加的头部元素
  'splice', // 截取的元素
  'sort', // 排序后的元素
  'reverse' // 反序后的元素
]

/**
 * 拦截修改方法和发射事件
 * Intercept mutating methods and emit events
 */
// 遍历方法
methodsToPatch.forEach(function (method) {
  // 缓存原始方法
  // cache original method
  const original = arrayProto[method]
  // 给对象,重新定义需要拦截的方法
  def(arrayMethods, method, function mutator (...args) {
    // 调用原始方法处理数组
    const result = original.apply(this, args)
    // 获取对象的观察者对象(this,指得是响应式对象,因为这些方法都会被重新定义到响应式对象上)
    const ob = this.__ob__
    let inserted
    // 只有着三个方法会添加元素
    switch (method) {
      case 'push':
      case 'unshift':
        // args是修改后的数组
        inserted = args
        break
      case 'splice':
        // splice方法参数,从第2位索引开始,才是添加数据,所以要获取添加的数据
        inserted = args.slice(2)
        break
    }
    // 元素存在,进行数据监听,将添加的数据进行观察
    if (inserted) ob.observeArray(inserted)
    // 通知改变
    // notify change
    ob.dep.notify()
    
    return result
  })
})
