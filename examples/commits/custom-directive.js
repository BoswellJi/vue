(function anonymous() {
  with (this) {
    return _c('div', {
      attrs: {
        "id": "demo"
      }
    }, [_c('div', _l((arr), function (item) {
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
        fn: function () {
          return [_c('comp2')]
        },
        proxy: true
      }])
    }), _v(" "), _c('input', {
      directives: [{
        name: "model",
        rawName: "v-model",
        value: (name),
        expression: "name"
      }],
      attrs: {
        "type": "text"
      },
      domProps: {
        "value": (name)
      },
      on: {
        "input": function ($event) {
          if ($event.target.composing)
            return;
          name = $event.target.value
        }
      }
    })], 1)
  }
}
)
