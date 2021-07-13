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

## Vue的运行时

* 核心运行时
  - 依赖收集与更新系统
  - virtual dom系统

* 平台运行时

## patch

* 核心逻辑为vnode的同层比较；
* 完全相同的vnode才会去深度比较内部vnode;
* diff的核心逻辑updateChildren;
* 期间vnode为component时，会调用vnode的init hook，的vm.$mount;
* createElm（元素，注释，文本
  - 组件/元素createChildren
    - 遍历child vnode创建createElm

## 响应式

- 组件中响应式属性发生变化时，会通知响应式属性的 watcher,会重新渲染 vnode,也就是执行 render,patch 函数;
- 一次只有一个 watcher 被执行；
- 一个组件模板中多个响应式属性的 dep 的 Watcher 都是同一个；
- 一个 watcher 有多个响应式属性的 Dep 实例(组件本身响应式属性；

## 组件化

- 模板编译到 render 函数执行创建 render 函数创建 vnode 元素；
- createElement->createComponent(构造子类/组件 Vue.extend({...options})，安装组件钩子函数，实例化vnode);
- 通过模板来创建树状的 vnode；

- 流程：
  - vm._render()->h/createElement->createComponent->Vue.extend(...)`mergeOptions()->installComponentHooks(vnode的hook)->vnode`->vm._update()->vm._patch_()`createElem,patchVnode`，从createElement会重新执行；

## render function只要依赖发生变化就会重新调用

## computed option

