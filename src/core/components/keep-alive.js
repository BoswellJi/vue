/* @flow */

import { isRegExp, remove } from 'shared/util'
import { getFirstComponentChild } from 'core/vdom/helpers/index'

type VNodeCache = { [key: string]: ?VNode };

function getComponentName (opts: ?VNodeComponentOptions): ?string {
  // 组件选项定义的组件名称, || vnode中的tag属性
  return opts && (opts.Ctor.options.name || opts.tag)
}

/**
 * 匹配
 * @param {*} pattern keep-alive组件的属性 include,exclude属性值
 * @param {*} name 组件名称
 */
function matches (pattern: string | RegExp | Array<string>, name: string): boolean {
  // 数组
  if (Array.isArray(pattern)) {
    // 在数组里查看当前组件名称
    return pattern.indexOf(name) > -1
    // 字符串
  } else if (typeof pattern === 'string') {
    return pattern.split(',').indexOf(name) > -1
    // 正则对象
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}

/**
 * 修剪缓存,组件include,exclude属性修改后
 * @param {*} keepAliveInstance 
 * @param {*} filter 
 */
function pruneCache (keepAliveInstance: any, filter: Function) {
  const { cache, keys, _vnode } = keepAliveInstance
  for (const key in cache) {
    const cachedNode: ?VNode = cache[key]
    if (cachedNode) {
      const name: ?string = getComponentName(cachedNode.componentOptions)
      // 名字存在 && 但是没有匹配到,组件不存在
      if (name && !filter(name)) {
        // 裁剪缓存条目
        pruneCacheEntry(cache, key, keys, _vnode)
      }
    }
  }
}

function pruneCacheEntry (
  cache: VNodeCache,
  key: string,
  keys: Array<string>,
  current?: VNode
) {
  // 获取缓存对象
  const cached = cache[key]
  // 缓存对象 && 当前的组件实例跟缓存中的不同
  if (cached && (!current || cached.tag !== current.tag)) {
    // 销毁缓存中的组件
    cached.componentInstance.$destroy()
  }
  // 将缓存中对应的组件设置为null
  cache[key] = null
  // 删除key
  remove(keys, key)
}

const patternTypes: Array<Function> = [String, RegExp, Array]

export default {
  name: 'keep-alive',
  abstract: true,

  props: {
    include: patternTypes,
    exclude: patternTypes,
    max: [String, Number]
  },

  created () {
    this.cache = Object.create(null)
    this.keys = []
  },

  destroyed () {
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted () {
    this.$watch('include', val => {
      pruneCache(this, name => matches(val, name))
    })
    this.$watch('exclude', val => {
      pruneCache(this, name => !matches(val, name))
    })
  },

  render () {
    // 获取插槽默认组件,组件vnode
    const slot = this.$slots.default
    // 获取组件的第一个子组件的vnode
    const vnode: VNode = getFirstComponentChild(slot)
    // 获取组件选项
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
    if (componentOptions) {
      // check pattern
      const name: ?string = getComponentName(componentOptions)
      // 获取属性
      const { include, exclude } = this
      if (
        // not included
        // 属性存在,组件名不存在 || include属性中没有这个组件名 || exclude && name && 匹配到name
        // 说明这个组件不应该在keep-alive组件中,直接返回组件本身
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        return vnode
      }
      // 获取缓存和keys
      const { cache, keys } = this

      const key: ?string = vnode.key == null
      // 相同的构造器可能注册作为不同的本地组件,所以cid是不够的
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key
        // 缓存中是否存在这个组件实例
      if (cache[key]) {
        // 获取组件实例
        vnode.componentInstance = cache[key].componentInstance
        // make current key freshest 使得当前key最新 rul
        // 将缓存key集合中的删除后,
        remove(keys, key)
        // 添加到数组的末尾,作为最新的使用的组件
        keys.push(key)
      } else {
        // 将组件vnode添加到缓存中
        cache[key] = vnode
        // 作为最新的组件
        keys.push(key)
        // prune oldest entry 修剪最老的条目,根据缓存上限来修剪缓存条目
        // 最大缓存数量 && keys大于了最大缓存数量
        if (this.max && keys.length > parseInt(this.max)) {
          // 修剪缓存条目, 缓存, 最老的元素, key集合
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
      }
      // 给组件添加keepAlive的标识
      vnode.data.keepAlive = true
    }
    // vnode || slot[0]
    return vnode || (slot && slot[0])
  }
}
