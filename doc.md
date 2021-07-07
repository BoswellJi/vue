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
