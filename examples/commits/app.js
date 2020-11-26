/* global Vue */

var apiURL = 'https://api.github.com/repos/vuejs/vue/commits?per_page=3&sha='

/**
 * Actual demo
 */

// Vue.config.silent = true;
Vue.config.performance = true;

const component2 = {
  template: `<div id="hhh1">abc</div>`,
  created() {
    console.log('2');
  },
};

const component3 = {
  template: `<div id="hhh1">123</div>`,
  created() {
    console.log('3');
  },
};

const vm = new Vue({
  el: '#demo',
  components: {
    component2,
    component3,
  },
  data: {
    // branches: ['master', 'dev', 'df', 'bb', 'dfdf'],
    // currentBranch: 'master',
    // commits: null,
    // ok: false,
    index: 1,
    name: 'app'
  },
  created: function () {
    // this.fetchData();
    // this.$watch('name', (...arg) => {
    // }, { sync: true });
    // this.$watch('name', (...arg) => {
    // }, { sync: true });
  },
  mounted() {
    console.log(this);    
  },
  // watch: {
  //   currentBranch() { }
  // },
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
    count() {
      if (this.index == 1) {
        this.index = 2;
      } else {
        this.index = 1
      }
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
});



