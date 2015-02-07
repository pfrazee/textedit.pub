var h = require('hyperscript')
var nicedate = require('nicedate')

module.exports = function (opts) {
  opts = opts || {}
  return h('li' + (opts.selected ? '.selected' : ''), { 'data-id': opts.key },
    h('a', { href: '#', onclick: handler(opts.onclick) }, opts.label),
    (opts.edited || opts.created) ? [
      h('br'),
      h('small', /*'edited ', nicedate(opts.edited, true), ' by alice, */'created ', nicedate(opts.created, true), ' by bob')
    ] : undefined
  )
}

function handler (cb) {
  return function (e) {
    e.preventDefault()
    cb && cb(e)
  }
}