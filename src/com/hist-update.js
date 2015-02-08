var h = require('hyperscript')
var nicedate = require('nicedate')

module.exports = function (update) {
  var desc, adds=0, dels=0
  try {
    desc = update.value.content.desc
    adds = update.value.content.diff.adds.length
    dels = update.value.content.diff.dels.length
  } catch (e) {}

  return h('p', 
    h('strong', desc || h('em', 'no commit message')),
    h('br'),
    h('small',
      '(', h('span.adds', '+', adds), ' ', h('span.dels', '-', dels), ') ',
      nicedate(update.value.timestamp, true),
      ' by ', update.value.author
    )
  )
}