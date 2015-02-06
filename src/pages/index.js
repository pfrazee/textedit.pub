'use strict'
var h = require('hyperscript')
var com = require('../com')

function notfound (app) {
  app.setPage('notfound', h('p', '404 Not Found'))
}

module.exports = {
  home:           require('./home'),
  notfound:       notfound
}