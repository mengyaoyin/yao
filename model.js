'use strict'
var require
var define
!(function(global) {
  var isIE = /IE/.test(navigator.userAgent),
    head = document.getElementsByTagName('head')[0]

  function importScript(url, successCallback, failureCallback) {
    var script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = url
    script.onerror = function() {
      failureCallback && failureCallback()
    }
    script.onload = function() {
      successCallback && successCallback()
    }

    if (isIE) {
      setTimeout(function() {
        head.appendChild(script)
      }, 0)
    } else {
      head.appendChild(script)
    }
  }

  var asyncModules = {},
    definedModules = {}

  define = function(moduleId, module) {
    definedModules[moduleId] = module
    var asyncModuleCallbacks = asyncModules[moduleId]
    if (asyncModuleCallbacks) {
      var prop = asyncModuleCallbacks.length - 1
      for (; prop >= 0; --prop) {
        asyncModuleCallbacks[prop]()
      }
      delete asyncModules[moduleId]
    }
  }

  var installedModules = {}
  require = function(moduleId) {
    moduleId = require.alias(moduleId)
    var module = installedModules[moduleId]
    if (module) {
      return module.exports
    }
    var definedModule = definedModules[moduleId]
    if (!definedModule) {
      throw Error('Cannot find module `' + e + '`')
    }

    module = installedModules[moduleId] = {
      exports: {}
    }

    var result =
      'function' == typeof definedModule
        ? definedModule.apply(module, [require, module.exports, module])
        : definedModule

    result && (module.exports = result)

    return module.exports
  }

  require.async = function(moduleId, successCallback, failureCallback) {
    function findNeed(array) {
      var j = array.length - 1
      for (; j >= 0; --j) {
        var url = array[j]
        if (!(url in definedModules || url in attachment)) {
          attachment[url] = true
          h++

          importScript(url, updateNeed, failureCallback)
        }
      }
    }

    function updateNeed() {
      if (0 == h--) {
        var j = 0
        var i = names.length
        var all = []

        for (; i > j; ++j) {
          all[j] = require(names[j])
        }

        if (successCallback) {
          successCallback.apply(global, all)
        }
      }
    }

    var asyncModules,
      originAsyncModules = []
    asyncModules = 'string' == typeof moduleId ? [moduleId] : moduleId

    // ���˱�����Զ��
    var i = asyncModules.length - 1
    for (; i >= 0; --i) {
      if (asyncModules[i].match(/^src:/)) {
        originAsyncModules.push(asyncModules[i].substring(4))
        asyncModules.splice(i, 1)
      } else {
        asyncModules[i] = require.alias(asyncModules[i])
      }
    }

    var originAsyncModuleUrl = originAsyncModules[0]
    if (originAsyncModules.length > 1) {
      i = originAsyncModules.length - 1
      for (; i >= 1; --i) {
        appendScript(originAsyncModules[i], null, failureCallback)
      }

      if (0 == asyncModules.length) {
        appendScript(originAsyncModuleUrl, successCallback, failureCallback)
      } else {
        appendScript(originAsyncModuleUrl, null, failureCallback)
      }
    } else {
      if (1 == originAsyncModules.length) {
        if (0 == asyncModules.length) {
          appendScript(originAsyncModuleUrl, successCallback, failureCallback)
        } else {
          appendScript(originAsyncModuleUrl, null, failureCallback)
        }
      }
    }

    if (0 !== asyncModules.length) {
      var attachment = {}
      var h = 0
      findNeed(asyncModules)
      updateNeed()
    }
  }

  require.alias = function(moduleId) {
    return moduleId
  }
})(this)