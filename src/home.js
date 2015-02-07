'use strict'
var muxrpc     = require('muxrpc')
var Serializer = require('pull-serializer')
var auth       = require('ssb-domain-auth')

require('codemirror/mode/javascript/javascript')
require('codemirror/mode/markdown/markdown')
require('codemirror/mode/javascript/javascript')
require('codemirror/mode/css/css')
require('codemirror/mode/htmlmixed/htmlmixed')
require('codemirror/keymap/sublime')
require('codemirror/addon/dialog/dialog')
var CodeMirror = require('codemirror')

var ssb        = muxrpc(require('ssb-manifest'), false, function (stream) { return Serializer(stream, JSON, {split: '\n\n'}) })()
var localhost  = require('ssb-channel').connect(ssb, 'localhost')
var app        = require('./app')(ssb)

var editor = CodeMirror(document.getElementById('editor'), {
  lineNumbers: true,
  mode: null,
  keyMap: 'sublime',
  // autoCloseBrackets: true,
  // matchBrackets: true,
  lineWrapping: true,
  showCursorWhenSelecting: true,
  theme: 'codemirror'
})
window.editor = editor

localhost.on('connect', function() {
  // authenticate the connection
  auth.getToken('localhost', function(err, token) {
    if (err) return localhost.close(), console.error('Token fetch failed', err)
    ssb.auth(token, function(err) {
      // app.setStatus(false)
      // app.setupRpcConnection()
      // app.refreshPage()
    })
  })
})

localhost.on('error', function(err) {
  // inform user and attempt a reconnect
  console.log('Connection Error', err)
  // app.setStatus('danger', 'Lost connection to the host program. Please restart the host program. Trying again in 10 seconds.')
  localhost.reconnect()
})

localhost.on('reconnecting', function(err) {
  console.log('Attempting Reconnect')
  // app.setStatus('danger', 'Lost connection to the host program. Reconnecting...')
})


// DEBUG
window.PULL = require('pull-stream')
window.SSB = ssb
window.APP = app