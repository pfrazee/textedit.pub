var h = require('hyperscript')
var file = require('./file')
var u = require('../util')

module.exports = function (opts) {
  opts = opts || {}
  return h('ul',
    file({ label: 'New', selected: true, onclick: u.handler(opts.onnew) })
  )
}