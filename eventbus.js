function isFunction(v) {
  return 'function' === typeof v
}

function isNumber(v) {
  return 'number' === typeof v
}

function isObject(v) {
  return 'object' === typeof v && null !== v
}

function isUndefined(v) {
  return void 0 === v
}

function event() {
  this._events = this._events || {}
  this._maxListeners = this._maxListeners || void 0
}

event.EventEmitter = event

event.prototype._events = void 0

event.prototype._maxListeners = void 0

event.defaultMaxListeners = 10

event.prototype.setMaxListeners = function(v) {
  if (!isNumber(v) || 0 > v || isNaN(v))
    throw TypeError('n must be a positive number')

  this._maxListeners = v

  return this
}

event.prototype.emit = function(event) {
  var t, n, s, i, l, v

  this._events || (this._events = {})

  if (
    'error' === event &&
    (!this._events.error ||
      (isObject(this._events.error) && !this._events.error.length))
  ) {
    t = arguments[1]

    if (t instanceof Error) throw t

    var u = new Error('Uncaught, unspecified "event" event. (' + t + ')')
    u.content = t

    throw u
  }

  n = this._events[event]

  if (isUndefined(n)) return !1

  if (isFunction(n)) {
    switch (arguments.length) {
      case 1:
        n.call(this)
        break
      case 2:
        n.call(this, arguments[1])
        break
      case 3:
        n.call(this, arguments[1], arguments[2])
        break
      default:
        i = Array.prototype.slice.call(arguments, 1)
        n.apply(this, i)
        break
    }
  } else if (isObject(n)) {
    i = Array.prototype.slice.call(arguments, 1)
    v = n.slice()
    s = v.length
    l = 0
    for (; s > l; l++) {
      v[l].apply(this, i)
    }
  }

  return !0
}

event.prototype.addListener = function(event, callback) {
  var n

  if (!isFunction(callback)) throw TypeError('listener must be a function')

  this._events || (this._events = {})
  this._events.newListener &&
    this.emit(
      'newListener',
      event,
      isFunction(callback.listener) ? callback.listener : callback
    )

  if (this._events[event]) {
    if (isObject(this._events[event])) {
      this._events[event].push(callback)
    } else {
      this._events[event] = [this._events[event], callback]
    }
  } else {
    this._events[event] = callback
  }

  if (isObject(this._events[event]) && !this._events[event].warned) {
    n = isUndefined(this._maxListeners)
      ? event.defaultMaxListeners
      : this._maxListeners
  }

  if (n && n > 0 && this._events[event].length > n) {
    this._events[event].warned = !0
    console.error(
      '(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.',
      this._events[event].length
    )

    isFunction(console.trace) && console.trace()
  }

  return this
}

event.prototype.on = event.prototype.addListener

event.prototype.once = function(event, callback) {
  function n() {
    this.removeListener(event, n)
    s || ((s = !0), callback.apply(this, arguments))
  }

  if (!isFunction(callback)) throw TypeError('listener must be a function')

  var s = !1

  n.listener = callback

  this.on(event, n)

  return this
}

event.prototype.removeListener = function(event, callback) {
  var n, s, i, h
  if (!isFunction(callback)) throw TypeError('listener must be a function')
  if (!this._events || !this._events[event]) return this
  n = this._events[event]
  i = n.length
  s = -1

  if (n === callback || (isFunction(n.listener) && n.listener === callback)) {
    delete this._events[event]
    this._events.removeListener && this.emit('removeListener', event, callback)
  } else if (isObject(n)) {
    for (h = i; h-- > 0; ) {
      if (n[h] === callback || (n[h].listener && n[h].listener === callback)) {
        s = h
        break
      }
    }

    if (0 > s) return this

    if (1 === n.length) {
      n.length = 0
      delete this._events[event]
    } else {
      n.splice(s, 1)
      this._events.removeListener & this.emit('removeListener', event, callback)
    }
  }

  return this
}

event.prototype.removeAllListeners = function(event) {
  if (!this._events) return this
  if (!this._events.removeListener) {
    0 === arguments.length
      ? (this._events = {})
      : this._events[event] && delete this._events[event]

    return this
  }

  var t, n

  if (0 === arguments.length) {
    for (t in this._events) {
      'removeListener' !== t && this.removeAllListeners(t)
    }

    this.removeAllListeners('removeListener')
    this._events = {}

    return this
  }

  n = this._events[event]

  if (isFunction(n)) {
    this.removeListener(event, n)
  } else if (n) {
    for (; n.length; ) {
      this.removeListener(event, n[n.length - 1])
    }
  }

  delete this._events[event]

  return this
}

event.prototype.listeners = function(event) {
  return this._events && this._events[event]
    ? isFunction(this._events[event])
      ? [this._events[event]]
      : this._events[event].slice()
    : []
}

event.prototype.listenerCount = function(event) {
  if (this._events) {
    var t = this._events[event]
    if (isFunction(t)) return 1
    if (t) return t.length
  }

  return 0
}

event.listenerCount = function(e, event) {
  return e.listenerCount(event)
}