;(function(global) {
  if (global.cmdjs) {
    return
  }

  var cmdjs = (global.cmdjs = {
    version: '1.0.0'
  })

  function isType(type) {
    return function(obj) {
      return Object.prototype.toString.call(obj) == '[object ' + type + ']'
    }
  }

  var isArray = Array.isArray || isType('Array')
  var isFunction = isType('Function')

  var _cid = 0
  function cid() {
    return _cid++
  }

  var cachedMods = {}
  var anonymousMeta

  var fetchingList = {}
  var fetchedList = {}
  var callbackList = {}

  var STATUS = {
    // 1 - The `module.uri` is being fetched
    FETCHING: 1,
    // 2 - The meta data has been saved to cachedMods
    SAVED: 2,
    // 3 - The `module.dependencies` are being loaded
    LOADING: 3,
    // 4 - The module are ready to execute
    LOADED: 4,
    // 5 - The module is being executed
    EXECUTING: 5,
    // 6 - The `module.exports` is available
    EXECUTED: 6,
    // 7 - 404
    ERROR: 7
  }

  function Module(uri, deps) {
    this.uri = uri
    this.dependencies = deps || []
    this.deps = {} // Ref the dependence modules
    this.status = 0

    this._entry = []
  }

  // Resolve module.dependencies
  Module.prototype.resolve = function() {
    var mod = this
    var ids = mod.dependencies
    var uris = []

    for (var i = 0, len = ids.length; i < len; i++) {
      uris[i] = Module.resolve(ids[i])
    }

    return uris
  }

  Module.prototype.pass = function() {
    var mod = this

    var len = mod.dependencies.length

    for (var i = 0; i < mod._entry.length; i++) {
      var entry = mod._entry[i]
      var count = 0

      for (var j = 0; j < len; j++) {
        var m = mod.deps[mod.dependencies[j]]
        // If the module is unload and unused in the entry, pass entry to it
        if (m.status < STATUS.LOADED && !entry.history.hasOwnProperty(m.uri)) {
          entry.history[m.uri] = true
          count++
          m._entry.push(entry)

          if (m.status === STATUS.LOADING) {
            m.pass()
          }
        }
      }
      // If has passed the entry to it's dependencies, modify the entry's count and del it in the module
      if (count > 0) {
        entry.remain += count - 1
        mod._entry.shift()
        i--
      }
    }
  }

  // Load module.dependencies and fire onload when all done
  Module.prototype.load = function() {
    var mod = this

    // If the module is being loaded, just wait it onload call
    if (mod.status >= STATUS.LOADING) {
      return
    }

    mod.status = STATUS.LOADING

    var uris = mod.resolve()
    for (var i = 0, len = uris.length; i < len; i++) {
      mod.deps[mod.dependencies[i]] = Module.get(uris[i])
    }

    // Pass entry to it's dependencies
    mod.pass()

    // If module has entries not be passed, call onload
    if (mod._entry.length) {
      mod.onload()
      return
    }

    // Begin parallel loading
    var requestCache = {}
    var m

    for (i = 0; i < len; i++) {
      m = cachedMods[uris[i]]

      if (m.status < STATUS.FETCHING) {
        m.fetch(requestCache)
      } else if (m.status === STATUS.SAVED) {
        m.load()
      }
    }
  }

  Module.prototype.onload = function() {
    var mod = this
    mod.status = STATUS.LOADED

    for (var i = 0, len = (mod._entry || []).length; i < len; i++) {
      var entry = mod._entry[i]
      if (--entry.remain === 0) {
        entry.callback()
      }
    }

    delete mod._entry
  }

  // Call this method when module is 404
  Module.prototype.error = function() {
    var mod = this
    mod.onload()
    mod.status = STATUS.ERROR
  }

  // Execute a module
  Module.prototype.exec = function() {
    var mod = this

    if (mod.status >= STATUS.EXECUTING) {
      return mod.exports
    }

    mod.status = STATUS.EXECUTING

    if (mod._entry && !mod._entry.length) {
      delete mod._entry
    }

    var uri = mod.uri

    function require(id) {
      var m = mod.deps[id] || Module.get(require.resolve(id))
      if (m.status == STATUS.ERROR) {
        throw new Error('module was broken: ' + m.uri)
      }

      return m.exec()
    }

    require.resolve = function(id) {
      return Module.resolve(id)
    }

    require.async = function(ids, callback) {
      Module.use(ids, callback, uri + '_async_' + cid())

      return require
    }

    // Exec factory
    var factory = mod.factory

    var exports = isFunction(factory)
      ? factory.call((mod.exports = {}), require, mod.exports, mod)
      : factory

    if (exports === undefined) {
      exports = mod.exports
    }

    // Reduce memory leak
    delete mod.factory

    mod.exports = exports
    mod.status = STATUS.EXECUTED

    return mod.exports
  }

  // Resolve id to uri
  Module.resolve = function(id) {
    // Emit `resolve` event for plugins such as text plugin
    return id
  }

  // Define a module
  Module.define = function(id, deps, factory) {
    var argsLen = arguments.length
    // define(factory)
    if (argsLen === 1) {
      factory = id
      id = undefined
    } else if (argsLen === 2) {
      factory = deps

      // define(deps, factory)
      if (isArray(id)) {
        deps = id
        id = undefined
      }
      // define(id, factory)
      else {
        deps = undefined
      }
    }

    var meta = {
      id: id,
      uri: Module.resolve(id),
      deps: deps,
      factory: factory
    }

    meta.uri ? Module.save(meta.uri, meta) : (anonymousMeta = meta)
  }

  // Save meta data to cachedMods
  Module.save = function(uri, meta) {
    var mod = Module.get(uri)

    // Do NOT override already saved modules
    if (mod.status < STATUS.SAVED) {
      mod.id = meta.id || uri
      mod.dependencies = meta.deps || []
      mod.factory = meta.factory
      mod.status = STATUS.SAVED
    }
  }

  // Get an existed module or create a new one
  Module.get = function(uri, deps) {
    return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps))
  }

  // Use function is equal to load a anonymous module
  Module.use = function(ids, callback, uri) {
    var mod = Module.get(uri, isArray(ids) ? ids : [ids])

    mod._entry.push(mod)
    mod.history = {}
    mod.remain = 1

    mod.callback = function() {
      var exports = []
      var uris = mod.resolve()

      for (var i = 0, len = uris.length; i < len; i++) {
        exports[i] = cachedMods[uris[i]].exec()
      }

      if (callback) {
        callback.apply(global, exports)
      }

      delete mod.callback
      delete mod.history
      delete mod.remain
      delete mod._entry
    }

    mod.load()
  }

  global.define = Module.define

  cmdjs.require = function(id) {
    var mod = Module.get(Module.resolve(id))

    if (mod.status < STATUS.EXECUTED) {
      mod.onload()
      mod.exec()
    }

    return mod.exports
  }

  cmdjs.use = function(ids, callback) {
    Module.use(ids, callback, '/' + '_use_' + cid())

    return cmdjs
  }
})(this)