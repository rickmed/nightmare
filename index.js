var Nightmare = require('./lib/nightmare')
var template = require('./lib/javascript')
var vm = require('vm')
var sliced = require('sliced')

module.exports = Nightmare

/**
 * Add support for iframes
 */

Nightmare.prototype.evaluate_now = function (js_fn, done) {
  var args = Array.prototype.slice.call(arguments).slice(2)
  var argsList = JSON.stringify(args).slice(1, -1)

  var sendJsFn = String(function(){
    var document = __nightmare.currentDocument
    return (js_fn).apply(this, arguments)
  })

  sendJsFn = sendJsFn.replace('js_fn', String(js_fn))
  var source = template.execute({ src: sendJsFn, args: argsList })

  this.child.call('javascript', source, done)
  return this
}


/*
 * Enter to IFrame and run actions as if from inside
 *
 * @param {String} selector
 * @param {Function} done
 */
Nightmare.action('enterIframe', function (selector, done) {
  this.evaluate_now(function (selector) {
    var element = __nightmare.currentDocument.querySelector(selector).contentDocument
    __nightmare.currentDocument = element
  }, done, selector)
})

/*
 * Exit from all Iframes and go to the main document
 *
 * @param {Function} done
 */
Nightmare.action('exitIframe', function (done) {
  this.evaluate_now(function() {
      var element = __nightmare.rootDocument
      __nightmare.currentDocument = element
    }, done)
})



/**
 * Additional actions.
 */

Nightmare.prototype.get = function (selector) {
  this.currentSelector = selector
  this.oneOrAll = 'get'
  return this
}

Nightmare.prototype.getAll = function (selector) {
  this.currentSelector = selector
  this.oneOrAll = 'getAll'
  return this
}

Nightmare.action('attribute', function (/**...attributes, done**/) {

  function getElement (attrs, selector) {
    var element = document.querySelector(selector)
    if (attrs.length === 1) {
      return element[attrs[0]]
    }
    else {
      var res = {}
      attrs.forEach( function (attr) {
        res[attr] = element[attr]
      })
      return res
    }
  }

  function getAllElements (attrs, selector) {
    var elements = document.querySelectorAll(selector)
    var arr = Array.from(elements)
    return arr.map( function (element) {
      if (attrs.length === 1) {
        return element[attrs[0]]
      }
      else {
        var res = {}
        attrs.forEach( function (attr) {
          res[attr] = element[attr]
        })
        return res
      }
    })
  }


  var fn = this.oneOrAll === 'get' ? getElement : getAllElements
  var selector = this.currentSelector

  var args = sliced(arguments)
  var done = args[args.length - 1]
  args.pop()
  var attrs = args
  this.evaluate_now(fn, done, attrs, selector)
})

Nightmare.prototype.text = function () {
  this.attribute('innerText')
  return this
}


/**
 * Add default wait for element before actions
 */

var proto = Nightmare.prototype

proto.enterIframeProxy = proto.enterIframe
proto.enterIframe = function (/*...selectors*/) {

  var args = sliced(arguments)
  var selectors = args[0].constructor === Array ? args[0] : args

  var self = this
  function waitAndEnter (selector) {
    self.wait(selector).enterIframeProxy(selector)
  }

  if (selectors.length === 1) {
    waitAndEnter(selectors[0])
  }
  else {
    this.exitIframe()
    selectors.forEach(waitAndEnter)
  }
  return this
}

proto.clickProxy = proto.click
proto.click = function (selector) {
  this.wait(selector).clickProxy(selector)
  return this
}

proto.typeProxy = proto.type
proto.type = function (selector, text) {
  this.wait(selector).typeProxy(selector, text)
  return this
}


/**
* Able to use Nightmare with electron instances.
*/
Nightmare.action('evaluate', function (fn) {

  // electron's ipc prevent callbacks from renderer process so need to pass the cb as a string
  if (typeof fn === 'string' ) {
    fn = vm.runInThisContext("("+fn+")")
  }

  var args = sliced(arguments)
  var done = args[args.length - 1]
  var newArgs = [fn, done].concat(args.slice(1, -1))
  if (typeof fn !== 'function') {
    return done(new Error('.evaluate() fn should be a function'))
  }
  this.evaluate_now.apply(this, newArgs)
})
