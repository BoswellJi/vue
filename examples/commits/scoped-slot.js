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
      }, [_v("diffOldVnodeChildren")]), _v(" "), _c('comp1', {
          scopedSlots: _u([{
              key: "slotone",
              fn: function() {
                  return [_c('comp2')]
              },
              proxy: true
          }])
      })], 1)
  }
}
)


/**
 * 当作父组件的data对象的scopedSlots属性，
 * scoped-slot被编译为函数
 */
