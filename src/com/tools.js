var h = require('hyperscript')
var u = require('../util')

module.exports = function (opts) {
  opts = opts || {}
  return h('div',
    h('hr'),
    h('p', h('button#save', { onclick: u.handler(opts.onsave) }, 'Commit')),
    h('p', h('button', { onclick: u.handler(opts.onhist) }, 'History'))
  )
}