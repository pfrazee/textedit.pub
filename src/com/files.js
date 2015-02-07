var h = require('hyperscript')
var nicedate = require('nicedate')

module.exports = function () {
  return h('ul',
    file({ label: 'New' }),
    file({ label: 'test.html', selected: true, created: 1000, edited: 1200 }),
    file({ label: 'README.md', selected: false, created: 1000, edited: 1200 })
  )
}

function file (opts) {
  return h('li' + (opts.selected ? '.selected' : ''),
    h('a', { href: '#' }, opts.label),
    (opts.edited || opts.created) ? [
      h('br'),
      h('small', 'edited ', nicedate(opts.edited, true), ' by alice, created ', nicedate(opts.created, true), ' by bob')
    ] : undefined
  )
}