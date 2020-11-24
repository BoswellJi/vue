/* @flow */

import { isRegExp, remove } from 'shared/util'
import { getFirstComponentChild } from 'core/vdom/helpers/index'

type VNodeCache = { [key: string]: ?VNode };

/**
 * 获取组件名称
 * @param {*} opts 组件选项
 */
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
  if (Array.isArray(pattern)) {
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    return pattern.split(',').indexOf(name) > -1
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

/**
 * 减少缓存条目
 * @param {*} cache 缓存组件集合
 * @param {*} key 缓存的key
 * @param {*} keys 缓存的key集合
 * @param {*} current 当前组件vnode
 */
function pruneCacheEntry (
  cache: VNodeCache,
  key: string,
  keys: Array<string>,
  current?: VNode
) {
  const cached = cache[key]
  // 是否为 缓存对象 && 当前的组件实例跟缓存中的不同
  if (cached && (!current || cached.tag !== current.tag)) {
    // 销魂组件
    cached.componentInstance.$destroy()
  }
  cache[key] = null
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
    const slot = this.$slots.default
    const vnode: VNode = getFirstComponentChild(slot)
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
    if (componentOptions) {
      // check pattern
      const name: ?string = getComponentName(componentOptions)
      const { include, exclude } = this
      // 没在缓存条件中，直接返回组件
      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        return vnode
      }
      const { cache, keys } = this

      // 缓存的key
      const key: ?string = vnode.key == null
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key
        // 已经存在缓存中
      if (cache[key]) {
        vnode.componentInstance = cache[key].componentInstance
        // make current key freshest  
        remove(keys, key)
        // 添加到数组的末尾,作为最新的组件
        keys.push(key)
      } else {
        cache[key] = vnode
        // 作为最新的组件
        keys.push(key)
        // prune oldest entry 
        // 修剪最老的条目,根据缓存上限来修剪缓存条目
        // 最大缓存数量 && keys大于了最大缓存数量
        if (this.max && keys.length > parseInt(this.max)) {
          // 修剪缓存条目，最新的放到末尾，最老的开始位置
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
      }
      vnode.data.keepAlive = true
    }
    // vnode || slot[0]
    return vnode || (slot && slot[0])
  }
}
