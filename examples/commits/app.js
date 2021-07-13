/* global Vue */

var apiURL = "https://api.github.com/repos/vuejs/vue/commits?per_page=3&sha=";

const component2 = {
  template: `
    <div id="component2">
      <slot></slot>
      <slot name="header" :obj="name"></slot>
      <div @click="click">点击2</div>
    </div>
  `,
  model: {
    prop: 'age',
    event: 'ok'
  },
  props: ["type", "type1"],
  data() {
    return {
      name: "jjj",
      i: 0,
    };
  },
  methods: {
    click() {
      this.$emit('ok', this.i++);
    },
  },
};

const component3 = {
  template: `
    <div id="component2">
      component3
    </div>
  `,
  data() {
    return {};
  },
};

const component4 = {
  template: `
    <div id="component4" @click="clickHandle">
      component4{{name}}
    </div>
  `,
  data() {
    return {
      name: "c4",
    };
  },
  inject:{
    name:'Boswell'
  },
  methods: {
    clickHandle() {
      this.name = "cc4";
    },
  },
};

const vm = new Vue({
  el: "#demo",
  components: {
    component2,
    component3,
    component4,
  },
  provide:{
    Boswell:'Boswell'
  },
  data: {
    index: 1,
    name: "component4",
    test: "a",
    age: 21,
    currentBranch:1
  },
  watch: {
    currentBranch(newVal,oldVal) { 
      return newVal;
    },
  },
  filters: {
    truncate: function (v) {
      var newline = v.indexOf("\n");
      return newline > 0 ? v.slice(0, newline) : v;
    },
    formatDate: function (v) {
      return v.replace(/T|Z/g, " ");
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
    clickHandle() {
      this.index = this.index == 1 ? 2 : 1;
      this.name = this.name == "component4" ? "component3" : "component4";
      this.currentBranch = this.currentBranch == 1 ? 2 : 1
    },
  },
});
