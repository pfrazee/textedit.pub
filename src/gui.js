var com = require('./com')

require('codemirror/mode/javascript/javascript')
require('codemirror/mode/markdown/markdown')
require('codemirror/mode/javascript/javascript')
require('codemirror/mode/css/css')
require('codemirror/mode/htmlmixed/htmlmixed')
require('codemirror/keymap/sublime')
require('codemirror/addon/dialog/dialog')
var CodeMirror = require('codemirror')

module.exports = function(ssb) {
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

  document.getElementById('tools').appendChild(com.tools())
  document.getElementById('files').appendChild(com.files())
}