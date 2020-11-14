/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import { mark, measure } from '../util/perf'
import { createEmptyVNode } from '../vdom/vnode'
import { updateComponentListeners } from './events'
import { resolveSlots } from './render-helpers/resolve-slots'
import { toggleObserving } from '../observer/index'
import { pushTarget, popTarget } from '../observer/dep'

import {
  warn,
  noop,
  remove,
  emptyObject,
  validateProp,
  invokeWithErrorHandling
} from '../util/index'

// options.parent 的值
export let activeInstance: any = null
export let isUpdatingChildComponent: boolean = false

/**
 * activeInstance 与 preActiveInstance是父子关系
 * @param {*} vm 组件实例
 */
export function setActiveInstance(vm: Component) {
  // 上一个活跃的组件实例
  const prevActiveInstance = activeInstance
  // 新的组件实例
  activeInstance = vm
  return () => {
    activeInstance = prevActiveInstance
  }
}

/**
 * 初始化组件生命周期
 * @param {} vm 组件实例
 */ 
export function initLifecycle (vm: Component) {
  const options = vm.$options

  // locate first non-abstract parent  
  let parent = options.parent // 父类
  // 存在父组件，不是abstract（抽象组件一般不渲染真实dom,并且不出现在父子组件的路径上
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    parent.$children.push(vm)
  }

  vm.$parent = parent
  // 第一个组件为根组件
  vm.$root = parent ? parent.$root : vm

  vm.$children = []
  vm.$refs = {}

  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}

export function lifecycleMixin (Vue: Class<Component>) {
 /**
  * 更新组件,将组件的虚拟节点安装到真实dom中
  * @param {} vnode 组件的vnode vm._render生成
  * @param {} 
  */
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    const prevEl = vm.$el
    // 当前组件的vnode
    const prevVnode = vm._vnode
    
    // 设置当前组件为活跃实例
    const restoreActiveInstance = setActiveInstance(vm)
    // 重新添加新的虚拟节点 vm._vnode 与vm.$vnode 是父子级关系
    // vm._vnode.parent === vm.$vnode
    vm._vnode = vnode 
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
      // initial render
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    // 更新完成 恢复
    restoreActiveInstance()
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }

  // 强迫组件更新
  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

  // 销毁组件，清理内存
  Vue.prototype.$destroy = function () {
    const vm: Component = this
    if (vm._isBeingDestroyed) {
      return
    }

    callHook(vm, 'beforeDestroy')

    vm._isBeingDestroyed = true
    // remove self from parent
    const parent = vm.$parent
    // 父组件实例存在，父组件不是正在被销毁，组件的选项中没有abstract属性
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      // 从父组件中删除，父组件下的所有子组件，vm,组件实例应用
      remove(parent.$children, vm)
    }
    // teardown watchers
    // 卸载watchers,child components listeners
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    // 组件的观察者数量
    let i = vm._watchers.length
    while (i--) {
      // 将没有给观察者卸载
      vm._watchers[i].teardown()
    }
    // remove reference from data ob
    // 冻结对象，不能有观察者
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // call the last hook...
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null)
    // fire destroyed hook
    // 触发组件销毁完成钩子函数
    callHook(vm, 'destroyed')
    // turn off all instance listeners.
    // 组件关闭所有自定义监听函数
    vm.$off()
    // remove __vue__ reference
    // 移除引用
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // 释放循环引用
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}

/**
 * 组件安装,创建监听 Vue实例
 * @param {*} vm Vue构造函数实例
 * @param {*} el 挂在元素（这里时必须为dom节点
 * @param {*} hydrating 
 */
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el
  // 首先找到Vue实例上的render(框架初始化时为Vue构造函数实例，安装子组件为Vue构造函数子类的实例)
  if (!vm.$options.render) {
    // 没有render函数的，初始化为创建一个空的vnode函数
    vm.$options.render = createEmptyVNode
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      // 有模板 && （模板第一个字符不是# || 有el属性 || dom节点
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }

  callHook(vm, 'beforeMount')

  let updateComponent
  /* istanbul ignore if */
  // 开发环境中，配置开启性能，以及mark功能
  // render + update 是同步操作
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`
     
      // console.log('s1');
      // mark(startTag)
      // 调用组件的render函数，生成虚拟节点
      const vnode = vm._render()
      // mark(endTag)
      // measure(`vue ${name} render`, startTag, endTag)
      // mark(startTag)
      // 将vnode渲染为真实dom（到这里组件被安装到真实dom中）这里是diff算法
      // 安装真实dom,为同步安装，递归安装了
      vm._update(vnode, hydrating)
      // mark(endTag)
      // measure(`vue ${name} patch`, startTag, endTag)
      // console.log('s2');
    }
  } else {
    updateComponent = () => {
      const vnode = vm._render()
      vm._update(vnode, hydrating)
    }
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  // 每个安装的组件都会实例化一个监听器（Watcher
  new Watcher(vm, updateComponent, noop, {
    // watch的钩子函数，在渲染真实dom之前执行
    before () {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate')
      }
    },
  }, true /* isRenderWatcher */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}

export function updateChildComponent (
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  const newScopedSlots = parentVnode.data.scopedSlots
  const oldScopedSlots = vm.$scopedSlots
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key)
  )

  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  const needsForceUpdate = !!(
    renderChildren ||               // has new static slots
    vm.$options._renderChildren ||  // has old static slots
    hasDynamicScopedSlot
  )

  vm.$options._parentVnode = parentVnode
  vm.$vnode = parentVnode // update vm's placeholder node without re-render

  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject
  vm.$listeners = listeners || emptyObject

  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false)
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions: any = vm.$options.props // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }

  // update listeners
  listeners = listeners || emptyObject
  const oldListeners = vm.$options._parentListeners
  vm.$options._parentListeners = listeners
  updateComponentListeners(vm, listeners, oldListeners)

  // resolve slots + force update if has children
  if (needsForceUpdate) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false
  }
}

/**
 * @param {*} vm 
 */
function isInInactiveTree (vm) {
  // 从组件自身向上找
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}
/**
 * 使组件活跃 keep-alive中
 * @param {*} vm  组件实例
 * @param {*} direct 
 */
export function activateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    // 直接激活
    vm._directInactive = false
    // 组件不活跃
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  // 是不活跃组件
  if (vm._inactive || vm._inactive === null) {
    // 改为false
    vm._inactive = false
    // 获取子组件，对子组件进行激活
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    // 已被激活
    callHook(vm, 'activated')
  }
}

/**
 * 使组件失去活跃
 * @param {*} vm 
 * @param {*} direct 
 */
export function deactivateChildComponent (vm: Component, direct?: boolean) {
  // 直接失活
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  // 非失活组件
  if (!vm._inactive) {
    // 设置失活
    vm._inactive = true
    
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    callHook(vm, 'deactivated')
  }
}

/**
 * 调用钩子函数
 * @param {*} vm 组件实例
 * @param {*} hook 钩子函数名称
 */
export function callHook (vm: Component, hook: string) {
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget()
  // 组件的选项定义的钩子函数
  const handlers = vm.$options[hook]
  const info = `${hook} hook`

  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info)
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }

  popTarget()
}
