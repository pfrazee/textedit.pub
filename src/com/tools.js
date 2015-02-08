var h = require('hyperscript')

module.exports = function (opts) {
  opts = opts || {}
  return h('p', h('button#save', { onclick: handler(opts.onsave) }, 'Commit'))
}

function handler (cb) {
  return function (e) {
    e.preventDefault()
    cb && cb(e)
  }
}