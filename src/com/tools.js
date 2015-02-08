var h = require('hyperscript')

module.exports = function (opts) {
  opts = opts || {}
  return h('div',
    h('hr'),
    h('p', h('button#save', { onclick: handler(opts.onsave) }, 'Commit')),
    h('p', h('button', { onclick: handler(opts.onhist) }, 'History'))
  )
}

function handler (cb) {
  return function (e) {
    e.preventDefault()
    cb && cb(e)
  }
}