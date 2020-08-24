/* @flow */

// 给单个元素和组件提供过度支持
// Provides transition support for a single element/component.
// 支持的过度模式 渐出渐入/渐入渐出
// supports transition mode (out-in / in-out)

import { warn } from 'core/util/index'
import { camelize, extend, isPrimitive } from 'shared/util'
import {
  mergeVNodeHook,
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
function getRealChild(vnode: ?VNode): ?VNode {
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
 * 获取transition组件的属性和监听函数
 */
export function extractTransitionData(comp: Component): Object {
  const data = {}
  // 获取组件的选项
  const options: ComponentOptions = comp.$options
  // props 获取属性对象，组件出入的属性 {name:'',css:'',mode:''}
  for (const key in options.propsData) {
    data[key] = comp[key]
  }
  // events.
  // 提取事件监听器并且通过他们直接来过渡方法
  // extract listeners and pass them directly to the transition methods
  // 获取父vnode监听器函数集合,父组件中，定义的 绑定事件 @click="clickFn"
  const listeners: ?Object = options._parentListeners
  // 将监听对象添加到过渡数据中
  for (const key in listeners) {
    data[camelize(key)] = listeners[key]
  }
  return data
}

/**
 * 占位符
 * @param {*} h 创建vnode的函数
 * @param {*} rawChild 子vnode
 */
function placeholder(h: Function, rawChild: VNode): ?VNode {
  // 组件的tag:  7-keep-alive
  if (/\d-keep-alive$/.test(rawChild.tag)) {
    // 创建keep-alive组件vnode
    return h('keep-alive', {
      props: rawChild.componentOptions.propsData
    })
  }
}

/**
 * 父组件时过度组件
 * @param {*} vnode 
 */
function hasParentTransition(vnode: VNode): ?boolean {
  while ((vnode = vnode.parent)) {
    if (vnode.data.transition) {
      return true
    }
  }
}

function isSameChild(child: VNode, oldChild: VNode): boolean {
  return oldChild.key === child.key && oldChild.tag === child.tag
}

// 不是文本节点
const isNotTextNode = (c: VNode) => c.tag || isAsyncPlaceholder(c)

// 指令实例的name判断，是否为show
const isVShowDirective = d => d.name === 'show'

/**
 * 过渡动画完成后，会将过渡
 */
export default {
  name: 'transition',
  props: transitionProps,
  abstract: true,

  render(h: Function) {
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
    // 只能放单个元素
    if (process.env.NODE_ENV !== 'production' && children.length > 1) {
      warn(
        '<transition> can only be used on a single element. Use ' +
        '<transition-group> for lists.',
        this.$parent
      )
    }

    const mode: string = this.mode

    // warn invalid mode 验证模式
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

    // 如果这是一个组件根节点并且组件的父容器节点页有transtion，跳过。
    // if this is a component root node and the component's
    // parent container node also has transition, skip.
    if (hasParentTransition(this.$vnode)) {
      return rawChild
    }

    // 应用过渡数据到子节点，使用getRealChild()方法来忽略抽象组件，例如keep-alive
    // apply transition data to child
    // use getRealChild() to ignore abstract components e.g. keep-alive
    const child: ?VNode = getRealChild(rawChild)
    /* istanbul ignore if */
    if (!child) {
      return rawChild
    }

    // 正在离开
    if (this._leaving) {
      // 获取展位节点
      return placeholder(h, rawChild)
    }

    // 确保vnode类型和这个过渡组件实例有唯一的key
    // 这个key被用来在 entering 期间 删除 pending leaving 节点
    // ensure a key that is unique to the vnode type and to this transition
    // component instance. This key will be used to remove pending leaving nodes
    // during entering.
    // 唯一id
    const id: string = `__transition-${this._uid}-`
    // 组件的key的设置
    child.key = child.key == null
      ? (child.isComment
        ? id + 'comment'
        : id + child.tag)
      : (isPrimitive(child.key)
        ? (String(child.key).indexOf(id) === 0 ? child.key : id + child.key)
        : child.key)

    //  子vnode的data，添加transtion过渡属性
    /**
     * {
     *   transition:{name:''}
     * }
     * 
     */
    // 获取
    const data: Object = (child.data || (child.data = {})).transition = extractTransitionData(this)
    // 获取组件实例的vnode
    const oldRawChild: VNode = this._vnode
    // 获取真实组件的vnode
    const oldChild: VNode = getRealChild(oldRawChild)

    // mark v-show 标记 v-show
    // 以至于过渡模块能够交出对指令的控制
    // so that the transition module can hand over the control to the directive
    // 子节点存在指令 && 存在show指令
    /**
     * { name:'指令名v-name', rawName:'全称v-rawName', value:'表达式的值', expression:'表达式' }
     */
    if (child.data.directives && child.data.directives.some(isVShowDirective)) {
      // 将子vnode标记为show
      child.data.show = true
    }

    if (
      // old vnode
      oldChild &&
      // old vnode的data属性
      oldChild.data &&
      // 不同相同的vnode
      !isSameChild(child, oldChild) &&
      // 不同的异步占位符
      !isAsyncPlaceholder(oldChild) &&
      // #6687 component root is a comment node
      // 组件根是一个注释节点
      // 非组件实例 && 非注释节点
      !(oldChild.componentInstance && oldChild.componentInstance._vnode.isComment)
    ) {
      // 使用新鲜数据替换老的子vnode过渡数据
      // replace old child transition data with fresh one
      // 动态过渡是重要的
      // important for dynamic transitions!
      // 替换老过渡数据
      const oldData: Object = oldChild.data.transition = extend({}, data)
      // 处理过渡模式
      // handle transition mode（渐入
      if (mode === 'out-in') {
        // 返回占位符节点 和 当离开完成时的队列更新 
        // return placeholder node and queue update when leave finishes
        this._leaving = true
        // 离开后
        mergeVNodeHook(oldData, 'afterLeave', () => {
          this._leaving = false
          this.$forceUpdate()
        })
        // 占位符
        return placeholder(h, rawChild)
        // 渐出
      } else if (mode === 'in-out') {
        // 是异步占位符
        if (isAsyncPlaceholder(child)) {
          return oldRawChild
        }
        let delayedLeave
        // 执行离开
        const performLeave = () => { delayedLeave() }
        // 合并vnode钩子函数
        mergeVNodeHook(data, 'afterEnter', performLeave)
        mergeVNodeHook(data, 'enterCancelled', performLeave)
        mergeVNodeHook(oldData, 'delayLeave', leave => { delayedLeave = leave })
      }
    }

    return rawChild
  }
}
