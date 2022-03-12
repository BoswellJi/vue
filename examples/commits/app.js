/* global Vue */

const comp1 = {
  template: `
    <div id="component3">
      component3
    </div>
  `,
  data() {
    return {};
  },
};

const comp2 = {
  functional: true,
  render(h) {
    return h('div', 'comp2');
  }
};

const comp3 = () => new Promise((reslove) => {
  setTimeout(() => {
    reslove({
      template: `<div>comp3</div>`
    });
  }, 1000);
});

const comp4 = () => ({
  component: new Promise((reslove) => {
    setTimeout(() => {
      reslove({
        template: `<div>comp4</div>`
      });
    }, 2000);
  }),
  loading: comp2,
  error: comp1,
  delay: 200,
  timeout: 3000
});

const comp5 = (reslove) => {
  setTimeout(() => {
    reslove({
      template: `<div>comp5</div>`
    });
  }, 1000);
}

const vm = new Vue({
  components: {
    comp1,
    comp2,
    comp3,
    comp4,
    comp5
  },
  provide: {
    Boswell: 'Boswell'
  },
  data: {
    index: 1,
    name: "comp2",
    test: "a",
    age: 21,
    currentBranch: 1,
    arr: [1, 2, 3]
  },
  watch: {
    currentBranch(newVal) {
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
    diffOldVnodeChildren(){
      this.arr = [];
    }
  },
});

vm.$mount('#demo');
