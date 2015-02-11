'use strict'
var muxrpc     = require('muxrpc')
var Serializer = require('pull-serializer')
var auth       = require('ssb-domain-auth')

var ssb        = muxrpc(require('ssb-manifest'), false, function (stream) { return Serializer(stream, JSON, {split: '\n\n'}) })()
var localhost  = require('ssb-channel').connect(ssb, 'localhost')
var gui        = require('./gui')(ssb)

var connected = false
var loginBtns = Array.prototype.slice.call(document.querySelectorAll('.login'))
var loginPane = document.getElementById('login-pane')

loginBtns.forEach(function (b) {
  b.onclick = onLoginClick
})
function onLoginClick () {
  if (connected) {
    auth.deauth('localhost')
    localhost.close()
  } else {
    auth.openAuthPopup('localhost', {
      title: 'textedit.pub',
      perms: ['add', 'messagesByType', 'messagesLinkedToMessage']
    }, function(err, granted) {
      debugger;
      if (granted)
        localhost.reconnect()
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
      loginBtns.forEach(function (b) {
        b.innerText = 'Logout'
        b.removeAttribute('disabled')
      })
      loginPane.style.display = 'none'
    })
  })
})

localhost.on('error', function(err) {
  // inform user and attempt a reconnect
  console.log('Connection Error', err)
  // app.setStatus('danger', 'Lost connection to the host program. Please restart the host program. Trying again in 10 seconds.')
  // localhost.reconnect()
  connected = false
  loginBtns.forEach(function (b) {
    b.innerText = 'Login'
    b.removeAttribute('disabled')
  })
  loginPane.style.display = 'block'
})

localhost.on('reconnecting', function(err) {
  console.log('Attempting Reconnect')
  // app.setStatus('danger', 'Lost connection to the host program. Reconnecting...')
  loginBtns.forEach(function (b) {
    b.innerText = 'Connecting...'
    b.setAttribute('disabled', true)
  })
})