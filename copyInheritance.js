// ¿½±´¼Ì³Ð
var inherit = (function() {
  function extend(o, props) {
    for (var i = 0; i < props.length; i++) {
      var prop = props[i]
      prop.enumerable = prop.enumerable || false
      prop.configurable = true

      if ('value' in prop) {
        prop.writable = true
      }

      Object.defineProperty(o, prop.key, prop)
    }
  }

  return function(o, props, staticProps) {
    props && extend(o.prototype, props)
    staticProps && extend(o, staticProps)

    return o
  }
})()