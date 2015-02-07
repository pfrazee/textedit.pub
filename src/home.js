'use strict'
var muxrpc     = require('muxrpc')
var Serializer = require('pull-serializer')
var auth       = require('ssb-domain-auth')

var ssb        = muxrpc(require('ssb-manifest'), false, function (stream) { return Serializer(stream, JSON, {split: '\n\n'}) })()
var localhost  = require('ssb-channel').connect(ssb, 'localhost')
var gui        = require('./gui')(ssb)

var connected = false
var loginBtn = document.getElementById('login')

loginBtn.onclick = function () {
  if (connected) {
    auth.deauth('localhost')
    localhost.close()
  } else {
    auth.openAuthPopup('localhost', {
      title: 'textedit.pub',
      perms: ['add', 'messagesByType', 'messagesLinkedToMessage']
    }, function(err, granted) {
      if (granted)
        localhost.reconnect({ wait: 0 })
    })
  }
}

localhost.on('connect', function() {
  // authenticate the connection
  auth.getToken('localhost', function(err, token) {
    if (err) return localhost.close(), console.error('Token fetch failed', err)
    ssb.auth(token, function(err) {
      if (err) return localhost.close(), console.error('Token auth failed', err)
      gui.sync()
      connected = true
      loginBtn.innerText = 'Logout'
      loginBtn.removeAttribute('disabled')
    })
  })
})

localhost.on('error', function(err) {
  // inform user and attempt a reconnect
  console.log('Connection Error', err)
  // app.setStatus('danger', 'Lost connection to the host program. Please restart the host program. Trying again in 10 seconds.')
  // localhost.reconnect()
  connected = false
  loginBtn.innerText = 'Login'
  loginBtn.removeAttribute('disabled')
})

localhost.on('reconnecting', function(err) {
  console.log('Attempting Reconnect')
  // app.setStatus('danger', 'Lost connection to the host program. Reconnecting...')
  loginBtn.innerText = 'Connecting...'
  loginBtn.setAttribute('disabled', true)
})