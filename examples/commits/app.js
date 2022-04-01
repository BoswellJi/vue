/* global Vue */

const comp1 = {
  template: `
    <div id="component3">
      <slot name="slotone"></slot>
    </div>
  `,
  data() {
    return {};
  },
};

const comp2 = {
  props:{
    arg: Object
  },
  template: `
    <div id="component3" >
      <button @click="change">com2-change</button>
      <input v-model="arg.name" />
    </div>
  `,
  data() {
    return {};
  },
  methods:{
    change(){
      this.$emit('update:arg',!this.arg);
    }
  }
};

const vm = new Vue({
  components: {
    comp1,
    comp2
  },
  filters: {

  },
  provide: {
    Boswell: 'Boswell'
  },
  data: {
    name: {name:22},
    arr: [1, 2, 3]
  },
  watch: {
    currentBranch(newVal) {
      return newVal;
    },
  },
  computed: {
    ageName: {
      get() {
        return this.age + this.name;
      },
    }
  },
  methods: {
    diffOldVnodeChildren() {
      // 先插入vnode的dom，再删除oldVnode的dom
      this.arr = this.arr.reverse();
    },
    change() {
      this.name = !this.name;
    }
  },
});

vm.$mount('#demo');
