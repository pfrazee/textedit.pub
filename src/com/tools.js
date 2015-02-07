var h = require('hyperscript')

module.exports = function () {
  return h('p', h('a', { href: '#' }, 'Save'))
}