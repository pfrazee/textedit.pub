var mview = require('mview')
var pull = require('pull-stream')
var h = require('hyperscript')
var com = require('./com')

require('codemirror/mode/javascript/javascript')
require('codemirror/mode/markdown/markdown')
require('codemirror/mode/javascript/javascript')
require('codemirror/mode/css/css')
require('codemirror/mode/htmlmixed/htmlmixed')
require('codemirror/keymap/sublime')
require('codemirror/addon/dialog/dialog')
var CodeMirror = require('codemirror')

module.exports = function (ssb) {

  // state

  var gui = {}
  var bufferId = null
  var bufferState = null
  var ssbConnected = false

  // buffer control

  gui.hasChanged = function () {
    var v = editor.getValue()
    if (!bufferState)
      return !!v
    return (bufferState.toString() !== v)
  }

  gui.open = function (id) {
    if (gui.hasChanged()) {
      if (!confirm('There are unsaved changes to this buffer. Are you sure you want to navigate away?'))
        return
    }

    bufferId = id
    bufferState = mview.text()
    if (id)
      readBuffer(bufferId, bufferState, next)
    else
      next()

    function next (err) {
      if (err)
        console.error('Failed to read buffer state', err)
      editor.setValue(bufferState.toString())
      try { document.querySelector('#left .selected').classList.remove('selected') }
      catch (e) {}
      if (id)
        document.querySelector('#left [data-id="'+id+'"]').classList.add('selected')
      else
        document.querySelector('#left li').classList.add('selected')
    }
  }

  gui.save = function () {
    if (!ssbConnected)
      return alert('You must be logged into your ssb feed to save.')

    var editorStr = editor.getValue()
    if (editorStr === bufferState.toString() || !editorStr)
      return console.log('No changes need saving')

    var name, commitMsg
    if (!bufferId) {
      // new buffer
      var name = prompt('Name of this text buffer')
      if (!(''+name).trim())
        return
    }
    commitMsg = prompt('Commit message')
    if (commitMsg === null)
      return

    if (!bufferId) {
      ssb.add({
        type: 'create-text-buffer',
        name: name
      }, next)
    } else
      next()

    function next (err, msg) {
      if (err) {
        console.error(err)
        alert('Failed to create new document, see console for error details')
        return
      }
      // publish diff
      var id = (msg) ? msg.key : bufferId
      var diff = bufferState.diff(editorStr)
      bufferState.update(diff)
      ssb.add({
        type: 'update-text-buffer',
        desc: commitMsg,
        rel: 'update',
        msg: id,
        diff: diff
      }, function (err) {
        if (err) {
          console.error(err)
          alert('Failed to publish diff, see console for error details')
          return
        }
        if (!bufferId)
          gui.open(id)
        document.querySelector('button#save').classList.remove('changed')
      })
    }
  }

  // ssb sync

  gui.sync = function () {
    ssbConnected = true
    document.getElementById('buffers').innerHTML = ''
    console.log('reading list')
    pull(ssb.messagesByType({ type: 'create-text-buffer', live: true }), pull.drain(onNewTextBuffer, function () {
      ssbConnected = false
    }))
  }

  function onNewTextBuffer (msg) {
    console.log(msg)
    try {
      var buffers = document.getElementById('buffers')
      var name = ''+msg.value.content.name
      if (!name.trim())
        name = 'Untitled'
      buffers.insertBefore(com.file({
        key: msg.key,
        label: msg.value.content.name,
        created: msg.value.timestamp,
        onclick: gui.open.bind(gui, msg.key)
      }), buffers.firstChild)
    } catch (e) {
      console.warn('Failed to read text buffer', e)
    }
  }

  function readBuffer (id, state, cb) {
    console.log('constructing', id)
    pull(ssb.messagesLinkedToMessage({ id: id, rel: 'update', keys: true }), pull.collect(function (err, updates) {
      if (err || !updates || !updates.length) return cb(err)
      updates.sort(updateSort)
      updates.forEach(function (update) {
        try {
          state.update(update.value.content.diff)
        } catch (e) {
          console.error('Failed to apply update', update, e)
        }
      })
      cb()
    }))
  }

  // layout

  document.getElementById('right').appendChild(com.tools({ onsave: gui.save.bind(gui) }))
  document.getElementById('left').appendChild(com.files({ onnew: gui.open.bind(gui, null) }))
  document.getElementById('left').appendChild(h('ul#buffers'))
  var editor = CodeMirror(document.getElementById('main'), {
    lineNumbers: true,
    mode: null,
    keyMap: 'sublime',
    // autoCloseBrackets: true,
    // matchBrackets: true,
    lineWrapping: true,
    showCursorWhenSelecting: true,
    theme: 'codemirror'
  })
  editor.on('change', function () {
    if (gui.hasChanged()) {
      document.querySelector('button#save').classList.add('changed')
    } else {
      document.querySelector('button#save').classList.remove('changed')
    }
  })
  window.editor = editor

  // final setup

  gui.open(null) // new buffer

  return gui
}

function updateSort (a, b) {
  return compare(a.value.timestamp, b.value.timestamp) || compare(a.key, b.key)
}

function compare (a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}