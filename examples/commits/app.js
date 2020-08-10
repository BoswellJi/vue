/* global Vue */

var apiURL = 'https://api.github.com/repos/vuejs/vue/commits?per_page=3&sha='

/**
 * Actual demo
 */

// Vue.config.silent = true;

const people = Vue.observable({ name: 'jmz' });
people.name;

const testChildren = {
  template: '<div>children</div>'
};

const test = {
  components: {
    testChildren
  },
  data() {
    return {
      name: 'jmz'
    }
  },
  template: '<div>dfdf<test-children></test-children></div>'
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
    ok:false,
    text:''
  },

  created: function () {
    this.fetchData()
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
    test() {
      this.ok=!this.ok;
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



