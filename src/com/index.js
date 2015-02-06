'use strict'
var h = require('hyperscript')

var page =
exports.page = function (app, id, content) {
  return h('div',
    h('#page.container-fluid.'+id+'-page', content)
  )
}
