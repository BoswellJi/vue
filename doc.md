## const app = new Vue()

* _init()

## app.$mount()

* new Watcher()
  - 直接调用updateComponent,在Watcher中执行组件的渲染
    - patch
      - createElement
        - createComponent
          - Vue.extend()
          - 创建vue-component-id-name的vnode

## patch

* 核心逻辑为vnode的同层比较；
* 完全相同的vnode才会去深度比较内部vnode;
* diff的核心逻辑updateChildren;
* 期间vnode为component时，会调用vnode的init hook，的vm.$mount;

* createElm
  - createComponent
  - createElement

* patchVnode
  - updateChildren: vnode的child vnode不同，需要再进行比对
  - addVnodes：oldVnodeChild不存在，直接添加
  - removeVnodes：newVnodeChild不存在，直接删除

## 双向数据绑定（MVVM模式

- 只能通过修改model来更新view,触发view事件来修改model
- **一个组件模板中多个响应式属性的 dep 的 Watcher 都是同一个**；
- 一个 watcher 有多个响应式属性的 Dep 实例(组件本身响应式属性；
- **一个响应式属性的依赖可能存在多个Watcher中，每个依赖就是一个Watcher**;

## 组件化

- 模板编译到 render 函数执行创建 render 函数创建 vnode 元素；
- createElement->createComponent(构造子类/组件 Vue.extend({...options})，安装组件钩子函数，实例化vnode);
- 通过模板来创建树状的 vnode；

- 流程：
  - vm._render()->h/createElement->createComponent->Vue.extend(...)`mergeOptions()->installComponentHooks(vnode的hook)->vnode`->vm._update()->vm._patch_()`createElem,patchVnode`，从createElement会重新执行；

## render function只要依赖发生变化就会重新调用

## computed option

* 会new Watcher对computed中的响应式属性进行监听，没有变化就会使用上次缓存的值，变化了重新执行并缓存下来；

## nextTick

## keep-alive

## transition

## transition-group



