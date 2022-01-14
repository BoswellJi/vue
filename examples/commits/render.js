(function anonymous() {
  with (this) {
    return _c('div', {
      attrs: {
        "id": "demo"
      }
    }, [_c('comp1'), _v(" "), _c('comp2'), _v(" "), _c('input', {
      directives: [{
        name: "model",
        rawName: "v-model",
        value: (index),
        expression: "index"
      }],
      attrs: {
        "type": "text"
      },
      domProps: {
        "value": (index)
      },
      on: {
        "input": function ($event) {
          if ($event.target.composing)
            return;
          index = $event.target.value
        }
      }
    }), _v(" "), _l((arr), function (item) {
      return _c('div', {
        key: item
      }, [_v("\n        " + _s(item) + "\n      ")])
    }), _v(" "), _c('keep-alive', [_c('comp1'), _v(" "), _c('div', [_v(_s(name))]), _v(" "), _c('div', [_v(_s(test))])], 1), _v(" "), _c(name, {
      tag: "component"
    }), _v(" "), _c('comp3')], 2)
  }
}
)
