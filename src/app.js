'use strict'
var h          = require('hyperscript')
var multicb    = require('multicb')
var router     = require('phoenix-router')
var pull       = require('pull-stream')
var com        = require('./com')
var pages      = require('./pages')

module.exports = function (ssb) {

  // master state object

  var app = {
    ssb: ssb,
    myid: null,
    names: null,
    nameTrustRanks: null,
    profiles: null,
    page: {
      id: 'feed',
      param: null
    }
  }

  // page behaviors

  window.addEventListener('hashchange', function() { app.refreshPage() })
  document.body.addEventListener('click', onClick(app))

  // toplevel & common methods
  //app.setupRpcConnection = setupRpcConnection.bind(app)
  app.refreshPage    = refreshPage.bind(app)
  app.setPage        = setPage.bind(app)

  return app
}

function onClick (app) {
  return function (e) {
    // look for link clicks which should trigger same-page refreshes
    var el = e.target
    while (el) {
      if (el.tagName == 'A' && el.origin == window.location.origin && el.hash && el.hash == window.location.hash)
        return e.preventDefault(), e.stopPropagation(), app.refreshPage()
      el = el.parentNode
    }
  }
}

// should be called each time the rpc connection is (re)established
// function setupRpcConnection () {
//   var app = this
//   pull(app.ssb.phoenix.events(), pull.drain(function (event) {
//     if (event.type == 'post' || event.type == 'notification')
//       app.setPendingMessages(app.pendingMessages + 1)
//   }))
// }

function refreshPage (e) {
  var app = this
  e && e.preventDefault()

  // run the router
  var route = router(window.location.hash, 'home')
  app.page.id    = route[0]
  app.page.param = route[1]
  app.page.qs    = route[2] || {}

  // collect common data
  var done = multicb({ pluck: 1 })
  app.ssb.whoami(done())
  app.ssb.phoenix.getNamesById(done())
  app.ssb.phoenix.getNameTrustRanks(done())
  app.ssb.phoenix.getAllProfiles(done())
  done(function (err, data) {
    if (err) throw err.message
    app.myid = data[0].id
    app.names = data[1]
    app.nameTrustRanks = data[2]
    app.profiles = data[3]

    // render the page
    h.cleanup()    
    var page = pages[app.page.id]
    if (!page)
      page = pages.notfound
    page(app)
  })
}

function setPage (name, page, opts) {
  var el = document.getElementById('page-container')
  el.innerHTML = ''
  if (!opts || !opts.noHeader)
    el.appendChild(com.page(this, name, page))
  else
    el.appendChild(h('#page.container-fluid.'+name+'-page', page))
}