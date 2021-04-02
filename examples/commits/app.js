/* global Vue */

var apiURL = 'https://api.github.com/repos/vuejs/vue/commits?per_page=3&sha='

/**
 * Actual demo
 */

// Vue.config.silent = true;
// Vue.config.performance = true;

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
      i: 0
    };
  },
  methods: {
    click() {
      this.name = this.i++;
    },
  }
};

const component3 = {
  template: `
    <div id="hhh2">
      {{name}}{{c3Test1}}
    </div>
  `,
  props: ['type', 'type1'],
  watch: {
    c3Test1() {
       
    }
  },
  created() {
    console.log(this, 'component3');
    this.$watch(function(){
      this.i;
    },function(){},);
  },
  data() {
    return {
      name: 'c3_name',
      i: 'c3_i',
      c3Test1:'c3Test1'
    };
  },
  methods: {
    click() {
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
    name: 'app',
    test: 'a',
    age:21
  },
  created: function () {
    console.log(this);
  },
  mounted() {

  },
  watch: {
    currentBranch() {
     
    }
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
      this.age = 20;
    },
  }
});



