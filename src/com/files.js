var h = require('hyperscript')
var file = require('./file')

module.exports = function (opts) {
  opts = opts || {}
  return h('ul',
    file({ label: 'New', onclick: handler(opts.onnew) })
  )
}

function handler (cb) {
  return function (e) {
    e.preventDefault()
    cb && cb(e)
  }
}