(function anonymous() {
  with (this) {
      return _c('div', {
          attrs: {
              "id": "demo"
          }
      }, [_c('div', _l((arr), function(item) {
          return _c('div', {
              key: item
          }, [_v(_s(item))])
      }), 0), _v(" "), _c('button', {
          on: {
              "click": diffOldVnodeChildren
          }
      }, [_v("diffOldVnodeChildren")]), _v(" "), _c('comp1', [_c('comp2')], 1)], 1)
  }
}
)

/**
 * 当作父组件的子组件来创建slot
 */
