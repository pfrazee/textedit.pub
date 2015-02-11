var mview = require('mview')
var pull = require('pull-stream')
var h = require('hyperscript')
var u = require('./util')
var com = require('./com')

require('codemirror/mode/javascript/javascript')
require('codemirror/mode/markdown/markdown')
require('codemirror/mode/javascript/javascript')
require('codemirror/mode/css/css')
require('codemirror/mode/htmlmixed/htmlmixed')
require('codemirror/keymap/sublime')
require('codemirror/addon/dialog/dialog')
var CodeMirror = require('codemirror')
window.CodeMirror = CodeMirror

module.exports = function (ssb) {

  // state

  var gui = {}
  var bufferId = null
  var bufferState = null
  var bufferDisabledCommits = null
  var ssbConnected = false

  // buffer control

  gui.hasChanged = function () {
    var v = editor.getValue()
    if (!bufferState)
      return !!v
    return (bufferState.toString() !== v)
  }

  gui.open = function (id) {
    console.log('gui.open', id)
    if (gui.hasChanged()) {
      if (!confirm('There are unsaved changes to this buffer. Are you sure you want to navigate away?'))
        return
    }
    
    if (id == 'null')
      id = null

    bufferId = id
    bufferState = mview.text()
    bufferDisabledCommits = {}

    updateNav()
    try { document.querySelector('button#save').removeAttribute('disabled') } catch (e) {}

    if (id)
      readBuffer(bufferId, bufferState, { redraw: true }, next)
    else {
      document.getElementById('history').firstChild.innerHTML = '<em class="new-buffer">new file</em>'
      next()
    }

    function next (err) {
      if (err)
        console.error('Failed to read buffer state', err)
      editor.setValue(bufferState.toString())
    }
  }

  gui.save = function () {
    if (!ssbConnected)
      return alert('You must be logged into your ssb feed to save.')

    if (Object.keys(bufferDisabledCommits).length)
      return console.log('Cannot save when parts of history have been disabled.')

    var editorStr = editor.getValue()
    if (editorStr === bufferState.toString() || !editorStr)
      return console.log('No changes need saving')

    var name, commitMsg
    if (!bufferId) {
      // new buffer
      var name = prompt('Name of this text buffer')
      if (!name || !(''+name).trim())
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
      u.publishTextBlob(ssb, JSON.stringify(diff), function (err, link) {
        if (err) {
          console.error(err)
          alert('Failed to publish diff, see console for error details')
          return
        }
        link.rel = 'diff'
        link.type = 'application/json'
        ssb.add({
          type: 'update-text-buffer',
          desc: commitMsg,
          rel: 'update',
          msg: id,
          diff: link
        }, function (err, update) {
          if (err) {
            console.error(err)
            alert('Failed to publish diff, see console for error details')
            return
          }
          bufferState.update(diff)       
          bufferId = id
          updateNav()
          addToHistoryPane(update, diff)
          document.querySelector('button#save').classList.remove('changed')
        })
      })
    }
  }

  gui.publish = function () {
    if (!ssbConnected)
      return alert('You must be logged into your ssb feed to publish.')

    if (!bufferId)
      return alert('No file committed to publish.')

    var editorStr = editor.getValue()
    if (!editorStr)
      return console.log('No doc to publish')

    var filename = prompt('File name')
    if (!filename || !(''+filename).trim())
      return

    var publishmsg = prompt('Publish message')
    if (publishmsg === null)
      return

    var sourceId = bufferId
    u.publishTextBlob(ssb, editorStr, function (err, link) {
      if (err) {
        console.error(err)
        alert('Failed to publish file, see console for error details')
        return
      }
      link.name = filename
      link.rel  = 'attachment'
      link.type = 'text/plain'
      ssb.add({
        type: 'post',
        text: publishmsg,
        attachments: [link],
        source: { rel: 'source', msg: sourceId }
      }, function (err, update) {
        if (err) {
          console.error(err)
          alert('Failed to publish file, see console for error details')
          return
        }
        var pubbtn = document.querySelector('#publish')
        pubbtn.classList.add('published')
        pubbtn.innerText = 'Published.'
        pubbtn.setAttribute('disabled', true)
        setTimeout(function () {
          pubbtn.classList.remove('published')
          pubbtn.innerText = 'Publish'
          pubbtn.removeAttribute('disabled')
        }, 5000)
      })
    })
  }

  // gui controls

  gui.toggleHistory = function () {
    document.getElementById('history').classList.toggle('visible')
  }

  gui.toggleCommit = function (e) {
    if (gui.hasChanged()) {
      if (!confirm('There are unsaved changes to this buffer. Toggling commits will lose those changes. Are you sure you want to proceed?'))
        return e.preventDefault()
    }

    var key = e.target.value
    bufferDisabledCommits[key] = !e.target.checked
    if (!bufferDisabledCommits[key])
      delete bufferDisabledCommits[key]

    if (Object.keys(bufferDisabledCommits).length)
      document.querySelector('button#save').setAttribute('disabled', true)
    else
      document.querySelector('button#save').removeAttribute('disabled')
    rebuildBuffer()
  }

  // ssb sync

  gui.sync = function () {
    ssbConnected = true
    document.getElementById('buffers').innerHTML = ''
    console.log('reading list')
    pull(ssb.messagesByType({ type: 'create-text-buffer', live: true}), pull.drain(onNewTextBuffer, function () {
      ssbConnected = false
    }))
    gui.open(bufferId || window.location.hash.slice('#/file/'.length) || null)
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
        onclick: gui.open.bind(gui, msg.key),
        selected: (bufferId == msg.key)
      }), buffers.firstChild)
    } catch (e) {
      console.warn('Failed to read text buffer', e)
    }
  }

  function rebuildBuffer (cb) {
    var oldState = bufferState
    bufferState = mview.text()
    readBuffer(bufferId, bufferState, function (err) {
      if (err) {
        alert('Failed to reconstruct the text buffer, check the console for error details.')
        console.error('Failed to read buffer state', err)
        bufferState = oldState
        cb && cb(err)
        return
      }
      editor.setValue(bufferState.toString())
      cb && cb()
    })
  }

  function readBuffer (id, state, opts, cb) {
    console.log('constructing', id)
    if (!cb) {
      cb = opts
      opts = {}
    }
    if (opts.redraw)
      clearHistoryPane()

    pull(ssb.messagesLinkedToMessage({ id: id, rel: 'update', keys: true }), pull.collect(function (err, updates) {
      if (err || !updates || !updates.length) return cb(err)
      updates.sort(updateSort)
      applyNextDiff()
      var missingBlob = false
      var total = updates.length
      var diffSpeed = (Math.max(33 - Math.min(33, updates.length), 0) + 0) * 2

      function applyNextDiff () {
        if (updates.length === 0) {
          if (missingBlob)
            alert('Some edits\' blobs have not yet been received, and thus their changes were not applied. Check the console for details. (Still working on the UI for this.)')
          return cb()
        }
        
        var update = updates.shift()
        var diff = update.value.content.diff
        
        if (bufferDisabledCommits[update.key])
          return applyNextDiff()

        if (diff.ext && diff.rel === 'diff')
          getBlob()
        else
          apply()

        function getBlob () {
          u.getBlob(ssb, diff.ext, function (err, blob) {
            if (err) {
              console.error('Failed to fetch update blob, id: '+diff.ext, update, err)
              missingBlob = true
              return applyNextDiff()
            }
            
            try { diff = JSON.parse(blob) }
            catch (e) {
              console.error('Failed to parse update blob', update, e, blob)
              return applyNextDiff()
            }
            console.log(diff)

            apply()
          })
        }

        function apply () {
          try {
            state.update(diff)
            if (opts.redraw) {
              document.getElementById('progress-bar').style.height = ((total - updates.length) / total) * 100 + '%'
              addToHistoryPane(update, diff)
              editor.setValue(state.toString())
              setTimeout(applyNextDiff, diffSpeed)
            } else
              applyNextDiff()            
          } catch (e) {
            console.error('Failed to apply update', update, e)
            applyNextDiff()            
          }
        }
      }
    }))
  }

  // layout

  document.getElementById('right').appendChild(com.tools({
    onsave: gui.save.bind(gui),
    onhist: gui.toggleHistory.bind(gui),
    onpub:  gui.publish.bind(gui)
  }))
  document.getElementById('left').appendChild(com.files({ onnew: gui.open.bind(gui, null) }))
  document.getElementById('left').appendChild(h('ul#buffers'))
  var editor = window.editor = CodeMirror(document.getElementById('main'), {
    lineNumbers: true,
    mode: 'markdown',
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
  var ctrl = (CodeMirror.keyMap['default'] == CodeMirror.keyMap.macDefault) ? 'Cmd-' : 'Ctrl-'
  CodeMirror.keyMap.sublime[ctrl+'H'] = gui.toggleHistory.bind(gui)
  CodeMirror.keyMap.sublime[ctrl+'P'] = gui.publish.bind(gui)
  CodeMirror.commands.save = gui.save.bind(gui)

  window.onhashchange = openFileInUrl
  function openFileInUrl() {
    var id = window.location.hash.slice('#/file/'.length)
    if (id == 'null')
      id = null
    if (bufferId != id)
      gui.open(id)
  }

  var histEntries = document.getElementById('history').firstChild
  function clearHistoryPane() {
    histEntries.innerHTML = ''
  }
  function addToHistoryPane(update, diff) {
    histEntries.insertBefore(
      com.histUpdate(update, diff, { ontoggle: gui.toggleCommit.bind(gui) }), 
      histEntries.firstChild
    )
  }

  function updateNav () {
    window.location.hash = '#/file/'+bufferId
    try { document.querySelector('#left .selected').classList.remove('selected') } catch (e) {}
    try {
      if (bufferId) {
        document.querySelector('#left [data-id="'+bufferId+'"]').classList.add('selected')
        document.querySelector('button#publish').removeAttribute('disabled')
      } else {
        document.querySelector('#left li').classList.add('selected')
        document.querySelector('button#publish').setAttribute('disabled', true)
      }
    } catch (e) {}
  }

  return gui
}

function updateSort (a, b) {
  return compare(a.value.timestamp, b.value.timestamp) || compare(a.key, b.key)
}

function compare (a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}