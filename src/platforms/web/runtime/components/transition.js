/* @flow */

// 给单个元素和组件提供过度支持
// Provides transition support for a single element/component.
// 支持的过度模式 渐出渐入/渐入渐出
// supports transition mode (out-in / in-out)

import { warn } from 'core/util/index'
import { camelize, extend, isPrimitive } from 'shared/util'
import {
  mergeVNodeHook,
  isAsyncPlaceholder,
  getFirstComponentChild
} from 'core/vdom/helpers/index'

// 过度属性
export const transitionProps = {
  name: String,
  appear: Boolean,
  css: Boolean,
  mode: String,
  type: String,
  enterClass: String,
  leaveClass: String,
  enterToClass: String,
  leaveToClass: String,
  enterActiveClass: String,
  leaveActiveClass: String,
  appearClass: String,
  appearActiveClass: String,
  appearToClass: String,
  duration: [Number, String, Object]
}

// 在案例中,子类还是一个抽象组件,例如<keep-alive>
// in case the child is also an abstract component, e.g. <keep-alive>
// 我们想要递归检索真实的组件来渲染
// we want to recursively retrieve the real component to be rendered
function getRealChild (vnode: ?VNode): ?VNode {
  // vnode && 组件的选项
  const compOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
  // 存在 && 符组件也是抽象组件
  if (compOptions && compOptions.Ctor.options.abstract) {
    // 重新获取真实的组件
    return getRealChild(getFirstComponentChild(compOptions.children))
  } else {
    // 当前组件的vnode
    return vnode
  }
}

/**
 * 提取过渡数据
 * @param {*} comp 组件实例
 */
export function extractTransitionData (comp: Component): Object {
  const data = {}
  // 获取组件的选项
  const options: ComponentOptions = comp.$options
  // props 获取属性对象
  for (const key in options.propsData) {
    data[key] = comp[key]
  }
  // events.
  // 提取事件监听器并且通过他们直接来过渡方法
  // extract listeners and pass them directly to the transition methods
  const listeners: ?Object = options._parentListeners
  for (const key in listeners) {
    data[camelize(key)] = listeners[key]
  }
  return data
}

/**
 * 占位符
 * @param {*} h 创建vnode的函数
 * @param {*} rawChild 
 */
function placeholder (h: Function, rawChild: VNode): ?VNode {
  // 组件的tag: 数字-keep-alive 模式
  if (/\d-keep-alive$/.test(rawChild.tag)) {
    // 创建keep-alive
    return h('keep-alive', {
      props: rawChild.componentOptions.propsData
    })
  }
}

/**
 * 父组件时过度组件
 * @param {*} vnode 
 */
function hasParentTransition (vnode: VNode): ?boolean {
  while ((vnode = vnode.parent)) {
    if (vnode.data.transition) {
      return true
    }
  }
}

function isSameChild (child: VNode, oldChild: VNode): boolean {
  return oldChild.key === child.key && oldChild.tag === child.tag
}

const isNotTextNode = (c: VNode) => c.tag || isAsyncPlaceholder(c)

const isVShowDirective = d => d.name === 'show'

export default {
  name: 'transition',
  props: transitionProps,
  abstract: true,

  render (h: Function) {
    // 获取插槽中组件.元素的vnode
    let children: any = this.$slots.default
    if (!children) {
      return
    }

    // 过滤空白字符,或者是纯字符
    // filter out text nodes (possible whitespaces)
    children = children.filter(isNotTextNode)
    /* istanbul ignore if */
    if (!children.length) {
      return
    }

    // warn multiple elements
    if (process.env.NODE_ENV !== 'production' && children.length > 1) {
      warn(
        '<transition> can only be used on a single element. Use ' +
        '<transition-group> for lists.',
        this.$parent
      )
    }

    const mode: string = this.mode

    // warn invalid mode
    if (process.env.NODE_ENV !== 'production' &&
      mode && mode !== 'in-out' && mode !== 'out-in'
    ) {
      warn(
        'invalid <transition> mode: ' + mode,
        this.$parent
      )
    }

    // 获取第一个组件的vnode
    const rawChild: VNode = children[0]

    // 已经存在父transition组件
    // if this is a component root node and the component's
    // parent container node also has transition, skip.
    if (hasParentTransition(this.$vnode)) {
      return rawChild
    }

    // apply transition data to child
    // use getRealChild() to ignore abstract components e.g. keep-alive
    const child: ?VNode = getRealChild(rawChild)
    /* istanbul ignore if */
    if (!child) {
      return rawChild
    }

    if (this._leaving) {
      return placeholder(h, rawChild)
    }

    // ensure a key that is unique to the vnode type and to this transition
    // component instance. This key will be used to remove pending leaving nodes
    // during entering.
    const id: string = `__transition-${this._uid}-`
    child.key = child.key == null
      ? child.isComment
        ? id + 'comment'
        : id + child.tag
      : isPrimitive(child.key)
        ? (String(child.key).indexOf(id) === 0 ? child.key : id + child.key)
        : child.key

    const data: Object = (child.data || (child.data = {})).transition = extractTransitionData(this)
    const oldRawChild: VNode = this._vnode
    const oldChild: VNode = getRealChild(oldRawChild)

    // mark v-show
    // so that the transition module can hand over the control to the directive
    if (child.data.directives && child.data.directives.some(isVShowDirective)) {
      child.data.show = true
    }

    if (
      oldChild &&
      oldChild.data &&
      !isSameChild(child, oldChild) &&
      !isAsyncPlaceholder(oldChild) &&
      // #6687 component root is a comment node
      !(oldChild.componentInstance && oldChild.componentInstance._vnode.isComment)
    ) {
      // replace old child transition data with fresh one
      // important for dynamic transitions!
      const oldData: Object = oldChild.data.transition = extend({}, data)
      // handle transition mode
      if (mode === 'out-in') {
        // return placeholder node and queue update when leave finishes
        this._leaving = true
        mergeVNodeHook(oldData, 'afterLeave', () => {
          this._leaving = false
          this.$forceUpdate()
        })
        return placeholder(h, rawChild)
      } else if (mode === 'in-out') {
        if (isAsyncPlaceholder(child)) {
          return oldRawChild
        }
        let delayedLeave
        const performLeave = () => { delayedLeave() }
        mergeVNodeHook(data, 'afterEnter', performLeave)
        mergeVNodeHook(data, 'enterCancelled', performLeave)
        mergeVNodeHook(oldData, 'delayLeave', leave => { delayedLeave = leave })
      }
    }

    return rawChild
  }
}
