var PENDING = 2, // pending
  FULFILLED = 1, // fulfilled
  REJECTED = 0, // rejected
  OBJECT = 'object',
  FUNCTION = 'function'

function isFunc(fn) {
  return fn && typeof fn === 'function'
}

// 类型判断
function type(t) {
  return void 0 === t ? 'undefined' : typeof t
}

/**
 * resolve & reject 函数
 * @param {Thenable} thisArg
 * @param {Number} state 状态
 */
function $callback(thisArg, state) {
  return function(value) {
    return execute(thisArg, state, value)
  }
}
/**
 * 执行 This Promise
 * @param {Thenable} thisArg
 * @param {Number} state 状态
 * @param {*} value 返回值
 */
function execute(thisArg, state, value) {
  if (thisArg._state === PENDING) {
    thisArg._state = state
    thisArg._value = value

    for (var r = 0, i = thisArg._pCount; r < i; ) {
      $executor(thisArg, thisArg[r++])
    }

    return thisArg
  }
}

function $executor(thisArg, thenable) {
  return setTimeout(function() {
    var value = void 0,
      callback = thisArg._state ? thenable._onFulfilled : thenable._onRejected

    if (void 0 !== callback) {
      try {
        value = callback(thisArg._value)
      } catch (error) {
        return void execute(thisArg, REJECTED, value)
      }
      executeThenable(thenable, value)
    } else {
      execute(thenable, thisArg._state, thisArg._value)
    }
  })
}

/**
 * 执行 thenable
 * @param {Thenable} thenable
 * @param {*} value
 */
function executeThenable(thenable, value) {
  if (value !== thenable || !value) {
    var then = void 0,
      r = type(value)

    if (null === value || (r !== OBJECT && r !== FUNCTION)) {
      execute(thenable, FULFILLED, value)
    } else {
      try {
        then = value.then
      } catch (error) {
        return void execute(thenable, REJECTED, value)
      }

      type(then) === FUNCTION
        ? (function(thenable, value, then) {
            try {
              then.call(
                value,
                function(t) {
                  value && ((value = null), executeThenable(thenable, t))
                },
                function(t) {
                  value && ((value = null), execute(thenable, REJECTED, t))
                }
              )
            } catch (error) {
              value && (execute(thenable, REJECTED, t), (value = null))
            }
          })(thenable, value, then)
        : execute(thenable, FULFILLED, value)
    }
  }

  execute(thenable, REJECTED, new Error('promise_circular_chain'))
}

/**
 * Promise
 * @param {function} executor resolve | reject
 */
function Promise(executor) {
  try {
    executor($callback(this, FULFILLED), $callback(this, REJECTED))
  } catch (t) {
    if (this._state === PENDING) {
      return execute(new Promise(qr), REJECTED, t)
    }
  }
}

// 回调
function qr(t) {
  return t
}

Promise.prototype.then = function(onFulfilled, onRejected) {
  return (function(thisArg, thenable, _onFulfilled, _onRejected) {
    type(_onFulfilled) === FUNCTION && (thenable._onFulfilled = _onFulfilled)
    type(_onRejected) === FUNCTION && (thenable._onRejected = _onRejected)
    thisArg._state === PENDING
      ? (thisArg[thisArg._pCount++] = thenable)
      : $executor(thisArg, thenable)

    return thenable
  })(this, new Promise(qr), onFulfilled, onRejected)
}

Promise.resolve = function(value) {
  if (value instanceof Promise) return value
  if (isFunc(value.then)) {
    var e = value.then.bind(value)
    return new Promise(function(resolve, reject) {
      e(resolve, reject)
    })
  }

  return new Promise(function(resolve) {
    resolve(value)
  })
}

Promise.reject = function(value) {
  return new Promise(function(resolve, reject) {
    reject(value)
  })
}

Promise.all = function(l) {
  return new Promise(function(resolve, reject) {
    var t,
      n,
      i,
      o = 0,
      a = l.length,
      u = [],
      c = 0,
      s = void 0,
      f = function(e) {
        return function(t) {
          e.value = t
          e.state = FULFILLED
          if (++c === e.len && !s) {
            var n = (function(t) {
              var n = []
              for (o = 0; o < a; o++) {
                n.push(t[o] ? t[o].value : void 0)
              }
              return n
            })(u)

            resolve(n)
          }
        }
      },
      d = function(n) {
        return function(t) {
          n.value = t
          n.state = REJECTED
          c++
          s || ((s = !0), reject(t))
        }
      }

    for (; o < a; o++) {
      n = t = void 0
      n = l[o]
      i = {
        value: null,
        index: o,
        state: null,
        len: a
      }
      u.push(i)
      t = i
      n.then ? n.then(f(t), d(t)) : Promise.resolve(n).then(f(t), d(t))
    }
  })
}

Promise.prototype._state = PENDING
Promise.prototype._pCount = 0