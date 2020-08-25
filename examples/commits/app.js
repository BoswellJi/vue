/* global Vue */

var apiURL = 'https://api.github.com/repos/vuejs/vue/commits?per_page=3&sha='

/**
 * Actual demo
 */

// Vue.config.silent = true;

const component1 = Vue.component('c1', {
  template: '<div>hhhh</div>'
});

const vm1 = new Vue({
  el: document.createElement('div'),
  data: {
    name: 'df'
  },
  components: {
    component1: component1
  },
  template: '<div><c1></c1>{{name}}</div>'
});

document.body.appendChild(vm1.$el);

Vue.directive('test', {
  /**
   * 指令绑定初始化
   * @param {*} el dom元素
   * @param {*} bind 
   * @param {*} vnode html元素的vnode对象
   */
  bind(...args) {
    // console.log(args);
  },
  undate(...args) {
    console.log(args);
  },
  /**
   * 1. dom元素
   * 2. 指令信息
   * 3. 绑定元素的new vnode
   * 4. 绑定元素的old vnode
   * @param  {...any} args 
   */
  inserted(...args) {
    // console.log(args);
  }
});

const testChildren = {
  template: '<div>children slot</div>'
};

const test = {
  data() {
    return {
      name: 'jmz'
    }
  },
  mounted() {
    console.log(this.$slots)
  },
  template: '<div><slot name="a"></slot></div>'
}

const vm = new Vue({
  el: '#demo',
  components: {
    test,
    testChildren
  },
  data: {
    branches: ['master', 'dev', 'df', 'bb', 'dfdf'],
    currentBranch: 'master',
    commits: null,
    ok: false,
    text: ''
  },

  created: function () {
    this.fetchData()
  },
  mounted() {

  },
  watch: {
    currentBranch: 'fetchData'
  },
  filters: {
    truncate: function (v) {
      var newline = v.indexOf('\n')
      return newline > 0 ? v.slice(0, newline) : v
    },
    formatDate: function (v) {
      return v.replace(/T|Z/g, ' ')
    }
  },
  methods: {
    beforeEnterFn(e) {
      console.log('before enter', e);
    },
    beforeLeaveFn(e) {
      console.log('before leave', e);
    },
    beforeAppearFn(e) {
      console.log('before appear', e);
    },
    enterFn(e) {
      console.log('enter', e);
    },
    leaveFn(e) {
      console.log('leave', e);
    },
    test() {
      this.ok = !this.ok;
      this.branches.splice(0, 1);
    },
    fetchData: function () {
      var self = this
      if (navigator.userAgent.indexOf('PhantomJS') > -1) {
        // use mocks in e2e to avoid dependency on network / authentication
        setTimeout(function () {
          self.commits = window.MOCKS[self.currentBranch]
        }, 0)
      } else {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', apiURL + self.currentBranch)
        xhr.onload = function () {
          self.commits = JSON.parse(xhr.responseText)
        }
        xhr.send()
      }
    }
  }
})



