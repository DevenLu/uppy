(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
var numberIsNan = require('number-is-nan');

module.exports = function (num) {
	if (typeof num !== 'number' || numberIsNan(num)) {
		throw new TypeError('Expected a number, got ' + typeof num);
	}

	var exponent;
	var unit;
	var neg = num < 0;
	var units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	if (neg) {
		num = -num;
	}

	if (num < 1) {
		return (neg ? '-' : '') + num + ' B';
	}

	exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1);
	num = Number((num / Math.pow(1000, exponent)).toFixed(2));
	unit = units[exponent];

	return (neg ? '-' : '') + num + ' ' + unit;
};

},{"number-is-nan":2}],2:[function(require,module,exports){
'use strict';
module.exports = Number.isNaN || function (x) {
	return x !== x;
};

},{}],3:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)

    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var list = this.map[name]
    if (!list) {
      list = []
      this.map[name] = list
    }
    list.push(value)
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    var values = this.map[normalizeName(name)]
    return values ? values[0] : null
  }

  Headers.prototype.getAll = function(name) {
    return this.map[normalizeName(name)] || []
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = [normalizeValue(value)]
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    Object.getOwnPropertyNames(this.map).forEach(function(name) {
      this.map[name].forEach(function(value) {
        callback.call(thisArg, value, name, this)
      }, this)
    }, this)
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    reader.readAsArrayBuffer(blob)
    return fileReaderReady(reader)
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    reader.readAsText(blob)
    return fileReaderReady(reader)
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (!body) {
        this._bodyText = ''
      } else if (support.arrayBuffer && ArrayBuffer.prototype.isPrototypeOf(body)) {
        // Only support ArrayBuffers for POST method.
        // Receiving ArrayBuffers happens via Blobs, instead.
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        return this.blob().then(readBlobAsArrayBuffer)
      }

      this.text = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as text')
        } else {
          return Promise.resolve(this._bodyText)
        }
      }
    } else {
      this.text = function() {
        var rejected = consumed(this)
        return rejected ? rejected : Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body
    if (Request.prototype.isPrototypeOf(input)) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = input
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this)
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function headers(xhr) {
    var head = new Headers()
    var pairs = (xhr.getAllResponseHeaders() || '').trim().split('\n')
    pairs.forEach(function(header) {
      var split = header.trim().split(':')
      var key = split.shift().trim()
      var value = split.join(':').trim()
      head.append(key, value)
    })
    return head
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = options.statusText
    this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request
      if (Request.prototype.isPrototypeOf(input) && !init) {
        request = input
      } else {
        request = new Request(input, init)
      }

      var xhr = new XMLHttpRequest()

      function responseURL() {
        if ('responseURL' in xhr) {
          return xhr.responseURL
        }

        // Avoid security warnings on getResponseHeader when not allowed by CORS
        if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
          return xhr.getResponseHeader('X-Request-URL')
        }

        return
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: headers(xhr),
          url: responseURL()
        }
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],4:[function(require,module,exports){
var bel = require('bel') // turns template tag into DOM elements
var morphdom = require('morphdom') // efficiently diffs + morphs two DOM elements
var defaultEvents = require('./update-events.js') // default events to be copied when dom elements update

module.exports = bel

// TODO move this + defaultEvents to a new module once we receive more feedback
module.exports.update = function (fromNode, toNode, opts) {
  if (!opts) opts = {}
  if (opts.events !== false) {
    if (!opts.onBeforeMorphEl) opts.onBeforeMorphEl = copier
  }

  return morphdom(fromNode, toNode, opts)

  // morphdom only copies attributes. we decided we also wanted to copy events
  // that can be set via attributes
  function copier (f, t) {
    // copy events:
    var events = opts.events || defaultEvents
    for (var i = 0; i < events.length; i++) {
      var ev = events[i]
      if (t[ev]) { // if new element has a whitelisted attribute
        f[ev] = t[ev] // update existing element
      } else if (f[ev]) { // if existing element has it and new one doesnt
        f[ev] = undefined // remove it from existing element
      }
    }
    // copy values for form elements
    if ((f.nodeName === 'INPUT' && f.type !== 'file') || f.nodeName === 'TEXTAREA' || f.nodeName === 'SELECT') {
      if (t.getAttribute('value') === null) t.value = f.value
    }
  }
}

},{"./update-events.js":12,"bel":5,"morphdom":11}],5:[function(require,module,exports){
var document = require('global/document')
var hyperx = require('hyperx')
var onload = require('on-load')

var SVGNS = 'http://www.w3.org/2000/svg'
var BOOL_PROPS = {
  autofocus: 1,
  checked: 1,
  defaultchecked: 1,
  disabled: 1,
  formnovalidate: 1,
  indeterminate: 1,
  readonly: 1,
  required: 1,
  selected: 1,
  willvalidate: 1
}
var SVG_TAGS = [
  'svg',
  'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
  'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB',
  'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence', 'filter', 'font', 'font-face',
  'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri',
  'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image', 'line',
  'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph', 'mpath',
  'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
  'set', 'stop', 'switch', 'symbol', 'text', 'textPath', 'title', 'tref',
  'tspan', 'use', 'view', 'vkern'
]

function belCreateElement (tag, props, children) {
  var el

  // If an svg tag, it needs a namespace
  if (SVG_TAGS.indexOf(tag) !== -1) {
    props.namespace = SVGNS
  }

  // If we are using a namespace
  var ns = false
  if (props.namespace) {
    ns = props.namespace
    delete props.namespace
  }

  // Create the element
  if (ns) {
    el = document.createElementNS(ns, tag)
  } else {
    el = document.createElement(tag)
  }

  // If adding onload events
  if (props.onload || props.onunload) {
    var load = props.onload || function () {}
    var unload = props.onunload || function () {}
    onload(el, function bel_onload () {
      load(el)
    }, function bel_onunload () {
      unload(el)
    },
    // We have to use non-standard `caller` to find who invokes `belCreateElement`
    belCreateElement.caller.caller.caller)
    delete props.onload
    delete props.onunload
  }

  // Create the properties
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      var key = p.toLowerCase()
      var val = props[p]
      // Normalize className
      if (key === 'classname') {
        key = 'class'
        p = 'class'
      }
      // The for attribute gets transformed to htmlFor, but we just set as for
      if (p === 'htmlFor') {
        p = 'for'
      }
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS[key]) {
        if (val === 'true') val = key
        else if (val === 'false') continue
      }
      // If a property prefers being set directly vs setAttribute
      if (key.slice(0, 2) === 'on') {
        el[p] = val
      } else {
        if (ns) {
          el.setAttributeNS(null, p, val)
        } else {
          el.setAttribute(p, val)
        }
      }
    }
  }

  function appendChild (childs) {
    if (!Array.isArray(childs)) return
    for (var i = 0; i < childs.length; i++) {
      var node = childs[i]
      if (Array.isArray(node)) {
        appendChild(node)
        continue
      }

      if (typeof node === 'number' ||
        typeof node === 'boolean' ||
        node instanceof Date ||
        node instanceof RegExp) {
        node = node.toString()
      }

      if (typeof node === 'string') {
        if (el.lastChild && el.lastChild.nodeName === '#text') {
          el.lastChild.nodeValue += node
          continue
        }
        node = document.createTextNode(node)
      }

      if (node && node.nodeType) {
        el.appendChild(node)
      }
    }
  }
  appendChild(children)

  return el
}

module.exports = hyperx(belCreateElement)
module.exports.createElement = belCreateElement

},{"global/document":6,"hyperx":8,"on-load":10}],6:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"min-document":21}],7:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],8:[function(require,module,exports){
var attrToProp = require('hyperscript-attribute-to-property')

var VAR = 0, TEXT = 1, OPEN = 2, CLOSE = 3, ATTR = 4
var ATTR_KEY = 5, ATTR_KEY_W = 6
var ATTR_VALUE_W = 7, ATTR_VALUE = 8
var ATTR_VALUE_SQ = 9, ATTR_VALUE_DQ = 10
var ATTR_EQ = 11, ATTR_BREAK = 12

module.exports = function (h, opts) {
  h = attrToProp(h)
  if (!opts) opts = {}
  var concat = opts.concat || function (a, b) {
    return String(a) + String(b)
  }

  return function (strings) {
    var state = TEXT, reg = ''
    var arglen = arguments.length
    var parts = []

    for (var i = 0; i < strings.length; i++) {
      if (i < arglen - 1) {
        var arg = arguments[i+1]
        var p = parse(strings[i])
        var xstate = state
        if (xstate === ATTR_VALUE_DQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_SQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_W) xstate = ATTR_VALUE
        if (xstate === ATTR) xstate = ATTR_KEY
        p.push([ VAR, xstate, arg ])
        parts.push.apply(parts, p)
      } else parts.push.apply(parts, parse(strings[i]))
    }

    var tree = [null,{},[]]
    var stack = [[tree,-1]]
    for (var i = 0; i < parts.length; i++) {
      var cur = stack[stack.length-1][0]
      var p = parts[i], s = p[0]
      if (s === OPEN && /^\//.test(p[1])) {
        var ix = stack[stack.length-1][1]
        if (stack.length > 1) {
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === OPEN) {
        var c = [p[1],{},[]]
        cur[2].push(c)
        stack.push([c,cur[2].length-1])
      } else if (s === ATTR_KEY || (s === VAR && p[1] === ATTR_KEY)) {
        var key = ''
        var copyKey
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_KEY) {
            key = concat(key, parts[i][1])
          } else if (parts[i][0] === VAR && parts[i][1] === ATTR_KEY) {
            if (typeof parts[i][2] === 'object' && !key) {
              for (copyKey in parts[i][2]) {
                if (parts[i][2].hasOwnProperty(copyKey) && !cur[1][copyKey]) {
                  cur[1][copyKey] = parts[i][2][copyKey]
                }
              }
            } else {
              key = concat(key, parts[i][2])
            }
          } else break
        }
        if (parts[i][0] === ATTR_EQ) i++
        var j = i
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_VALUE || parts[i][0] === ATTR_KEY) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][1])
            else cur[1][key] = concat(cur[1][key], parts[i][1])
          } else if (parts[i][0] === VAR
          && (parts[i][1] === ATTR_VALUE || parts[i][1] === ATTR_KEY)) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][2])
            else cur[1][key] = concat(cur[1][key], parts[i][2])
          } else {
            if (key.length && !cur[1][key] && i === j
            && (parts[i][0] === CLOSE || parts[i][0] === ATTR_BREAK)) {
              // https://html.spec.whatwg.org/multipage/infrastructure.html#boolean-attributes
              // empty string is falsy, not well behaved value in browser
              cur[1][key] = key.toLowerCase()
            }
            break
          }
        }
      } else if (s === ATTR_KEY) {
        cur[1][p[1]] = true
      } else if (s === VAR && p[1] === ATTR_KEY) {
        cur[1][p[2]] = true
      } else if (s === CLOSE) {
        if (selfClosing(cur[0]) && stack.length) {
          var ix = stack[stack.length-1][1]
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === VAR && p[1] === TEXT) {
        if (p[2] === undefined || p[2] === null) p[2] = ''
        else if (!p[2]) p[2] = concat('', p[2])
        if (Array.isArray(p[2][0])) {
          cur[2].push.apply(cur[2], p[2])
        } else {
          cur[2].push(p[2])
        }
      } else if (s === TEXT) {
        cur[2].push(p[1])
      } else if (s === ATTR_EQ || s === ATTR_BREAK) {
        // no-op
      } else {
        throw new Error('unhandled: ' + s)
      }
    }

    if (tree[2].length > 1 && /^\s*$/.test(tree[2][0])) {
      tree[2].shift()
    }

    if (tree[2].length > 2
    || (tree[2].length === 2 && /\S/.test(tree[2][1]))) {
      throw new Error(
        'multiple root elements must be wrapped in an enclosing tag'
      )
    }
    if (Array.isArray(tree[2][0]) && typeof tree[2][0][0] === 'string'
    && Array.isArray(tree[2][0][2])) {
      tree[2][0] = h(tree[2][0][0], tree[2][0][1], tree[2][0][2])
    }
    return tree[2][0]

    function parse (str) {
      var res = []
      if (state === ATTR_VALUE_W) state = ATTR
      for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i)
        if (state === TEXT && c === '<') {
          if (reg.length) res.push([TEXT, reg])
          reg = ''
          state = OPEN
        } else if (c === '>' && !quot(state)) {
          if (state === OPEN) {
            res.push([OPEN,reg])
          } else if (state === ATTR_KEY) {
            res.push([ATTR_KEY,reg])
          } else if (state === ATTR_VALUE && reg.length) {
            res.push([ATTR_VALUE,reg])
          }
          res.push([CLOSE])
          reg = ''
          state = TEXT
        } else if (state === TEXT) {
          reg += c
        } else if (state === OPEN && /\s/.test(c)) {
          res.push([OPEN, reg])
          reg = ''
          state = ATTR
        } else if (state === OPEN) {
          reg += c
        } else if (state === ATTR && /[\w-]/.test(c)) {
          state = ATTR_KEY
          reg = c
        } else if (state === ATTR && /\s/.test(c)) {
          if (reg.length) res.push([ATTR_KEY,reg])
          res.push([ATTR_BREAK])
        } else if (state === ATTR_KEY && /\s/.test(c)) {
          res.push([ATTR_KEY,reg])
          reg = ''
          state = ATTR_KEY_W
        } else if (state === ATTR_KEY && c === '=') {
          res.push([ATTR_KEY,reg],[ATTR_EQ])
          reg = ''
          state = ATTR_VALUE_W
        } else if (state === ATTR_KEY) {
          reg += c
        } else if ((state === ATTR_KEY_W || state === ATTR) && c === '=') {
          res.push([ATTR_EQ])
          state = ATTR_VALUE_W
        } else if ((state === ATTR_KEY_W || state === ATTR) && !/\s/.test(c)) {
          res.push([ATTR_BREAK])
          if (/[\w-]/.test(c)) {
            reg += c
            state = ATTR_KEY
          } else state = ATTR
        } else if (state === ATTR_VALUE_W && c === '"') {
          state = ATTR_VALUE_DQ
        } else if (state === ATTR_VALUE_W && c === "'") {
          state = ATTR_VALUE_SQ
        } else if (state === ATTR_VALUE_DQ && c === '"') {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_SQ && c === "'") {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_W && !/\s/.test(c)) {
          state = ATTR_VALUE
          i--
        } else if (state === ATTR_VALUE && /\s/.test(c)) {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE || state === ATTR_VALUE_SQ
        || state === ATTR_VALUE_DQ) {
          reg += c
        }
      }
      if (state === TEXT && reg.length) {
        res.push([TEXT,reg])
        reg = ''
      } else if (state === ATTR_VALUE && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_DQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_SQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_KEY) {
        res.push([ATTR_KEY,reg])
        reg = ''
      }
      return res
    }
  }

  function strfn (x) {
    if (typeof x === 'function') return x
    else if (typeof x === 'string') return x
    else if (x && typeof x === 'object') return x
    else return concat('', x)
  }
}

function quot (state) {
  return state === ATTR_VALUE_SQ || state === ATTR_VALUE_DQ
}

var hasOwn = Object.prototype.hasOwnProperty
function has (obj, key) { return hasOwn.call(obj, key) }

var closeRE = RegExp('^(' + [
  'area', 'base', 'basefont', 'bgsound', 'br', 'col', 'command', 'embed',
  'frame', 'hr', 'img', 'input', 'isindex', 'keygen', 'link', 'meta', 'param',
  'source', 'track', 'wbr',
  // SVG TAGS
  'animate', 'animateTransform', 'circle', 'cursor', 'desc', 'ellipse',
  'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
  'feGaussianBlur', 'feImage', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
  'feTurbulence', 'font-face-format', 'font-face-name', 'font-face-uri',
  'glyph', 'glyphRef', 'hkern', 'image', 'line', 'missing-glyph', 'mpath',
  'path', 'polygon', 'polyline', 'rect', 'set', 'stop', 'tref', 'use', 'view',
  'vkern'
].join('|') + ')(?:[\.#][a-zA-Z0-9\u007F-\uFFFF_:-]+)*$')
function selfClosing (tag) { return closeRE.test(tag) }

},{"hyperscript-attribute-to-property":9}],9:[function(require,module,exports){
module.exports = attributeToProperty

var transform = {
  'class': 'className',
  'for': 'htmlFor',
  'http-equiv': 'httpEquiv'
}

function attributeToProperty (h) {
  return function (tagName, attrs, children) {
    for (var attr in attrs) {
      if (attr in transform) {
        attrs[transform[attr]] = attrs[attr]
        delete attrs[attr]
      }
    }
    return h(tagName, attrs, children)
  }
}

},{}],10:[function(require,module,exports){
/* global MutationObserver */
var document = require('global/document')
var window = require('global/window')
var watch = Object.create(null)
var KEY_ID = 'onloadid' + (new Date() % 9e6).toString(36)
var KEY_ATTR = 'data-' + KEY_ID
var INDEX = 0

if (window && window.MutationObserver) {
  var observer = new MutationObserver(function (mutations) {
    if (Object.keys(watch).length < 1) return
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === KEY_ATTR) {
        eachAttr(mutations[i], turnon, turnoff)
        continue
      }
      eachMutation(mutations[i].removedNodes, turnoff)
      eachMutation(mutations[i].addedNodes, turnon)
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: [KEY_ATTR]
  })
}

module.exports = function onload (el, on, off, caller) {
  on = on || function () {}
  off = off || function () {}
  el.setAttribute(KEY_ATTR, 'o' + INDEX)
  watch['o' + INDEX] = [on, off, 0, caller || onload.caller]
  INDEX += 1
  return el
}

function turnon (index, el) {
  if (watch[index][0] && watch[index][2] === 0) {
    watch[index][0](el)
    watch[index][2] = 1
  }
}

function turnoff (index, el) {
  if (watch[index][1] && watch[index][2] === 1) {
    watch[index][1](el)
    watch[index][2] = 0
  }
}

function eachAttr (mutation, on, off) {
  var newValue = mutation.target.getAttribute(KEY_ATTR)
  if (sameOrigin(mutation.oldValue, newValue)) {
    watch[newValue] = watch[mutation.oldValue]
    return
  }
  if (watch[mutation.oldValue]) {
    off(mutation.oldValue, mutation.target)
  }
  if (watch[newValue]) {
    on(newValue, mutation.target)
  }
}

function sameOrigin (oldValue, newValue) {
  if (!oldValue || !newValue) return false
  return watch[oldValue][3] === watch[newValue][3]
}

function eachMutation (nodes, fn) {
  var keys = Object.keys(watch)
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] && nodes[i].getAttribute && nodes[i].getAttribute(KEY_ATTR)) {
      var onloadid = nodes[i].getAttribute(KEY_ATTR)
      keys.forEach(function (k) {
        if (onloadid === k) {
          fn(k, nodes[i])
        }
      })
    }
    if (nodes[i].childNodes.length > 0) {
      eachMutation(nodes[i].childNodes, fn)
    }
  }
}

},{"global/document":6,"global/window":7}],11:[function(require,module,exports){
// Create a range object for efficently rendering strings to elements.
var range;

var testEl = (typeof document !== 'undefined') ?
    document.body || document.createElement('div') :
    {};

var XHTML = 'http://www.w3.org/1999/xhtml';
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

// Fixes <https://github.com/patrick-steele-idem/morphdom/issues/32>
// (IE7+ support) <=IE7 does not support el.hasAttribute(name)
var hasAttributeNS;

if (testEl.hasAttributeNS) {
    hasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttributeNS(namespaceURI, name);
    };
} else if (testEl.hasAttribute) {
    hasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttribute(name);
    };
} else {
    hasAttributeNS = function(el, namespaceURI, name) {
        return !!el.getAttributeNode(name);
    };
}

function empty(o) {
    for (var k in o) {
        if (o.hasOwnProperty(k)) {
            return false;
        }
    }
    return true;
}

function toElement(str) {
    if (!range && document.createRange) {
        range = document.createRange();
        range.selectNode(document.body);
    }

    var fragment;
    if (range && range.createContextualFragment) {
        fragment = range.createContextualFragment(str);
    } else {
        fragment = document.createElement('body');
        fragment.innerHTML = str;
    }
    return fragment.childNodes[0];
}

var specialElHandlers = {
    /**
     * Needed for IE. Apparently IE doesn't think that "selected" is an
     * attribute when reading over the attributes using selectEl.attributes
     */
    OPTION: function(fromEl, toEl) {
        fromEl.selected = toEl.selected;
        if (fromEl.selected) {
            fromEl.setAttribute('selected', '');
        } else {
            fromEl.removeAttribute('selected', '');
        }
    },
    /**
     * The "value" attribute is special for the <input> element since it sets
     * the initial value. Changing the "value" attribute without changing the
     * "value" property will have no effect since it is only used to the set the
     * initial value.  Similar for the "checked" attribute, and "disabled".
     */
    INPUT: function(fromEl, toEl) {
        fromEl.checked = toEl.checked;
        if (fromEl.checked) {
            fromEl.setAttribute('checked', '');
        } else {
            fromEl.removeAttribute('checked');
        }

        if (fromEl.value !== toEl.value) {
            fromEl.value = toEl.value;
        }

        if (!hasAttributeNS(toEl, null, 'value')) {
            fromEl.removeAttribute('value');
        }

        fromEl.disabled = toEl.disabled;
        if (fromEl.disabled) {
            fromEl.setAttribute('disabled', '');
        } else {
            fromEl.removeAttribute('disabled');
        }
    },

    TEXTAREA: function(fromEl, toEl) {
        var newValue = toEl.value;
        if (fromEl.value !== newValue) {
            fromEl.value = newValue;
        }

        if (fromEl.firstChild) {
            fromEl.firstChild.nodeValue = newValue;
        }
    }
};

function noop() {}

/**
 * Returns true if two node's names and namespace URIs are the same.
 *
 * @param {Element} a
 * @param {Element} b
 * @return {boolean}
 */
var compareNodeNames = function(a, b) {
    return a.nodeName === b.nodeName &&
           a.namespaceURI === b.namespaceURI;
};

/**
 * Create an element, optionally with a known namespace URI.
 *
 * @param {string} name the element name, e.g. 'div' or 'svg'
 * @param {string} [namespaceURI] the element's namespace URI, i.e. the value of
 * its `xmlns` attribute or its inferred namespace.
 *
 * @return {Element}
 */
function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === XHTML ?
        document.createElement(name) :
        document.createElementNS(namespaceURI, name);
}

/**
 * Loop over all of the attributes on the target node and make sure the original
 * DOM node has the same attributes. If an attribute found on the original node
 * is not on the new node then remove it from the original node.
 *
 * @param  {Element} fromNode
 * @param  {Element} toNode
 */
function morphAttrs(fromNode, toNode) {
    var attrs = toNode.attributes;
    var i;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;

    for (i = attrs.length - 1; i >= 0; i--) {
        attr = attrs[i];
        attrName = attr.name;
        attrValue = attr.value;
        attrNamespaceURI = attr.namespaceURI;

        if (attrNamespaceURI) {
            attrName = attr.localName || attrName;
            fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);
        } else {
            fromValue = fromNode.getAttribute(attrName);
        }

        if (fromValue !== attrValue) {
            if (attrNamespaceURI) {
                fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
            } else {
                fromNode.setAttribute(attrName, attrValue);
            }
        }
    }

    // Remove any extra attributes found on the original DOM element that
    // weren't found on the target element.
    attrs = fromNode.attributes;

    for (i = attrs.length - 1; i >= 0; i--) {
        attr = attrs[i];
        if (attr.specified !== false) {
            attrName = attr.name;
            attrNamespaceURI = attr.namespaceURI;

            if (!hasAttributeNS(toNode, attrNamespaceURI, attrNamespaceURI ? attrName = attr.localName || attrName : attrName)) {
                if (attrNamespaceURI) {
                    fromNode.removeAttributeNS(attrNamespaceURI, attr.localName);
                } else {
                    fromNode.removeAttribute(attrName);
                }
            }
        }
    }
}

/**
 * Copies the children of one DOM element to another DOM element
 */
function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
        var nextChild = curChild.nextSibling;
        toEl.appendChild(curChild);
        curChild = nextChild;
    }
    return toEl;
}

function defaultGetNodeKey(node) {
    return node.id;
}

function morphdom(fromNode, toNode, options) {
    if (!options) {
        options = {};
    }

    if (typeof toNode === 'string') {
        if (fromNode.nodeName === '#document' || fromNode.nodeName === 'HTML') {
            var toNodeHtml = toNode;
            toNode = document.createElement('html');
            toNode.innerHTML = toNodeHtml;
        } else {
            toNode = toElement(toNode);
        }
    }

    // XXX optimization: if the nodes are equal, don't morph them
    /*
    if (fromNode.isEqualNode(toNode)) {
      return fromNode;
    }
    */

    var savedEls = {}; // Used to save off DOM elements with IDs
    var unmatchedEls = {};
    var getNodeKey = options.getNodeKey || defaultGetNodeKey;
    var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
    var onNodeAdded = options.onNodeAdded || noop;
    var onBeforeElUpdated = options.onBeforeElUpdated || options.onBeforeMorphEl || noop;
    var onElUpdated = options.onElUpdated || noop;
    var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
    var onNodeDiscarded = options.onNodeDiscarded || noop;
    var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || options.onBeforeMorphElChildren || noop;
    var childrenOnly = options.childrenOnly === true;
    var movedEls = [];

    function removeNodeHelper(node, nestedInSavedEl) {
        var id = getNodeKey(node);
        // If the node has an ID then save it off since we will want
        // to reuse it in case the target DOM tree has a DOM element
        // with the same ID
        if (id) {
            savedEls[id] = node;
        } else if (!nestedInSavedEl) {
            // If we are not nested in a saved element then we know that this node has been
            // completely discarded and will not exist in the final DOM.
            onNodeDiscarded(node);
        }

        if (node.nodeType === ELEMENT_NODE) {
            var curChild = node.firstChild;
            while (curChild) {
                removeNodeHelper(curChild, nestedInSavedEl || id);
                curChild = curChild.nextSibling;
            }
        }
    }

    function walkDiscardedChildNodes(node) {
        if (node.nodeType === ELEMENT_NODE) {
            var curChild = node.firstChild;
            while (curChild) {


                if (!getNodeKey(curChild)) {
                    // We only want to handle nodes that don't have an ID to avoid double
                    // walking the same saved element.

                    onNodeDiscarded(curChild);

                    // Walk recursively
                    walkDiscardedChildNodes(curChild);
                }

                curChild = curChild.nextSibling;
            }
        }
    }

    function removeNode(node, parentNode, alreadyVisited) {
        if (onBeforeNodeDiscarded(node) === false) {
            return;
        }

        parentNode.removeChild(node);
        if (alreadyVisited) {
            if (!getNodeKey(node)) {
                onNodeDiscarded(node);
                walkDiscardedChildNodes(node);
            }
        } else {
            removeNodeHelper(node);
        }
    }

    function morphEl(fromEl, toEl, alreadyVisited, childrenOnly) {
        var toElKey = getNodeKey(toEl);
        if (toElKey) {
            // If an element with an ID is being morphed then it is will be in the final
            // DOM so clear it out of the saved elements collection
            delete savedEls[toElKey];
        }

        if (!childrenOnly) {
            if (onBeforeElUpdated(fromEl, toEl) === false) {
                return;
            }

            morphAttrs(fromEl, toEl);
            onElUpdated(fromEl);

            if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
                return;
            }
        }

        if (fromEl.nodeName !== 'TEXTAREA') {
            var curToNodeChild = toEl.firstChild;
            var curFromNodeChild = fromEl.firstChild;
            var curToNodeId;

            var fromNextSibling;
            var toNextSibling;
            var savedEl;
            var unmatchedEl;

            outer: while (curToNodeChild) {
                toNextSibling = curToNodeChild.nextSibling;
                curToNodeId = getNodeKey(curToNodeChild);

                while (curFromNodeChild) {
                    var curFromNodeId = getNodeKey(curFromNodeChild);
                    fromNextSibling = curFromNodeChild.nextSibling;

                    if (!alreadyVisited) {
                        if (curFromNodeId && (unmatchedEl = unmatchedEls[curFromNodeId])) {
                            unmatchedEl.parentNode.replaceChild(curFromNodeChild, unmatchedEl);
                            morphEl(curFromNodeChild, unmatchedEl, alreadyVisited);
                            curFromNodeChild = fromNextSibling;
                            continue;
                        }
                    }

                    var curFromNodeType = curFromNodeChild.nodeType;

                    if (curFromNodeType === curToNodeChild.nodeType) {
                        var isCompatible = false;

                        // Both nodes being compared are Element nodes
                        if (curFromNodeType === ELEMENT_NODE) {
                            if (compareNodeNames(curFromNodeChild, curToNodeChild)) {
                                // We have compatible DOM elements
                                if (curFromNodeId || curToNodeId) {
                                    // If either DOM element has an ID then we
                                    // handle those differently since we want to
                                    // match up by ID
                                    if (curToNodeId === curFromNodeId) {
                                        isCompatible = true;
                                    }
                                } else {
                                    isCompatible = true;
                                }
                            }

                            if (isCompatible) {
                                // We found compatible DOM elements so transform
                                // the current "from" node to match the current
                                // target DOM node.
                                morphEl(curFromNodeChild, curToNodeChild, alreadyVisited);
                            }
                        // Both nodes being compared are Text or Comment nodes
                    } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                            isCompatible = true;
                            // Simply update nodeValue on the original node to
                            // change the text value
                            curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                        }

                        if (isCompatible) {
                            curToNodeChild = toNextSibling;
                            curFromNodeChild = fromNextSibling;
                            continue outer;
                        }
                    }

                    // No compatible match so remove the old node from the DOM
                    // and continue trying to find a match in the original DOM
                    removeNode(curFromNodeChild, fromEl, alreadyVisited);
                    curFromNodeChild = fromNextSibling;
                }

                if (curToNodeId) {
                    if ((savedEl = savedEls[curToNodeId])) {
                        if (compareNodeNames(savedEl, curToNodeChild)) {
                            morphEl(savedEl, curToNodeChild, true);
                            // We want to append the saved element instead
                            curToNodeChild = savedEl;
                        } else {
                            delete savedEls[curToNodeId];
                            onNodeDiscarded(savedEl);
                        }
                    } else {
                        // The current DOM element in the target tree has an ID
                        // but we did not find a match in any of the
                        // corresponding siblings. We just put the target
                        // element in the old DOM tree but if we later find an
                        // element in the old DOM tree that has a matching ID
                        // then we will replace the target element with the
                        // corresponding old element and morph the old element
                        unmatchedEls[curToNodeId] = curToNodeChild;
                    }
                }

                // If we got this far then we did not find a candidate match for
                // our "to node" and we exhausted all of the children "from"
                // nodes. Therefore, we will just append the current "to node"
                // to the end
                if (onBeforeNodeAdded(curToNodeChild) !== false) {
                    fromEl.appendChild(curToNodeChild);
                    onNodeAdded(curToNodeChild);
                }

                if (curToNodeChild.nodeType === ELEMENT_NODE &&
                    (curToNodeId || curToNodeChild.firstChild)) {
                    // The element that was just added to the original DOM may
                    // have some nested elements with a key/ID that needs to be
                    // matched up with other elements. We'll add the element to
                    // a list so that we can later process the nested elements
                    // if there are any unmatched keyed elements that were
                    // discarded
                    movedEls.push(curToNodeChild);
                }

                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
            }

            // We have processed all of the "to nodes". If curFromNodeChild is
            // non-null then we still have some from nodes left over that need
            // to be removed
            while (curFromNodeChild) {
                fromNextSibling = curFromNodeChild.nextSibling;
                removeNode(curFromNodeChild, fromEl, alreadyVisited);
                curFromNodeChild = fromNextSibling;
            }
        }

        var specialElHandler = specialElHandlers[fromEl.nodeName];
        if (specialElHandler) {
            specialElHandler(fromEl, toEl);
        }
    } // END: morphEl(...)

    var morphedNode = fromNode;
    var morphedNodeType = morphedNode.nodeType;
    var toNodeType = toNode.nodeType;

    if (!childrenOnly) {
        // Handle the case where we are given two DOM nodes that are not
        // compatible (e.g. <div> --> <span> or <div> --> TEXT)
        if (morphedNodeType === ELEMENT_NODE) {
            if (toNodeType === ELEMENT_NODE) {
                if (!compareNodeNames(fromNode, toNode)) {
                    onNodeDiscarded(fromNode);
                    morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
                }
            } else {
                // Going from an element node to a text node
                morphedNode = toNode;
            }
        } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) { // Text or comment node
            if (toNodeType === morphedNodeType) {
                morphedNode.nodeValue = toNode.nodeValue;
                return morphedNode;
            } else {
                // Text node to something else
                morphedNode = toNode;
            }
        }
    }

    if (morphedNode === toNode) {
        // The "to node" was not compatible with the "from node" so we had to
        // toss out the "from node" and use the "to node"
        onNodeDiscarded(fromNode);
    } else {
        morphEl(morphedNode, toNode, false, childrenOnly);

        /**
         * What we will do here is walk the tree for the DOM element that was
         * moved from the target DOM tree to the original DOM tree and we will
         * look for keyed elements that could be matched to keyed elements that
         * were earlier discarded.  If we find a match then we will move the
         * saved element into the final DOM tree.
         */
        var handleMovedEl = function(el) {
            var curChild = el.firstChild;
            while (curChild) {
                var nextSibling = curChild.nextSibling;

                var key = getNodeKey(curChild);
                if (key) {
                    var savedEl = savedEls[key];
                    if (savedEl && compareNodeNames(curChild, savedEl)) {
                        curChild.parentNode.replaceChild(savedEl, curChild);
                        // true: already visited the saved el tree
                        morphEl(savedEl, curChild, true);
                        curChild = nextSibling;
                        if (empty(savedEls)) {
                            return false;
                        }
                        continue;
                    }
                }

                if (curChild.nodeType === ELEMENT_NODE) {
                    handleMovedEl(curChild);
                }

                curChild = nextSibling;
            }
        };

        // The loop below is used to possibly match up any discarded
        // elements in the original DOM tree with elemenets from the
        // target tree that were moved over without visiting their
        // children
        if (!empty(savedEls)) {
            handleMovedElsLoop:
            while (movedEls.length) {
                var movedElsTemp = movedEls;
                movedEls = [];
                for (var i=0; i<movedElsTemp.length; i++) {
                    if (handleMovedEl(movedElsTemp[i]) === false) {
                        // There are no more unmatched elements so completely end
                        // the loop
                        break handleMovedElsLoop;
                    }
                }
            }
        }

        // Fire the "onNodeDiscarded" event for any saved elements
        // that never found a new home in the morphed DOM
        for (var savedElId in savedEls) {
            if (savedEls.hasOwnProperty(savedElId)) {
                var savedEl = savedEls[savedElId];
                onNodeDiscarded(savedEl);
                walkDiscardedChildNodes(savedEl);
            }
        }
    }

    if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
        // If we had to swap out the from node with a new node because the old
        // node was not compatible with the target node then we need to
        // replace the old DOM node in the original DOM tree. This is only
        // possible if the original DOM node was part of a DOM tree which
        // we know is the case if it has a parent node.
        fromNode.parentNode.replaceChild(morphedNode, fromNode);
    }

    return morphedNode;
}

module.exports = morphdom;

},{}],12:[function(require,module,exports){
module.exports = [
  // attribute events (can be set with attributes)
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'ondragstart',
  'ondrag',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondrop',
  'ondragend',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onunload',
  'onabort',
  'onerror',
  'onresize',
  'onscroll',
  'onselect',
  'onchange',
  'onsubmit',
  'onreset',
  'onfocus',
  'onblur',
  'oninput',
  // other common events
  'oncontextmenu',
  'onfocusin',
  'onfocusout'
]

},{}],13:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _templateObject = _taggedTemplateLiteralLoose(['<img alt="', '" src="', '">'], ['<img alt="', '" src="', '">']);

var _Utils = require('../core/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _Translator = require('../core/Translator');

var _Translator2 = _interopRequireDefault(_Translator);

var _prettyBytes = require('pretty-bytes');

var _prettyBytes2 = _interopRequireDefault(_prettyBytes);

var _yoYo = require('yo-yo');

var _yoYo2 = _interopRequireDefault(_yoYo);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _UppySocket = require('./UppySocket');

var _UppySocket2 = _interopRequireDefault(_UppySocket);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteralLoose(strings, raw) { strings.raw = raw; return strings; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Main Uppy core
 *
 * @param {object} opts general options, like locales, to show modal or not to show
 */

var Core = function () {
  function Core(opts) {
    _classCallCheck(this, Core);

    // set default options
    var defaultOptions = {
      // load English as the default locales
      locales: require('../locales/en_US.js'),
      autoProceed: true,
      debug: false
    };

    // Merge default options with the ones set by user
    this.opts = _extends({}, defaultOptions, opts);

    // Dictates in what order different plugin types are ran:
    this.types = ['presetter', 'orchestrator', 'progressindicator', 'acquirer', 'uploader', 'presenter'];

    this.type = 'core';

    // Container for different types of plugins
    this.plugins = {};

    this.translator = new _Translator2.default({ locales: this.opts.locales });
    this.i18n = this.translator.translate.bind(this.translator);
    this.initSocket = this.initSocket.bind(this);

    this.emitter = new _events2.default.EventEmitter();

    this.state = {
      files: {}
    };

    if (this.opts.debug) {
      // for debugging and testing
      global.UppyState = this.state;
      global.uppyLog = '';
      global.UppyAddFile = this.addFile.bind(this);
    }
  }

  /**
   * Iterate on all plugins and run `update` on them. Called each time when state changes
   *
   */


  Core.prototype.updateAll = function updateAll() {
    var _this = this;

    Object.keys(this.plugins).forEach(function (pluginType) {
      _this.plugins[pluginType].forEach(function (plugin) {
        plugin.update();
      });
    });
  };

  /**
   * Updates state
   *
   * @param {newState} object
   */


  Core.prototype.setState = function setState(newState) {
    this.log('Setting state to: ');
    this.log(newState);
    this.state = _extends({}, this.state, newState);
    this.updateAll();
  };

  /**
   * Gets current state, making sure to make a copy of the state object and pass that,
   * instead of an actual reference to `this.state`
   *
   */


  Core.prototype.getState = function getState() {
    return this.state;
  };

  Core.prototype.addMeta = function addMeta(meta, fileID) {
    if (typeof fileID === 'undefined') {
      var updatedFiles = _extends({}, this.state.files);
      for (var file in updatedFiles) {
        updatedFiles[file].meta = meta;
      }
      this.setState({ files: updatedFiles });
    }
  };

  Core.prototype.addFile = function addFile(file) {
    var _this2 = this;

    var updatedFiles = _extends({}, this.state.files);

    var fileType = file.type.split('/');
    var fileTypeGeneral = fileType[0];
    var fileTypeSpecific = fileType[1];
    var fileID = _Utils2.default.generateFileID(file.name);

    updatedFiles[fileID] = {
      source: file.source || '',
      id: fileID,
      name: file.name,
      type: {
        general: fileTypeGeneral,
        specific: fileTypeSpecific
      },
      data: file.data,
      progress: 0,
      totalSize: file.data.size ? (0, _prettyBytes2.default)(file.data.size) : '?',
      uploadedSize: 0,
      isRemote: file.isRemote || false,
      remote: file.remote
    };

    this.setState({ files: updatedFiles });

    if (fileTypeGeneral === 'image') {
      // this.addImgPreviewToFile(updatedFiles[fileID])
      _Utils2.default.readImage(updatedFiles[fileID].data, function (imgEl) {
        var newImageWidth = 200;
        var newImageHeight = _Utils2.default.getProportionalImageHeight(imgEl, newImageWidth);
        var resizedImgSrc = _Utils2.default.resizeImage(imgEl, newImageWidth, newImageHeight);

        var updatedFiles = _extends({}, _this2.state.files);
        updatedFiles[fileID].previewEl = (0, _yoYo2.default)(_templateObject, file.name, resizedImgSrc);
        _this2.setState({ files: updatedFiles });
      });
    }

    if (this.opts.autoProceed) {
      this.emitter.emit('next');
    }
  };

  /**
   * Registers listeners for all global actions, like:
   * `file-add`, `file-remove`, `upload-progress`, `reset`
   *
   */


  Core.prototype.actions = function actions() {
    var _this3 = this;

    this.emitter.on('file-add', function (data) {
      _this3.addFile(data);
    });

    // `remove-file` removes a file from `state.files`, for example when
    // a user decides not to upload particular file and clicks a button to remove it
    this.emitter.on('file-remove', function (fileID) {
      var updatedFiles = _extends({}, _this3.state.files);
      delete updatedFiles[fileID];
      _this3.setState({ files: updatedFiles });
    });

    this.emitter.on('upload-progress', function (data) {
      var percentage = (data.bytesUploaded / data.bytesTotal * 100).toFixed(2);
      percentage = Math.round(percentage);

      var updatedFiles = _extends({}, _this3.state.files);
      updatedFiles[data.id].progress = percentage;
      updatedFiles[data.id].uploadedSize = data.bytesUploaded ? (0, _prettyBytes2.default)(data.bytesUploaded) : '?';

      var inProgress = Object.keys(updatedFiles).map(function (file) {
        return file.progress !== 0;
      });

      // calculate total progress, using the number of files currently uploading,
      // multiplied by 100 and the summ of individual progress of each file
      var progressMax = Object.keys(inProgress).length * 100;
      var progressAll = 0;
      Object.keys(updatedFiles).forEach(function (file) {
        progressAll = progressAll + updatedFiles[file].progress;
      });

      var totalProgress = progressAll * 100 / progressMax;

      _this3.setState({
        totalProgress: totalProgress,
        files: updatedFiles
      });
    });

    // `upload-success` adds successfully uploaded file to `state.uploadedFiles`
    // and fires `remove-file` to remove it from `state.files`
    this.emitter.on('upload-success', function (file) {
      var updatedFiles = _extends({}, _this3.state.files);
      updatedFiles[file.id] = file;
      _this3.setState({ files: updatedFiles });
      // this.log(this.state.uploadedFiles)
      // this.emitter.emit('file-remove', file.id)
    });
  };

  /**
   * Registers a plugin with Core
   *
   * @param {Class} Plugin object
   * @param {Object} options object that will be passed to Plugin later
   * @return {Object} self for chaining
   */


  Core.prototype.use = function use(Plugin, opts) {
    // Instantiate
    var plugin = new Plugin(this, opts);
    var pluginName = plugin.id;
    this.plugins[plugin.type] = this.plugins[plugin.type] || [];

    if (!pluginName) {
      throw new Error('Your plugin must have a name');
    }

    if (!plugin.type) {
      throw new Error('Your plugin must have a type');
    }

    var existsPluginAlready = this.getPlugin(pluginName);
    if (existsPluginAlready) {
      var msg = 'Already found a plugin named \'' + existsPluginAlready.name + '\'.\n        Tried to use: \'' + pluginName + '\'.\n        Uppy is currently limited to running one of every plugin.\n        Share your use case with us over at\n        https://github.com/transloadit/uppy/issues/\n        if you want us to reconsider.';
      throw new Error(msg);
    }

    this.plugins[plugin.type].push(plugin);

    return this;
  };

  /**
   * Find one Plugin by name
   *
   * @param string name description
   */


  Core.prototype.getPlugin = function getPlugin(name) {
    var foundPlugin = false;
    this.iteratePlugins(function (plugin) {
      var pluginName = plugin.id;
      if (pluginName === name) {
        foundPlugin = plugin;
        return false;
      }
    });
    return foundPlugin;
  };

  /**
   * Iterate through all `use`d plugins
   *
   * @param function method description
   */


  Core.prototype.iteratePlugins = function iteratePlugins(method) {
    var _this4 = this;

    Object.keys(this.plugins).forEach(function (pluginType) {
      _this4.plugins[pluginType].forEach(method);
    });
  };

  /**
   * Logs stuff to console, only if `debug` is set to true. Silent in production.
   *
   * @return {String|Object} to log
   */


  Core.prototype.log = function log(msg) {
    if (!this.opts.debug) {
      return;
    }
    if (msg === '' + msg) {
      console.log('LOG: ' + msg);
    } else {
      console.log('LOG↓');
      console.dir(msg);
    }
    global.uppyLog = global.uppyLog + '\n' + 'DEBUG LOG: ' + msg;
  };

  /**
   * Runs all plugins of the same type in parallel
   *
   * @param {string} type that wants to set progress
   * @param {array} files
   * @return {Promise} of all methods
   */


  Core.prototype.runType = function runType(type, method, files) {
    var methods = this.plugins[type].map(function (plugin) {
      return plugin[method](_Utils2.default.flatten(files));
    });

    return Promise.all(methods).catch(function (error) {
      return console.error(error);
    });
  };

  /**
   * Runs a waterfall of runType plugin packs, like so:
   * All preseters(data) --> All acquirers(data) --> All uploaders(data) --> done
   */


  Core.prototype.run = function run() {
    var _this5 = this;

    this.log('Core is run, initializing actions, installing plugins...');

    this.actions();

    // Forse set `autoProceed` option to false if there are multiple selector Plugins active
    if (this.plugins.acquirer && this.plugins.acquirer.length > 1) {
      this.opts.autoProceed = false;
    }

    // Install all plugins
    Object.keys(this.plugins).forEach(function (pluginType) {
      _this5.plugins[pluginType].forEach(function (plugin) {
        plugin.install();
      });
    });

    return;

    // Each Plugin can have `run` and/or `install` methods.
    // `install` adds event listeners and does some non-blocking work, useful for `progressindicator`,
    // `run` waits for the previous step to finish (user selects files) before proceeding
    // ['install', 'run'].forEach((method) => {
    //   // First we select only plugins of current type,
    //   // then create an array of runType methods of this plugins
    //   const typeMethods = this.types.filter((type) => this.plugins[type])
    //     .map((type) => this.runType.bind(this, type, method))
    //   // Run waterfall of typeMethods
    //   return Utils.promiseWaterfall(typeMethods)
    //     .then((result) => {
    //       // If results are empty, don't log upload results. Hasn't run yet.
    //       if (result[0] !== undefined) {
    //         this.log(result)
    //         this.log('Upload result -> success!')
    //         return result
    //       }
    //     })
    //     .catch((error) => this.log('Upload result -> failed:', error))
    // })
  };

  Core.prototype.initSocket = function initSocket(opts) {
    if (!this.socket) {
      this.socket = new _UppySocket2.default(opts);
    }

    return this.socket;
  };

  return Core;
}();

exports.default = Core;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../core/Translator":14,"../core/Utils":16,"../locales/en_US.js":17,"./UppySocket":15,"events":22,"pretty-bytes":1,"yo-yo":4}],14:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Translates strings with interpolation & pluralization support.Extensible with custom dictionaries
 * and pluralization functions.
 *
 * Borrows heavily from and inspired by Polyglot https://github.com/airbnb/polyglot.js,
 * basically a stripped-down version of it. Differences: pluralization functions are not hardcoded
 * and can be easily added among with dictionaries, nested objects are used for pluralization
 * as opposed to `||||` delimeter
 *
 * Usage example: `translator.translate('files_chosen', {smart_count: 3})`
 *
 * @param {object} opts
 */

var Translator = function () {
  function Translator(opts) {
    _classCallCheck(this, Translator);

    var defaultOptions = {};
    this.opts = _extends({}, defaultOptions, opts);
  }

  /**
   * Takes a string with placeholder variables like `%{smart_count} file selected`
   * and replaces it with values from options `{smart_count: 5}`
   *
   * @license https://github.com/airbnb/polyglot.js/blob/master/LICENSE
   * taken from https://github.com/airbnb/polyglot.js/blob/master/lib/polyglot.js#L299
   *
   * @param {string} phrase that needs interpolation, with placeholders
   * @param {object} options with values that will be used to replace placeholders
   * @return {string} interpolated
   */


  Translator.prototype.interpolate = function interpolate(phrase, options) {
    var replace = String.prototype.replace;
    var dollarRegex = /\$/g;
    var dollarBillsYall = '$$$$';

    for (var arg in options) {
      if (arg !== '_' && options.hasOwnProperty(arg)) {
        // Ensure replacement value is escaped to prevent special $-prefixed
        // regex replace tokens. the "$$$$" is needed because each "$" needs to
        // be escaped with "$" itself, and we need two in the resulting output.
        var replacement = options[arg];
        if (typeof replacement === 'string') {
          replacement = replace.call(options[arg], dollarRegex, dollarBillsYall);
        }
        // We create a new `RegExp` each time instead of using a more-efficient
        // string replace so that the same argument can be replaced multiple times
        // in the same phrase.
        phrase = replace.call(phrase, new RegExp('%\\{' + arg + '\\}', 'g'), replacement);
      }
    }
    return phrase;
  };

  /**
   * Public translate method
   *
   * @param {string} key
   * @param {object} options with values that will be used later to replace placeholders in string
   * @return {string} translated (and interpolated)
   */


  Translator.prototype.translate = function translate(key, options) {
    if (options && options.smart_count) {
      var plural = this.opts.locales.pluralize(options.smart_count);
      return this.interpolate(this.opts.locales.strings[key][plural], options);
    }

    return this.interpolate(this.opts.locales.strings[key], options);
  };

  return Translator;
}();

exports.default = Translator;

},{}],15:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var UppySocket = function () {
  function UppySocket(opts) {
    var _this = this;

    _classCallCheck(this, UppySocket);

    this.queued = [];
    this.isOpen = false;
    this.socket = new WebSocket(opts.target);
    this.emitter = new _events2.default.EventEmitter();

    this.socket.onopen = function (e) {
      _this.isOpen = true;

      while (_this.queued.length > 0 && _this.isOpen) {
        var first = _this.queued[0];
        _this.send(first.action, first.payload);
        _this.queued = _this.queued.slice(1);
      }
    };

    this.socket.onclose = function (e) {
      _this.isOpen = false;
    };

    this._handleMessage = this._handleMessage.bind(this);

    this.socket.onmessage = this._handleMessage;

    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.once = this.once.bind(this);
    this.send = this.send.bind(this);
  }

  UppySocket.prototype.send = function send(action, payload) {
    // attach uuid

    if (!this.isOpen) {
      this.queued.push({ action: action, payload: payload });
      return;
    }

    this.socket.send(JSON.stringify({
      action: action,
      payload: payload
    }));
  };

  UppySocket.prototype.on = function on(action, handler) {
    this.emitter.on(action, handler);
  };

  UppySocket.prototype.emit = function emit(action, payload) {
    this.emitter.emit(action, payload);
  };

  UppySocket.prototype.once = function once(action, handler) {
    this.emitter.once(action, handler);
  };

  UppySocket.prototype._handleMessage = function _handleMessage(e) {
    try {
      var message = JSON.parse(e.data);
      this.emit(message.action, message.payload);
    } catch (err) {
      console.log(err);
    }
  };

  return UppySocket;
}();

exports.default = UppySocket;

},{"events":22}],16:[function(require,module,exports){
'use strict';

exports.__esModule = true;
/**
 * A collection of small utility functions that help with dom manipulation, adding listeners,
 * promises and other good things.
 *
 * @module Utils
 */

/**
 * Runs a waterfall of promises: calls each task, passing the result
 * from the previous one as an argument. The first task is run with an empty array.
 *
 * @memberof Utils
 * @param {array} methods of Promises to run waterfall on
 * @return {Promise} of the final task
 */
function promiseWaterfall(methods) {
  var resolvedPromise = methods[0];
  var tasks = methods.slice(1);

  var finalTaskPromise = tasks.reduce(function (prevTaskPromise, task) {
    return prevTaskPromise.then(task);
  }, resolvedPromise([])); // initial value

  return finalTaskPromise;
}

/**
 * Shallow flatten nested arrays.
 */
function flatten(arr) {
  return [].concat.apply([], arr);
}

function isTouchDevice() {
  return 'ontouchstart' in window || // works on most browsers
  navigator.maxTouchPoints; // works on IE10/11 and Surface
};

/**
 * `querySelectorAll` that returns a normal array instead of fileList
 */
function qsa(selector, context) {
  return Array.prototype.slice.call((context || document).querySelectorAll(selector) || []);
}

/**
 * Partition array by a grouping function.
 * @param  {[type]} array      Input array
 * @param  {[type]} groupingFn Grouping function
 * @return {[type]}            Array of arrays
 */
function groupBy(array, groupingFn) {
  return array.reduce(function (result, item) {
    var key = groupingFn(item);
    var xs = result.get(key) || [];
    xs.push(item);
    result.set(key, xs);
    return result;
  }, new Map());
}

/**
 * Tests if every array element passes predicate
 * @param  {Array}  array       Input array
 * @param  {Object} predicateFn Predicate
 * @return {bool}               Every element pass
 */
function every(array, predicateFn) {
  return array.reduce(function (result, item) {
    if (!result) {
      return false;
    }

    return predicateFn(item);
  }, true);
}

/**
 * Converts list into array
*/
function toArray(list) {
  return Array.prototype.slice.call(list || [], 0);
}

/**
 * Takes a fileName and turns it into fileID, by converting to lowercase,
 * removing extra characters and adding unix timestamp
 *
 * @param {String} fileName
 *
 */
function generateFileID(fileName) {
  var fileID = fileName.toLowerCase();
  fileID = fileID.replace(/[^A-Z0-9]/ig, '');
  fileID = fileID + Date.now();
  return fileID;
}

function extend() {
  for (var _len = arguments.length, objs = Array(_len), _key = 0; _key < _len; _key++) {
    objs[_key] = arguments[_key];
  }

  return Object.assign.apply(this, [{}].concat(objs));
}

/**
 * Takes function or class, returns its name.
 * Because IE doesn’t support `constructor.name`.
 * https://gist.github.com/dfkaye/6384439, http://stackoverflow.com/a/15714445
 *
 * @param {Object} fn — function
 *
 */
function getFnName(fn) {
  var f = typeof fn === 'function';
  var s = f && (fn.name && ['', fn.name] || fn.toString().match(/function ([^\(]+)/));
  return !f && 'not a function' || s && s[1] || 'anonymous';
}

/**
 * Reads image as data URI from file object,
 * the one you get from input[type=file] or drag & drop.
 * This will only read image files, skipping others
 *
 * @param {Object} imgObject
 * @param {Function} cb callback that will be called once the image is read
 *
 */
function readImage(imgObject, cb) {
  // if (!imgObject.type.match(/image.*/)) {
  //   console.log('The file is not an image: ', imgObject.type)
  //   return
  // }

  var reader = new FileReader();
  reader.addEventListener('load', function (ev) {
    var imgSrcBase64 = ev.target.result;
    var img = new Image();
    img.onload = function () {
      return cb(img);
    };
    img.src = imgSrcBase64;
  });
  reader.addEventListener('error', function (err) {
    console.log('FileReader error' + err);
  });
  reader.readAsDataURL(imgObject);
}

function getProportionalImageHeight(img, newWidth) {
  var aspect = img.width / img.height;
  var newHeight = Math.round(newWidth / aspect);
  return newHeight;
}

/**
 * Resizes an image to specified width and height, using canvas
 * See https://davidwalsh.name/resize-image-canvas
 *
 * @param {Object} img element
 * @param {String} width of the resulting image
 * @param {String} height of the resulting image
 * @return {String} dataURL of the resized image
 */
function resizeImage(img, width, height) {
  // create an off-screen canvas
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  // set its dimension to target size
  canvas.width = width;
  canvas.height = height;

  // draw source image into the off-screen canvas:
  ctx.drawImage(img, 0, 0, width, height);

  // encode image to data-uri with base64 version of compressed image
  // canvas.toDataURL('image/jpeg', quality);  // quality = [0.0, 1.0]
  return canvas.toDataURL();
}

exports.default = {
  promiseWaterfall: promiseWaterfall,
  generateFileID: generateFileID,
  getFnName: getFnName,
  toArray: toArray,
  every: every,
  flatten: flatten,
  groupBy: groupBy,
  qsa: qsa,
  extend: extend,
  readImage: readImage,
  resizeImage: resizeImage,
  getProportionalImageHeight: getProportionalImageHeight,
  isTouchDevice: isTouchDevice
};

},{}],17:[function(require,module,exports){
'use strict';

var en_US = {};

en_US.strings = {
  chooseFile: 'Choose a file',
  youHaveChosen: 'You have chosen: %{fileName}',
  orDragDrop: 'or drag it here',
  filesChosen: {
    0: '%{smart_count} file selected',
    1: '%{smart_count} files selected'
  },
  filesUploaded: {
    0: '%{smart_count} file uploaded',
    1: '%{smart_count} files uploaded'
  },
  files: {
    0: '%{smart_count} file',
    1: '%{smart_count} files'
  },
  uploadFiles: {
    0: 'Upload %{smart_count} file',
    1: 'Upload %{smart_count} files'
  },
  selectToUpload: 'Select files to upload',
  closeModal: 'Close Modal',
  upload: 'Upload'
};

en_US.pluralize = function (n) {
  if (n === 1) {
    return 0;
  }
  return 1;
};

if (typeof window !== 'undefined' && typeof window.Uppy !== 'undefined') {
  window.Uppy.locales.en_US = en_US;
}

module.exports = en_US;

},{}],18:[function(require,module,exports){
'use strict';

var ru_RU = {};

ru_RU.strings = {
  chooseFile: 'Выберите файл',
  orDragDrop: 'или перенесите его сюда',
  youHaveChosen: 'Вы выбрали: %{file_name}',
  filesChosen: {
    0: 'Выбран %{smart_count} файл',
    1: 'Выбрано %{smart_count} файла',
    2: 'Выбрано %{smart_count} файлов'
  },
  upload: 'Загрузить'
};

ru_RU.pluralize = function (n) {
  if (n % 10 === 1 && n % 100 !== 11) {
    return 0;
  }

  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) {
    return 1;
  }

  return 2;
};

if (typeof window !== 'undefined' && typeof window.Uppy !== 'undefined') {
  window.Uppy.locales.ru_RU = ru_RU;
}

module.exports = ru_RU;

},{}],19:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _templateObject = _taggedTemplateLiteralLoose(['\n      <svg class="UppyIcon UppyModalTab-icon" width="28" height="28" viewBox="0 0 16 16">\n        <path d="M2.955 14.93l2.667-4.62H16l-2.667 4.62H2.955zm2.378-4.62l-2.666 4.62L0 10.31l5.19-8.99 2.666 4.62-2.523 4.37zm10.523-.25h-5.333l-5.19-8.99h5.334l5.19 8.99z"/>\n      </svg>\n    '], ['\n      <svg class="UppyIcon UppyModalTab-icon" width="28" height="28" viewBox="0 0 16 16">\n        <path d="M2.955 14.93l2.667-4.62H16l-2.667 4.62H2.955zm2.378-4.62l-2.666 4.62L0 10.31l5.19-8.99 2.666 4.62-2.523 4.37zm10.523-.25h-5.333l-5.19-8.99h5.334l5.19 8.99z"/>\n      </svg>\n    ']),
    _templateObject2 = _taggedTemplateLiteralLoose(['\n      <div class="UppyGoogleDrive-authenticate">\n        <h1>You need to authenticate with Google before selecting files.</h1>\n        <a href=', '>Authenticate</a>\n      </div>\n    '], ['\n      <div class="UppyGoogleDrive-authenticate">\n        <h1>You need to authenticate with Google before selecting files.</h1>\n        <a href=', '>Authenticate</a>\n      </div>\n    ']),
    _templateObject3 = _taggedTemplateLiteralLoose(['<li><button onclick=', '>', '</button></li> '], ['<li><button onclick=', '>', '</button></li> ']),
    _templateObject4 = _taggedTemplateLiteralLoose(['\n        <div>\n          <h1><span class="UppyGoogleDrive-fileIcon"><img src=', '/></span>', '</h1>\n          <ul>\n            <li>Type: ', '</li>\n            <li>Modified By Me: ', '</li>\n          </ul>\n          ', '\n        </div>\n      '], ['\n        <div>\n          <h1><span class="UppyGoogleDrive-fileIcon"><img src=', '/></span>', '</h1>\n          <ul>\n            <li>Type: ', '</li>\n            <li>Modified By Me: ', '</li>\n          </ul>\n          ', '\n        </div>\n      ']),
    _templateObject5 = _taggedTemplateLiteralLoose(['<img src=', ' class="UppyGoogleDrive-fileThumbnail" />'], ['<img src=', ' class="UppyGoogleDrive-fileThumbnail" />']),
    _templateObject6 = _taggedTemplateLiteralLoose([''], ['']),
    _templateObject7 = _taggedTemplateLiteralLoose(['\n      <div>\n        <div class="UppyGoogleDrive-header">\n          <ul class="UppyGoogleDrive-breadcrumbs">\n            ', '\n          </ul>\n        </div>\n        <div class="container-fluid">\n          <div class="row">\n            <div class="hidden-md-down col-lg-3 col-xl-3">\n              <ul class="UppyGoogleDrive-sidebar">\n                <li class="UppyGoogleDrive-filter"><input class="UppyGoogleDrive-focusInput" type=\'text\' onkeyup=', ' placeholder="Search.." value=', '/></li>\n                <li><button onclick=', '><img src="https://ssl.gstatic.com/docs/doclist/images/icon_11_collection_list_3.png"/> My Drive</button></li>\n                <li><button><img src="https://ssl.gstatic.com/docs/doclist/images/icon_11_shared_collection_list_1.png"/> Shared with me</button></li>\n                <li><button onclick=', '>Logout</button></li>\n              </ul>\n            </div>\n            <div class="col-md-12 col-lg-9 col-xl-6">\n              <div class="UppyGoogleDrive-browserContainer">\n                <table class="UppyGoogleDrive-browser">\n                  <thead>\n                    <tr>\n                      <td class="UppyGoogleDrive-sortableHeader" onclick=', '>Name</td>\n                      <td>Owner</td>\n                      <td class="UppyGoogleDrive-sortableHeader" onclick=', '>Last Modified</td>\n                      <td>Filesize</td>\n                    </tr>\n                  </thead>\n                  <tbody>\n                    ', '\n                    ', '\n                  </tbody>\n                </table>\n              </div>\n            </div>\n            <div class="hidden-lg-down col-xl-2">\n              <div class="UppyGoogleDrive-fileInfo">\n                ', '\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    '], ['\n      <div>\n        <div class="UppyGoogleDrive-header">\n          <ul class="UppyGoogleDrive-breadcrumbs">\n            ', '\n          </ul>\n        </div>\n        <div class="container-fluid">\n          <div class="row">\n            <div class="hidden-md-down col-lg-3 col-xl-3">\n              <ul class="UppyGoogleDrive-sidebar">\n                <li class="UppyGoogleDrive-filter"><input class="UppyGoogleDrive-focusInput" type=\'text\' onkeyup=', ' placeholder="Search.." value=', '/></li>\n                <li><button onclick=', '><img src="https://ssl.gstatic.com/docs/doclist/images/icon_11_collection_list_3.png"/> My Drive</button></li>\n                <li><button><img src="https://ssl.gstatic.com/docs/doclist/images/icon_11_shared_collection_list_1.png"/> Shared with me</button></li>\n                <li><button onclick=', '>Logout</button></li>\n              </ul>\n            </div>\n            <div class="col-md-12 col-lg-9 col-xl-6">\n              <div class="UppyGoogleDrive-browserContainer">\n                <table class="UppyGoogleDrive-browser">\n                  <thead>\n                    <tr>\n                      <td class="UppyGoogleDrive-sortableHeader" onclick=', '>Name</td>\n                      <td>Owner</td>\n                      <td class="UppyGoogleDrive-sortableHeader" onclick=', '>Last Modified</td>\n                      <td>Filesize</td>\n                    </tr>\n                  </thead>\n                  <tbody>\n                    ', '\n                    ', '\n                  </tbody>\n                </table>\n              </div>\n            </div>\n            <div class="hidden-lg-down col-xl-2">\n              <div class="UppyGoogleDrive-fileInfo">\n                ', '\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    ']),
    _templateObject8 = _taggedTemplateLiteralLoose(['\n      <tr class=', '\n        onclick=', '\n        ondblclick=', '>\n        <td><span class="UppyGoogleDrive-folderIcon"><img src=', '/></span> ', '</td>\n        <td>Me</td>\n        <td>', '</td>\n        <td>-</td>\n      </tr>\n    '], ['\n      <tr class=', '\n        onclick=', '\n        ondblclick=', '>\n        <td><span class="UppyGoogleDrive-folderIcon"><img src=', '/></span> ', '</td>\n        <td>Me</td>\n        <td>', '</td>\n        <td>-</td>\n      </tr>\n    ']),
    _templateObject9 = _taggedTemplateLiteralLoose(['\n      <div>\n        <span>\n          Something went wrong.  Probably our fault. ', '\n        </span>\n      </div>\n    '], ['\n      <div>\n        <span>\n          Something went wrong.  Probably our fault. ', '\n        </span>\n      </div>\n    ']);

var _Utils = require('../core/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _Plugin2 = require('./Plugin');

var _Plugin3 = _interopRequireDefault(_Plugin2);

require('whatwg-fetch');

var _yoYo = require('yo-yo');

var _yoYo2 = _interopRequireDefault(_yoYo);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteralLoose(strings, raw) { strings.raw = raw; return strings; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Google = function (_Plugin) {
  _inherits(Google, _Plugin);

  function Google(core, opts) {
    _classCallCheck(this, Google);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, core, opts));

    _this.type = 'acquirer';
    _this.id = 'GoogleDrive';
    _this.title = 'Google Drive';
    _this.icon = (0, _yoYo2.default)(_templateObject);

    _this.files = [];

    // Logic
    _this.addFile = _this.addFile.bind(_this);
    _this.getFolder = _this.getFolder.bind(_this);
    _this.handleClick = _this.handleClick.bind(_this);
    _this.logout = _this.logout.bind(_this);

    // Visual
    _this.renderBrowserItem = _this.renderBrowserItem.bind(_this);
    _this.filterItems = _this.filterItems.bind(_this);
    _this.filterQuery = _this.filterQuery.bind(_this);
    _this.renderAuth = _this.renderAuth.bind(_this);
    _this.renderBrowser = _this.renderBrowser.bind(_this);
    _this.sortByTitle = _this.sortByTitle.bind(_this);
    _this.sortByDate = _this.sortByDate.bind(_this);
    _this.render = _this.render.bind(_this);

    // set default options
    var defaultOptions = {};

    // merge default options with the ones set by user
    _this.opts = _extends({}, defaultOptions, opts);
    return _this;
  }

  Google.prototype.install = function install() {
    var _this2 = this;

    // Set default state for Google Drive
    this.core.setState({
      googleDrive: {
        authenticated: false,
        files: [],
        folders: [],
        directory: [{
          title: 'My Drive',
          id: 'root'
        }],
        active: {},
        filterInput: ''
      }
    });

    var target = this.opts.target;
    var plugin = this;
    this.target = this.mount(target, plugin);

    this.checkAuthentication().then(function (authenticated) {
      _this2.updateState({ authenticated: authenticated });

      if (authenticated) {
        return _this2.getFolder(_this2.core.getState().googleDrive.directory.id);
      }

      return authenticated;
    }).then(function (newState) {
      _this2.updateState(newState);
    });

    return;
  };

  Google.prototype.focus = function focus() {
    var firstInput = document.querySelector(this.target + ' .UppyGoogleDrive-focusInput');

    // only works for the first time if wrapped in setTimeout for some reason
    // firstInput.focus()
    setTimeout(function () {
      firstInput.focus();
    }, 10);
  };

  /**
   * Little shorthand to update the state with my new state
   */


  Google.prototype.updateState = function updateState(newState) {
    var state = this.core.state;

    var googleDrive = _extends({}, state.googleDrive, newState);

    this.core.setState({ googleDrive: googleDrive });
  };

  /**
   * Check to see if the user is authenticated.
   * @return {Promise} authentication status
   */


  Google.prototype.checkAuthentication = function checkAuthentication() {
    var _this3 = this;

    return fetch(this.opts.host + '/google/authorize', {
      method: 'get',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(function (res) {
      if (res.status >= 200 && res.status <= 300) {
        return res.json();
      } else {
        _this3.updateState({
          authenticated: false,
          error: true
        });
        var error = new Error(res.statusText);
        error.response = res;
        throw error;
      }
    }).then(function (data) {
      return data.isAuthenticated;
    }).catch(function (err) {
      return err;
    });
  };

  /**
   * Based on folder ID, fetch a new folder
   * @param  {String} id Folder id
   * @return {Promise}   Folders/files in folder
   */


  Google.prototype.getFolder = function getFolder() {
    var _this4 = this;

    var id = arguments.length <= 0 || arguments[0] === undefined ? 'root' : arguments[0];

    return fetch(this.opts.host + '/google/list?dir=' + id, {
      method: 'get',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(function (res) {
      if (res.status >= 200 && res.status <= 300) {
        return res.json().then(function (data) {
          // let result = Utils.groupBy(data.items, (item) => item.mimeType)
          var folders = [];
          var files = [];
          data.items.forEach(function (item) {
            if (item.mimeType === 'application/vnd.google-apps.folder') {
              folders.push(item);
            } else {
              files.push(item);
            }
          });
          return {
            folders: folders,
            files: files
          };
        });
      } else {
        _this4.handleError(res);
        var error = new Error(res.statusText);
        error.response = res;
        throw error;
      }
    }).catch(function (err) {
      return err;
    });
  };

  /**
   * Fetches new folder and adds to breadcrumb nav
   * @param  {String} id    Folder id
   * @param  {String} title Folder title
   */


  Google.prototype.getNextFolder = function getNextFolder(id, title) {
    var _this5 = this;

    this.getFolder(id).then(function (data) {
      var state = _this5.core.getState().googleDrive;

      var index = state.directory.findIndex(function (dir) {
        return id === dir.id;
      });
      var directory = void 0;

      if (index !== -1) {
        directory = state.directory.slice(0, index + 1);
      } else {
        directory = state.directory.concat([{
          id: id,
          title: title
        }]);
      }

      _this5.updateState(_Utils2.default.extend(data, { directory: directory }));
    });
  };

  Google.prototype.addFile = function addFile(file) {
    var tagFile = {
      source: this,
      data: file,
      name: file.title,
      type: this.getFileType(file),
      isRemote: true,
      remote: {
        url: this.opts.host + '/google/get?fileId=' + file.id,
        body: {
          fileId: file.id
        }
      }
    };

    this.core.emitter.emit('file-add', tagFile);
  };

  Google.prototype.handleError = function handleError(response) {
    var _this6 = this;

    this.checkAuthentication().then(function (authenticated) {
      _this6.updateState({ authenticated: authenticated });
    });
  };

  /**
   * Removes session token on client side.
   */


  Google.prototype.logout = function logout() {
    var _this7 = this;

    fetch(this.opts.host + '/google/logout?redirect=' + location.href, {
      method: 'get',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(function (res) {
      return res.json();
    }).then(function (res) {
      if (res.ok) {
        console.log('ok');
        var newState = {
          authenticated: false,
          files: [],
          folders: [],
          directory: [{
            title: 'My Drive',
            id: 'root'
          }]
        };

        _this7.updateState(newState);
      }
    });
  };

  Google.prototype.getFileType = function getFileType(file) {
    var fileTypes = {
      'application/vnd.google-apps.folder': 'Folder',
      'application/vnd.google-apps.document': 'Google Docs',
      'application/vnd.google-apps.spreadsheet': 'Google Sheets',
      'application/vnd.google-apps.presentation': 'Google Slides',
      'image/jpeg': 'JPEG Image',
      'image/png': 'PNG Image'
    };

    return fileTypes[file.mimeType] ? fileTypes[file.mimeType] : file.fileExtension.toUpperCase();
  };

  /**
   * Used to set active file/folder.
   * @param  {Object} file   Active file/folder
   */


  Google.prototype.handleClick = function handleClick(file) {
    var state = this.core.getState().googleDrive;
    var newState = _extends({}, state, {
      active: file
    });

    this.updateState(newState);
  };

  Google.prototype.filterQuery = function filterQuery(e) {
    var state = this.core.getState().googleDrive;
    this.updateState(_extends({}, state, {
      filterInput: e.target.value
    }));
  };

  Google.prototype.filterItems = function filterItems(items) {
    var state = this.core.getState().googleDrive;
    return items.filter(function (folder) {
      return folder.title.toLowerCase().indexOf(state.filterInput.toLowerCase()) !== -1;
    });
  };

  Google.prototype.sortByTitle = function sortByTitle() {
    var state = this.core.getState().googleDrive;
    var files = state.files;
    var folders = state.folders;
    var sorting = state.sorting;


    var sortedFiles = files.sort(function (fileA, fileB) {
      if (sorting === 'titleDescending') {
        return fileB.title.localeCompare(fileA.title);
      }
      return fileA.title.localeCompare(fileB.title);
    });

    var sortedFolders = folders.sort(function (folderA, folderB) {
      if (sorting === 'titleDescending') {
        return folderB.title.localeCompare(folderA.title);
      }
      return folderA.title.localeCompare(folderB.title);
    });

    this.updateState(_extends({}, state, {
      files: sortedFiles,
      folders: sortedFolders,
      sorting: sorting === 'titleDescending' ? 'titleAscending' : 'titleDescending'
    }));
  };

  Google.prototype.sortByDate = function sortByDate() {
    var state = this.core.getState().googleDrive;
    var files = state.files;
    var folders = state.folders;
    var sorting = state.sorting;


    var sortedFiles = files.sort(function (fileA, fileB) {
      var a = new Date(fileA.modifiedByMeDate);
      var b = new Date(fileB.modifiedByMeDate);

      if (sorting === 'dateDescending') {
        return a > b ? -1 : a < b ? 1 : 0;
      }
      return a > b ? 1 : a < b ? -1 : 0;
    });

    var sortedFolders = folders.sort(function (folderA, folderB) {
      var a = new Date(folderA.modifiedByMeDate);
      var b = new Date(folderB.modifiedByMeDate);

      if (sorting === 'dateDescending') {
        return a > b ? -1 : a < b ? 1 : 0;
      }

      return a > b ? 1 : a < b ? -1 : 0;
    });

    this.updateState(_extends({}, state, {
      files: sortedFiles,
      folders: sortedFolders,
      sorting: sorting === 'dateDescending' ? 'dateAscending' : 'dateDescending'
    }));
  };

  /**
   * Render user authentication view
   */


  Google.prototype.renderAuth = function renderAuth() {
    var state = btoa(JSON.stringify({
      redirect: location.href.split('#')[0]
    }));

    var link = this.opts.host + '/connect/google?state=' + state;
    return (0, _yoYo2.default)(_templateObject2, link);
  };

  /**
   * Render file browser
   * @param  {Object} state Google Drive state
   */


  Google.prototype.renderBrowser = function renderBrowser(state) {
    var _this8 = this;

    var folders = state.folders;
    var files = state.files;
    var previewElem = '';
    var isFileSelected = Object.keys(state.active).length !== 0 && JSON.stringify(state.active) !== JSON.stringify({});

    if (state.filterInput !== '') {
      folders = this.filterItems(state.folders);
      files = this.filterItems(state.files);
    }

    folders = folders.map(function (folder) {
      return _this8.renderBrowserItem(folder);
    });
    files = files.map(function (file) {
      return _this8.renderBrowserItem(file);
    });

    var breadcrumbs = state.directory.map(function (dir) {
      return (0, _yoYo2.default)(_templateObject3, _this8.getNextFolder.bind(_this8, dir.id, dir.title), dir.title);
    });
    if (isFileSelected) {
      previewElem = (0, _yoYo2.default)(_templateObject4, state.active.iconLink, state.active.title, this.getFileType(state.active), state.active.modifiedByMeDate, state.active.thumbnailLink ? (0, _yoYo2.default)(_templateObject5, state.active.thumbnailLink) : (0, _yoYo2.default)(_templateObject6));
    }

    return (0, _yoYo2.default)(_templateObject7, breadcrumbs, this.filterQuery, state.filterInput, this.getNextFolder.bind(this, 'root', 'My Drive'), this.logout, this.sortByTitle, this.sortByDate, folders, files, previewElem);
  };

  Google.prototype.renderBrowserItem = function renderBrowserItem(item) {
    var state = this.core.getState().googleDrive;
    var isAFileSelected = Object.keys(state.active).length !== 0 && JSON.stringify(state.active) !== JSON.stringify({});
    var isFolder = item.mimeType === 'application/vnd.google-apps.folder';
    return (0, _yoYo2.default)(_templateObject8, isAFileSelected && state.active.id === item.id ? 'is-active' : '', this.handleClick.bind(this, item), isFolder ? this.getNextFolder.bind(this, item.id, item.title) : this.addFile.bind(this, item), item.iconLink, item.title, item.modifiedByMeDate);
  };

  Google.prototype.renderError = function renderError(err) {
    return (0, _yoYo2.default)(_templateObject9, err);
  };

  Google.prototype.render = function render(state) {
    if (state.googleDrive.error) {
      return this.renderError();
    }

    if (!state.googleDrive.authenticated) {
      return this.renderAuth();
    }

    return this.renderBrowser(state.googleDrive);
  };

  return Google;
}(_Plugin3.default);

exports.default = Google;

},{"../core/Utils":16,"./Plugin":20,"whatwg-fetch":3,"yo-yo":4}],20:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _yoYo = require('yo-yo');

var _yoYo2 = _interopRequireDefault(_yoYo);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Boilerplate that all Plugins share - and should not be used
 * directly. It also shows which methods final plugins should implement/override,
 * this deciding on structure.
 *
 * @param {object} main Uppy core object
 * @param {object} object with plugin options
 * @return {array | string} files or success/fail message
 */

var Plugin = function () {
  function Plugin(core, opts) {
    _classCallCheck(this, Plugin);

    this.core = core;
    this.opts = opts;
    this.type = 'none';

    this.update = this.update.bind(this);
    this.mount = this.mount.bind(this);
    this.focus = this.focus.bind(this);
    this.install = this.install.bind(this);
  }

  Plugin.prototype.update = function update() {
    if (typeof this.el === 'undefined') {
      return;
    }

    var newEl = this.render(this.core.state);
    _yoYo2.default.update(this.el, newEl);
  };

  /**
   * Check if supplied `target` is a `string` or an `object`.
   * If it’s an object — target is a plugin, and we search `plugins`
   * for a plugin with same name and return its target.
   *
   * @param {String|Object} target
   *
   */


  Plugin.prototype.mount = function mount(target, plugin) {
    var callerPluginName = plugin.id;

    if (typeof target === 'string') {
      this.core.log('Installing ' + callerPluginName + ' to ' + target);

      // clear everything inside the target selector
      // if (replaceTargetContent) {
      //   document.querySelector(target).innerHTML = ''
      // }
      this.el = plugin.render(this.core.state);
      document.querySelector(target).appendChild(this.el);

      return target;
    } else {
      // TODO: is instantiating the plugin really the way to roll
      // just to get the plugin name?
      var Target = target;
      var targetPluginName = new Target().id;

      this.core.log('Installing ' + callerPluginName + ' to ' + targetPluginName);

      var targetPlugin = this.core.getPlugin(targetPluginName);
      var selectorTarget = targetPlugin.addTarget(plugin);

      return selectorTarget;
    }
  };

  Plugin.prototype.focus = function focus() {
    return;
  };

  Plugin.prototype.install = function install() {
    return;
  };

  Plugin.prototype.run = function run() {
    return;
  };

  return Plugin;
}();

exports.default = Plugin;

},{"yo-yo":4}],21:[function(require,module,exports){

},{}],22:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],23:[function(require,module,exports){
'use strict';

var _Core = require('../../../../src/core/Core.js');

var _Core2 = _interopRequireDefault(_Core);

var _GoogleDrive = require('../../../../src/plugins/GoogleDrive.js');

var _GoogleDrive2 = _interopRequireDefault(_GoogleDrive);

var _ru_RU = require('../../../../src/locales/ru_RU');

var _ru_RU2 = _interopRequireDefault(_ru_RU);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import Uppy from 'uppy/core'
// import { Tus10 } from 'uppy/plugins'
// import { ru_RU } from 'uppy/locales'

var uppy = new _Core2.default({ debug: true, wait: false, locales: _ru_RU2.default });

uppy.use(_GoogleDrive2.default, { endpoint: 'http://master.tus.io:3020/files/' }).run();

console.log('--> Uppy Bundled version with Tus10 & Russian language pack has loaded');

},{"../../../../src/core/Core.js":13,"../../../../src/locales/ru_RU":18,"../../../../src/plugins/GoogleDrive.js":19}]},{},[23])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvcHJldHR5LWJ5dGVzL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3ByZXR0eS1ieXRlcy9ub2RlX21vZHVsZXMvbnVtYmVyLWlzLW5hbi9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy93aGF0d2ctZmV0Y2gvZmV0Y2guanMiLCIuLi9ub2RlX21vZHVsZXMveW8teW8vaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMveW8teW8vbm9kZV9tb2R1bGVzL2JlbC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvYmVsL25vZGVfbW9kdWxlcy9nbG9iYWwvZG9jdW1lbnQuanMiLCIuLi9ub2RlX21vZHVsZXMveW8teW8vbm9kZV9tb2R1bGVzL2JlbC9ub2RlX21vZHVsZXMvZ2xvYmFsL3dpbmRvdy5qcyIsIi4uL25vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvYmVsL25vZGVfbW9kdWxlcy9oeXBlcngvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMveW8teW8vbm9kZV9tb2R1bGVzL2JlbC9ub2RlX21vZHVsZXMvaHlwZXJ4L25vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC1hdHRyaWJ1dGUtdG8tcHJvcGVydHkvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMveW8teW8vbm9kZV9tb2R1bGVzL2JlbC9ub2RlX21vZHVsZXMvb24tbG9hZC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvbW9ycGhkb20vbGliL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3lvLXlvL3VwZGF0ZS1ldmVudHMuanMiLCIuLi9zcmMvY29yZS9Db3JlLmpzIiwiLi4vc3JjL2NvcmUvVHJhbnNsYXRvci5qcyIsIi4uL3NyYy9jb3JlL1VwcHlTb2NrZXQuanMiLCIuLi9zcmMvY29yZS9VdGlscy5qcyIsIi4uL3NyYy9sb2NhbGVzL2VuX1VTLmpzIiwiLi4vc3JjL2xvY2FsZXMvcnVfUlUuanMiLCIuLi9zcmMvcGx1Z2lucy9Hb29nbGVEcml2ZS5qcyIsIi4uL3NyYy9wbHVnaW5zL1BsdWdpbi5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXJlc29sdmUvZW1wdHkuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsInNyYy9leGFtcGxlcy9pMThuL2FwcC5lczYiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2piQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMVNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBQ0E7QUFDQTtBQUNBOztBQUVBLElBQU0sT0FBTyxtQkFBUyxFQUFDLE9BQU8sSUFBUixFQUFjLE1BQU0sS0FBcEIsRUFBMkIsd0JBQTNCLEVBQVQsQ0FBYjs7QUFFQSxLQUNHLEdBREgsd0JBQ2MsRUFBQyxVQUFVLGtDQUFYLEVBRGQsRUFFRyxHQUZIOztBQUlBLFFBQVEsR0FBUixDQUFZLHdFQUFaIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcbnZhciBudW1iZXJJc05hbiA9IHJlcXVpcmUoJ251bWJlci1pcy1uYW4nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobnVtKSB7XG5cdGlmICh0eXBlb2YgbnVtICE9PSAnbnVtYmVyJyB8fCBudW1iZXJJc05hbihudW0pKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgYSBudW1iZXIsIGdvdCAnICsgdHlwZW9mIG51bSk7XG5cdH1cblxuXHR2YXIgZXhwb25lbnQ7XG5cdHZhciB1bml0O1xuXHR2YXIgbmVnID0gbnVtIDwgMDtcblx0dmFyIHVuaXRzID0gWydCJywgJ2tCJywgJ01CJywgJ0dCJywgJ1RCJywgJ1BCJywgJ0VCJywgJ1pCJywgJ1lCJ107XG5cblx0aWYgKG5lZykge1xuXHRcdG51bSA9IC1udW07XG5cdH1cblxuXHRpZiAobnVtIDwgMSkge1xuXHRcdHJldHVybiAobmVnID8gJy0nIDogJycpICsgbnVtICsgJyBCJztcblx0fVxuXG5cdGV4cG9uZW50ID0gTWF0aC5taW4oTWF0aC5mbG9vcihNYXRoLmxvZyhudW0pIC8gTWF0aC5sb2coMTAwMCkpLCB1bml0cy5sZW5ndGggLSAxKTtcblx0bnVtID0gTnVtYmVyKChudW0gLyBNYXRoLnBvdygxMDAwLCBleHBvbmVudCkpLnRvRml4ZWQoMikpO1xuXHR1bml0ID0gdW5pdHNbZXhwb25lbnRdO1xuXG5cdHJldHVybiAobmVnID8gJy0nIDogJycpICsgbnVtICsgJyAnICsgdW5pdDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlci5pc05hTiB8fCBmdW5jdGlvbiAoeCkge1xuXHRyZXR1cm4geCAhPT0geDtcbn07XG4iLCIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG5cbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgbGlzdCA9IHRoaXMubWFwW25hbWVdXG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICBsaXN0ID0gW11cbiAgICAgIHRoaXMubWFwW25hbWVdID0gbGlzdFxuICAgIH1cbiAgICBsaXN0LnB1c2godmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIHZhbHVlcyA9IHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gICAgcmV0dXJuIHZhbHVlcyA/IHZhbHVlc1swXSA6IG51bGxcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gfHwgW11cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBbbm9ybWFsaXplVmFsdWUodmFsdWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcy5tYXApLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgdGhpcy5tYXBbbmFtZV0uZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHZhbHVlLCBuYW1lLCB0aGlzKVxuICAgICAgfSwgdGhpcylcbiAgICB9LCB0aGlzKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2gobmFtZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkgeyBpdGVtcy5wdXNoKHZhbHVlKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKFtuYW1lLCB2YWx1ZV0pIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICBIZWFkZXJzLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID0gSGVhZGVycy5wcm90b3R5cGUuZW50cmllc1xuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpXG4gICAgICB9XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHkudG9TdHJpbmcoKVxuICAgICAgfSBlbHNlIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgQXJyYXlCdWZmZXIucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgLy8gT25seSBzdXBwb3J0IEFycmF5QnVmZmVycyBmb3IgUE9TVCBtZXRob2QuXG4gICAgICAgIC8vIFJlY2VpdmluZyBBcnJheUJ1ZmZlcnMgaGFwcGVucyB2aWEgQmxvYnMsIGluc3RlYWQuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbjtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QmxvYiAmJiB0aGlzLl9ib2R5QmxvYi50eXBlKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgdGhpcy5fYm9keUJsb2IudHlwZSlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgIH1cblxuICAgICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICByZXR1cm4gcmVqZWN0ZWQgPyByZWplY3RlZCA6IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5qc29uID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihKU09OLnBhcnNlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ11cblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKVxuICAgIHJldHVybiAobWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEpID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdChpbnB1dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdmFyIGJvZHkgPSBvcHRpb25zLmJvZHlcbiAgICBpZiAoUmVxdWVzdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnB1dCkpIHtcbiAgICAgIGlmIChpbnB1dC5ib2R5VXNlZCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKVxuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSBpbnB1dC51cmxcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBpbnB1dC5jcmVkZW50aWFsc1xuICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5wdXQuaGVhZGVycylcbiAgICAgIH1cbiAgICAgIHRoaXMubWV0aG9kID0gaW5wdXQubWV0aG9kXG4gICAgICB0aGlzLm1vZGUgPSBpbnB1dC5tb2RlXG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgYm9keSA9IGlucHV0Ll9ib2R5SW5pdFxuICAgICAgICBpbnB1dC5ib2R5VXNlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cmwgPSBpbnB1dFxuICAgIH1cblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8IHRoaXMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgfVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8IHRoaXMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzKVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBoZWFkZXJzKHhocikge1xuICAgIHZhciBoZWFkID0gbmV3IEhlYWRlcnMoKVxuICAgIHZhciBwYWlycyA9ICh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkgfHwgJycpLnRyaW0oKS5zcGxpdCgnXFxuJylcbiAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgdmFyIHNwbGl0ID0gaGVhZGVyLnRyaW0oKS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gc3BsaXQuc2hpZnQoKS50cmltKClcbiAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJzonKS50cmltKClcbiAgICAgIGhlYWQuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgfSlcbiAgICByZXR1cm4gaGVhZFxuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9IG9wdGlvbnMuc3RhdHVzVGV4dFxuICAgIHRoaXMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMgPyBvcHRpb25zLmhlYWRlcnMgOiBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBSZXNwb25zZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHRoaXMuX2JvZHlJbml0LCB7XG4gICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogdGhpcy5zdGF0dXNUZXh0LFxuICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnModGhpcy5oZWFkZXJzKSxcbiAgICAgIHVybDogdGhpcy51cmxcbiAgICB9KVxuICB9XG5cbiAgUmVzcG9uc2UuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMCwgc3RhdHVzVGV4dDogJyd9KVxuICAgIHJlc3BvbnNlLnR5cGUgPSAnZXJyb3InXG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICB2YXIgcmVkaXJlY3RTdGF0dXNlcyA9IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF1cblxuICBSZXNwb25zZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgc3RhdHVzKSB7XG4gICAgaWYgKHJlZGlyZWN0U3RhdHVzZXMuaW5kZXhPZihzdGF0dXMpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgc3RhdHVzIGNvZGUnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogc3RhdHVzLCBoZWFkZXJzOiB7bG9jYXRpb246IHVybH19KVxuICB9XG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVyc1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZVxuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZXF1ZXN0XG4gICAgICBpZiAoUmVxdWVzdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnB1dCkgJiYgIWluaXQpIHtcbiAgICAgICAgcmVxdWVzdCA9IGlucHV0XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgICB9XG5cbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG4gICAgICBmdW5jdGlvbiByZXNwb25zZVVSTCgpIHtcbiAgICAgICAgaWYgKCdyZXNwb25zZVVSTCcgaW4geGhyKSB7XG4gICAgICAgICAgcmV0dXJuIHhoci5yZXNwb25zZVVSTFxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXZvaWQgc2VjdXJpdHkgd2FybmluZ3Mgb24gZ2V0UmVzcG9uc2VIZWFkZXIgd2hlbiBub3QgYWxsb3dlZCBieSBDT1JTXG4gICAgICAgIGlmICgvXlgtUmVxdWVzdC1VUkw6L20udGVzdCh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpKSB7XG4gICAgICAgICAgcmV0dXJuIHhoci5nZXRSZXNwb25zZUhlYWRlcignWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHhoci5zdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogaGVhZGVycyh4aHIpLFxuICAgICAgICAgIHVybDogcmVzcG9uc2VVUkwoKVxuICAgICAgICB9XG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdpbmNsdWRlJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZVxuICAgICAgfVxuXG4gICAgICBpZiAoJ3Jlc3BvbnNlVHlwZScgaW4geGhyICYmIHN1cHBvcnQuYmxvYikge1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InXG4gICAgICB9XG5cbiAgICAgIHJlcXVlc3QuaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKG5hbWUsIHZhbHVlKVxuICAgICAgfSlcblxuICAgICAgeGhyLnNlbmQodHlwZW9mIHJlcXVlc3QuX2JvZHlJbml0ID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiByZXF1ZXN0Ll9ib2R5SW5pdClcbiAgICB9KVxuICB9XG4gIHNlbGYuZmV0Y2gucG9seWZpbGwgPSB0cnVlXG59KSh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDogdGhpcyk7XG4iLCJ2YXIgYmVsID0gcmVxdWlyZSgnYmVsJykgLy8gdHVybnMgdGVtcGxhdGUgdGFnIGludG8gRE9NIGVsZW1lbnRzXG52YXIgbW9ycGhkb20gPSByZXF1aXJlKCdtb3JwaGRvbScpIC8vIGVmZmljaWVudGx5IGRpZmZzICsgbW9ycGhzIHR3byBET00gZWxlbWVudHNcbnZhciBkZWZhdWx0RXZlbnRzID0gcmVxdWlyZSgnLi91cGRhdGUtZXZlbnRzLmpzJykgLy8gZGVmYXVsdCBldmVudHMgdG8gYmUgY29waWVkIHdoZW4gZG9tIGVsZW1lbnRzIHVwZGF0ZVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJlbFxuXG4vLyBUT0RPIG1vdmUgdGhpcyArIGRlZmF1bHRFdmVudHMgdG8gYSBuZXcgbW9kdWxlIG9uY2Ugd2UgcmVjZWl2ZSBtb3JlIGZlZWRiYWNrXG5tb2R1bGUuZXhwb3J0cy51cGRhdGUgPSBmdW5jdGlvbiAoZnJvbU5vZGUsIHRvTm9kZSwgb3B0cykge1xuICBpZiAoIW9wdHMpIG9wdHMgPSB7fVxuICBpZiAob3B0cy5ldmVudHMgIT09IGZhbHNlKSB7XG4gICAgaWYgKCFvcHRzLm9uQmVmb3JlTW9ycGhFbCkgb3B0cy5vbkJlZm9yZU1vcnBoRWwgPSBjb3BpZXJcbiAgfVxuXG4gIHJldHVybiBtb3JwaGRvbShmcm9tTm9kZSwgdG9Ob2RlLCBvcHRzKVxuXG4gIC8vIG1vcnBoZG9tIG9ubHkgY29waWVzIGF0dHJpYnV0ZXMuIHdlIGRlY2lkZWQgd2UgYWxzbyB3YW50ZWQgdG8gY29weSBldmVudHNcbiAgLy8gdGhhdCBjYW4gYmUgc2V0IHZpYSBhdHRyaWJ1dGVzXG4gIGZ1bmN0aW9uIGNvcGllciAoZiwgdCkge1xuICAgIC8vIGNvcHkgZXZlbnRzOlxuICAgIHZhciBldmVudHMgPSBvcHRzLmV2ZW50cyB8fCBkZWZhdWx0RXZlbnRzXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBldiA9IGV2ZW50c1tpXVxuICAgICAgaWYgKHRbZXZdKSB7IC8vIGlmIG5ldyBlbGVtZW50IGhhcyBhIHdoaXRlbGlzdGVkIGF0dHJpYnV0ZVxuICAgICAgICBmW2V2XSA9IHRbZXZdIC8vIHVwZGF0ZSBleGlzdGluZyBlbGVtZW50XG4gICAgICB9IGVsc2UgaWYgKGZbZXZdKSB7IC8vIGlmIGV4aXN0aW5nIGVsZW1lbnQgaGFzIGl0IGFuZCBuZXcgb25lIGRvZXNudFxuICAgICAgICBmW2V2XSA9IHVuZGVmaW5lZCAvLyByZW1vdmUgaXQgZnJvbSBleGlzdGluZyBlbGVtZW50XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNvcHkgdmFsdWVzIGZvciBmb3JtIGVsZW1lbnRzXG4gICAgaWYgKChmLm5vZGVOYW1lID09PSAnSU5QVVQnICYmIGYudHlwZSAhPT0gJ2ZpbGUnKSB8fCBmLm5vZGVOYW1lID09PSAnVEVYVEFSRUEnIHx8IGYubm9kZU5hbWUgPT09ICdTRUxFQ1QnKSB7XG4gICAgICBpZiAodC5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykgPT09IG51bGwpIHQudmFsdWUgPSBmLnZhbHVlXG4gICAgfVxuICB9XG59XG4iLCJ2YXIgZG9jdW1lbnQgPSByZXF1aXJlKCdnbG9iYWwvZG9jdW1lbnQnKVxudmFyIGh5cGVyeCA9IHJlcXVpcmUoJ2h5cGVyeCcpXG52YXIgb25sb2FkID0gcmVxdWlyZSgnb24tbG9hZCcpXG5cbnZhciBTVkdOUyA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZydcbnZhciBCT09MX1BST1BTID0ge1xuICBhdXRvZm9jdXM6IDEsXG4gIGNoZWNrZWQ6IDEsXG4gIGRlZmF1bHRjaGVja2VkOiAxLFxuICBkaXNhYmxlZDogMSxcbiAgZm9ybW5vdmFsaWRhdGU6IDEsXG4gIGluZGV0ZXJtaW5hdGU6IDEsXG4gIHJlYWRvbmx5OiAxLFxuICByZXF1aXJlZDogMSxcbiAgc2VsZWN0ZWQ6IDEsXG4gIHdpbGx2YWxpZGF0ZTogMVxufVxudmFyIFNWR19UQUdTID0gW1xuICAnc3ZnJyxcbiAgJ2FsdEdseXBoJywgJ2FsdEdseXBoRGVmJywgJ2FsdEdseXBoSXRlbScsICdhbmltYXRlJywgJ2FuaW1hdGVDb2xvcicsXG4gICdhbmltYXRlTW90aW9uJywgJ2FuaW1hdGVUcmFuc2Zvcm0nLCAnY2lyY2xlJywgJ2NsaXBQYXRoJywgJ2NvbG9yLXByb2ZpbGUnLFxuICAnY3Vyc29yJywgJ2RlZnMnLCAnZGVzYycsICdlbGxpcHNlJywgJ2ZlQmxlbmQnLCAnZmVDb2xvck1hdHJpeCcsXG4gICdmZUNvbXBvbmVudFRyYW5zZmVyJywgJ2ZlQ29tcG9zaXRlJywgJ2ZlQ29udm9sdmVNYXRyaXgnLCAnZmVEaWZmdXNlTGlnaHRpbmcnLFxuICAnZmVEaXNwbGFjZW1lbnRNYXAnLCAnZmVEaXN0YW50TGlnaHQnLCAnZmVGbG9vZCcsICdmZUZ1bmNBJywgJ2ZlRnVuY0InLFxuICAnZmVGdW5jRycsICdmZUZ1bmNSJywgJ2ZlR2F1c3NpYW5CbHVyJywgJ2ZlSW1hZ2UnLCAnZmVNZXJnZScsICdmZU1lcmdlTm9kZScsXG4gICdmZU1vcnBob2xvZ3knLCAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JywgJ2ZlU3BlY3VsYXJMaWdodGluZycsXG4gICdmZVNwb3RMaWdodCcsICdmZVRpbGUnLCAnZmVUdXJidWxlbmNlJywgJ2ZpbHRlcicsICdmb250JywgJ2ZvbnQtZmFjZScsXG4gICdmb250LWZhY2UtZm9ybWF0JywgJ2ZvbnQtZmFjZS1uYW1lJywgJ2ZvbnQtZmFjZS1zcmMnLCAnZm9udC1mYWNlLXVyaScsXG4gICdmb3JlaWduT2JqZWN0JywgJ2cnLCAnZ2x5cGgnLCAnZ2x5cGhSZWYnLCAnaGtlcm4nLCAnaW1hZ2UnLCAnbGluZScsXG4gICdsaW5lYXJHcmFkaWVudCcsICdtYXJrZXInLCAnbWFzaycsICdtZXRhZGF0YScsICdtaXNzaW5nLWdseXBoJywgJ21wYXRoJyxcbiAgJ3BhdGgnLCAncGF0dGVybicsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JhZGlhbEdyYWRpZW50JywgJ3JlY3QnLFxuICAnc2V0JywgJ3N0b3AnLCAnc3dpdGNoJywgJ3N5bWJvbCcsICd0ZXh0JywgJ3RleHRQYXRoJywgJ3RpdGxlJywgJ3RyZWYnLFxuICAndHNwYW4nLCAndXNlJywgJ3ZpZXcnLCAndmtlcm4nXG5dXG5cbmZ1bmN0aW9uIGJlbENyZWF0ZUVsZW1lbnQgKHRhZywgcHJvcHMsIGNoaWxkcmVuKSB7XG4gIHZhciBlbFxuXG4gIC8vIElmIGFuIHN2ZyB0YWcsIGl0IG5lZWRzIGEgbmFtZXNwYWNlXG4gIGlmIChTVkdfVEFHUy5pbmRleE9mKHRhZykgIT09IC0xKSB7XG4gICAgcHJvcHMubmFtZXNwYWNlID0gU1ZHTlNcbiAgfVxuXG4gIC8vIElmIHdlIGFyZSB1c2luZyBhIG5hbWVzcGFjZVxuICB2YXIgbnMgPSBmYWxzZVxuICBpZiAocHJvcHMubmFtZXNwYWNlKSB7XG4gICAgbnMgPSBwcm9wcy5uYW1lc3BhY2VcbiAgICBkZWxldGUgcHJvcHMubmFtZXNwYWNlXG4gIH1cblxuICAvLyBDcmVhdGUgdGhlIGVsZW1lbnRcbiAgaWYgKG5zKSB7XG4gICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsIHRhZylcbiAgfSBlbHNlIHtcbiAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKVxuICB9XG5cbiAgLy8gSWYgYWRkaW5nIG9ubG9hZCBldmVudHNcbiAgaWYgKHByb3BzLm9ubG9hZCB8fCBwcm9wcy5vbnVubG9hZCkge1xuICAgIHZhciBsb2FkID0gcHJvcHMub25sb2FkIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgdmFyIHVubG9hZCA9IHByb3BzLm9udW5sb2FkIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgb25sb2FkKGVsLCBmdW5jdGlvbiBiZWxfb25sb2FkICgpIHtcbiAgICAgIGxvYWQoZWwpXG4gICAgfSwgZnVuY3Rpb24gYmVsX29udW5sb2FkICgpIHtcbiAgICAgIHVubG9hZChlbClcbiAgICB9LFxuICAgIC8vIFdlIGhhdmUgdG8gdXNlIG5vbi1zdGFuZGFyZCBgY2FsbGVyYCB0byBmaW5kIHdobyBpbnZva2VzIGBiZWxDcmVhdGVFbGVtZW50YFxuICAgIGJlbENyZWF0ZUVsZW1lbnQuY2FsbGVyLmNhbGxlci5jYWxsZXIpXG4gICAgZGVsZXRlIHByb3BzLm9ubG9hZFxuICAgIGRlbGV0ZSBwcm9wcy5vbnVubG9hZFxuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSBwcm9wZXJ0aWVzXG4gIGZvciAodmFyIHAgaW4gcHJvcHMpIHtcbiAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgIHZhciBrZXkgPSBwLnRvTG93ZXJDYXNlKClcbiAgICAgIHZhciB2YWwgPSBwcm9wc1twXVxuICAgICAgLy8gTm9ybWFsaXplIGNsYXNzTmFtZVxuICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzbmFtZScpIHtcbiAgICAgICAga2V5ID0gJ2NsYXNzJ1xuICAgICAgICBwID0gJ2NsYXNzJ1xuICAgICAgfVxuICAgICAgLy8gVGhlIGZvciBhdHRyaWJ1dGUgZ2V0cyB0cmFuc2Zvcm1lZCB0byBodG1sRm9yLCBidXQgd2UganVzdCBzZXQgYXMgZm9yXG4gICAgICBpZiAocCA9PT0gJ2h0bWxGb3InKSB7XG4gICAgICAgIHAgPSAnZm9yJ1xuICAgICAgfVxuICAgICAgLy8gSWYgYSBwcm9wZXJ0eSBpcyBib29sZWFuLCBzZXQgaXRzZWxmIHRvIHRoZSBrZXlcbiAgICAgIGlmIChCT09MX1BST1BTW2tleV0pIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gJ3RydWUnKSB2YWwgPSBrZXlcbiAgICAgICAgZWxzZSBpZiAodmFsID09PSAnZmFsc2UnKSBjb250aW51ZVxuICAgICAgfVxuICAgICAgLy8gSWYgYSBwcm9wZXJ0eSBwcmVmZXJzIGJlaW5nIHNldCBkaXJlY3RseSB2cyBzZXRBdHRyaWJ1dGVcbiAgICAgIGlmIChrZXkuc2xpY2UoMCwgMikgPT09ICdvbicpIHtcbiAgICAgICAgZWxbcF0gPSB2YWxcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChucykge1xuICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKG51bGwsIHAsIHZhbClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUocCwgdmFsKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYXBwZW5kQ2hpbGQgKGNoaWxkcykge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShjaGlsZHMpKSByZXR1cm5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5vZGUgPSBjaGlsZHNbaV1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSB7XG4gICAgICAgIGFwcGVuZENoaWxkKG5vZGUpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgdHlwZW9mIG5vZGUgPT09ICdib29sZWFuJyB8fFxuICAgICAgICBub2RlIGluc3RhbmNlb2YgRGF0ZSB8fFxuICAgICAgICBub2RlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgIG5vZGUgPSBub2RlLnRvU3RyaW5nKClcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBub2RlID09PSAnc3RyaW5nJykge1xuICAgICAgICBpZiAoZWwubGFzdENoaWxkICYmIGVsLmxhc3RDaGlsZC5ub2RlTmFtZSA9PT0gJyN0ZXh0Jykge1xuICAgICAgICAgIGVsLmxhc3RDaGlsZC5ub2RlVmFsdWUgKz0gbm9kZVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKG5vZGUpXG4gICAgICB9XG5cbiAgICAgIGlmIChub2RlICYmIG5vZGUubm9kZVR5cGUpIHtcbiAgICAgICAgZWwuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgYXBwZW5kQ2hpbGQoY2hpbGRyZW4pXG5cbiAgcmV0dXJuIGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gaHlwZXJ4KGJlbENyZWF0ZUVsZW1lbnQpXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVFbGVtZW50ID0gYmVsQ3JlYXRlRWxlbWVudFxuIiwidmFyIHRvcExldmVsID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOlxuICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge31cbnZhciBtaW5Eb2MgPSByZXF1aXJlKCdtaW4tZG9jdW1lbnQnKTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY3VtZW50O1xufSBlbHNlIHtcbiAgICB2YXIgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddO1xuXG4gICAgaWYgKCFkb2NjeSkge1xuICAgICAgICBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J10gPSBtaW5Eb2M7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2NjeTtcbn1cbiIsImlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGdsb2JhbDtcbn0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpe1xuICAgIG1vZHVsZS5leHBvcnRzID0gc2VsZjtcbn0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7fTtcbn1cbiIsInZhciBhdHRyVG9Qcm9wID0gcmVxdWlyZSgnaHlwZXJzY3JpcHQtYXR0cmlidXRlLXRvLXByb3BlcnR5JylcblxudmFyIFZBUiA9IDAsIFRFWFQgPSAxLCBPUEVOID0gMiwgQ0xPU0UgPSAzLCBBVFRSID0gNFxudmFyIEFUVFJfS0VZID0gNSwgQVRUUl9LRVlfVyA9IDZcbnZhciBBVFRSX1ZBTFVFX1cgPSA3LCBBVFRSX1ZBTFVFID0gOFxudmFyIEFUVFJfVkFMVUVfU1EgPSA5LCBBVFRSX1ZBTFVFX0RRID0gMTBcbnZhciBBVFRSX0VRID0gMTEsIEFUVFJfQlJFQUsgPSAxMlxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChoLCBvcHRzKSB7XG4gIGggPSBhdHRyVG9Qcm9wKGgpXG4gIGlmICghb3B0cykgb3B0cyA9IHt9XG4gIHZhciBjb25jYXQgPSBvcHRzLmNvbmNhdCB8fCBmdW5jdGlvbiAoYSwgYikge1xuICAgIHJldHVybiBTdHJpbmcoYSkgKyBTdHJpbmcoYilcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAoc3RyaW5ncykge1xuICAgIHZhciBzdGF0ZSA9IFRFWFQsIHJlZyA9ICcnXG4gICAgdmFyIGFyZ2xlbiA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICB2YXIgcGFydHMgPSBbXVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA8IGFyZ2xlbiAtIDEpIHtcbiAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1tpKzFdXG4gICAgICAgIHZhciBwID0gcGFyc2Uoc3RyaW5nc1tpXSlcbiAgICAgICAgdmFyIHhzdGF0ZSA9IHN0YXRlXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFJfVkFMVUVfRFEpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSkgeHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSX1ZBTFVFX1cpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUikgeHN0YXRlID0gQVRUUl9LRVlcbiAgICAgICAgcC5wdXNoKFsgVkFSLCB4c3RhdGUsIGFyZyBdKVxuICAgICAgICBwYXJ0cy5wdXNoLmFwcGx5KHBhcnRzLCBwKVxuICAgICAgfSBlbHNlIHBhcnRzLnB1c2guYXBwbHkocGFydHMsIHBhcnNlKHN0cmluZ3NbaV0pKVxuICAgIH1cblxuICAgIHZhciB0cmVlID0gW251bGwse30sW11dXG4gICAgdmFyIHN0YWNrID0gW1t0cmVlLC0xXV1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY3VyID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzBdXG4gICAgICB2YXIgcCA9IHBhcnRzW2ldLCBzID0gcFswXVxuICAgICAgaWYgKHMgPT09IE9QRU4gJiYgL15cXC8vLnRlc3QocFsxXSkpIHtcbiAgICAgICAgdmFyIGl4ID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzFdXG4gICAgICAgIGlmIChzdGFjay5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgc3RhY2sucG9wKClcbiAgICAgICAgICBzdGFja1tzdGFjay5sZW5ndGgtMV1bMF1bMl1baXhdID0gaChcbiAgICAgICAgICAgIGN1clswXSwgY3VyWzFdLCBjdXJbMl0ubGVuZ3RoID8gY3VyWzJdIDogdW5kZWZpbmVkXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IE9QRU4pIHtcbiAgICAgICAgdmFyIGMgPSBbcFsxXSx7fSxbXV1cbiAgICAgICAgY3VyWzJdLnB1c2goYylcbiAgICAgICAgc3RhY2sucHVzaChbYyxjdXJbMl0ubGVuZ3RoLTFdKVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0tFWSB8fCAocyA9PT0gVkFSICYmIHBbMV0gPT09IEFUVFJfS0VZKSkge1xuICAgICAgICB2YXIga2V5ID0gJydcbiAgICAgICAgdmFyIGNvcHlLZXlcbiAgICAgICAgZm9yICg7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGtleSA9IGNvbmNhdChrZXksIHBhcnRzW2ldWzFdKVxuICAgICAgICAgIH0gZWxzZSBpZiAocGFydHNbaV1bMF0gPT09IFZBUiAmJiBwYXJ0c1tpXVsxXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGFydHNbaV1bMl0gPT09ICdvYmplY3QnICYmICFrZXkpIHtcbiAgICAgICAgICAgICAgZm9yIChjb3B5S2V5IGluIHBhcnRzW2ldWzJdKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzW2ldWzJdLmhhc093blByb3BlcnR5KGNvcHlLZXkpICYmICFjdXJbMV1bY29weUtleV0pIHtcbiAgICAgICAgICAgICAgICAgIGN1clsxXVtjb3B5S2V5XSA9IHBhcnRzW2ldWzJdW2NvcHlLZXldXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBrZXkgPSBjb25jYXQoa2V5LCBwYXJ0c1tpXVsyXSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IEFUVFJfRVEpIGkrK1xuICAgICAgICB2YXIgaiA9IGlcbiAgICAgICAgZm9yICg7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9WQUxVRSB8fCBwYXJ0c1tpXVswXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGlmICghY3VyWzFdW2tleV0pIGN1clsxXVtrZXldID0gc3RyZm4ocGFydHNbaV1bMV0pXG4gICAgICAgICAgICBlbHNlIGN1clsxXVtrZXldID0gY29uY2F0KGN1clsxXVtrZXldLCBwYXJ0c1tpXVsxXSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcnRzW2ldWzBdID09PSBWQVJcbiAgICAgICAgICAmJiAocGFydHNbaV1bMV0gPT09IEFUVFJfVkFMVUUgfHwgcGFydHNbaV1bMV0gPT09IEFUVFJfS0VZKSkge1xuICAgICAgICAgICAgaWYgKCFjdXJbMV1ba2V5XSkgY3VyWzFdW2tleV0gPSBzdHJmbihwYXJ0c1tpXVsyXSlcbiAgICAgICAgICAgIGVsc2UgY3VyWzFdW2tleV0gPSBjb25jYXQoY3VyWzFdW2tleV0sIHBhcnRzW2ldWzJdKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoa2V5Lmxlbmd0aCAmJiAhY3VyWzFdW2tleV0gJiYgaSA9PT0galxuICAgICAgICAgICAgJiYgKHBhcnRzW2ldWzBdID09PSBDTE9TRSB8fCBwYXJ0c1tpXVswXSA9PT0gQVRUUl9CUkVBSykpIHtcbiAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2UvaW5mcmFzdHJ1Y3R1cmUuaHRtbCNib29sZWFuLWF0dHJpYnV0ZXNcbiAgICAgICAgICAgICAgLy8gZW1wdHkgc3RyaW5nIGlzIGZhbHN5LCBub3Qgd2VsbCBiZWhhdmVkIHZhbHVlIGluIGJyb3dzZXJcbiAgICAgICAgICAgICAgY3VyWzFdW2tleV0gPSBrZXkudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgY3VyWzFdW3BbMV1dID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChzID09PSBWQVIgJiYgcFsxXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgY3VyWzFdW3BbMl1dID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChzID09PSBDTE9TRSkge1xuICAgICAgICBpZiAoc2VsZkNsb3NpbmcoY3VyWzBdKSAmJiBzdGFjay5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgaXggPSBzdGFja1tzdGFjay5sZW5ndGgtMV1bMV1cbiAgICAgICAgICBzdGFjay5wb3AoKVxuICAgICAgICAgIHN0YWNrW3N0YWNrLmxlbmd0aC0xXVswXVsyXVtpeF0gPSBoKFxuICAgICAgICAgICAgY3VyWzBdLCBjdXJbMV0sIGN1clsyXS5sZW5ndGggPyBjdXJbMl0gOiB1bmRlZmluZWRcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVkFSICYmIHBbMV0gPT09IFRFWFQpIHtcbiAgICAgICAgaWYgKHBbMl0gPT09IHVuZGVmaW5lZCB8fCBwWzJdID09PSBudWxsKSBwWzJdID0gJydcbiAgICAgICAgZWxzZSBpZiAoIXBbMl0pIHBbMl0gPSBjb25jYXQoJycsIHBbMl0pXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHBbMl1bMF0pKSB7XG4gICAgICAgICAgY3VyWzJdLnB1c2guYXBwbHkoY3VyWzJdLCBwWzJdKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGN1clsyXS5wdXNoKHBbMl0pXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVEVYVCkge1xuICAgICAgICBjdXJbMl0ucHVzaChwWzFdKVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0VRIHx8IHMgPT09IEFUVFJfQlJFQUspIHtcbiAgICAgICAgLy8gbm8tb3BcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5oYW5kbGVkOiAnICsgcylcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHJlZVsyXS5sZW5ndGggPiAxICYmIC9eXFxzKiQvLnRlc3QodHJlZVsyXVswXSkpIHtcbiAgICAgIHRyZWVbMl0uc2hpZnQoKVxuICAgIH1cblxuICAgIGlmICh0cmVlWzJdLmxlbmd0aCA+IDJcbiAgICB8fCAodHJlZVsyXS5sZW5ndGggPT09IDIgJiYgL1xcUy8udGVzdCh0cmVlWzJdWzFdKSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ211bHRpcGxlIHJvb3QgZWxlbWVudHMgbXVzdCBiZSB3cmFwcGVkIGluIGFuIGVuY2xvc2luZyB0YWcnXG4gICAgICApXG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KHRyZWVbMl1bMF0pICYmIHR5cGVvZiB0cmVlWzJdWzBdWzBdID09PSAnc3RyaW5nJ1xuICAgICYmIEFycmF5LmlzQXJyYXkodHJlZVsyXVswXVsyXSkpIHtcbiAgICAgIHRyZWVbMl1bMF0gPSBoKHRyZWVbMl1bMF1bMF0sIHRyZWVbMl1bMF1bMV0sIHRyZWVbMl1bMF1bMl0pXG4gICAgfVxuICAgIHJldHVybiB0cmVlWzJdWzBdXG5cbiAgICBmdW5jdGlvbiBwYXJzZSAoc3RyKSB7XG4gICAgICB2YXIgcmVzID0gW11cbiAgICAgIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XKSBzdGF0ZSA9IEFUVFJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjID0gc3RyLmNoYXJBdChpKVxuICAgICAgICBpZiAoc3RhdGUgPT09IFRFWFQgJiYgYyA9PT0gJzwnKSB7XG4gICAgICAgICAgaWYgKHJlZy5sZW5ndGgpIHJlcy5wdXNoKFtURVhULCByZWddKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBPUEVOXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJz4nICYmICFxdW90KHN0YXRlKSkge1xuICAgICAgICAgIGlmIChzdGF0ZSA9PT0gT1BFTikge1xuICAgICAgICAgICAgcmVzLnB1c2goW09QRU4scmVnXSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXMucHVzaChbQ0xPU0VdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBURVhUXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IFRFWFQpIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBPUEVOICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbT1BFTiwgcmVnXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBPUEVOKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUiAmJiAvW1xcdy1dLy50ZXN0KGMpKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWVxuICAgICAgICAgIHJlZyA9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUiAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgaWYgKHJlZy5sZW5ndGgpIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0JSRUFLXSlcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkgJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWV9XXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZICYmIGMgPT09ICc9Jykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddLFtBVFRSX0VRXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9XXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmICgoc3RhdGUgPT09IEFUVFJfS0VZX1cgfHwgc3RhdGUgPT09IEFUVFIpICYmIGMgPT09ICc9Jykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0VRXSlcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfV1xuICAgICAgICB9IGVsc2UgaWYgKChzdGF0ZSA9PT0gQVRUUl9LRVlfVyB8fCBzdGF0ZSA9PT0gQVRUUikgJiYgIS9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9CUkVBS10pXG4gICAgICAgICAgaWYgKC9bXFx3LV0vLnRlc3QoYykpIHtcbiAgICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgICAgICBzdGF0ZSA9IEFUVFJfS0VZXG4gICAgICAgICAgfSBlbHNlIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgYyA9PT0gJ1wiJykge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9EUVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgYyA9PT0gXCInXCIpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfU1FcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSAmJiBjID09PSAnXCInKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSxbQVRUUl9CUkVBS10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSAmJiBjID09PSBcIidcIikge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10sW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVyAmJiAhL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICAgIGktLVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddLFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRXG4gICAgICAgIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHN0YXRlID09PSBURVhUICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW1RFWFQscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHN0cmZuICh4KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKSByZXR1cm4geFxuICAgIGVsc2UgaWYgKHR5cGVvZiB4ID09PSAnc3RyaW5nJykgcmV0dXJuIHhcbiAgICBlbHNlIGlmICh4ICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0JykgcmV0dXJuIHhcbiAgICBlbHNlIHJldHVybiBjb25jYXQoJycsIHgpXG4gIH1cbn1cblxuZnVuY3Rpb24gcXVvdCAoc3RhdGUpIHtcbiAgcmV0dXJuIHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRXG59XG5cbnZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5XG5mdW5jdGlvbiBoYXMgKG9iaiwga2V5KSB7IHJldHVybiBoYXNPd24uY2FsbChvYmosIGtleSkgfVxuXG52YXIgY2xvc2VSRSA9IFJlZ0V4cCgnXignICsgW1xuICAnYXJlYScsICdiYXNlJywgJ2Jhc2Vmb250JywgJ2Jnc291bmQnLCAnYnInLCAnY29sJywgJ2NvbW1hbmQnLCAnZW1iZWQnLFxuICAnZnJhbWUnLCAnaHInLCAnaW1nJywgJ2lucHV0JywgJ2lzaW5kZXgnLCAna2V5Z2VuJywgJ2xpbmsnLCAnbWV0YScsICdwYXJhbScsXG4gICdzb3VyY2UnLCAndHJhY2snLCAnd2JyJyxcbiAgLy8gU1ZHIFRBR1NcbiAgJ2FuaW1hdGUnLCAnYW5pbWF0ZVRyYW5zZm9ybScsICdjaXJjbGUnLCAnY3Vyc29yJywgJ2Rlc2MnLCAnZWxsaXBzZScsXG4gICdmZUJsZW5kJywgJ2ZlQ29sb3JNYXRyaXgnLCAnZmVDb21wb25lbnRUcmFuc2ZlcicsICdmZUNvbXBvc2l0ZScsXG4gICdmZUNvbnZvbHZlTWF0cml4JywgJ2ZlRGlmZnVzZUxpZ2h0aW5nJywgJ2ZlRGlzcGxhY2VtZW50TWFwJyxcbiAgJ2ZlRGlzdGFudExpZ2h0JywgJ2ZlRmxvb2QnLCAnZmVGdW5jQScsICdmZUZ1bmNCJywgJ2ZlRnVuY0cnLCAnZmVGdW5jUicsXG4gICdmZUdhdXNzaWFuQmx1cicsICdmZUltYWdlJywgJ2ZlTWVyZ2VOb2RlJywgJ2ZlTW9ycGhvbG9neScsXG4gICdmZU9mZnNldCcsICdmZVBvaW50TGlnaHQnLCAnZmVTcGVjdWxhckxpZ2h0aW5nJywgJ2ZlU3BvdExpZ2h0JywgJ2ZlVGlsZScsXG4gICdmZVR1cmJ1bGVuY2UnLCAnZm9udC1mYWNlLWZvcm1hdCcsICdmb250LWZhY2UtbmFtZScsICdmb250LWZhY2UtdXJpJyxcbiAgJ2dseXBoJywgJ2dseXBoUmVmJywgJ2hrZXJuJywgJ2ltYWdlJywgJ2xpbmUnLCAnbWlzc2luZy1nbHlwaCcsICdtcGF0aCcsXG4gICdwYXRoJywgJ3BvbHlnb24nLCAncG9seWxpbmUnLCAncmVjdCcsICdzZXQnLCAnc3RvcCcsICd0cmVmJywgJ3VzZScsICd2aWV3JyxcbiAgJ3ZrZXJuJ1xuXS5qb2luKCd8JykgKyAnKSg/OltcXC4jXVthLXpBLVowLTlcXHUwMDdGLVxcdUZGRkZfOi1dKykqJCcpXG5mdW5jdGlvbiBzZWxmQ2xvc2luZyAodGFnKSB7IHJldHVybiBjbG9zZVJFLnRlc3QodGFnKSB9XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGF0dHJpYnV0ZVRvUHJvcGVydHlcblxudmFyIHRyYW5zZm9ybSA9IHtcbiAgJ2NsYXNzJzogJ2NsYXNzTmFtZScsXG4gICdmb3InOiAnaHRtbEZvcicsXG4gICdodHRwLWVxdWl2JzogJ2h0dHBFcXVpdidcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlVG9Qcm9wZXJ0eSAoaCkge1xuICByZXR1cm4gZnVuY3Rpb24gKHRhZ05hbWUsIGF0dHJzLCBjaGlsZHJlbikge1xuICAgIGZvciAodmFyIGF0dHIgaW4gYXR0cnMpIHtcbiAgICAgIGlmIChhdHRyIGluIHRyYW5zZm9ybSkge1xuICAgICAgICBhdHRyc1t0cmFuc2Zvcm1bYXR0cl1dID0gYXR0cnNbYXR0cl1cbiAgICAgICAgZGVsZXRlIGF0dHJzW2F0dHJdXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBoKHRhZ05hbWUsIGF0dHJzLCBjaGlsZHJlbilcbiAgfVxufVxuIiwiLyogZ2xvYmFsIE11dGF0aW9uT2JzZXJ2ZXIgKi9cbnZhciBkb2N1bWVudCA9IHJlcXVpcmUoJ2dsb2JhbC9kb2N1bWVudCcpXG52YXIgd2luZG93ID0gcmVxdWlyZSgnZ2xvYmFsL3dpbmRvdycpXG52YXIgd2F0Y2ggPSBPYmplY3QuY3JlYXRlKG51bGwpXG52YXIgS0VZX0lEID0gJ29ubG9hZGlkJyArIChuZXcgRGF0ZSgpICUgOWU2KS50b1N0cmluZygzNilcbnZhciBLRVlfQVRUUiA9ICdkYXRhLScgKyBLRVlfSURcbnZhciBJTkRFWCA9IDBcblxuaWYgKHdpbmRvdyAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcikge1xuICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAobXV0YXRpb25zKSB7XG4gICAgaWYgKE9iamVjdC5rZXlzKHdhdGNoKS5sZW5ndGggPCAxKSByZXR1cm5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG11dGF0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKG11dGF0aW9uc1tpXS5hdHRyaWJ1dGVOYW1lID09PSBLRVlfQVRUUikge1xuICAgICAgICBlYWNoQXR0cihtdXRhdGlvbnNbaV0sIHR1cm5vbiwgdHVybm9mZilcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIGVhY2hNdXRhdGlvbihtdXRhdGlvbnNbaV0ucmVtb3ZlZE5vZGVzLCB0dXJub2ZmKVxuICAgICAgZWFjaE11dGF0aW9uKG11dGF0aW9uc1tpXS5hZGRlZE5vZGVzLCB0dXJub24pXG4gICAgfVxuICB9KVxuICBvYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHtcbiAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgc3VidHJlZTogdHJ1ZSxcbiAgICBhdHRyaWJ1dGVzOiB0cnVlLFxuICAgIGF0dHJpYnV0ZU9sZFZhbHVlOiB0cnVlLFxuICAgIGF0dHJpYnV0ZUZpbHRlcjogW0tFWV9BVFRSXVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG9ubG9hZCAoZWwsIG9uLCBvZmYsIGNhbGxlcikge1xuICBvbiA9IG9uIHx8IGZ1bmN0aW9uICgpIHt9XG4gIG9mZiA9IG9mZiB8fCBmdW5jdGlvbiAoKSB7fVxuICBlbC5zZXRBdHRyaWJ1dGUoS0VZX0FUVFIsICdvJyArIElOREVYKVxuICB3YXRjaFsnbycgKyBJTkRFWF0gPSBbb24sIG9mZiwgMCwgY2FsbGVyIHx8IG9ubG9hZC5jYWxsZXJdXG4gIElOREVYICs9IDFcbiAgcmV0dXJuIGVsXG59XG5cbmZ1bmN0aW9uIHR1cm5vbiAoaW5kZXgsIGVsKSB7XG4gIGlmICh3YXRjaFtpbmRleF1bMF0gJiYgd2F0Y2hbaW5kZXhdWzJdID09PSAwKSB7XG4gICAgd2F0Y2hbaW5kZXhdWzBdKGVsKVxuICAgIHdhdGNoW2luZGV4XVsyXSA9IDFcbiAgfVxufVxuXG5mdW5jdGlvbiB0dXJub2ZmIChpbmRleCwgZWwpIHtcbiAgaWYgKHdhdGNoW2luZGV4XVsxXSAmJiB3YXRjaFtpbmRleF1bMl0gPT09IDEpIHtcbiAgICB3YXRjaFtpbmRleF1bMV0oZWwpXG4gICAgd2F0Y2hbaW5kZXhdWzJdID0gMFxuICB9XG59XG5cbmZ1bmN0aW9uIGVhY2hBdHRyIChtdXRhdGlvbiwgb24sIG9mZikge1xuICB2YXIgbmV3VmFsdWUgPSBtdXRhdGlvbi50YXJnZXQuZ2V0QXR0cmlidXRlKEtFWV9BVFRSKVxuICBpZiAoc2FtZU9yaWdpbihtdXRhdGlvbi5vbGRWYWx1ZSwgbmV3VmFsdWUpKSB7XG4gICAgd2F0Y2hbbmV3VmFsdWVdID0gd2F0Y2hbbXV0YXRpb24ub2xkVmFsdWVdXG4gICAgcmV0dXJuXG4gIH1cbiAgaWYgKHdhdGNoW211dGF0aW9uLm9sZFZhbHVlXSkge1xuICAgIG9mZihtdXRhdGlvbi5vbGRWYWx1ZSwgbXV0YXRpb24udGFyZ2V0KVxuICB9XG4gIGlmICh3YXRjaFtuZXdWYWx1ZV0pIHtcbiAgICBvbihuZXdWYWx1ZSwgbXV0YXRpb24udGFyZ2V0KVxuICB9XG59XG5cbmZ1bmN0aW9uIHNhbWVPcmlnaW4gKG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICBpZiAoIW9sZFZhbHVlIHx8ICFuZXdWYWx1ZSkgcmV0dXJuIGZhbHNlXG4gIHJldHVybiB3YXRjaFtvbGRWYWx1ZV1bM10gPT09IHdhdGNoW25ld1ZhbHVlXVszXVxufVxuXG5mdW5jdGlvbiBlYWNoTXV0YXRpb24gKG5vZGVzLCBmbikge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHdhdGNoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKG5vZGVzW2ldICYmIG5vZGVzW2ldLmdldEF0dHJpYnV0ZSAmJiBub2Rlc1tpXS5nZXRBdHRyaWJ1dGUoS0VZX0FUVFIpKSB7XG4gICAgICB2YXIgb25sb2FkaWQgPSBub2Rlc1tpXS5nZXRBdHRyaWJ1dGUoS0VZX0FUVFIpXG4gICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgaWYgKG9ubG9hZGlkID09PSBrKSB7XG4gICAgICAgICAgZm4oaywgbm9kZXNbaV0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICAgIGlmIChub2Rlc1tpXS5jaGlsZE5vZGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGVhY2hNdXRhdGlvbihub2Rlc1tpXS5jaGlsZE5vZGVzLCBmbilcbiAgICB9XG4gIH1cbn1cbiIsIi8vIENyZWF0ZSBhIHJhbmdlIG9iamVjdCBmb3IgZWZmaWNlbnRseSByZW5kZXJpbmcgc3RyaW5ncyB0byBlbGVtZW50cy5cbnZhciByYW5nZTtcblxudmFyIHRlc3RFbCA9ICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSA/XG4gICAgZG9jdW1lbnQuYm9keSB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSA6XG4gICAge307XG5cbnZhciBYSFRNTCA9ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sJztcbnZhciBFTEVNRU5UX05PREUgPSAxO1xudmFyIFRFWFRfTk9ERSA9IDM7XG52YXIgQ09NTUVOVF9OT0RFID0gODtcblxuLy8gRml4ZXMgPGh0dHBzOi8vZ2l0aHViLmNvbS9wYXRyaWNrLXN0ZWVsZS1pZGVtL21vcnBoZG9tL2lzc3Vlcy8zMj5cbi8vIChJRTcrIHN1cHBvcnQpIDw9SUU3IGRvZXMgbm90IHN1cHBvcnQgZWwuaGFzQXR0cmlidXRlKG5hbWUpXG52YXIgaGFzQXR0cmlidXRlTlM7XG5cbmlmICh0ZXN0RWwuaGFzQXR0cmlidXRlTlMpIHtcbiAgICBoYXNBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKGVsLCBuYW1lc3BhY2VVUkksIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGVsLmhhc0F0dHJpYnV0ZU5TKG5hbWVzcGFjZVVSSSwgbmFtZSk7XG4gICAgfTtcbn0gZWxzZSBpZiAodGVzdEVsLmhhc0F0dHJpYnV0ZSkge1xuICAgIGhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gZWwuaGFzQXR0cmlidXRlKG5hbWUpO1xuICAgIH07XG59IGVsc2Uge1xuICAgIGhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gISFlbC5nZXRBdHRyaWJ1dGVOb2RlKG5hbWUpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGVtcHR5KG8pIHtcbiAgICBmb3IgKHZhciBrIGluIG8pIHtcbiAgICAgICAgaWYgKG8uaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdG9FbGVtZW50KHN0cikge1xuICAgIGlmICghcmFuZ2UgJiYgZG9jdW1lbnQuY3JlYXRlUmFuZ2UpIHtcbiAgICAgICAgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgICAgICByYW5nZS5zZWxlY3ROb2RlKGRvY3VtZW50LmJvZHkpO1xuICAgIH1cblxuICAgIHZhciBmcmFnbWVudDtcbiAgICBpZiAocmFuZ2UgJiYgcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KSB7XG4gICAgICAgIGZyYWdtZW50ID0gcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHN0cik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdib2R5Jyk7XG4gICAgICAgIGZyYWdtZW50LmlubmVySFRNTCA9IHN0cjtcbiAgICB9XG4gICAgcmV0dXJuIGZyYWdtZW50LmNoaWxkTm9kZXNbMF07XG59XG5cbnZhciBzcGVjaWFsRWxIYW5kbGVycyA9IHtcbiAgICAvKipcbiAgICAgKiBOZWVkZWQgZm9yIElFLiBBcHBhcmVudGx5IElFIGRvZXNuJ3QgdGhpbmsgdGhhdCBcInNlbGVjdGVkXCIgaXMgYW5cbiAgICAgKiBhdHRyaWJ1dGUgd2hlbiByZWFkaW5nIG92ZXIgdGhlIGF0dHJpYnV0ZXMgdXNpbmcgc2VsZWN0RWwuYXR0cmlidXRlc1xuICAgICAqL1xuICAgIE9QVElPTjogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIGZyb21FbC5zZWxlY3RlZCA9IHRvRWwuc2VsZWN0ZWQ7XG4gICAgICAgIGlmIChmcm9tRWwuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIGZyb21FbC5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbUVsLnJlbW92ZUF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCAnJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFRoZSBcInZhbHVlXCIgYXR0cmlidXRlIGlzIHNwZWNpYWwgZm9yIHRoZSA8aW5wdXQ+IGVsZW1lbnQgc2luY2UgaXQgc2V0c1xuICAgICAqIHRoZSBpbml0aWFsIHZhbHVlLiBDaGFuZ2luZyB0aGUgXCJ2YWx1ZVwiIGF0dHJpYnV0ZSB3aXRob3V0IGNoYW5naW5nIHRoZVxuICAgICAqIFwidmFsdWVcIiBwcm9wZXJ0eSB3aWxsIGhhdmUgbm8gZWZmZWN0IHNpbmNlIGl0IGlzIG9ubHkgdXNlZCB0byB0aGUgc2V0IHRoZVxuICAgICAqIGluaXRpYWwgdmFsdWUuICBTaW1pbGFyIGZvciB0aGUgXCJjaGVja2VkXCIgYXR0cmlidXRlLCBhbmQgXCJkaXNhYmxlZFwiLlxuICAgICAqL1xuICAgIElOUFVUOiBmdW5jdGlvbihmcm9tRWwsIHRvRWwpIHtcbiAgICAgICAgZnJvbUVsLmNoZWNrZWQgPSB0b0VsLmNoZWNrZWQ7XG4gICAgICAgIGlmIChmcm9tRWwuY2hlY2tlZCkge1xuICAgICAgICAgICAgZnJvbUVsLnNldEF0dHJpYnV0ZSgnY2hlY2tlZCcsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyb21FbC5yZW1vdmVBdHRyaWJ1dGUoJ2NoZWNrZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmcm9tRWwudmFsdWUgIT09IHRvRWwudmFsdWUpIHtcbiAgICAgICAgICAgIGZyb21FbC52YWx1ZSA9IHRvRWwudmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWhhc0F0dHJpYnV0ZU5TKHRvRWwsIG51bGwsICd2YWx1ZScpKSB7XG4gICAgICAgICAgICBmcm9tRWwucmVtb3ZlQXR0cmlidXRlKCd2YWx1ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnJvbUVsLmRpc2FibGVkID0gdG9FbC5kaXNhYmxlZDtcbiAgICAgICAgaWYgKGZyb21FbC5kaXNhYmxlZCkge1xuICAgICAgICAgICAgZnJvbUVsLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tRWwucmVtb3ZlQXR0cmlidXRlKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIFRFWFRBUkVBOiBmdW5jdGlvbihmcm9tRWwsIHRvRWwpIHtcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gdG9FbC52YWx1ZTtcbiAgICAgICAgaWYgKGZyb21FbC52YWx1ZSAhPT0gbmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGZyb21FbC52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZyb21FbC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBmcm9tRWwuZmlyc3RDaGlsZC5ub2RlVmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0d28gbm9kZSdzIG5hbWVzIGFuZCBuYW1lc3BhY2UgVVJJcyBhcmUgdGhlIHNhbWUuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBhXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGJcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbnZhciBjb21wYXJlTm9kZU5hbWVzID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhLm5vZGVOYW1lID09PSBiLm5vZGVOYW1lICYmXG4gICAgICAgICAgIGEubmFtZXNwYWNlVVJJID09PSBiLm5hbWVzcGFjZVVSSTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGFuIGVsZW1lbnQsIG9wdGlvbmFsbHkgd2l0aCBhIGtub3duIG5hbWVzcGFjZSBVUkkuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgdGhlIGVsZW1lbnQgbmFtZSwgZS5nLiAnZGl2JyBvciAnc3ZnJ1xuICogQHBhcmFtIHtzdHJpbmd9IFtuYW1lc3BhY2VVUkldIHRoZSBlbGVtZW50J3MgbmFtZXNwYWNlIFVSSSwgaS5lLiB0aGUgdmFsdWUgb2ZcbiAqIGl0cyBgeG1sbnNgIGF0dHJpYnV0ZSBvciBpdHMgaW5mZXJyZWQgbmFtZXNwYWNlLlxuICpcbiAqIEByZXR1cm4ge0VsZW1lbnR9XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnROUyhuYW1lLCBuYW1lc3BhY2VVUkkpIHtcbiAgICByZXR1cm4gIW5hbWVzcGFjZVVSSSB8fCBuYW1lc3BhY2VVUkkgPT09IFhIVE1MID9cbiAgICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lKSA6XG4gICAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2VVUkksIG5hbWUpO1xufVxuXG4vKipcbiAqIExvb3Agb3ZlciBhbGwgb2YgdGhlIGF0dHJpYnV0ZXMgb24gdGhlIHRhcmdldCBub2RlIGFuZCBtYWtlIHN1cmUgdGhlIG9yaWdpbmFsXG4gKiBET00gbm9kZSBoYXMgdGhlIHNhbWUgYXR0cmlidXRlcy4gSWYgYW4gYXR0cmlidXRlIGZvdW5kIG9uIHRoZSBvcmlnaW5hbCBub2RlXG4gKiBpcyBub3Qgb24gdGhlIG5ldyBub2RlIHRoZW4gcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIG5vZGUuXG4gKlxuICogQHBhcmFtICB7RWxlbWVudH0gZnJvbU5vZGVcbiAqIEBwYXJhbSAge0VsZW1lbnR9IHRvTm9kZVxuICovXG5mdW5jdGlvbiBtb3JwaEF0dHJzKGZyb21Ob2RlLCB0b05vZGUpIHtcbiAgICB2YXIgYXR0cnMgPSB0b05vZGUuYXR0cmlidXRlcztcbiAgICB2YXIgaTtcbiAgICB2YXIgYXR0cjtcbiAgICB2YXIgYXR0ck5hbWU7XG4gICAgdmFyIGF0dHJOYW1lc3BhY2VVUkk7XG4gICAgdmFyIGF0dHJWYWx1ZTtcbiAgICB2YXIgZnJvbVZhbHVlO1xuXG4gICAgZm9yIChpID0gYXR0cnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXR0ciA9IGF0dHJzW2ldO1xuICAgICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZTtcbiAgICAgICAgYXR0clZhbHVlID0gYXR0ci52YWx1ZTtcbiAgICAgICAgYXR0ck5hbWVzcGFjZVVSSSA9IGF0dHIubmFtZXNwYWNlVVJJO1xuXG4gICAgICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICAgICAgICBhdHRyTmFtZSA9IGF0dHIubG9jYWxOYW1lIHx8IGF0dHJOYW1lO1xuICAgICAgICAgICAgZnJvbVZhbHVlID0gZnJvbU5vZGUuZ2V0QXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbVZhbHVlID0gZnJvbU5vZGUuZ2V0QXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmcm9tVmFsdWUgIT09IGF0dHJWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGF0dHJOYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgICAgICAgICBmcm9tTm9kZS5zZXRBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZnJvbU5vZGUuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCBhdHRyVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIGFueSBleHRyYSBhdHRyaWJ1dGVzIGZvdW5kIG9uIHRoZSBvcmlnaW5hbCBET00gZWxlbWVudCB0aGF0XG4gICAgLy8gd2VyZW4ndCBmb3VuZCBvbiB0aGUgdGFyZ2V0IGVsZW1lbnQuXG4gICAgYXR0cnMgPSBmcm9tTm9kZS5hdHRyaWJ1dGVzO1xuXG4gICAgZm9yIChpID0gYXR0cnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXR0ciA9IGF0dHJzW2ldO1xuICAgICAgICBpZiAoYXR0ci5zcGVjaWZpZWQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZTtcbiAgICAgICAgICAgIGF0dHJOYW1lc3BhY2VVUkkgPSBhdHRyLm5hbWVzcGFjZVVSSTtcblxuICAgICAgICAgICAgaWYgKCFoYXNBdHRyaWJ1dGVOUyh0b05vZGUsIGF0dHJOYW1lc3BhY2VVUkksIGF0dHJOYW1lc3BhY2VVUkkgPyBhdHRyTmFtZSA9IGF0dHIubG9jYWxOYW1lIHx8IGF0dHJOYW1lIDogYXR0ck5hbWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHJOYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJvbU5vZGUucmVtb3ZlQXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ci5sb2NhbE5hbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZyb21Ob2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIENvcGllcyB0aGUgY2hpbGRyZW4gb2Ygb25lIERPTSBlbGVtZW50IHRvIGFub3RoZXIgRE9NIGVsZW1lbnRcbiAqL1xuZnVuY3Rpb24gbW92ZUNoaWxkcmVuKGZyb21FbCwgdG9FbCkge1xuICAgIHZhciBjdXJDaGlsZCA9IGZyb21FbC5maXJzdENoaWxkO1xuICAgIHdoaWxlIChjdXJDaGlsZCkge1xuICAgICAgICB2YXIgbmV4dENoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgIHRvRWwuYXBwZW5kQ2hpbGQoY3VyQ2hpbGQpO1xuICAgICAgICBjdXJDaGlsZCA9IG5leHRDaGlsZDtcbiAgICB9XG4gICAgcmV0dXJuIHRvRWw7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRHZXROb2RlS2V5KG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5pZDtcbn1cblxuZnVuY3Rpb24gbW9ycGhkb20oZnJvbU5vZGUsIHRvTm9kZSwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0b05vZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGlmIChmcm9tTm9kZS5ub2RlTmFtZSA9PT0gJyNkb2N1bWVudCcgfHwgZnJvbU5vZGUubm9kZU5hbWUgPT09ICdIVE1MJykge1xuICAgICAgICAgICAgdmFyIHRvTm9kZUh0bWwgPSB0b05vZGU7XG4gICAgICAgICAgICB0b05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdodG1sJyk7XG4gICAgICAgICAgICB0b05vZGUuaW5uZXJIVE1MID0gdG9Ob2RlSHRtbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRvTm9kZSA9IHRvRWxlbWVudCh0b05vZGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gWFhYIG9wdGltaXphdGlvbjogaWYgdGhlIG5vZGVzIGFyZSBlcXVhbCwgZG9uJ3QgbW9ycGggdGhlbVxuICAgIC8qXG4gICAgaWYgKGZyb21Ob2RlLmlzRXF1YWxOb2RlKHRvTm9kZSkpIHtcbiAgICAgIHJldHVybiBmcm9tTm9kZTtcbiAgICB9XG4gICAgKi9cblxuICAgIHZhciBzYXZlZEVscyA9IHt9OyAvLyBVc2VkIHRvIHNhdmUgb2ZmIERPTSBlbGVtZW50cyB3aXRoIElEc1xuICAgIHZhciB1bm1hdGNoZWRFbHMgPSB7fTtcbiAgICB2YXIgZ2V0Tm9kZUtleSA9IG9wdGlvbnMuZ2V0Tm9kZUtleSB8fCBkZWZhdWx0R2V0Tm9kZUtleTtcbiAgICB2YXIgb25CZWZvcmVOb2RlQWRkZWQgPSBvcHRpb25zLm9uQmVmb3JlTm9kZUFkZGVkIHx8IG5vb3A7XG4gICAgdmFyIG9uTm9kZUFkZGVkID0gb3B0aW9ucy5vbk5vZGVBZGRlZCB8fCBub29wO1xuICAgIHZhciBvbkJlZm9yZUVsVXBkYXRlZCA9IG9wdGlvbnMub25CZWZvcmVFbFVwZGF0ZWQgfHwgb3B0aW9ucy5vbkJlZm9yZU1vcnBoRWwgfHwgbm9vcDtcbiAgICB2YXIgb25FbFVwZGF0ZWQgPSBvcHRpb25zLm9uRWxVcGRhdGVkIHx8IG5vb3A7XG4gICAgdmFyIG9uQmVmb3JlTm9kZURpc2NhcmRlZCA9IG9wdGlvbnMub25CZWZvcmVOb2RlRGlzY2FyZGVkIHx8IG5vb3A7XG4gICAgdmFyIG9uTm9kZURpc2NhcmRlZCA9IG9wdGlvbnMub25Ob2RlRGlzY2FyZGVkIHx8IG5vb3A7XG4gICAgdmFyIG9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQgPSBvcHRpb25zLm9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQgfHwgb3B0aW9ucy5vbkJlZm9yZU1vcnBoRWxDaGlsZHJlbiB8fCBub29wO1xuICAgIHZhciBjaGlsZHJlbk9ubHkgPSBvcHRpb25zLmNoaWxkcmVuT25seSA9PT0gdHJ1ZTtcbiAgICB2YXIgbW92ZWRFbHMgPSBbXTtcblxuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGVIZWxwZXIobm9kZSwgbmVzdGVkSW5TYXZlZEVsKSB7XG4gICAgICAgIHZhciBpZCA9IGdldE5vZGVLZXkobm9kZSk7XG4gICAgICAgIC8vIElmIHRoZSBub2RlIGhhcyBhbiBJRCB0aGVuIHNhdmUgaXQgb2ZmIHNpbmNlIHdlIHdpbGwgd2FudFxuICAgICAgICAvLyB0byByZXVzZSBpdCBpbiBjYXNlIHRoZSB0YXJnZXQgRE9NIHRyZWUgaGFzIGEgRE9NIGVsZW1lbnRcbiAgICAgICAgLy8gd2l0aCB0aGUgc2FtZSBJRFxuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHNhdmVkRWxzW2lkXSA9IG5vZGU7XG4gICAgICAgIH0gZWxzZSBpZiAoIW5lc3RlZEluU2F2ZWRFbCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgYXJlIG5vdCBuZXN0ZWQgaW4gYSBzYXZlZCBlbGVtZW50IHRoZW4gd2Uga25vdyB0aGF0IHRoaXMgbm9kZSBoYXMgYmVlblxuICAgICAgICAgICAgLy8gY29tcGxldGVseSBkaXNjYXJkZWQgYW5kIHdpbGwgbm90IGV4aXN0IGluIHRoZSBmaW5hbCBET00uXG4gICAgICAgICAgICBvbk5vZGVEaXNjYXJkZWQobm9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICB2YXIgY3VyQ2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICByZW1vdmVOb2RlSGVscGVyKGN1ckNoaWxkLCBuZXN0ZWRJblNhdmVkRWwgfHwgaWQpO1xuICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB3YWxrRGlzY2FyZGVkQ2hpbGROb2Rlcyhub2RlKSB7XG4gICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgIHZhciBjdXJDaGlsZCA9IG5vZGUuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHdoaWxlIChjdXJDaGlsZCkge1xuXG5cbiAgICAgICAgICAgICAgICBpZiAoIWdldE5vZGVLZXkoY3VyQ2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIG9ubHkgd2FudCB0byBoYW5kbGUgbm9kZXMgdGhhdCBkb24ndCBoYXZlIGFuIElEIHRvIGF2b2lkIGRvdWJsZVxuICAgICAgICAgICAgICAgICAgICAvLyB3YWxraW5nIHRoZSBzYW1lIHNhdmVkIGVsZW1lbnQuXG5cbiAgICAgICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGN1ckNoaWxkKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBXYWxrIHJlY3Vyc2l2ZWx5XG4gICAgICAgICAgICAgICAgICAgIHdhbGtEaXNjYXJkZWRDaGlsZE5vZGVzKGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVtb3ZlTm9kZShub2RlLCBwYXJlbnROb2RlLCBhbHJlYWR5VmlzaXRlZCkge1xuICAgICAgICBpZiAob25CZWZvcmVOb2RlRGlzY2FyZGVkKG5vZGUpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgaWYgKGFscmVhZHlWaXNpdGVkKSB7XG4gICAgICAgICAgICBpZiAoIWdldE5vZGVLZXkobm9kZSkpIHtcbiAgICAgICAgICAgICAgICBvbk5vZGVEaXNjYXJkZWQobm9kZSk7XG4gICAgICAgICAgICAgICAgd2Fsa0Rpc2NhcmRlZENoaWxkTm9kZXMobm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZW1vdmVOb2RlSGVscGVyKG5vZGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW9ycGhFbChmcm9tRWwsIHRvRWwsIGFscmVhZHlWaXNpdGVkLCBjaGlsZHJlbk9ubHkpIHtcbiAgICAgICAgdmFyIHRvRWxLZXkgPSBnZXROb2RlS2V5KHRvRWwpO1xuICAgICAgICBpZiAodG9FbEtleSkge1xuICAgICAgICAgICAgLy8gSWYgYW4gZWxlbWVudCB3aXRoIGFuIElEIGlzIGJlaW5nIG1vcnBoZWQgdGhlbiBpdCBpcyB3aWxsIGJlIGluIHRoZSBmaW5hbFxuICAgICAgICAgICAgLy8gRE9NIHNvIGNsZWFyIGl0IG91dCBvZiB0aGUgc2F2ZWQgZWxlbWVudHMgY29sbGVjdGlvblxuICAgICAgICAgICAgZGVsZXRlIHNhdmVkRWxzW3RvRWxLZXldO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjaGlsZHJlbk9ubHkpIHtcbiAgICAgICAgICAgIGlmIChvbkJlZm9yZUVsVXBkYXRlZChmcm9tRWwsIHRvRWwpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbW9ycGhBdHRycyhmcm9tRWwsIHRvRWwpO1xuICAgICAgICAgICAgb25FbFVwZGF0ZWQoZnJvbUVsKTtcblxuICAgICAgICAgICAgaWYgKG9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQoZnJvbUVsLCB0b0VsKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZnJvbUVsLm5vZGVOYW1lICE9PSAnVEVYVEFSRUEnKSB7XG4gICAgICAgICAgICB2YXIgY3VyVG9Ob2RlQ2hpbGQgPSB0b0VsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB2YXIgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21FbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgdmFyIGN1clRvTm9kZUlkO1xuXG4gICAgICAgICAgICB2YXIgZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgdmFyIHRvTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB2YXIgc2F2ZWRFbDtcbiAgICAgICAgICAgIHZhciB1bm1hdGNoZWRFbDtcblxuICAgICAgICAgICAgb3V0ZXI6IHdoaWxlIChjdXJUb05vZGVDaGlsZCkge1xuICAgICAgICAgICAgICAgIHRvTmV4dFNpYmxpbmcgPSBjdXJUb05vZGVDaGlsZC5uZXh0U2libGluZztcbiAgICAgICAgICAgICAgICBjdXJUb05vZGVJZCA9IGdldE5vZGVLZXkoY3VyVG9Ob2RlQ2hpbGQpO1xuXG4gICAgICAgICAgICAgICAgd2hpbGUgKGN1ckZyb21Ob2RlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckZyb21Ob2RlSWQgPSBnZXROb2RlS2V5KGN1ckZyb21Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICBmcm9tTmV4dFNpYmxpbmcgPSBjdXJGcm9tTm9kZUNoaWxkLm5leHRTaWJsaW5nO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICghYWxyZWFkeVZpc2l0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJGcm9tTm9kZUlkICYmICh1bm1hdGNoZWRFbCA9IHVubWF0Y2hlZEVsc1tjdXJGcm9tTm9kZUlkXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bm1hdGNoZWRFbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChjdXJGcm9tTm9kZUNoaWxkLCB1bm1hdGNoZWRFbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9ycGhFbChjdXJGcm9tTm9kZUNoaWxkLCB1bm1hdGNoZWRFbCwgYWxyZWFkeVZpc2l0ZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB2YXIgY3VyRnJvbU5vZGVUeXBlID0gY3VyRnJvbU5vZGVDaGlsZC5ub2RlVHlwZTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVUeXBlID09PSBjdXJUb05vZGVDaGlsZC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzQ29tcGF0aWJsZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBCb3RoIG5vZGVzIGJlaW5nIGNvbXBhcmVkIGFyZSBFbGVtZW50IG5vZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcGFyZU5vZGVOYW1lcyhjdXJGcm9tTm9kZUNoaWxkLCBjdXJUb05vZGVDaGlsZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBjb21wYXRpYmxlIERPTSBlbGVtZW50c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVJZCB8fCBjdXJUb05vZGVJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgZWl0aGVyIERPTSBlbGVtZW50IGhhcyBhbiBJRCB0aGVuIHdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGUgdGhvc2UgZGlmZmVyZW50bHkgc2luY2Ugd2Ugd2FudCB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWF0Y2ggdXAgYnkgSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVJZCA9PT0gY3VyRnJvbU5vZGVJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NvbXBhdGlibGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ29tcGF0aWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBjb21wYXRpYmxlIERPTSBlbGVtZW50cyBzbyB0cmFuc2Zvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGN1cnJlbnQgXCJmcm9tXCIgbm9kZSB0byBtYXRjaCB0aGUgY3VycmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0YXJnZXQgRE9NIG5vZGUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwoY3VyRnJvbU5vZGVDaGlsZCwgY3VyVG9Ob2RlQ2hpbGQsIGFscmVhZHlWaXNpdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBCb3RoIG5vZGVzIGJlaW5nIGNvbXBhcmVkIGFyZSBUZXh0IG9yIENvbW1lbnQgbm9kZXNcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJGcm9tTm9kZVR5cGUgPT09IFRFWFRfTk9ERSB8fCBjdXJGcm9tTm9kZVR5cGUgPT0gQ09NTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb21wYXRpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTaW1wbHkgdXBkYXRlIG5vZGVWYWx1ZSBvbiB0aGUgb3JpZ2luYWwgbm9kZSB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoYW5nZSB0aGUgdGV4dCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQubm9kZVZhbHVlID0gY3VyVG9Ob2RlQ2hpbGQubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb21wYXRpYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlQ2hpbGQgPSB0b05leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgb3V0ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBObyBjb21wYXRpYmxlIG1hdGNoIHNvIHJlbW92ZSB0aGUgb2xkIG5vZGUgZnJvbSB0aGUgRE9NXG4gICAgICAgICAgICAgICAgICAgIC8vIGFuZCBjb250aW51ZSB0cnlpbmcgdG8gZmluZCBhIG1hdGNoIGluIHRoZSBvcmlnaW5hbCBET01cbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTm9kZShjdXJGcm9tTm9kZUNoaWxkLCBmcm9tRWwsIGFscmVhZHlWaXNpdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChzYXZlZEVsID0gc2F2ZWRFbHNbY3VyVG9Ob2RlSWRdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBhcmVOb2RlTmFtZXMoc2F2ZWRFbCwgY3VyVG9Ob2RlQ2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9ycGhFbChzYXZlZEVsLCBjdXJUb05vZGVDaGlsZCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2Ugd2FudCB0byBhcHBlbmQgdGhlIHNhdmVkIGVsZW1lbnQgaW5zdGVhZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gc2F2ZWRFbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVkRWxzW2N1clRvTm9kZUlkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbk5vZGVEaXNjYXJkZWQoc2F2ZWRFbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgY3VycmVudCBET00gZWxlbWVudCBpbiB0aGUgdGFyZ2V0IHRyZWUgaGFzIGFuIElEXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBidXQgd2UgZGlkIG5vdCBmaW5kIGEgbWF0Y2ggaW4gYW55IG9mIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29ycmVzcG9uZGluZyBzaWJsaW5ncy4gV2UganVzdCBwdXQgdGhlIHRhcmdldFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZWxlbWVudCBpbiB0aGUgb2xkIERPTSB0cmVlIGJ1dCBpZiB3ZSBsYXRlciBmaW5kIGFuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBlbGVtZW50IGluIHRoZSBvbGQgRE9NIHRyZWUgdGhhdCBoYXMgYSBtYXRjaGluZyBJRFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlbiB3ZSB3aWxsIHJlcGxhY2UgdGhlIHRhcmdldCBlbGVtZW50IHdpdGggdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb3JyZXNwb25kaW5nIG9sZCBlbGVtZW50IGFuZCBtb3JwaCB0aGUgb2xkIGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIHVubWF0Y2hlZEVsc1tjdXJUb05vZGVJZF0gPSBjdXJUb05vZGVDaGlsZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGdvdCB0aGlzIGZhciB0aGVuIHdlIGRpZCBub3QgZmluZCBhIGNhbmRpZGF0ZSBtYXRjaCBmb3JcbiAgICAgICAgICAgICAgICAvLyBvdXIgXCJ0byBub2RlXCIgYW5kIHdlIGV4aGF1c3RlZCBhbGwgb2YgdGhlIGNoaWxkcmVuIFwiZnJvbVwiXG4gICAgICAgICAgICAgICAgLy8gbm9kZXMuIFRoZXJlZm9yZSwgd2Ugd2lsbCBqdXN0IGFwcGVuZCB0aGUgY3VycmVudCBcInRvIG5vZGVcIlxuICAgICAgICAgICAgICAgIC8vIHRvIHRoZSBlbmRcbiAgICAgICAgICAgICAgICBpZiAob25CZWZvcmVOb2RlQWRkZWQoY3VyVG9Ob2RlQ2hpbGQpICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBmcm9tRWwuYXBwZW5kQ2hpbGQoY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICBvbk5vZGVBZGRlZChjdXJUb05vZGVDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGN1clRvTm9kZUNoaWxkLm5vZGVUeXBlID09PSBFTEVNRU5UX05PREUgJiZcbiAgICAgICAgICAgICAgICAgICAgKGN1clRvTm9kZUlkIHx8IGN1clRvTm9kZUNoaWxkLmZpcnN0Q2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZSBlbGVtZW50IHRoYXQgd2FzIGp1c3QgYWRkZWQgdG8gdGhlIG9yaWdpbmFsIERPTSBtYXlcbiAgICAgICAgICAgICAgICAgICAgLy8gaGF2ZSBzb21lIG5lc3RlZCBlbGVtZW50cyB3aXRoIGEga2V5L0lEIHRoYXQgbmVlZHMgdG8gYmVcbiAgICAgICAgICAgICAgICAgICAgLy8gbWF0Y2hlZCB1cCB3aXRoIG90aGVyIGVsZW1lbnRzLiBXZSdsbCBhZGQgdGhlIGVsZW1lbnQgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8gYSBsaXN0IHNvIHRoYXQgd2UgY2FuIGxhdGVyIHByb2Nlc3MgdGhlIG5lc3RlZCBlbGVtZW50c1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiB0aGVyZSBhcmUgYW55IHVubWF0Y2hlZCBrZXllZCBlbGVtZW50cyB0aGF0IHdlcmVcbiAgICAgICAgICAgICAgICAgICAgLy8gZGlzY2FyZGVkXG4gICAgICAgICAgICAgICAgICAgIG1vdmVkRWxzLnB1c2goY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gdG9OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBXZSBoYXZlIHByb2Nlc3NlZCBhbGwgb2YgdGhlIFwidG8gbm9kZXNcIi4gSWYgY3VyRnJvbU5vZGVDaGlsZCBpc1xuICAgICAgICAgICAgLy8gbm9uLW51bGwgdGhlbiB3ZSBzdGlsbCBoYXZlIHNvbWUgZnJvbSBub2RlcyBsZWZ0IG92ZXIgdGhhdCBuZWVkXG4gICAgICAgICAgICAvLyB0byBiZSByZW1vdmVkXG4gICAgICAgICAgICB3aGlsZSAoY3VyRnJvbU5vZGVDaGlsZCkge1xuICAgICAgICAgICAgICAgIGZyb21OZXh0U2libGluZyA9IGN1ckZyb21Ob2RlQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgcmVtb3ZlTm9kZShjdXJGcm9tTm9kZUNoaWxkLCBmcm9tRWwsIGFscmVhZHlWaXNpdGVkKTtcbiAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNwZWNpYWxFbEhhbmRsZXIgPSBzcGVjaWFsRWxIYW5kbGVyc1tmcm9tRWwubm9kZU5hbWVdO1xuICAgICAgICBpZiAoc3BlY2lhbEVsSGFuZGxlcikge1xuICAgICAgICAgICAgc3BlY2lhbEVsSGFuZGxlcihmcm9tRWwsIHRvRWwpO1xuICAgICAgICB9XG4gICAgfSAvLyBFTkQ6IG1vcnBoRWwoLi4uKVxuXG4gICAgdmFyIG1vcnBoZWROb2RlID0gZnJvbU5vZGU7XG4gICAgdmFyIG1vcnBoZWROb2RlVHlwZSA9IG1vcnBoZWROb2RlLm5vZGVUeXBlO1xuICAgIHZhciB0b05vZGVUeXBlID0gdG9Ob2RlLm5vZGVUeXBlO1xuXG4gICAgaWYgKCFjaGlsZHJlbk9ubHkpIHtcbiAgICAgICAgLy8gSGFuZGxlIHRoZSBjYXNlIHdoZXJlIHdlIGFyZSBnaXZlbiB0d28gRE9NIG5vZGVzIHRoYXQgYXJlIG5vdFxuICAgICAgICAvLyBjb21wYXRpYmxlIChlLmcuIDxkaXY+IC0tPiA8c3Bhbj4gb3IgPGRpdj4gLS0+IFRFWFQpXG4gICAgICAgIGlmIChtb3JwaGVkTm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgaWYgKHRvTm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgIGlmICghY29tcGFyZU5vZGVOYW1lcyhmcm9tTm9kZSwgdG9Ob2RlKSkge1xuICAgICAgICAgICAgICAgICAgICBvbk5vZGVEaXNjYXJkZWQoZnJvbU5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IG1vdmVDaGlsZHJlbihmcm9tTm9kZSwgY3JlYXRlRWxlbWVudE5TKHRvTm9kZS5ub2RlTmFtZSwgdG9Ob2RlLm5hbWVzcGFjZVVSSSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gR29pbmcgZnJvbSBhbiBlbGVtZW50IG5vZGUgdG8gYSB0ZXh0IG5vZGVcbiAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IHRvTm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChtb3JwaGVkTm9kZVR5cGUgPT09IFRFWFRfTk9ERSB8fCBtb3JwaGVkTm9kZVR5cGUgPT09IENPTU1FTlRfTk9ERSkgeyAvLyBUZXh0IG9yIGNvbW1lbnQgbm9kZVxuICAgICAgICAgICAgaWYgKHRvTm9kZVR5cGUgPT09IG1vcnBoZWROb2RlVHlwZSkge1xuICAgICAgICAgICAgICAgIG1vcnBoZWROb2RlLm5vZGVWYWx1ZSA9IHRvTm9kZS5ub2RlVmFsdWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vcnBoZWROb2RlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUZXh0IG5vZGUgdG8gc29tZXRoaW5nIGVsc2VcbiAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IHRvTm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtb3JwaGVkTm9kZSA9PT0gdG9Ob2RlKSB7XG4gICAgICAgIC8vIFRoZSBcInRvIG5vZGVcIiB3YXMgbm90IGNvbXBhdGlibGUgd2l0aCB0aGUgXCJmcm9tIG5vZGVcIiBzbyB3ZSBoYWQgdG9cbiAgICAgICAgLy8gdG9zcyBvdXQgdGhlIFwiZnJvbSBub2RlXCIgYW5kIHVzZSB0aGUgXCJ0byBub2RlXCJcbiAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGZyb21Ob2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBtb3JwaEVsKG1vcnBoZWROb2RlLCB0b05vZGUsIGZhbHNlLCBjaGlsZHJlbk9ubHkpO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGF0IHdlIHdpbGwgZG8gaGVyZSBpcyB3YWxrIHRoZSB0cmVlIGZvciB0aGUgRE9NIGVsZW1lbnQgdGhhdCB3YXNcbiAgICAgICAgICogbW92ZWQgZnJvbSB0aGUgdGFyZ2V0IERPTSB0cmVlIHRvIHRoZSBvcmlnaW5hbCBET00gdHJlZSBhbmQgd2Ugd2lsbFxuICAgICAgICAgKiBsb29rIGZvciBrZXllZCBlbGVtZW50cyB0aGF0IGNvdWxkIGJlIG1hdGNoZWQgdG8ga2V5ZWQgZWxlbWVudHMgdGhhdFxuICAgICAgICAgKiB3ZXJlIGVhcmxpZXIgZGlzY2FyZGVkLiAgSWYgd2UgZmluZCBhIG1hdGNoIHRoZW4gd2Ugd2lsbCBtb3ZlIHRoZVxuICAgICAgICAgKiBzYXZlZCBlbGVtZW50IGludG8gdGhlIGZpbmFsIERPTSB0cmVlLlxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGhhbmRsZU1vdmVkRWwgPSBmdW5jdGlvbihlbCkge1xuICAgICAgICAgICAgdmFyIGN1ckNoaWxkID0gZWwuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHdoaWxlIChjdXJDaGlsZCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXh0U2libGluZyA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuXG4gICAgICAgICAgICAgICAgdmFyIGtleSA9IGdldE5vZGVLZXkoY3VyQ2hpbGQpO1xuICAgICAgICAgICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNhdmVkRWwgPSBzYXZlZEVsc1trZXldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZWRFbCAmJiBjb21wYXJlTm9kZU5hbWVzKGN1ckNoaWxkLCBzYXZlZEVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VyQ2hpbGQucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoc2F2ZWRFbCwgY3VyQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdHJ1ZTogYWxyZWFkeSB2aXNpdGVkIHRoZSBzYXZlZCBlbCB0cmVlXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3JwaEVsKHNhdmVkRWwsIGN1ckNoaWxkLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gbmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW1wdHkoc2F2ZWRFbHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VyQ2hpbGQubm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVNb3ZlZEVsKGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IG5leHRTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRoZSBsb29wIGJlbG93IGlzIHVzZWQgdG8gcG9zc2libHkgbWF0Y2ggdXAgYW55IGRpc2NhcmRlZFxuICAgICAgICAvLyBlbGVtZW50cyBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUgd2l0aCBlbGVtZW5ldHMgZnJvbSB0aGVcbiAgICAgICAgLy8gdGFyZ2V0IHRyZWUgdGhhdCB3ZXJlIG1vdmVkIG92ZXIgd2l0aG91dCB2aXNpdGluZyB0aGVpclxuICAgICAgICAvLyBjaGlsZHJlblxuICAgICAgICBpZiAoIWVtcHR5KHNhdmVkRWxzKSkge1xuICAgICAgICAgICAgaGFuZGxlTW92ZWRFbHNMb29wOlxuICAgICAgICAgICAgd2hpbGUgKG1vdmVkRWxzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciBtb3ZlZEVsc1RlbXAgPSBtb3ZlZEVscztcbiAgICAgICAgICAgICAgICBtb3ZlZEVscyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxtb3ZlZEVsc1RlbXAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhbmRsZU1vdmVkRWwobW92ZWRFbHNUZW1wW2ldKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZXJlIGFyZSBubyBtb3JlIHVubWF0Y2hlZCBlbGVtZW50cyBzbyBjb21wbGV0ZWx5IGVuZFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGxvb3BcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrIGhhbmRsZU1vdmVkRWxzTG9vcDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpcmUgdGhlIFwib25Ob2RlRGlzY2FyZGVkXCIgZXZlbnQgZm9yIGFueSBzYXZlZCBlbGVtZW50c1xuICAgICAgICAvLyB0aGF0IG5ldmVyIGZvdW5kIGEgbmV3IGhvbWUgaW4gdGhlIG1vcnBoZWQgRE9NXG4gICAgICAgIGZvciAodmFyIHNhdmVkRWxJZCBpbiBzYXZlZEVscykge1xuICAgICAgICAgICAgaWYgKHNhdmVkRWxzLmhhc093blByb3BlcnR5KHNhdmVkRWxJZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2F2ZWRFbCA9IHNhdmVkRWxzW3NhdmVkRWxJZF07XG4gICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKHNhdmVkRWwpO1xuICAgICAgICAgICAgICAgIHdhbGtEaXNjYXJkZWRDaGlsZE5vZGVzKHNhdmVkRWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFjaGlsZHJlbk9ubHkgJiYgbW9ycGhlZE5vZGUgIT09IGZyb21Ob2RlICYmIGZyb21Ob2RlLnBhcmVudE5vZGUpIHtcbiAgICAgICAgLy8gSWYgd2UgaGFkIHRvIHN3YXAgb3V0IHRoZSBmcm9tIG5vZGUgd2l0aCBhIG5ldyBub2RlIGJlY2F1c2UgdGhlIG9sZFxuICAgICAgICAvLyBub2RlIHdhcyBub3QgY29tcGF0aWJsZSB3aXRoIHRoZSB0YXJnZXQgbm9kZSB0aGVuIHdlIG5lZWQgdG9cbiAgICAgICAgLy8gcmVwbGFjZSB0aGUgb2xkIERPTSBub2RlIGluIHRoZSBvcmlnaW5hbCBET00gdHJlZS4gVGhpcyBpcyBvbmx5XG4gICAgICAgIC8vIHBvc3NpYmxlIGlmIHRoZSBvcmlnaW5hbCBET00gbm9kZSB3YXMgcGFydCBvZiBhIERPTSB0cmVlIHdoaWNoXG4gICAgICAgIC8vIHdlIGtub3cgaXMgdGhlIGNhc2UgaWYgaXQgaGFzIGEgcGFyZW50IG5vZGUuXG4gICAgICAgIGZyb21Ob2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG1vcnBoZWROb2RlLCBmcm9tTm9kZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1vcnBoZWROb2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG1vcnBoZG9tO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBbXG4gIC8vIGF0dHJpYnV0ZSBldmVudHMgKGNhbiBiZSBzZXQgd2l0aCBhdHRyaWJ1dGVzKVxuICAnb25jbGljaycsXG4gICdvbmRibGNsaWNrJyxcbiAgJ29ubW91c2Vkb3duJyxcbiAgJ29ubW91c2V1cCcsXG4gICdvbm1vdXNlb3ZlcicsXG4gICdvbm1vdXNlbW92ZScsXG4gICdvbm1vdXNlb3V0JyxcbiAgJ29uZHJhZ3N0YXJ0JyxcbiAgJ29uZHJhZycsXG4gICdvbmRyYWdlbnRlcicsXG4gICdvbmRyYWdsZWF2ZScsXG4gICdvbmRyYWdvdmVyJyxcbiAgJ29uZHJvcCcsXG4gICdvbmRyYWdlbmQnLFxuICAnb25rZXlkb3duJyxcbiAgJ29ua2V5cHJlc3MnLFxuICAnb25rZXl1cCcsXG4gICdvbnVubG9hZCcsXG4gICdvbmFib3J0JyxcbiAgJ29uZXJyb3InLFxuICAnb25yZXNpemUnLFxuICAnb25zY3JvbGwnLFxuICAnb25zZWxlY3QnLFxuICAnb25jaGFuZ2UnLFxuICAnb25zdWJtaXQnLFxuICAnb25yZXNldCcsXG4gICdvbmZvY3VzJyxcbiAgJ29uYmx1cicsXG4gICdvbmlucHV0JyxcbiAgLy8gb3RoZXIgY29tbW9uIGV2ZW50c1xuICAnb25jb250ZXh0bWVudScsXG4gICdvbmZvY3VzaW4nLFxuICAnb25mb2N1c291dCdcbl1cbiIsImltcG9ydCBVdGlscyBmcm9tICcuLi9jb3JlL1V0aWxzJ1xuaW1wb3J0IFRyYW5zbGF0b3IgZnJvbSAnLi4vY29yZS9UcmFuc2xhdG9yJ1xuaW1wb3J0IHByZXR0eUJ5dGVzIGZyb20gJ3ByZXR0eS1ieXRlcydcbmltcG9ydCB5byBmcm9tICd5by15bydcbmltcG9ydCBlZSBmcm9tICdldmVudHMnXG5pbXBvcnQgVXBweVNvY2tldCBmcm9tICcuL1VwcHlTb2NrZXQnXG5cbi8qKlxuICogTWFpbiBVcHB5IGNvcmVcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0cyBnZW5lcmFsIG9wdGlvbnMsIGxpa2UgbG9jYWxlcywgdG8gc2hvdyBtb2RhbCBvciBub3QgdG8gc2hvd1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb3JlIHtcbiAgY29uc3RydWN0b3IgKG9wdHMpIHtcbiAgICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICAvLyBsb2FkIEVuZ2xpc2ggYXMgdGhlIGRlZmF1bHQgbG9jYWxlc1xuICAgICAgbG9jYWxlczogcmVxdWlyZSgnLi4vbG9jYWxlcy9lbl9VUy5qcycpLFxuICAgICAgYXV0b1Byb2NlZWQ6IHRydWUsXG4gICAgICBkZWJ1ZzogZmFsc2VcbiAgICB9XG5cbiAgICAvLyBNZXJnZSBkZWZhdWx0IG9wdGlvbnMgd2l0aCB0aGUgb25lcyBzZXQgYnkgdXNlclxuICAgIHRoaXMub3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRPcHRpb25zLCBvcHRzKVxuXG4gICAgLy8gRGljdGF0ZXMgaW4gd2hhdCBvcmRlciBkaWZmZXJlbnQgcGx1Z2luIHR5cGVzIGFyZSByYW46XG4gICAgdGhpcy50eXBlcyA9IFsgJ3ByZXNldHRlcicsICdvcmNoZXN0cmF0b3InLCAncHJvZ3Jlc3NpbmRpY2F0b3InLCAnYWNxdWlyZXInLCAndXBsb2FkZXInLCAncHJlc2VudGVyJyBdXG5cbiAgICB0aGlzLnR5cGUgPSAnY29yZSdcblxuICAgIC8vIENvbnRhaW5lciBmb3IgZGlmZmVyZW50IHR5cGVzIG9mIHBsdWdpbnNcbiAgICB0aGlzLnBsdWdpbnMgPSB7fVxuXG4gICAgdGhpcy50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3Ioe2xvY2FsZXM6IHRoaXMub3B0cy5sb2NhbGVzfSlcbiAgICB0aGlzLmkxOG4gPSB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlLmJpbmQodGhpcy50cmFuc2xhdG9yKVxuICAgIHRoaXMuaW5pdFNvY2tldCA9IHRoaXMuaW5pdFNvY2tldC5iaW5kKHRoaXMpXG5cbiAgICB0aGlzLmVtaXR0ZXIgPSBuZXcgZWUuRXZlbnRFbWl0dGVyKClcblxuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBmaWxlczoge31cbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRzLmRlYnVnKSB7XG4gICAgICAvLyBmb3IgZGVidWdnaW5nIGFuZCB0ZXN0aW5nXG4gICAgICBnbG9iYWwuVXBweVN0YXRlID0gdGhpcy5zdGF0ZVxuICAgICAgZ2xvYmFsLnVwcHlMb2cgPSAnJ1xuICAgICAgZ2xvYmFsLlVwcHlBZGRGaWxlID0gdGhpcy5hZGRGaWxlLmJpbmQodGhpcylcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSBvbiBhbGwgcGx1Z2lucyBhbmQgcnVuIGB1cGRhdGVgIG9uIHRoZW0uIENhbGxlZCBlYWNoIHRpbWUgd2hlbiBzdGF0ZSBjaGFuZ2VzXG4gICAqXG4gICAqL1xuICB1cGRhdGVBbGwgKCkge1xuICAgIE9iamVjdC5rZXlzKHRoaXMucGx1Z2lucykuZm9yRWFjaCgocGx1Z2luVHlwZSkgPT4ge1xuICAgICAgdGhpcy5wbHVnaW5zW3BsdWdpblR5cGVdLmZvckVhY2goKHBsdWdpbikgPT4ge1xuICAgICAgICBwbHVnaW4udXBkYXRlKClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHN0YXRlXG4gICAqXG4gICAqIEBwYXJhbSB7bmV3U3RhdGV9IG9iamVjdFxuICAgKi9cbiAgc2V0U3RhdGUgKG5ld1N0YXRlKSB7XG4gICAgdGhpcy5sb2coJ1NldHRpbmcgc3RhdGUgdG86ICcpXG4gICAgdGhpcy5sb2cobmV3U3RhdGUpXG4gICAgdGhpcy5zdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUsIG5ld1N0YXRlKVxuICAgIHRoaXMudXBkYXRlQWxsKClcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGN1cnJlbnQgc3RhdGUsIG1ha2luZyBzdXJlIHRvIG1ha2UgYSBjb3B5IG9mIHRoZSBzdGF0ZSBvYmplY3QgYW5kIHBhc3MgdGhhdCxcbiAgICogaW5zdGVhZCBvZiBhbiBhY3R1YWwgcmVmZXJlbmNlIHRvIGB0aGlzLnN0YXRlYFxuICAgKlxuICAgKi9cbiAgZ2V0U3RhdGUgKCkge1xuICAgIHJldHVybiB0aGlzLnN0YXRlXG4gIH1cblxuICBhZGRNZXRhIChtZXRhLCBmaWxlSUQpIHtcbiAgICBpZiAodHlwZW9mIGZpbGVJRCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUuZmlsZXMpXG4gICAgICBmb3IgKGxldCBmaWxlIGluIHVwZGF0ZWRGaWxlcykge1xuICAgICAgICB1cGRhdGVkRmlsZXNbZmlsZV0ubWV0YSA9IG1ldGFcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuICAgIH1cbiAgfVxuXG4gIGFkZEZpbGUgKGZpbGUpIHtcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnN0YXRlLmZpbGVzKVxuXG4gICAgY29uc3QgZmlsZVR5cGUgPSBmaWxlLnR5cGUuc3BsaXQoJy8nKVxuICAgIGNvbnN0IGZpbGVUeXBlR2VuZXJhbCA9IGZpbGVUeXBlWzBdXG4gICAgY29uc3QgZmlsZVR5cGVTcGVjaWZpYyA9IGZpbGVUeXBlWzFdXG4gICAgY29uc3QgZmlsZUlEID0gVXRpbHMuZ2VuZXJhdGVGaWxlSUQoZmlsZS5uYW1lKVxuXG4gICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0gPSB7XG4gICAgICBzb3VyY2U6IGZpbGUuc291cmNlIHx8ICcnLFxuICAgICAgaWQ6IGZpbGVJRCxcbiAgICAgIG5hbWU6IGZpbGUubmFtZSxcbiAgICAgIHR5cGU6IHtcbiAgICAgICAgZ2VuZXJhbDogZmlsZVR5cGVHZW5lcmFsLFxuICAgICAgICBzcGVjaWZpYzogZmlsZVR5cGVTcGVjaWZpY1xuICAgICAgfSxcbiAgICAgIGRhdGE6IGZpbGUuZGF0YSxcbiAgICAgIHByb2dyZXNzOiAwLFxuICAgICAgdG90YWxTaXplOiBmaWxlLmRhdGEuc2l6ZSA/IHByZXR0eUJ5dGVzKGZpbGUuZGF0YS5zaXplKSA6ICc/JyxcbiAgICAgIHVwbG9hZGVkU2l6ZTogMCxcbiAgICAgIGlzUmVtb3RlOiBmaWxlLmlzUmVtb3RlIHx8IGZhbHNlLFxuICAgICAgcmVtb3RlOiBmaWxlLnJlbW90ZVxuICAgIH1cblxuICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuXG4gICAgaWYgKGZpbGVUeXBlR2VuZXJhbCA9PT0gJ2ltYWdlJykge1xuICAgICAgLy8gdGhpcy5hZGRJbWdQcmV2aWV3VG9GaWxlKHVwZGF0ZWRGaWxlc1tmaWxlSURdKVxuICAgICAgVXRpbHMucmVhZEltYWdlKHVwZGF0ZWRGaWxlc1tmaWxlSURdLmRhdGEsIChpbWdFbCkgPT4ge1xuICAgICAgICBjb25zdCBuZXdJbWFnZVdpZHRoID0gMjAwXG4gICAgICAgIGNvbnN0IG5ld0ltYWdlSGVpZ2h0ID0gVXRpbHMuZ2V0UHJvcG9ydGlvbmFsSW1hZ2VIZWlnaHQoaW1nRWwsIG5ld0ltYWdlV2lkdGgpXG4gICAgICAgIGNvbnN0IHJlc2l6ZWRJbWdTcmMgPSBVdGlscy5yZXNpemVJbWFnZShpbWdFbCwgbmV3SW1hZ2VXaWR0aCwgbmV3SW1hZ2VIZWlnaHQpXG5cbiAgICAgICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5zdGF0ZS5maWxlcylcbiAgICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0ucHJldmlld0VsID0geW9gPGltZyBhbHQ9XCIke2ZpbGUubmFtZX1cIiBzcmM9XCIke3Jlc2l6ZWRJbWdTcmN9XCI+YFxuICAgICAgICB0aGlzLnNldFN0YXRlKHtmaWxlczogdXBkYXRlZEZpbGVzfSlcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0cy5hdXRvUHJvY2VlZCkge1xuICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ25leHQnKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgbGlzdGVuZXJzIGZvciBhbGwgZ2xvYmFsIGFjdGlvbnMsIGxpa2U6XG4gICAqIGBmaWxlLWFkZGAsIGBmaWxlLXJlbW92ZWAsIGB1cGxvYWQtcHJvZ3Jlc3NgLCBgcmVzZXRgXG4gICAqXG4gICAqL1xuICBhY3Rpb25zICgpIHtcbiAgICB0aGlzLmVtaXR0ZXIub24oJ2ZpbGUtYWRkJywgKGRhdGEpID0+IHtcbiAgICAgIHRoaXMuYWRkRmlsZShkYXRhKVxuICAgIH0pXG5cbiAgICAvLyBgcmVtb3ZlLWZpbGVgIHJlbW92ZXMgYSBmaWxlIGZyb20gYHN0YXRlLmZpbGVzYCwgZm9yIGV4YW1wbGUgd2hlblxuICAgIC8vIGEgdXNlciBkZWNpZGVzIG5vdCB0byB1cGxvYWQgcGFydGljdWxhciBmaWxlIGFuZCBjbGlja3MgYSBidXR0b24gdG8gcmVtb3ZlIGl0XG4gICAgdGhpcy5lbWl0dGVyLm9uKCdmaWxlLXJlbW92ZScsIChmaWxlSUQpID0+IHtcbiAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUuZmlsZXMpXG4gICAgICBkZWxldGUgdXBkYXRlZEZpbGVzW2ZpbGVJRF1cbiAgICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuICAgIH0pXG5cbiAgICB0aGlzLmVtaXR0ZXIub24oJ3VwbG9hZC1wcm9ncmVzcycsIChkYXRhKSA9PiB7XG4gICAgICBsZXQgcGVyY2VudGFnZSA9IChkYXRhLmJ5dGVzVXBsb2FkZWQgLyBkYXRhLmJ5dGVzVG90YWwgKiAxMDApLnRvRml4ZWQoMilcbiAgICAgIHBlcmNlbnRhZ2UgPSBNYXRoLnJvdW5kKHBlcmNlbnRhZ2UpXG5cbiAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUuZmlsZXMpXG4gICAgICB1cGRhdGVkRmlsZXNbZGF0YS5pZF0ucHJvZ3Jlc3MgPSBwZXJjZW50YWdlXG4gICAgICB1cGRhdGVkRmlsZXNbZGF0YS5pZF0udXBsb2FkZWRTaXplID0gZGF0YS5ieXRlc1VwbG9hZGVkID8gcHJldHR5Qnl0ZXMoZGF0YS5ieXRlc1VwbG9hZGVkKSA6ICc/J1xuXG4gICAgICBjb25zdCBpblByb2dyZXNzID0gT2JqZWN0LmtleXModXBkYXRlZEZpbGVzKS5tYXAoKGZpbGUpID0+IHtcbiAgICAgICAgcmV0dXJuIGZpbGUucHJvZ3Jlc3MgIT09IDBcbiAgICAgIH0pXG5cbiAgICAgIC8vIGNhbGN1bGF0ZSB0b3RhbCBwcm9ncmVzcywgdXNpbmcgdGhlIG51bWJlciBvZiBmaWxlcyBjdXJyZW50bHkgdXBsb2FkaW5nLFxuICAgICAgLy8gbXVsdGlwbGllZCBieSAxMDAgYW5kIHRoZSBzdW1tIG9mIGluZGl2aWR1YWwgcHJvZ3Jlc3Mgb2YgZWFjaCBmaWxlXG4gICAgICBjb25zdCBwcm9ncmVzc01heCA9IE9iamVjdC5rZXlzKGluUHJvZ3Jlc3MpLmxlbmd0aCAqIDEwMFxuICAgICAgbGV0IHByb2dyZXNzQWxsID0gMFxuICAgICAgT2JqZWN0LmtleXModXBkYXRlZEZpbGVzKS5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgIHByb2dyZXNzQWxsID0gcHJvZ3Jlc3NBbGwgKyB1cGRhdGVkRmlsZXNbZmlsZV0ucHJvZ3Jlc3NcbiAgICAgIH0pXG5cbiAgICAgIGNvbnN0IHRvdGFsUHJvZ3Jlc3MgPSBwcm9ncmVzc0FsbCAqIDEwMCAvIHByb2dyZXNzTWF4XG5cbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICB0b3RhbFByb2dyZXNzOiB0b3RhbFByb2dyZXNzLFxuICAgICAgICBmaWxlczogdXBkYXRlZEZpbGVzXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBgdXBsb2FkLXN1Y2Nlc3NgIGFkZHMgc3VjY2Vzc2Z1bGx5IHVwbG9hZGVkIGZpbGUgdG8gYHN0YXRlLnVwbG9hZGVkRmlsZXNgXG4gICAgLy8gYW5kIGZpcmVzIGByZW1vdmUtZmlsZWAgdG8gcmVtb3ZlIGl0IGZyb20gYHN0YXRlLmZpbGVzYFxuICAgIHRoaXMuZW1pdHRlci5vbigndXBsb2FkLXN1Y2Nlc3MnLCAoZmlsZSkgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5zdGF0ZS5maWxlcylcbiAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlLmlkXSA9IGZpbGVcbiAgICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuICAgICAgLy8gdGhpcy5sb2codGhpcy5zdGF0ZS51cGxvYWRlZEZpbGVzKVxuICAgICAgLy8gdGhpcy5lbWl0dGVyLmVtaXQoJ2ZpbGUtcmVtb3ZlJywgZmlsZS5pZClcbiAgICB9KVxuICB9XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgcGx1Z2luIHdpdGggQ29yZVxuICpcbiAqIEBwYXJhbSB7Q2xhc3N9IFBsdWdpbiBvYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIG9iamVjdCB0aGF0IHdpbGwgYmUgcGFzc2VkIHRvIFBsdWdpbiBsYXRlclxuICogQHJldHVybiB7T2JqZWN0fSBzZWxmIGZvciBjaGFpbmluZ1xuICovXG4gIHVzZSAoUGx1Z2luLCBvcHRzKSB7XG4gICAgLy8gSW5zdGFudGlhdGVcbiAgICBjb25zdCBwbHVnaW4gPSBuZXcgUGx1Z2luKHRoaXMsIG9wdHMpXG4gICAgY29uc3QgcGx1Z2luTmFtZSA9IHBsdWdpbi5pZFxuICAgIHRoaXMucGx1Z2luc1twbHVnaW4udHlwZV0gPSB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdIHx8IFtdXG5cbiAgICBpZiAoIXBsdWdpbk5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignWW91ciBwbHVnaW4gbXVzdCBoYXZlIGEgbmFtZScpXG4gICAgfVxuXG4gICAgaWYgKCFwbHVnaW4udHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3VyIHBsdWdpbiBtdXN0IGhhdmUgYSB0eXBlJylcbiAgICB9XG5cbiAgICBsZXQgZXhpc3RzUGx1Z2luQWxyZWFkeSA9IHRoaXMuZ2V0UGx1Z2luKHBsdWdpbk5hbWUpXG4gICAgaWYgKGV4aXN0c1BsdWdpbkFscmVhZHkpIHtcbiAgICAgIGxldCBtc2cgPSBgQWxyZWFkeSBmb3VuZCBhIHBsdWdpbiBuYW1lZCAnJHtleGlzdHNQbHVnaW5BbHJlYWR5Lm5hbWV9Jy5cbiAgICAgICAgVHJpZWQgdG8gdXNlOiAnJHtwbHVnaW5OYW1lfScuXG4gICAgICAgIFVwcHkgaXMgY3VycmVudGx5IGxpbWl0ZWQgdG8gcnVubmluZyBvbmUgb2YgZXZlcnkgcGx1Z2luLlxuICAgICAgICBTaGFyZSB5b3VyIHVzZSBjYXNlIHdpdGggdXMgb3ZlciBhdFxuICAgICAgICBodHRwczovL2dpdGh1Yi5jb20vdHJhbnNsb2FkaXQvdXBweS9pc3N1ZXMvXG4gICAgICAgIGlmIHlvdSB3YW50IHVzIHRvIHJlY29uc2lkZXIuYFxuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZylcbiAgICB9XG5cbiAgICB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdLnB1c2gocGx1Z2luKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4vKipcbiAqIEZpbmQgb25lIFBsdWdpbiBieSBuYW1lXG4gKlxuICogQHBhcmFtIHN0cmluZyBuYW1lIGRlc2NyaXB0aW9uXG4gKi9cbiAgZ2V0UGx1Z2luIChuYW1lKSB7XG4gICAgbGV0IGZvdW5kUGx1Z2luID0gZmFsc2VcbiAgICB0aGlzLml0ZXJhdGVQbHVnaW5zKChwbHVnaW4pID0+IHtcbiAgICAgIGNvbnN0IHBsdWdpbk5hbWUgPSBwbHVnaW4uaWRcbiAgICAgIGlmIChwbHVnaW5OYW1lID09PSBuYW1lKSB7XG4gICAgICAgIGZvdW5kUGx1Z2luID0gcGx1Z2luXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvdW5kUGx1Z2luXG4gIH1cblxuLyoqXG4gKiBJdGVyYXRlIHRocm91Z2ggYWxsIGB1c2VgZCBwbHVnaW5zXG4gKlxuICogQHBhcmFtIGZ1bmN0aW9uIG1ldGhvZCBkZXNjcmlwdGlvblxuICovXG4gIGl0ZXJhdGVQbHVnaW5zIChtZXRob2QpIHtcbiAgICBPYmplY3Qua2V5cyh0aGlzLnBsdWdpbnMpLmZvckVhY2goKHBsdWdpblR5cGUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luc1twbHVnaW5UeXBlXS5mb3JFYWNoKG1ldGhvZClcbiAgICB9KVxuICB9XG5cbi8qKlxuICogTG9ncyBzdHVmZiB0byBjb25zb2xlLCBvbmx5IGlmIGBkZWJ1Z2AgaXMgc2V0IHRvIHRydWUuIFNpbGVudCBpbiBwcm9kdWN0aW9uLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ3xPYmplY3R9IHRvIGxvZ1xuICovXG4gIGxvZyAobXNnKSB7XG4gICAgaWYgKCF0aGlzLm9wdHMuZGVidWcpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAobXNnID09PSBgJHttc2d9YCkge1xuICAgICAgY29uc29sZS5sb2coYExPRzogJHttc2d9YClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coJ0xPR+KGkycpXG4gICAgICBjb25zb2xlLmRpcihtc2cpXG4gICAgfVxuICAgIGdsb2JhbC51cHB5TG9nID0gZ2xvYmFsLnVwcHlMb2cgKyAnXFxuJyArICdERUJVRyBMT0c6ICcgKyBtc2dcbiAgfVxuXG4vKipcbiAqIFJ1bnMgYWxsIHBsdWdpbnMgb2YgdGhlIHNhbWUgdHlwZSBpbiBwYXJhbGxlbFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIHRoYXQgd2FudHMgdG8gc2V0IHByb2dyZXNzXG4gKiBAcGFyYW0ge2FycmF5fSBmaWxlc1xuICogQHJldHVybiB7UHJvbWlzZX0gb2YgYWxsIG1ldGhvZHNcbiAqL1xuICBydW5UeXBlICh0eXBlLCBtZXRob2QsIGZpbGVzKSB7XG4gICAgY29uc3QgbWV0aG9kcyA9IHRoaXMucGx1Z2luc1t0eXBlXS5tYXAoXG4gICAgICAocGx1Z2luKSA9PiBwbHVnaW5bbWV0aG9kXShVdGlscy5mbGF0dGVuKGZpbGVzKSlcbiAgICApXG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwobWV0aG9kcylcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZXJyb3IpKVxuICB9XG5cbi8qKlxuICogUnVucyBhIHdhdGVyZmFsbCBvZiBydW5UeXBlIHBsdWdpbiBwYWNrcywgbGlrZSBzbzpcbiAqIEFsbCBwcmVzZXRlcnMoZGF0YSkgLS0+IEFsbCBhY3F1aXJlcnMoZGF0YSkgLS0+IEFsbCB1cGxvYWRlcnMoZGF0YSkgLS0+IGRvbmVcbiAqL1xuICBydW4gKCkge1xuICAgIHRoaXMubG9nKCdDb3JlIGlzIHJ1biwgaW5pdGlhbGl6aW5nIGFjdGlvbnMsIGluc3RhbGxpbmcgcGx1Z2lucy4uLicpXG5cbiAgICB0aGlzLmFjdGlvbnMoKVxuXG4gICAgLy8gRm9yc2Ugc2V0IGBhdXRvUHJvY2VlZGAgb3B0aW9uIHRvIGZhbHNlIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBzZWxlY3RvciBQbHVnaW5zIGFjdGl2ZVxuICAgIGlmICh0aGlzLnBsdWdpbnMuYWNxdWlyZXIgJiYgdGhpcy5wbHVnaW5zLmFjcXVpcmVyLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRoaXMub3B0cy5hdXRvUHJvY2VlZCA9IGZhbHNlXG4gICAgfVxuXG4gICAgLy8gSW5zdGFsbCBhbGwgcGx1Z2luc1xuICAgIE9iamVjdC5rZXlzKHRoaXMucGx1Z2lucykuZm9yRWFjaCgocGx1Z2luVHlwZSkgPT4ge1xuICAgICAgdGhpcy5wbHVnaW5zW3BsdWdpblR5cGVdLmZvckVhY2goKHBsdWdpbikgPT4ge1xuICAgICAgICBwbHVnaW4uaW5zdGFsbCgpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICByZXR1cm5cblxuICAgIC8vIEVhY2ggUGx1Z2luIGNhbiBoYXZlIGBydW5gIGFuZC9vciBgaW5zdGFsbGAgbWV0aG9kcy5cbiAgICAvLyBgaW5zdGFsbGAgYWRkcyBldmVudCBsaXN0ZW5lcnMgYW5kIGRvZXMgc29tZSBub24tYmxvY2tpbmcgd29yaywgdXNlZnVsIGZvciBgcHJvZ3Jlc3NpbmRpY2F0b3JgLFxuICAgIC8vIGBydW5gIHdhaXRzIGZvciB0aGUgcHJldmlvdXMgc3RlcCB0byBmaW5pc2ggKHVzZXIgc2VsZWN0cyBmaWxlcykgYmVmb3JlIHByb2NlZWRpbmdcbiAgICAvLyBbJ2luc3RhbGwnLCAncnVuJ10uZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgLy8gICAvLyBGaXJzdCB3ZSBzZWxlY3Qgb25seSBwbHVnaW5zIG9mIGN1cnJlbnQgdHlwZSxcbiAgICAvLyAgIC8vIHRoZW4gY3JlYXRlIGFuIGFycmF5IG9mIHJ1blR5cGUgbWV0aG9kcyBvZiB0aGlzIHBsdWdpbnNcbiAgICAvLyAgIGNvbnN0IHR5cGVNZXRob2RzID0gdGhpcy50eXBlcy5maWx0ZXIoKHR5cGUpID0+IHRoaXMucGx1Z2luc1t0eXBlXSlcbiAgICAvLyAgICAgLm1hcCgodHlwZSkgPT4gdGhpcy5ydW5UeXBlLmJpbmQodGhpcywgdHlwZSwgbWV0aG9kKSlcbiAgICAvLyAgIC8vIFJ1biB3YXRlcmZhbGwgb2YgdHlwZU1ldGhvZHNcbiAgICAvLyAgIHJldHVybiBVdGlscy5wcm9taXNlV2F0ZXJmYWxsKHR5cGVNZXRob2RzKVxuICAgIC8vICAgICAudGhlbigocmVzdWx0KSA9PiB7XG4gICAgLy8gICAgICAgLy8gSWYgcmVzdWx0cyBhcmUgZW1wdHksIGRvbid0IGxvZyB1cGxvYWQgcmVzdWx0cy4gSGFzbid0IHJ1biB5ZXQuXG4gICAgLy8gICAgICAgaWYgKHJlc3VsdFswXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gICAgICAgICB0aGlzLmxvZyhyZXN1bHQpXG4gICAgLy8gICAgICAgICB0aGlzLmxvZygnVXBsb2FkIHJlc3VsdCAtPiBzdWNjZXNzIScpXG4gICAgLy8gICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgLy8gICAgICAgfVxuICAgIC8vICAgICB9KVxuICAgIC8vICAgICAuY2F0Y2goKGVycm9yKSA9PiB0aGlzLmxvZygnVXBsb2FkIHJlc3VsdCAtPiBmYWlsZWQ6JywgZXJyb3IpKVxuICAgIC8vIH0pXG4gIH1cblxuICBpbml0U29ja2V0IChvcHRzKSB7XG4gICAgaWYgKCF0aGlzLnNvY2tldCkge1xuICAgICAgdGhpcy5zb2NrZXQgPSBuZXcgVXBweVNvY2tldChvcHRzKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnNvY2tldFxuICB9XG59XG4iLCIvKipcbiAqIFRyYW5zbGF0ZXMgc3RyaW5ncyB3aXRoIGludGVycG9sYXRpb24gJiBwbHVyYWxpemF0aW9uIHN1cHBvcnQuRXh0ZW5zaWJsZSB3aXRoIGN1c3RvbSBkaWN0aW9uYXJpZXNcbiAqIGFuZCBwbHVyYWxpemF0aW9uIGZ1bmN0aW9ucy5cbiAqXG4gKiBCb3Jyb3dzIGhlYXZpbHkgZnJvbSBhbmQgaW5zcGlyZWQgYnkgUG9seWdsb3QgaHR0cHM6Ly9naXRodWIuY29tL2FpcmJuYi9wb2x5Z2xvdC5qcyxcbiAqIGJhc2ljYWxseSBhIHN0cmlwcGVkLWRvd24gdmVyc2lvbiBvZiBpdC4gRGlmZmVyZW5jZXM6IHBsdXJhbGl6YXRpb24gZnVuY3Rpb25zIGFyZSBub3QgaGFyZGNvZGVkXG4gKiBhbmQgY2FuIGJlIGVhc2lseSBhZGRlZCBhbW9uZyB3aXRoIGRpY3Rpb25hcmllcywgbmVzdGVkIG9iamVjdHMgYXJlIHVzZWQgZm9yIHBsdXJhbGl6YXRpb25cbiAqIGFzIG9wcG9zZWQgdG8gYHx8fHxgIGRlbGltZXRlclxuICpcbiAqIFVzYWdlIGV4YW1wbGU6IGB0cmFuc2xhdG9yLnRyYW5zbGF0ZSgnZmlsZXNfY2hvc2VuJywge3NtYXJ0X2NvdW50OiAzfSlgXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdHNcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJhbnNsYXRvciB7XG4gIGNvbnN0cnVjdG9yIChvcHRzKSB7XG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7fVxuICAgIHRoaXMub3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRPcHRpb25zLCBvcHRzKVxuICB9XG5cbi8qKlxuICogVGFrZXMgYSBzdHJpbmcgd2l0aCBwbGFjZWhvbGRlciB2YXJpYWJsZXMgbGlrZSBgJXtzbWFydF9jb3VudH0gZmlsZSBzZWxlY3RlZGBcbiAqIGFuZCByZXBsYWNlcyBpdCB3aXRoIHZhbHVlcyBmcm9tIG9wdGlvbnMgYHtzbWFydF9jb3VudDogNX1gXG4gKlxuICogQGxpY2Vuc2UgaHR0cHM6Ly9naXRodWIuY29tL2FpcmJuYi9wb2x5Z2xvdC5qcy9ibG9iL21hc3Rlci9MSUNFTlNFXG4gKiB0YWtlbiBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9haXJibmIvcG9seWdsb3QuanMvYmxvYi9tYXN0ZXIvbGliL3BvbHlnbG90LmpzI0wyOTlcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcGhyYXNlIHRoYXQgbmVlZHMgaW50ZXJwb2xhdGlvbiwgd2l0aCBwbGFjZWhvbGRlcnNcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIHdpdGggdmFsdWVzIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHJlcGxhY2UgcGxhY2Vob2xkZXJzXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGludGVycG9sYXRlZFxuICovXG4gIGludGVycG9sYXRlIChwaHJhc2UsIG9wdGlvbnMpIHtcbiAgICBjb25zdCByZXBsYWNlID0gU3RyaW5nLnByb3RvdHlwZS5yZXBsYWNlXG4gICAgY29uc3QgZG9sbGFyUmVnZXggPSAvXFwkL2dcbiAgICBjb25zdCBkb2xsYXJCaWxsc1lhbGwgPSAnJCQkJCdcblxuICAgIGZvciAobGV0IGFyZyBpbiBvcHRpb25zKSB7XG4gICAgICBpZiAoYXJnICE9PSAnXycgJiYgb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShhcmcpKSB7XG4gICAgICAgIC8vIEVuc3VyZSByZXBsYWNlbWVudCB2YWx1ZSBpcyBlc2NhcGVkIHRvIHByZXZlbnQgc3BlY2lhbCAkLXByZWZpeGVkXG4gICAgICAgIC8vIHJlZ2V4IHJlcGxhY2UgdG9rZW5zLiB0aGUgXCIkJCQkXCIgaXMgbmVlZGVkIGJlY2F1c2UgZWFjaCBcIiRcIiBuZWVkcyB0b1xuICAgICAgICAvLyBiZSBlc2NhcGVkIHdpdGggXCIkXCIgaXRzZWxmLCBhbmQgd2UgbmVlZCB0d28gaW4gdGhlIHJlc3VsdGluZyBvdXRwdXQuXG4gICAgICAgIHZhciByZXBsYWNlbWVudCA9IG9wdGlvbnNbYXJnXVxuICAgICAgICBpZiAodHlwZW9mIHJlcGxhY2VtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJlcGxhY2VtZW50ID0gcmVwbGFjZS5jYWxsKG9wdGlvbnNbYXJnXSwgZG9sbGFyUmVnZXgsIGRvbGxhckJpbGxzWWFsbClcbiAgICAgICAgfVxuICAgICAgICAvLyBXZSBjcmVhdGUgYSBuZXcgYFJlZ0V4cGAgZWFjaCB0aW1lIGluc3RlYWQgb2YgdXNpbmcgYSBtb3JlLWVmZmljaWVudFxuICAgICAgICAvLyBzdHJpbmcgcmVwbGFjZSBzbyB0aGF0IHRoZSBzYW1lIGFyZ3VtZW50IGNhbiBiZSByZXBsYWNlZCBtdWx0aXBsZSB0aW1lc1xuICAgICAgICAvLyBpbiB0aGUgc2FtZSBwaHJhc2UuXG4gICAgICAgIHBocmFzZSA9IHJlcGxhY2UuY2FsbChwaHJhc2UsIG5ldyBSZWdFeHAoJyVcXFxceycgKyBhcmcgKyAnXFxcXH0nLCAnZycpLCByZXBsYWNlbWVudClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBocmFzZVxuICB9XG5cbi8qKlxuICogUHVibGljIHRyYW5zbGF0ZSBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyB3aXRoIHZhbHVlcyB0aGF0IHdpbGwgYmUgdXNlZCBsYXRlciB0byByZXBsYWNlIHBsYWNlaG9sZGVycyBpbiBzdHJpbmdcbiAqIEByZXR1cm4ge3N0cmluZ30gdHJhbnNsYXRlZCAoYW5kIGludGVycG9sYXRlZClcbiAqL1xuICB0cmFuc2xhdGUgKGtleSwgb3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuc21hcnRfY291bnQpIHtcbiAgICAgIHZhciBwbHVyYWwgPSB0aGlzLm9wdHMubG9jYWxlcy5wbHVyYWxpemUob3B0aW9ucy5zbWFydF9jb3VudClcbiAgICAgIHJldHVybiB0aGlzLmludGVycG9sYXRlKHRoaXMub3B0cy5sb2NhbGVzLnN0cmluZ3Nba2V5XVtwbHVyYWxdLCBvcHRpb25zKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmludGVycG9sYXRlKHRoaXMub3B0cy5sb2NhbGVzLnN0cmluZ3Nba2V5XSwgb3B0aW9ucylcbiAgfVxufVxuIiwiaW1wb3J0IGVlIGZyb20gJ2V2ZW50cydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVXBweVNvY2tldCB7XG4gIGNvbnN0cnVjdG9yIChvcHRzKSB7XG4gICAgdGhpcy5xdWV1ZWQgPSBbXVxuICAgIHRoaXMuaXNPcGVuID0gZmFsc2VcbiAgICB0aGlzLnNvY2tldCA9IG5ldyBXZWJTb2NrZXQob3B0cy50YXJnZXQpXG4gICAgdGhpcy5lbWl0dGVyID0gbmV3IGVlLkV2ZW50RW1pdHRlcigpXG5cbiAgICB0aGlzLnNvY2tldC5vbm9wZW4gPSAoZSkgPT4ge1xuICAgICAgdGhpcy5pc09wZW4gPSB0cnVlXG5cbiAgICAgIHdoaWxlICh0aGlzLnF1ZXVlZC5sZW5ndGggPiAwICYmIHRoaXMuaXNPcGVuKSB7XG4gICAgICAgIGNvbnN0IGZpcnN0ID0gdGhpcy5xdWV1ZWRbMF1cbiAgICAgICAgdGhpcy5zZW5kKGZpcnN0LmFjdGlvbiwgZmlyc3QucGF5bG9hZClcbiAgICAgICAgdGhpcy5xdWV1ZWQgPSB0aGlzLnF1ZXVlZC5zbGljZSgxKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuc29ja2V0Lm9uY2xvc2UgPSAoZSkgPT4ge1xuICAgICAgdGhpcy5pc09wZW4gPSBmYWxzZVxuICAgIH1cblxuICAgIHRoaXMuX2hhbmRsZU1lc3NhZ2UgPSB0aGlzLl9oYW5kbGVNZXNzYWdlLmJpbmQodGhpcylcblxuICAgIHRoaXMuc29ja2V0Lm9ubWVzc2FnZSA9IHRoaXMuX2hhbmRsZU1lc3NhZ2VcblxuICAgIHRoaXMuZW1pdCA9IHRoaXMuZW1pdC5iaW5kKHRoaXMpXG4gICAgdGhpcy5vbiA9IHRoaXMub24uYmluZCh0aGlzKVxuICAgIHRoaXMub25jZSA9IHRoaXMub25jZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5zZW5kID0gdGhpcy5zZW5kLmJpbmQodGhpcylcbiAgfVxuXG4gIHNlbmQgKGFjdGlvbiwgcGF5bG9hZCkge1xuICAgIC8vIGF0dGFjaCB1dWlkXG5cbiAgICBpZiAoIXRoaXMuaXNPcGVuKSB7XG4gICAgICB0aGlzLnF1ZXVlZC5wdXNoKHthY3Rpb24sIHBheWxvYWR9KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5zb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICBhY3Rpb24sXG4gICAgICBwYXlsb2FkXG4gICAgfSkpXG4gIH1cblxuICBvbiAoYWN0aW9uLCBoYW5kbGVyKSB7XG4gICAgdGhpcy5lbWl0dGVyLm9uKGFjdGlvbiwgaGFuZGxlcilcbiAgfVxuXG4gIGVtaXQgKGFjdGlvbiwgcGF5bG9hZCkge1xuICAgIHRoaXMuZW1pdHRlci5lbWl0KGFjdGlvbiwgcGF5bG9hZClcbiAgfVxuXG4gIG9uY2UgKGFjdGlvbiwgaGFuZGxlcikge1xuICAgIHRoaXMuZW1pdHRlci5vbmNlKGFjdGlvbiwgaGFuZGxlcilcbiAgfVxuXG4gIF9oYW5kbGVNZXNzYWdlIChlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBKU09OLnBhcnNlKGUuZGF0YSlcbiAgICAgIHRoaXMuZW1pdChtZXNzYWdlLmFjdGlvbiwgbWVzc2FnZS5wYXlsb2FkKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgIH1cbiAgfVxufVxuIiwiLyoqXG4gKiBBIGNvbGxlY3Rpb24gb2Ygc21hbGwgdXRpbGl0eSBmdW5jdGlvbnMgdGhhdCBoZWxwIHdpdGggZG9tIG1hbmlwdWxhdGlvbiwgYWRkaW5nIGxpc3RlbmVycyxcbiAqIHByb21pc2VzIGFuZCBvdGhlciBnb29kIHRoaW5ncy5cbiAqXG4gKiBAbW9kdWxlIFV0aWxzXG4gKi9cblxuLyoqXG4gKiBSdW5zIGEgd2F0ZXJmYWxsIG9mIHByb21pc2VzOiBjYWxscyBlYWNoIHRhc2ssIHBhc3NpbmcgdGhlIHJlc3VsdFxuICogZnJvbSB0aGUgcHJldmlvdXMgb25lIGFzIGFuIGFyZ3VtZW50LiBUaGUgZmlyc3QgdGFzayBpcyBydW4gd2l0aCBhbiBlbXB0eSBhcnJheS5cbiAqXG4gKiBAbWVtYmVyb2YgVXRpbHNcbiAqIEBwYXJhbSB7YXJyYXl9IG1ldGhvZHMgb2YgUHJvbWlzZXMgdG8gcnVuIHdhdGVyZmFsbCBvblxuICogQHJldHVybiB7UHJvbWlzZX0gb2YgdGhlIGZpbmFsIHRhc2tcbiAqL1xuZnVuY3Rpb24gcHJvbWlzZVdhdGVyZmFsbCAobWV0aG9kcykge1xuICBjb25zdCBbcmVzb2x2ZWRQcm9taXNlLCAuLi50YXNrc10gPSBtZXRob2RzXG4gIGNvbnN0IGZpbmFsVGFza1Byb21pc2UgPSB0YXNrcy5yZWR1Y2UoKHByZXZUYXNrUHJvbWlzZSwgdGFzaykgPT4ge1xuICAgIHJldHVybiBwcmV2VGFza1Byb21pc2UudGhlbih0YXNrKVxuICB9LCByZXNvbHZlZFByb21pc2UoW10pKSAvLyBpbml0aWFsIHZhbHVlXG5cbiAgcmV0dXJuIGZpbmFsVGFza1Byb21pc2Vcbn1cblxuLyoqXG4gKiBTaGFsbG93IGZsYXR0ZW4gbmVzdGVkIGFycmF5cy5cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbiAoYXJyKSB7XG4gIHJldHVybiBbXS5jb25jYXQuYXBwbHkoW10sIGFycilcbn1cblxuZnVuY3Rpb24gaXNUb3VjaERldmljZSAoKSB7XG4gIHJldHVybiAnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cgfHwgLy8gd29ya3Mgb24gbW9zdCBicm93c2Vyc1xuICAgICAgICAgIG5hdmlnYXRvci5tYXhUb3VjaFBvaW50cyAgIC8vIHdvcmtzIG9uIElFMTAvMTEgYW5kIFN1cmZhY2Vcbn07XG5cbi8qKlxuICogYHF1ZXJ5U2VsZWN0b3JBbGxgIHRoYXQgcmV0dXJucyBhIG5vcm1hbCBhcnJheSBpbnN0ZWFkIG9mIGZpbGVMaXN0XG4gKi9cbmZ1bmN0aW9uIHFzYSAoc2VsZWN0b3IsIGNvbnRleHQpIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKChjb250ZXh0IHx8IGRvY3VtZW50KS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSB8fCBbXSlcbn1cblxuLyoqXG4gKiBQYXJ0aXRpb24gYXJyYXkgYnkgYSBncm91cGluZyBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge1t0eXBlXX0gYXJyYXkgICAgICBJbnB1dCBhcnJheVxuICogQHBhcmFtICB7W3R5cGVdfSBncm91cGluZ0ZuIEdyb3VwaW5nIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgICAgICAgQXJyYXkgb2YgYXJyYXlzXG4gKi9cbmZ1bmN0aW9uIGdyb3VwQnkgKGFycmF5LCBncm91cGluZ0ZuKSB7XG4gIHJldHVybiBhcnJheS5yZWR1Y2UoKHJlc3VsdCwgaXRlbSkgPT4ge1xuICAgIGxldCBrZXkgPSBncm91cGluZ0ZuKGl0ZW0pXG4gICAgbGV0IHhzID0gcmVzdWx0LmdldChrZXkpIHx8IFtdXG4gICAgeHMucHVzaChpdGVtKVxuICAgIHJlc3VsdC5zZXQoa2V5LCB4cylcbiAgICByZXR1cm4gcmVzdWx0XG4gIH0sIG5ldyBNYXAoKSlcbn1cblxuLyoqXG4gKiBUZXN0cyBpZiBldmVyeSBhcnJheSBlbGVtZW50IHBhc3NlcyBwcmVkaWNhdGVcbiAqIEBwYXJhbSAge0FycmF5fSAgYXJyYXkgICAgICAgSW5wdXQgYXJyYXlcbiAqIEBwYXJhbSAge09iamVjdH0gcHJlZGljYXRlRm4gUHJlZGljYXRlXG4gKiBAcmV0dXJuIHtib29sfSAgICAgICAgICAgICAgIEV2ZXJ5IGVsZW1lbnQgcGFzc1xuICovXG5mdW5jdGlvbiBldmVyeSAoYXJyYXksIHByZWRpY2F0ZUZuKSB7XG4gIHJldHVybiBhcnJheS5yZWR1Y2UoKHJlc3VsdCwgaXRlbSkgPT4ge1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICByZXR1cm4gcHJlZGljYXRlRm4oaXRlbSlcbiAgfSwgdHJ1ZSlcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBsaXN0IGludG8gYXJyYXlcbiovXG5mdW5jdGlvbiB0b0FycmF5IChsaXN0KSB7XG4gIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChsaXN0IHx8IFtdLCAwKVxufVxuXG4vKipcbiAqIFRha2VzIGEgZmlsZU5hbWUgYW5kIHR1cm5zIGl0IGludG8gZmlsZUlELCBieSBjb252ZXJ0aW5nIHRvIGxvd2VyY2FzZSxcbiAqIHJlbW92aW5nIGV4dHJhIGNoYXJhY3RlcnMgYW5kIGFkZGluZyB1bml4IHRpbWVzdGFtcFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWxlTmFtZVxuICpcbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVGaWxlSUQgKGZpbGVOYW1lKSB7XG4gIGxldCBmaWxlSUQgPSBmaWxlTmFtZS50b0xvd2VyQ2FzZSgpXG4gIGZpbGVJRCA9IGZpbGVJRC5yZXBsYWNlKC9bXkEtWjAtOV0vaWcsICcnKVxuICBmaWxlSUQgPSBmaWxlSUQgKyBEYXRlLm5vdygpXG4gIHJldHVybiBmaWxlSURcbn1cblxuZnVuY3Rpb24gZXh0ZW5kICguLi5vYmpzKSB7XG4gIHJldHVybiBPYmplY3QuYXNzaWduLmFwcGx5KHRoaXMsIFt7fV0uY29uY2F0KG9ianMpKVxufVxuXG4vKipcbiAqIFRha2VzIGZ1bmN0aW9uIG9yIGNsYXNzLCByZXR1cm5zIGl0cyBuYW1lLlxuICogQmVjYXVzZSBJRSBkb2VzbuKAmXQgc3VwcG9ydCBgY29uc3RydWN0b3IubmFtZWAuXG4gKiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9kZmtheWUvNjM4NDQzOSwgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTU3MTQ0NDVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZm4g4oCUIGZ1bmN0aW9uXG4gKlxuICovXG5mdW5jdGlvbiBnZXRGbk5hbWUgKGZuKSB7XG4gIHZhciBmID0gdHlwZW9mIGZuID09PSAnZnVuY3Rpb24nXG4gIHZhciBzID0gZiAmJiAoKGZuLm5hbWUgJiYgWycnLCBmbi5uYW1lXSkgfHwgZm4udG9TdHJpbmcoKS5tYXRjaCgvZnVuY3Rpb24gKFteXFwoXSspLykpXG4gIHJldHVybiAoIWYgJiYgJ25vdCBhIGZ1bmN0aW9uJykgfHwgKHMgJiYgc1sxXSB8fCAnYW5vbnltb3VzJylcbn1cblxuLyoqXG4gKiBSZWFkcyBpbWFnZSBhcyBkYXRhIFVSSSBmcm9tIGZpbGUgb2JqZWN0LFxuICogdGhlIG9uZSB5b3UgZ2V0IGZyb20gaW5wdXRbdHlwZT1maWxlXSBvciBkcmFnICYgZHJvcC5cbiAqIFRoaXMgd2lsbCBvbmx5IHJlYWQgaW1hZ2UgZmlsZXMsIHNraXBwaW5nIG90aGVyc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBpbWdPYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIGNhbGxiYWNrIHRoYXQgd2lsbCBiZSBjYWxsZWQgb25jZSB0aGUgaW1hZ2UgaXMgcmVhZFxuICpcbiAqL1xuZnVuY3Rpb24gcmVhZEltYWdlIChpbWdPYmplY3QsIGNiKSB7XG4gIC8vIGlmICghaW1nT2JqZWN0LnR5cGUubWF0Y2goL2ltYWdlLiovKSkge1xuICAvLyAgIGNvbnNvbGUubG9nKCdUaGUgZmlsZSBpcyBub3QgYW4gaW1hZ2U6ICcsIGltZ09iamVjdC50eXBlKVxuICAvLyAgIHJldHVyblxuICAvLyB9XG5cbiAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICB2YXIgaW1nU3JjQmFzZTY0ID0gZXYudGFyZ2V0LnJlc3VsdFxuICAgIHZhciBpbWcgPSBuZXcgSW1hZ2UoKVxuICAgIGltZy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gY2IoaW1nKVxuICAgIH1cbiAgICBpbWcuc3JjID0gaW1nU3JjQmFzZTY0XG4gIH0pXG4gIHJlYWRlci5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBjb25zb2xlLmxvZygnRmlsZVJlYWRlciBlcnJvcicgKyBlcnIpXG4gIH0pXG4gIHJlYWRlci5yZWFkQXNEYXRhVVJMKGltZ09iamVjdClcbn1cblxuZnVuY3Rpb24gZ2V0UHJvcG9ydGlvbmFsSW1hZ2VIZWlnaHQgKGltZywgbmV3V2lkdGgpIHtcbiAgdmFyIGFzcGVjdCA9IGltZy53aWR0aCAvIGltZy5oZWlnaHRcbiAgdmFyIG5ld0hlaWdodCA9IE1hdGgucm91bmQobmV3V2lkdGggLyBhc3BlY3QpXG4gIHJldHVybiBuZXdIZWlnaHRcbn1cblxuLyoqXG4gKiBSZXNpemVzIGFuIGltYWdlIHRvIHNwZWNpZmllZCB3aWR0aCBhbmQgaGVpZ2h0LCB1c2luZyBjYW52YXNcbiAqIFNlZSBodHRwczovL2Rhdmlkd2Fsc2gubmFtZS9yZXNpemUtaW1hZ2UtY2FudmFzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGltZyBlbGVtZW50XG4gKiBAcGFyYW0ge1N0cmluZ30gd2lkdGggb2YgdGhlIHJlc3VsdGluZyBpbWFnZVxuICogQHBhcmFtIHtTdHJpbmd9IGhlaWdodCBvZiB0aGUgcmVzdWx0aW5nIGltYWdlXG4gKiBAcmV0dXJuIHtTdHJpbmd9IGRhdGFVUkwgb2YgdGhlIHJlc2l6ZWQgaW1hZ2VcbiAqL1xuZnVuY3Rpb24gcmVzaXplSW1hZ2UgKGltZywgd2lkdGgsIGhlaWdodCkge1xuICAvLyBjcmVhdGUgYW4gb2ZmLXNjcmVlbiBjYW52YXNcbiAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpXG4gIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuXG4gIC8vIHNldCBpdHMgZGltZW5zaW9uIHRvIHRhcmdldCBzaXplXG4gIGNhbnZhcy53aWR0aCA9IHdpZHRoXG4gIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHRcblxuICAvLyBkcmF3IHNvdXJjZSBpbWFnZSBpbnRvIHRoZSBvZmYtc2NyZWVuIGNhbnZhczpcbiAgY3R4LmRyYXdJbWFnZShpbWcsIDAsIDAsIHdpZHRoLCBoZWlnaHQpXG5cbiAgLy8gZW5jb2RlIGltYWdlIHRvIGRhdGEtdXJpIHdpdGggYmFzZTY0IHZlcnNpb24gb2YgY29tcHJlc3NlZCBpbWFnZVxuICAvLyBjYW52YXMudG9EYXRhVVJMKCdpbWFnZS9qcGVnJywgcXVhbGl0eSk7ICAvLyBxdWFsaXR5ID0gWzAuMCwgMS4wXVxuICByZXR1cm4gY2FudmFzLnRvRGF0YVVSTCgpXG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgcHJvbWlzZVdhdGVyZmFsbCxcbiAgZ2VuZXJhdGVGaWxlSUQsXG4gIGdldEZuTmFtZSxcbiAgdG9BcnJheSxcbiAgZXZlcnksXG4gIGZsYXR0ZW4sXG4gIGdyb3VwQnksXG4gIHFzYSxcbiAgZXh0ZW5kLFxuICByZWFkSW1hZ2UsXG4gIHJlc2l6ZUltYWdlLFxuICBnZXRQcm9wb3J0aW9uYWxJbWFnZUhlaWdodCxcbiAgaXNUb3VjaERldmljZVxufVxuIiwiY29uc3QgZW5fVVMgPSB7fVxuXG5lbl9VUy5zdHJpbmdzID0ge1xuICBjaG9vc2VGaWxlOiAnQ2hvb3NlIGEgZmlsZScsXG4gIHlvdUhhdmVDaG9zZW46ICdZb3UgaGF2ZSBjaG9zZW46ICV7ZmlsZU5hbWV9JyxcbiAgb3JEcmFnRHJvcDogJ29yIGRyYWcgaXQgaGVyZScsXG4gIGZpbGVzQ2hvc2VuOiB7XG4gICAgMDogJyV7c21hcnRfY291bnR9IGZpbGUgc2VsZWN0ZWQnLFxuICAgIDE6ICcle3NtYXJ0X2NvdW50fSBmaWxlcyBzZWxlY3RlZCdcbiAgfSxcbiAgZmlsZXNVcGxvYWRlZDoge1xuICAgIDA6ICcle3NtYXJ0X2NvdW50fSBmaWxlIHVwbG9hZGVkJyxcbiAgICAxOiAnJXtzbWFydF9jb3VudH0gZmlsZXMgdXBsb2FkZWQnXG4gIH0sXG4gIGZpbGVzOiB7XG4gICAgMDogJyV7c21hcnRfY291bnR9IGZpbGUnLFxuICAgIDE6ICcle3NtYXJ0X2NvdW50fSBmaWxlcydcbiAgfSxcbiAgdXBsb2FkRmlsZXM6IHtcbiAgICAwOiAnVXBsb2FkICV7c21hcnRfY291bnR9IGZpbGUnLFxuICAgIDE6ICdVcGxvYWQgJXtzbWFydF9jb3VudH0gZmlsZXMnXG4gIH0sXG4gIHNlbGVjdFRvVXBsb2FkOiAnU2VsZWN0IGZpbGVzIHRvIHVwbG9hZCcsXG4gIGNsb3NlTW9kYWw6ICdDbG9zZSBNb2RhbCcsXG4gIHVwbG9hZDogJ1VwbG9hZCdcbn1cblxuZW5fVVMucGx1cmFsaXplID0gZnVuY3Rpb24gKG4pIHtcbiAgaWYgKG4gPT09IDEpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIHJldHVybiAxXG59XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93LlVwcHkgIT09ICd1bmRlZmluZWQnKSB7XG4gIHdpbmRvdy5VcHB5LmxvY2FsZXMuZW5fVVMgPSBlbl9VU1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGVuX1VTXG4iLCJjb25zdCBydV9SVSA9IHt9XG5cbnJ1X1JVLnN0cmluZ3MgPSB7XG4gIGNob29zZUZpbGU6ICfQktGL0LHQtdGA0LjRgtC1INGE0LDQudC7JyxcbiAgb3JEcmFnRHJvcDogJ9C40LvQuCDQv9C10YDQtdC90LXRgdC40YLQtSDQtdCz0L7CoNGB0Y7QtNCwJyxcbiAgeW91SGF2ZUNob3NlbjogJ9CS0Ysg0LLRi9Cx0YDQsNC70Lg6ICV7ZmlsZV9uYW1lfScsXG4gIGZpbGVzQ2hvc2VuOiB7XG4gICAgMDogJ9CS0YvQsdGA0LDQvSAle3NtYXJ0X2NvdW50fSDRhNCw0LnQuycsXG4gICAgMTogJ9CS0YvQsdGA0LDQvdC+ICV7c21hcnRfY291bnR9INGE0LDQudC70LAnLFxuICAgIDI6ICfQktGL0LHRgNCw0L3QviAle3NtYXJ0X2NvdW50fSDRhNCw0LnQu9C+0LInXG4gIH0sXG4gIHVwbG9hZDogJ9CX0LDQs9GA0YPQt9C40YLRjCdcbn1cblxucnVfUlUucGx1cmFsaXplID0gZnVuY3Rpb24gKG4pIHtcbiAgaWYgKG4gJSAxMCA9PT0gMSAmJiBuICUgMTAwICE9PSAxMSkge1xuICAgIHJldHVybiAwXG4gIH1cblxuICBpZiAobiAlIDEwID49IDIgJiYgbiAlIDEwIDw9IDQgJiYgKG4gJSAxMDAgPCAxMCB8fCBuICUgMTAwID49IDIwKSkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICByZXR1cm4gMlxufVxuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdy5VcHB5ICE9PSAndW5kZWZpbmVkJykge1xuICB3aW5kb3cuVXBweS5sb2NhbGVzLnJ1X1JVID0gcnVfUlVcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBydV9SVVxuIiwiaW1wb3J0IFV0aWxzIGZyb20gJy4uL2NvcmUvVXRpbHMnXG5pbXBvcnQgUGx1Z2luIGZyb20gJy4vUGx1Z2luJ1xuaW1wb3J0ICd3aGF0d2ctZmV0Y2gnXG5pbXBvcnQgeW8gZnJvbSAneW8teW8nXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdvb2dsZSBleHRlbmRzIFBsdWdpbiB7XG4gIGNvbnN0cnVjdG9yIChjb3JlLCBvcHRzKSB7XG4gICAgc3VwZXIoY29yZSwgb3B0cylcbiAgICB0aGlzLnR5cGUgPSAnYWNxdWlyZXInXG4gICAgdGhpcy5pZCA9ICdHb29nbGVEcml2ZSdcbiAgICB0aGlzLnRpdGxlID0gJ0dvb2dsZSBEcml2ZSdcbiAgICB0aGlzLmljb24gPSB5b2BcbiAgICAgIDxzdmcgY2xhc3M9XCJVcHB5SWNvbiBVcHB5TW9kYWxUYWItaWNvblwiIHdpZHRoPVwiMjhcIiBoZWlnaHQ9XCIyOFwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIj5cbiAgICAgICAgPHBhdGggZD1cIk0yLjk1NSAxNC45M2wyLjY2Ny00LjYySDE2bC0yLjY2NyA0LjYySDIuOTU1em0yLjM3OC00LjYybC0yLjY2NiA0LjYyTDAgMTAuMzFsNS4xOS04Ljk5IDIuNjY2IDQuNjItMi41MjMgNC4zN3ptMTAuNTIzLS4yNWgtNS4zMzNsLTUuMTktOC45OWg1LjMzNGw1LjE5IDguOTl6XCIvPlxuICAgICAgPC9zdmc+XG4gICAgYFxuXG4gICAgdGhpcy5maWxlcyA9IFtdXG5cbiAgICAvLyBMb2dpY1xuICAgIHRoaXMuYWRkRmlsZSA9IHRoaXMuYWRkRmlsZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5nZXRGb2xkZXIgPSB0aGlzLmdldEZvbGRlci5iaW5kKHRoaXMpXG4gICAgdGhpcy5oYW5kbGVDbGljayA9IHRoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzKVxuICAgIHRoaXMubG9nb3V0ID0gdGhpcy5sb2dvdXQuYmluZCh0aGlzKVxuXG4gICAgLy8gVmlzdWFsXG4gICAgdGhpcy5yZW5kZXJCcm93c2VySXRlbSA9IHRoaXMucmVuZGVyQnJvd3Nlckl0ZW0uYmluZCh0aGlzKVxuICAgIHRoaXMuZmlsdGVySXRlbXMgPSB0aGlzLmZpbHRlckl0ZW1zLmJpbmQodGhpcylcbiAgICB0aGlzLmZpbHRlclF1ZXJ5ID0gdGhpcy5maWx0ZXJRdWVyeS5iaW5kKHRoaXMpXG4gICAgdGhpcy5yZW5kZXJBdXRoID0gdGhpcy5yZW5kZXJBdXRoLmJpbmQodGhpcylcbiAgICB0aGlzLnJlbmRlckJyb3dzZXIgPSB0aGlzLnJlbmRlckJyb3dzZXIuYmluZCh0aGlzKVxuICAgIHRoaXMuc29ydEJ5VGl0bGUgPSB0aGlzLnNvcnRCeVRpdGxlLmJpbmQodGhpcylcbiAgICB0aGlzLnNvcnRCeURhdGUgPSB0aGlzLnNvcnRCeURhdGUuYmluZCh0aGlzKVxuICAgIHRoaXMucmVuZGVyID0gdGhpcy5yZW5kZXIuYmluZCh0aGlzKVxuXG4gICAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICAgIGNvbnN0IGRlZmF1bHRPcHRpb25zID0ge31cblxuICAgIC8vIG1lcmdlIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBvbmVzIHNldCBieSB1c2VyXG4gICAgdGhpcy5vcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdHMpXG4gIH1cblxuICBpbnN0YWxsICgpIHtcbiAgICAvLyBTZXQgZGVmYXVsdCBzdGF0ZSBmb3IgR29vZ2xlIERyaXZlXG4gICAgdGhpcy5jb3JlLnNldFN0YXRlKHtcbiAgICAgIGdvb2dsZURyaXZlOiB7XG4gICAgICAgIGF1dGhlbnRpY2F0ZWQ6IGZhbHNlLFxuICAgICAgICBmaWxlczogW10sXG4gICAgICAgIGZvbGRlcnM6IFtdLFxuICAgICAgICBkaXJlY3Rvcnk6IFt7XG4gICAgICAgICAgdGl0bGU6ICdNeSBEcml2ZScsXG4gICAgICAgICAgaWQ6ICdyb290J1xuICAgICAgICB9XSxcbiAgICAgICAgYWN0aXZlOiB7fSxcbiAgICAgICAgZmlsdGVySW5wdXQ6ICcnXG4gICAgICB9XG4gICAgfSlcblxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMub3B0cy50YXJnZXRcbiAgICBjb25zdCBwbHVnaW4gPSB0aGlzXG4gICAgdGhpcy50YXJnZXQgPSB0aGlzLm1vdW50KHRhcmdldCwgcGx1Z2luKVxuXG4gICAgdGhpcy5jaGVja0F1dGhlbnRpY2F0aW9uKClcbiAgICAgIC50aGVuKChhdXRoZW50aWNhdGVkKSA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlU3RhdGUoe2F1dGhlbnRpY2F0ZWR9KVxuXG4gICAgICAgIGlmIChhdXRoZW50aWNhdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Rm9sZGVyKHRoaXMuY29yZS5nZXRTdGF0ZSgpLmdvb2dsZURyaXZlLmRpcmVjdG9yeS5pZClcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhdXRoZW50aWNhdGVkXG4gICAgICB9KVxuICAgICAgLnRoZW4oKG5ld1N0YXRlKSA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlU3RhdGUobmV3U3RhdGUpXG4gICAgICB9KVxuXG4gICAgcmV0dXJuXG4gIH1cblxuICBmb2N1cyAoKSB7XG4gICAgY29uc3QgZmlyc3RJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYCR7dGhpcy50YXJnZXR9IC5VcHB5R29vZ2xlRHJpdmUtZm9jdXNJbnB1dGApXG5cbiAgICAvLyBvbmx5IHdvcmtzIGZvciB0aGUgZmlyc3QgdGltZSBpZiB3cmFwcGVkIGluIHNldFRpbWVvdXQgZm9yIHNvbWUgcmVhc29uXG4gICAgLy8gZmlyc3RJbnB1dC5mb2N1cygpXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBmaXJzdElucHV0LmZvY3VzKClcbiAgICB9LCAxMClcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXR0bGUgc2hvcnRoYW5kIHRvIHVwZGF0ZSB0aGUgc3RhdGUgd2l0aCBteSBuZXcgc3RhdGVcbiAgICovXG4gIHVwZGF0ZVN0YXRlIChuZXdTdGF0ZSkge1xuICAgIGNvbnN0IHtzdGF0ZX0gPSB0aGlzLmNvcmVcbiAgICBjb25zdCBnb29nbGVEcml2ZSA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmdvb2dsZURyaXZlLCBuZXdTdGF0ZSlcblxuICAgIHRoaXMuY29yZS5zZXRTdGF0ZSh7Z29vZ2xlRHJpdmV9KVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHRvIHNlZSBpZiB0aGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBhdXRoZW50aWNhdGlvbiBzdGF0dXNcbiAgICovXG4gIGNoZWNrQXV0aGVudGljYXRpb24gKCkge1xuICAgIHJldHVybiBmZXRjaChgJHt0aGlzLm9wdHMuaG9zdH0vZ29vZ2xlL2F1dGhvcml6ZWAsIHtcbiAgICAgIG1ldGhvZDogJ2dldCcsXG4gICAgICBjcmVkZW50aWFsczogJ2luY2x1ZGUnLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICB9XG4gICAgfSlcbiAgICAudGhlbigocmVzKSA9PiB7XG4gICAgICBpZiAocmVzLnN0YXR1cyA+PSAyMDAgJiYgcmVzLnN0YXR1cyA8PSAzMDApIHtcbiAgICAgICAgcmV0dXJuIHJlcy5qc29uKClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudXBkYXRlU3RhdGUoe1xuICAgICAgICAgIGF1dGhlbnRpY2F0ZWQ6IGZhbHNlLFxuICAgICAgICAgIGVycm9yOiB0cnVlXG4gICAgICAgIH0pXG4gICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcihyZXMuc3RhdHVzVGV4dClcbiAgICAgICAgZXJyb3IucmVzcG9uc2UgPSByZXNcbiAgICAgICAgdGhyb3cgZXJyb3JcbiAgICAgIH1cbiAgICB9KVxuICAgIC50aGVuKChkYXRhKSA9PiBkYXRhLmlzQXV0aGVudGljYXRlZClcbiAgICAuY2F0Y2goKGVycikgPT4gZXJyKVxuICB9XG5cbiAgLyoqXG4gICAqIEJhc2VkIG9uIGZvbGRlciBJRCwgZmV0Y2ggYSBuZXcgZm9sZGVyXG4gICAqIEBwYXJhbSAge1N0cmluZ30gaWQgRm9sZGVyIGlkXG4gICAqIEByZXR1cm4ge1Byb21pc2V9ICAgRm9sZGVycy9maWxlcyBpbiBmb2xkZXJcbiAgICovXG4gIGdldEZvbGRlciAoaWQgPSAncm9vdCcpIHtcbiAgICByZXR1cm4gZmV0Y2goYCR7dGhpcy5vcHRzLmhvc3R9L2dvb2dsZS9saXN0P2Rpcj0ke2lkfWAsIHtcbiAgICAgIG1ldGhvZDogJ2dldCcsXG4gICAgICBjcmVkZW50aWFsczogJ2luY2x1ZGUnLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICB9XG4gICAgfSlcbiAgICAudGhlbigocmVzKSA9PiB7XG4gICAgICBpZiAocmVzLnN0YXR1cyA+PSAyMDAgJiYgcmVzLnN0YXR1cyA8PSAzMDApIHtcbiAgICAgICAgcmV0dXJuIHJlcy5qc29uKCkudGhlbigoZGF0YSkgPT4ge1xuICAgICAgICAgIC8vIGxldCByZXN1bHQgPSBVdGlscy5ncm91cEJ5KGRhdGEuaXRlbXMsIChpdGVtKSA9PiBpdGVtLm1pbWVUeXBlKVxuICAgICAgICAgIGxldCBmb2xkZXJzID0gW11cbiAgICAgICAgICBsZXQgZmlsZXMgPSBbXVxuICAgICAgICAgIGRhdGEuaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0ubWltZVR5cGUgPT09ICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJykge1xuICAgICAgICAgICAgICBmb2xkZXJzLnB1c2goaXRlbSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZpbGVzLnB1c2goaXRlbSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBmb2xkZXJzLFxuICAgICAgICAgICAgZmlsZXNcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmhhbmRsZUVycm9yKHJlcylcbiAgICAgICAgbGV0IGVycm9yID0gbmV3IEVycm9yKHJlcy5zdGF0dXNUZXh0KVxuICAgICAgICBlcnJvci5yZXNwb25zZSA9IHJlc1xuICAgICAgICB0aHJvdyBlcnJvclxuICAgICAgfVxuICAgIH0pXG4gICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgIHJldHVybiBlcnJcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEZldGNoZXMgbmV3IGZvbGRlciBhbmQgYWRkcyB0byBicmVhZGNydW1iIG5hdlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkICAgIEZvbGRlciBpZFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHRpdGxlIEZvbGRlciB0aXRsZVxuICAgKi9cbiAgZ2V0TmV4dEZvbGRlciAoaWQsIHRpdGxlKSB7XG4gICAgdGhpcy5nZXRGb2xkZXIoaWQpXG4gICAgICAudGhlbigoZGF0YSkgPT4ge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IHRoaXMuY29yZS5nZXRTdGF0ZSgpLmdvb2dsZURyaXZlXG5cbiAgICAgICAgY29uc3QgaW5kZXggPSBzdGF0ZS5kaXJlY3RvcnkuZmluZEluZGV4KChkaXIpID0+IGlkID09PSBkaXIuaWQpXG4gICAgICAgIGxldCBkaXJlY3RvcnlcblxuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgZGlyZWN0b3J5ID0gc3RhdGUuZGlyZWN0b3J5LnNsaWNlKDAsIGluZGV4ICsgMSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkaXJlY3RvcnkgPSBzdGF0ZS5kaXJlY3RvcnkuY29uY2F0KFt7XG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIHRpdGxlXG4gICAgICAgICAgfV0pXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlKFV0aWxzLmV4dGVuZChkYXRhLCB7ZGlyZWN0b3J5fSkpXG4gICAgICB9KVxuICB9XG5cbiAgYWRkRmlsZSAoZmlsZSkge1xuICAgIGNvbnN0IHRhZ0ZpbGUgPSB7XG4gICAgICBzb3VyY2U6IHRoaXMsXG4gICAgICBkYXRhOiBmaWxlLFxuICAgICAgbmFtZTogZmlsZS50aXRsZSxcbiAgICAgIHR5cGU6IHRoaXMuZ2V0RmlsZVR5cGUoZmlsZSksXG4gICAgICBpc1JlbW90ZTogdHJ1ZSxcbiAgICAgIHJlbW90ZToge1xuICAgICAgICB1cmw6IGAke3RoaXMub3B0cy5ob3N0fS9nb29nbGUvZ2V0P2ZpbGVJZD0ke2ZpbGUuaWR9YCxcbiAgICAgICAgYm9keToge1xuICAgICAgICAgIGZpbGVJZDogZmlsZS5pZFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb3JlLmVtaXR0ZXIuZW1pdCgnZmlsZS1hZGQnLCB0YWdGaWxlKVxuICB9XG5cbiAgaGFuZGxlRXJyb3IgKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5jaGVja0F1dGhlbnRpY2F0aW9uKClcbiAgICAgIC50aGVuKChhdXRoZW50aWNhdGVkKSA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlU3RhdGUoe2F1dGhlbnRpY2F0ZWR9KVxuICAgICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIHNlc3Npb24gdG9rZW4gb24gY2xpZW50IHNpZGUuXG4gICAqL1xuICBsb2dvdXQgKCkge1xuICAgIGZldGNoKGAke3RoaXMub3B0cy5ob3N0fS9nb29nbGUvbG9nb3V0P3JlZGlyZWN0PSR7bG9jYXRpb24uaHJlZn1gLCB7XG4gICAgICBtZXRob2Q6ICdnZXQnLFxuICAgICAgY3JlZGVudGlhbHM6ICdpbmNsdWRlJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgfVxuICAgIH0pXG4gICAgICAudGhlbigocmVzKSA9PiByZXMuanNvbigpKVxuICAgICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBpZiAocmVzLm9rKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ29rJylcbiAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgZmlsZXM6IFtdLFxuICAgICAgICAgICAgZm9sZGVyczogW10sXG4gICAgICAgICAgICBkaXJlY3Rvcnk6IFt7XG4gICAgICAgICAgICAgIHRpdGxlOiAnTXkgRHJpdmUnLFxuICAgICAgICAgICAgICBpZDogJ3Jvb3QnXG4gICAgICAgICAgICB9XVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMudXBkYXRlU3RhdGUobmV3U3RhdGUpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gIH1cblxuICBnZXRGaWxlVHlwZSAoZmlsZSkge1xuICAgIGNvbnN0IGZpbGVUeXBlcyA9IHtcbiAgICAgICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJzogJ0ZvbGRlcicsXG4gICAgICAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmRvY3VtZW50JzogJ0dvb2dsZSBEb2NzJyxcbiAgICAgICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuc3ByZWFkc2hlZXQnOiAnR29vZ2xlIFNoZWV0cycsXG4gICAgICAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLnByZXNlbnRhdGlvbic6ICdHb29nbGUgU2xpZGVzJyxcbiAgICAgICdpbWFnZS9qcGVnJzogJ0pQRUcgSW1hZ2UnLFxuICAgICAgJ2ltYWdlL3BuZyc6ICdQTkcgSW1hZ2UnXG4gICAgfVxuXG4gICAgcmV0dXJuIGZpbGVUeXBlc1tmaWxlLm1pbWVUeXBlXSA/IGZpbGVUeXBlc1tmaWxlLm1pbWVUeXBlXSA6IGZpbGUuZmlsZUV4dGVuc2lvbi50b1VwcGVyQ2FzZSgpXG4gIH1cblxuICAvKipcbiAgICogVXNlZCB0byBzZXQgYWN0aXZlIGZpbGUvZm9sZGVyLlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGZpbGUgICBBY3RpdmUgZmlsZS9mb2xkZXJcbiAgICovXG4gIGhhbmRsZUNsaWNrIChmaWxlKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLmNvcmUuZ2V0U3RhdGUoKS5nb29nbGVEcml2ZVxuICAgIGNvbnN0IG5ld1N0YXRlID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIHtcbiAgICAgIGFjdGl2ZTogZmlsZVxuICAgIH0pXG5cbiAgICB0aGlzLnVwZGF0ZVN0YXRlKG5ld1N0YXRlKVxuICB9XG5cbiAgZmlsdGVyUXVlcnkgKGUpIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMuY29yZS5nZXRTdGF0ZSgpLmdvb2dsZURyaXZlXG4gICAgdGhpcy51cGRhdGVTdGF0ZShPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSwge1xuICAgICAgZmlsdGVySW5wdXQ6IGUudGFyZ2V0LnZhbHVlXG4gICAgfSkpXG4gIH1cblxuICBmaWx0ZXJJdGVtcyAoaXRlbXMpIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMuY29yZS5nZXRTdGF0ZSgpLmdvb2dsZURyaXZlXG4gICAgcmV0dXJuIGl0ZW1zLmZpbHRlcigoZm9sZGVyKSA9PiB7XG4gICAgICByZXR1cm4gZm9sZGVyLnRpdGxlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihzdGF0ZS5maWx0ZXJJbnB1dC50b0xvd2VyQ2FzZSgpKSAhPT0gLTFcbiAgICB9KVxuICB9XG5cbiAgc29ydEJ5VGl0bGUgKCkge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5jb3JlLmdldFN0YXRlKCkuZ29vZ2xlRHJpdmVcbiAgICBjb25zdCB7ZmlsZXMsIGZvbGRlcnMsIHNvcnRpbmd9ID0gc3RhdGVcblxuICAgIGxldCBzb3J0ZWRGaWxlcyA9IGZpbGVzLnNvcnQoKGZpbGVBLCBmaWxlQikgPT4ge1xuICAgICAgaWYgKHNvcnRpbmcgPT09ICd0aXRsZURlc2NlbmRpbmcnKSB7XG4gICAgICAgIHJldHVybiBmaWxlQi50aXRsZS5sb2NhbGVDb21wYXJlKGZpbGVBLnRpdGxlKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZpbGVBLnRpdGxlLmxvY2FsZUNvbXBhcmUoZmlsZUIudGl0bGUpXG4gICAgfSlcblxuICAgIGxldCBzb3J0ZWRGb2xkZXJzID0gZm9sZGVycy5zb3J0KChmb2xkZXJBLCBmb2xkZXJCKSA9PiB7XG4gICAgICBpZiAoc29ydGluZyA9PT0gJ3RpdGxlRGVzY2VuZGluZycpIHtcbiAgICAgICAgcmV0dXJuIGZvbGRlckIudGl0bGUubG9jYWxlQ29tcGFyZShmb2xkZXJBLnRpdGxlKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZvbGRlckEudGl0bGUubG9jYWxlQ29tcGFyZShmb2xkZXJCLnRpdGxlKVxuICAgIH0pXG5cbiAgICB0aGlzLnVwZGF0ZVN0YXRlKE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLCB7XG4gICAgICBmaWxlczogc29ydGVkRmlsZXMsXG4gICAgICBmb2xkZXJzOiBzb3J0ZWRGb2xkZXJzLFxuICAgICAgc29ydGluZzogKHNvcnRpbmcgPT09ICd0aXRsZURlc2NlbmRpbmcnKSA/ICd0aXRsZUFzY2VuZGluZycgOiAndGl0bGVEZXNjZW5kaW5nJ1xuICAgIH0pKVxuICB9XG5cbiAgc29ydEJ5RGF0ZSAoKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLmNvcmUuZ2V0U3RhdGUoKS5nb29nbGVEcml2ZVxuICAgIGNvbnN0IHtmaWxlcywgZm9sZGVycywgc29ydGluZ30gPSBzdGF0ZVxuXG4gICAgbGV0IHNvcnRlZEZpbGVzID0gZmlsZXMuc29ydCgoZmlsZUEsIGZpbGVCKSA9PiB7XG4gICAgICBsZXQgYSA9IG5ldyBEYXRlKGZpbGVBLm1vZGlmaWVkQnlNZURhdGUpXG4gICAgICBsZXQgYiA9IG5ldyBEYXRlKGZpbGVCLm1vZGlmaWVkQnlNZURhdGUpXG5cbiAgICAgIGlmIChzb3J0aW5nID09PSAnZGF0ZURlc2NlbmRpbmcnKSB7XG4gICAgICAgIHJldHVybiBhID4gYiA/IC0xIDogYSA8IGIgPyAxIDogMFxuICAgICAgfVxuICAgICAgcmV0dXJuIGEgPiBiID8gMSA6IGEgPCBiID8gLTEgOiAwXG4gICAgfSlcblxuICAgIGxldCBzb3J0ZWRGb2xkZXJzID0gZm9sZGVycy5zb3J0KChmb2xkZXJBLCBmb2xkZXJCKSA9PiB7XG4gICAgICBsZXQgYSA9IG5ldyBEYXRlKGZvbGRlckEubW9kaWZpZWRCeU1lRGF0ZSlcbiAgICAgIGxldCBiID0gbmV3IERhdGUoZm9sZGVyQi5tb2RpZmllZEJ5TWVEYXRlKVxuXG4gICAgICBpZiAoc29ydGluZyA9PT0gJ2RhdGVEZXNjZW5kaW5nJykge1xuICAgICAgICByZXR1cm4gYSA+IGIgPyAtMSA6IGEgPCBiID8gMSA6IDBcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGEgPiBiID8gMSA6IGEgPCBiID8gLTEgOiAwXG4gICAgfSlcblxuICAgIHRoaXMudXBkYXRlU3RhdGUoT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIHtcbiAgICAgIGZpbGVzOiBzb3J0ZWRGaWxlcyxcbiAgICAgIGZvbGRlcnM6IHNvcnRlZEZvbGRlcnMsXG4gICAgICBzb3J0aW5nOiAoc29ydGluZyA9PT0gJ2RhdGVEZXNjZW5kaW5nJykgPyAnZGF0ZUFzY2VuZGluZycgOiAnZGF0ZURlc2NlbmRpbmcnXG4gICAgfSkpXG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHVzZXIgYXV0aGVudGljYXRpb24gdmlld1xuICAgKi9cbiAgcmVuZGVyQXV0aCAoKSB7XG4gICAgY29uc3Qgc3RhdGUgPSBidG9hKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIHJlZGlyZWN0OiBsb2NhdGlvbi5ocmVmLnNwbGl0KCcjJylbMF1cbiAgICB9KSlcblxuICAgIGNvbnN0IGxpbmsgPSBgJHt0aGlzLm9wdHMuaG9zdH0vY29ubmVjdC9nb29nbGU/c3RhdGU9JHtzdGF0ZX1gXG4gICAgcmV0dXJuIHlvYFxuICAgICAgPGRpdiBjbGFzcz1cIlVwcHlHb29nbGVEcml2ZS1hdXRoZW50aWNhdGVcIj5cbiAgICAgICAgPGgxPllvdSBuZWVkIHRvIGF1dGhlbnRpY2F0ZSB3aXRoIEdvb2dsZSBiZWZvcmUgc2VsZWN0aW5nIGZpbGVzLjwvaDE+XG4gICAgICAgIDxhIGhyZWY9JHtsaW5rfT5BdXRoZW50aWNhdGU8L2E+XG4gICAgICA8L2Rpdj5cbiAgICBgXG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIGZpbGUgYnJvd3NlclxuICAgKiBAcGFyYW0gIHtPYmplY3R9IHN0YXRlIEdvb2dsZSBEcml2ZSBzdGF0ZVxuICAgKi9cbiAgcmVuZGVyQnJvd3NlciAoc3RhdGUpIHtcbiAgICBsZXQgZm9sZGVycyA9IHN0YXRlLmZvbGRlcnNcbiAgICBsZXQgZmlsZXMgPSBzdGF0ZS5maWxlc1xuICAgIGxldCBwcmV2aWV3RWxlbSA9ICcnXG4gICAgY29uc3QgaXNGaWxlU2VsZWN0ZWQgPSBPYmplY3Qua2V5cyhzdGF0ZS5hY3RpdmUpLmxlbmd0aCAhPT0gMCAmJiBKU09OLnN0cmluZ2lmeShzdGF0ZS5hY3RpdmUpICE9PSBKU09OLnN0cmluZ2lmeSh7fSlcblxuICAgIGlmIChzdGF0ZS5maWx0ZXJJbnB1dCAhPT0gJycpIHtcbiAgICAgIGZvbGRlcnMgPSB0aGlzLmZpbHRlckl0ZW1zKHN0YXRlLmZvbGRlcnMpXG4gICAgICBmaWxlcyA9IHRoaXMuZmlsdGVySXRlbXMoc3RhdGUuZmlsZXMpXG4gICAgfVxuXG4gICAgZm9sZGVycyA9IGZvbGRlcnMubWFwKChmb2xkZXIpID0+IHRoaXMucmVuZGVyQnJvd3Nlckl0ZW0oZm9sZGVyKSlcbiAgICBmaWxlcyA9IGZpbGVzLm1hcCgoZmlsZSkgPT4gdGhpcy5yZW5kZXJCcm93c2VySXRlbShmaWxlKSlcblxuICAgIGNvbnN0IGJyZWFkY3J1bWJzID0gc3RhdGUuZGlyZWN0b3J5Lm1hcCgoZGlyKSA9PiB5b2A8bGk+PGJ1dHRvbiBvbmNsaWNrPSR7dGhpcy5nZXROZXh0Rm9sZGVyLmJpbmQodGhpcywgZGlyLmlkLCBkaXIudGl0bGUpfT4ke2Rpci50aXRsZX08L2J1dHRvbj48L2xpPiBgKVxuICAgIGlmIChpc0ZpbGVTZWxlY3RlZCkge1xuICAgICAgcHJldmlld0VsZW0gPSB5b2BcbiAgICAgICAgPGRpdj5cbiAgICAgICAgICA8aDE+PHNwYW4gY2xhc3M9XCJVcHB5R29vZ2xlRHJpdmUtZmlsZUljb25cIj48aW1nIHNyYz0ke3N0YXRlLmFjdGl2ZS5pY29uTGlua30vPjwvc3Bhbj4ke3N0YXRlLmFjdGl2ZS50aXRsZX08L2gxPlxuICAgICAgICAgIDx1bD5cbiAgICAgICAgICAgIDxsaT5UeXBlOiAke3RoaXMuZ2V0RmlsZVR5cGUoc3RhdGUuYWN0aXZlKX08L2xpPlxuICAgICAgICAgICAgPGxpPk1vZGlmaWVkIEJ5IE1lOiAke3N0YXRlLmFjdGl2ZS5tb2RpZmllZEJ5TWVEYXRlfTwvbGk+XG4gICAgICAgICAgPC91bD5cbiAgICAgICAgICAke3N0YXRlLmFjdGl2ZS50aHVtYm5haWxMaW5rID8geW9gPGltZyBzcmM9JHtzdGF0ZS5hY3RpdmUudGh1bWJuYWlsTGlua30gY2xhc3M9XCJVcHB5R29vZ2xlRHJpdmUtZmlsZVRodW1ibmFpbFwiIC8+YCA6IHlvYGB9XG4gICAgICAgIDwvZGl2PlxuICAgICAgYFxuICAgIH1cblxuICAgIHJldHVybiB5b2BcbiAgICAgIDxkaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJVcHB5R29vZ2xlRHJpdmUtaGVhZGVyXCI+XG4gICAgICAgICAgPHVsIGNsYXNzPVwiVXBweUdvb2dsZURyaXZlLWJyZWFkY3J1bWJzXCI+XG4gICAgICAgICAgICAke2JyZWFkY3J1bWJzfVxuICAgICAgICAgIDwvdWw+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGFpbmVyLWZsdWlkXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJvd1wiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhpZGRlbi1tZC1kb3duIGNvbC1sZy0zIGNvbC14bC0zXCI+XG4gICAgICAgICAgICAgIDx1bCBjbGFzcz1cIlVwcHlHb29nbGVEcml2ZS1zaWRlYmFyXCI+XG4gICAgICAgICAgICAgICAgPGxpIGNsYXNzPVwiVXBweUdvb2dsZURyaXZlLWZpbHRlclwiPjxpbnB1dCBjbGFzcz1cIlVwcHlHb29nbGVEcml2ZS1mb2N1c0lucHV0XCIgdHlwZT0ndGV4dCcgb25rZXl1cD0ke3RoaXMuZmlsdGVyUXVlcnl9IHBsYWNlaG9sZGVyPVwiU2VhcmNoLi5cIiB2YWx1ZT0ke3N0YXRlLmZpbHRlcklucHV0fS8+PC9saT5cbiAgICAgICAgICAgICAgICA8bGk+PGJ1dHRvbiBvbmNsaWNrPSR7dGhpcy5nZXROZXh0Rm9sZGVyLmJpbmQodGhpcywgJ3Jvb3QnLCAnTXkgRHJpdmUnKX0+PGltZyBzcmM9XCJodHRwczovL3NzbC5nc3RhdGljLmNvbS9kb2NzL2RvY2xpc3QvaW1hZ2VzL2ljb25fMTFfY29sbGVjdGlvbl9saXN0XzMucG5nXCIvPiBNeSBEcml2ZTwvYnV0dG9uPjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPjxidXR0b24+PGltZyBzcmM9XCJodHRwczovL3NzbC5nc3RhdGljLmNvbS9kb2NzL2RvY2xpc3QvaW1hZ2VzL2ljb25fMTFfc2hhcmVkX2NvbGxlY3Rpb25fbGlzdF8xLnBuZ1wiLz4gU2hhcmVkIHdpdGggbWU8L2J1dHRvbj48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT48YnV0dG9uIG9uY2xpY2s9JHt0aGlzLmxvZ291dH0+TG9nb3V0PC9idXR0b24+PC9saT5cbiAgICAgICAgICAgICAgPC91bD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbC1tZC0xMiBjb2wtbGctOSBjb2wteGwtNlwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiVXBweUdvb2dsZURyaXZlLWJyb3dzZXJDb250YWluZXJcIj5cbiAgICAgICAgICAgICAgICA8dGFibGUgY2xhc3M9XCJVcHB5R29vZ2xlRHJpdmUtYnJvd3NlclwiPlxuICAgICAgICAgICAgICAgICAgPHRoZWFkPlxuICAgICAgICAgICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiVXBweUdvb2dsZURyaXZlLXNvcnRhYmxlSGVhZGVyXCIgb25jbGljaz0ke3RoaXMuc29ydEJ5VGl0bGV9Pk5hbWU8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgIDx0ZD5Pd25lcjwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiVXBweUdvb2dsZURyaXZlLXNvcnRhYmxlSGVhZGVyXCIgb25jbGljaz0ke3RoaXMuc29ydEJ5RGF0ZX0+TGFzdCBNb2RpZmllZDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgPHRkPkZpbGVzaXplPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICAgIDwvdGhlYWQ+XG4gICAgICAgICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAgICAgICAgICR7Zm9sZGVyc31cbiAgICAgICAgICAgICAgICAgICAgJHtmaWxlc31cbiAgICAgICAgICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoaWRkZW4tbGctZG93biBjb2wteGwtMlwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiVXBweUdvb2dsZURyaXZlLWZpbGVJbmZvXCI+XG4gICAgICAgICAgICAgICAgJHtwcmV2aWV3RWxlbX1cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgXG4gIH1cblxuICByZW5kZXJCcm93c2VySXRlbSAoaXRlbSkge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5jb3JlLmdldFN0YXRlKCkuZ29vZ2xlRHJpdmVcbiAgICBjb25zdCBpc0FGaWxlU2VsZWN0ZWQgPSBPYmplY3Qua2V5cyhzdGF0ZS5hY3RpdmUpLmxlbmd0aCAhPT0gMCAmJiBKU09OLnN0cmluZ2lmeShzdGF0ZS5hY3RpdmUpICE9PSBKU09OLnN0cmluZ2lmeSh7fSlcbiAgICBjb25zdCBpc0ZvbGRlciA9IGl0ZW0ubWltZVR5cGUgPT09ICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJ1xuICAgIHJldHVybiB5b2BcbiAgICAgIDx0ciBjbGFzcz0keyhpc0FGaWxlU2VsZWN0ZWQgJiYgc3RhdGUuYWN0aXZlLmlkID09PSBpdGVtLmlkKSA/ICdpcy1hY3RpdmUnIDogJyd9XG4gICAgICAgIG9uY2xpY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgaXRlbSl9XG4gICAgICAgIG9uZGJsY2xpY2s9JHtpc0ZvbGRlciA/IHRoaXMuZ2V0TmV4dEZvbGRlci5iaW5kKHRoaXMsIGl0ZW0uaWQsIGl0ZW0udGl0bGUpIDogdGhpcy5hZGRGaWxlLmJpbmQodGhpcywgaXRlbSl9PlxuICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9XCJVcHB5R29vZ2xlRHJpdmUtZm9sZGVySWNvblwiPjxpbWcgc3JjPSR7aXRlbS5pY29uTGlua30vPjwvc3Bhbj4gJHtpdGVtLnRpdGxlfTwvdGQ+XG4gICAgICAgIDx0ZD5NZTwvdGQ+XG4gICAgICAgIDx0ZD4ke2l0ZW0ubW9kaWZpZWRCeU1lRGF0ZX08L3RkPlxuICAgICAgICA8dGQ+LTwvdGQ+XG4gICAgICA8L3RyPlxuICAgIGBcbiAgfVxuXG4gIHJlbmRlckVycm9yIChlcnIpIHtcbiAgICByZXR1cm4geW9gXG4gICAgICA8ZGl2PlxuICAgICAgICA8c3Bhbj5cbiAgICAgICAgICBTb21ldGhpbmcgd2VudCB3cm9uZy4gIFByb2JhYmx5IG91ciBmYXVsdC4gJHtlcnJ9XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgIDwvZGl2PlxuICAgIGBcbiAgfVxuXG4gIHJlbmRlciAoc3RhdGUpIHtcbiAgICBpZiAoc3RhdGUuZ29vZ2xlRHJpdmUuZXJyb3IpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlbmRlckVycm9yKClcbiAgICB9XG5cbiAgICBpZiAoIXN0YXRlLmdvb2dsZURyaXZlLmF1dGhlbnRpY2F0ZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlbmRlckF1dGgoKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJlbmRlckJyb3dzZXIoc3RhdGUuZ29vZ2xlRHJpdmUpXG4gIH1cbn1cbiIsImltcG9ydCB5byBmcm9tICd5by15bydcblxuLyoqXG4gKiBCb2lsZXJwbGF0ZSB0aGF0IGFsbCBQbHVnaW5zIHNoYXJlIC0gYW5kIHNob3VsZCBub3QgYmUgdXNlZFxuICogZGlyZWN0bHkuIEl0IGFsc28gc2hvd3Mgd2hpY2ggbWV0aG9kcyBmaW5hbCBwbHVnaW5zIHNob3VsZCBpbXBsZW1lbnQvb3ZlcnJpZGUsXG4gKiB0aGlzIGRlY2lkaW5nIG9uIHN0cnVjdHVyZS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gbWFpbiBVcHB5IGNvcmUgb2JqZWN0XG4gKiBAcGFyYW0ge29iamVjdH0gb2JqZWN0IHdpdGggcGx1Z2luIG9wdGlvbnNcbiAqIEByZXR1cm4ge2FycmF5IHwgc3RyaW5nfSBmaWxlcyBvciBzdWNjZXNzL2ZhaWwgbWVzc2FnZVxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbHVnaW4ge1xuXG4gIGNvbnN0cnVjdG9yIChjb3JlLCBvcHRzKSB7XG4gICAgdGhpcy5jb3JlID0gY29yZVxuICAgIHRoaXMub3B0cyA9IG9wdHNcbiAgICB0aGlzLnR5cGUgPSAnbm9uZSdcblxuICAgIHRoaXMudXBkYXRlID0gdGhpcy51cGRhdGUuYmluZCh0aGlzKVxuICAgIHRoaXMubW91bnQgPSB0aGlzLm1vdW50LmJpbmQodGhpcylcbiAgICB0aGlzLmZvY3VzID0gdGhpcy5mb2N1cy5iaW5kKHRoaXMpXG4gICAgdGhpcy5pbnN0YWxsID0gdGhpcy5pbnN0YWxsLmJpbmQodGhpcylcbiAgfVxuXG4gIHVwZGF0ZSAoKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLmVsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc3QgbmV3RWwgPSB0aGlzLnJlbmRlcih0aGlzLmNvcmUuc3RhdGUpXG4gICAgeW8udXBkYXRlKHRoaXMuZWwsIG5ld0VsKVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHN1cHBsaWVkIGB0YXJnZXRgIGlzIGEgYHN0cmluZ2Agb3IgYW4gYG9iamVjdGAuXG4gICAqIElmIGl04oCZcyBhbiBvYmplY3Qg4oCUIHRhcmdldCBpcyBhIHBsdWdpbiwgYW5kIHdlIHNlYXJjaCBgcGx1Z2luc2BcbiAgICogZm9yIGEgcGx1Z2luIHdpdGggc2FtZSBuYW1lIGFuZCByZXR1cm4gaXRzIHRhcmdldC5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSB0YXJnZXRcbiAgICpcbiAgICovXG4gIG1vdW50ICh0YXJnZXQsIHBsdWdpbikge1xuICAgIGNvbnN0IGNhbGxlclBsdWdpbk5hbWUgPSBwbHVnaW4uaWRcblxuICAgIGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5jb3JlLmxvZyhgSW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9IHRvICR7dGFyZ2V0fWApXG5cbiAgICAgIC8vIGNsZWFyIGV2ZXJ5dGhpbmcgaW5zaWRlIHRoZSB0YXJnZXQgc2VsZWN0b3JcbiAgICAgIC8vIGlmIChyZXBsYWNlVGFyZ2V0Q29udGVudCkge1xuICAgICAgLy8gICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRhcmdldCkuaW5uZXJIVE1MID0gJydcbiAgICAgIC8vIH1cbiAgICAgIHRoaXMuZWwgPSBwbHVnaW4ucmVuZGVyKHRoaXMuY29yZS5zdGF0ZSlcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0KS5hcHBlbmRDaGlsZCh0aGlzLmVsKVxuXG4gICAgICByZXR1cm4gdGFyZ2V0XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRPRE86IGlzIGluc3RhbnRpYXRpbmcgdGhlIHBsdWdpbiByZWFsbHkgdGhlIHdheSB0byByb2xsXG4gICAgICAvLyBqdXN0IHRvIGdldCB0aGUgcGx1Z2luIG5hbWU/XG4gICAgICBjb25zdCBUYXJnZXQgPSB0YXJnZXRcbiAgICAgIGNvbnN0IHRhcmdldFBsdWdpbk5hbWUgPSBuZXcgVGFyZ2V0KCkuaWRcblxuICAgICAgdGhpcy5jb3JlLmxvZyhgSW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9IHRvICR7dGFyZ2V0UGx1Z2luTmFtZX1gKVxuXG4gICAgICBjb25zdCB0YXJnZXRQbHVnaW4gPSB0aGlzLmNvcmUuZ2V0UGx1Z2luKHRhcmdldFBsdWdpbk5hbWUpXG4gICAgICBjb25zdCBzZWxlY3RvclRhcmdldCA9IHRhcmdldFBsdWdpbi5hZGRUYXJnZXQocGx1Z2luKVxuXG4gICAgICByZXR1cm4gc2VsZWN0b3JUYXJnZXRcbiAgICB9XG4gIH1cblxuICBmb2N1cyAoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBpbnN0YWxsICgpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHJ1biAoKSB7XG4gICAgcmV0dXJuXG4gIH1cbn1cbiIsIiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSBpZiAobGlzdGVuZXJzKSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24odHlwZSkge1xuICBpZiAodGhpcy5fZXZlbnRzKSB7XG4gICAgdmFyIGV2bGlzdGVuZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgICBpZiAoaXNGdW5jdGlvbihldmxpc3RlbmVyKSlcbiAgICAgIHJldHVybiAxO1xuICAgIGVsc2UgaWYgKGV2bGlzdGVuZXIpXG4gICAgICByZXR1cm4gZXZsaXN0ZW5lci5sZW5ndGg7XG4gIH1cbiAgcmV0dXJuIDA7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgcmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJDb3VudCh0eXBlKTtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsImltcG9ydCBVcHB5IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9jb3JlL0NvcmUuanMnXG5pbXBvcnQgVHVzMTAgZnJvbSAnLi4vLi4vLi4vLi4vc3JjL3BsdWdpbnMvR29vZ2xlRHJpdmUuanMnXG5pbXBvcnQgcnVfUlUgZnJvbSAnLi4vLi4vLi4vLi4vc3JjL2xvY2FsZXMvcnVfUlUnXG4vLyBpbXBvcnQgVXBweSBmcm9tICd1cHB5L2NvcmUnXG4vLyBpbXBvcnQgeyBUdXMxMCB9IGZyb20gJ3VwcHkvcGx1Z2lucydcbi8vIGltcG9ydCB7IHJ1X1JVIH0gZnJvbSAndXBweS9sb2NhbGVzJ1xuXG5jb25zdCB1cHB5ID0gbmV3IFVwcHkoe2RlYnVnOiB0cnVlLCB3YWl0OiBmYWxzZSwgbG9jYWxlczogcnVfUlV9KVxuXG51cHB5XG4gIC51c2UoVHVzMTAsIHtlbmRwb2ludDogJ2h0dHA6Ly9tYXN0ZXIudHVzLmlvOjMwMjAvZmlsZXMvJ30pXG4gIC5ydW4oKVxuXG5jb25zb2xlLmxvZygnLS0+IFVwcHkgQnVuZGxlZCB2ZXJzaW9uIHdpdGggVHVzMTAgJiBSdXNzaWFuIGxhbmd1YWdlIHBhY2sgaGFzIGxvYWRlZCcpXG4iXX0=
