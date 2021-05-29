/* @flow */

// 过渡的 进入，离开
import { enter, leave } from '../modules/transition'

// 在根组件内部递归搜索可能的过渡定义
// recursively search for possible transition defined inside the component root
function locateNode (vnode: VNode): VNodeWithData {
  // 组件实例 && 没有data || data对象中没有transition对象
  return vnode.componentInstance && (!vnode.data || !vnode.data.transition)
  //
    ? locateNode(vnode.componentInstance._vnode)
    : vnode
}

export default {
  // 首次指令绑定元素
  bind (el: any, { value }: VNodeDirective, vnode: VNodeWithData) {
    vnode = locateNode(vnode)
    const transition = vnode.data && vnode.data.transition
    const originalDisplay = el.__vOriginalDisplay =
      el.style.display === 'none' ? '' : el.style.display
    if (value && transition) {
      vnode.data.show = true
      enter(vnode, () => {
        el.style.display = originalDisplay
      })
    } else {
      el.style.display = value ? originalDisplay : 'none'
    }
  },

  // 指令绑定的响应式对象属性发生变化
  update (el: any, { value, oldValue }: VNodeDirective, vnode: VNodeWithData) {
    /* istanbul ignore if */
    if (!value === !oldValue) return
    vnode = locateNode(vnode)
    const transition = vnode.data && vnode.data.transition
    if (transition) {
      vnode.data.show = true
      if (value) {
        enter(vnode, () => {
          el.style.display = el.__vOriginalDisplay
        })
      } else {
        leave(vnode, () => {
          el.style.display = 'none'
        })
      }
    } else {
      el.style.display = value ? el.__vOriginalDisplay : 'none'
    }
  },

  // 解绑指令
  unbind (
    el: any,
    binding: VNodeDirective,
    vnode: VNodeWithData,
    oldVnode: VNodeWithData,
    isDestroy: boolean
  ) {
    if (!isDestroy) {
      el.style.display = el.__vOriginalDisplay
    }
  }
}
