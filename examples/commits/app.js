/* global Vue */

var apiURL = 'https://api.github.com/repos/vuejs/vue/commits?per_page=3&sha='

/**
 * Actual demo
 */

// Vue.config.silent = true;
Vue.config.performance = true;

const component2 = {
  template: `<div id="hhh1">
          {{type}}{{name}}
          <slot></slot>
          <div @click="click">点击2</div>
      </div>
  `,
  props: ['type', 'type1'],
  data() {
    return {
      name: 'jjj',
      i:0
    };
  },
  methods: {
    click() {
      this.name = this.i++;
    },
  }
};

const component3 = {
  template: `<div id="hhh2">
  <slot></slot>
      </div>
  `,
  props: ['type', 'type1'],
  data() {
    return {
      name: 'jjj',
      i:0
    };
  },
  methods: {
    click() {
      console.log('test');
      this.name = this.i++;
    },
  }
};

const vm = new Vue({
  el: '#demo',
  components: {
    component2,
    component3
  },
  data: {
    index: 1,
    name: 'app'
  },
  created: function () {
  },
  mounted() {
  },
  watch: {
    currentBranch() { }
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
    clickHandle() {
      this.name = 'Boswell'+ this.index++;
    },
  }
});



