/* global Vue */

var apiURL = 'https://api.github.com/repos/vuejs/vue/commits?per_page=3&sha='

/**
 * Actual demo
 */

Vue.config.silent = true;

const people = Vue.observable({ name: 'jmz' });
people.name;

const testChildren = {
  template: '<div>children</div>'
};

const test = {
  components: {
    testChildren
  },
  template: '<div>dfdf<test-children></test-children></div>'
}

new Vue({
  el: '#demo',
  components: {
    test
  },
  data: {
    branches: ['master', 'dev'],
    currentBranch: 'master',
    commits: null
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

          Vue.nextTick(function () {
            console.log('txt');
          });
        }
        xhr.send()
      }
    }
  }
})



