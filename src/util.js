var pull = require('pull-stream')
var createHash = require('multiblob/util').createHash

exports.handler = function (cb, allowDefault) {
  return function (e) {
    if (!allowDefault)
      e.preventDefault()
    cb && cb(e)
  }
}

exports.getBlob = function (ssb, id, cb) {
  var blob = ''
  function concat (chunk) { blob += atob(chunk) }
  pull(ssb.blobs.get(id), pull.drain(concat, function (err) {
    if (err) cb(err)
    else cb(null, blob)
  }))
}

exports.publishTextBlob = function (ssb, blob, cb) {
  // hash and store
  var hasher = createHash()
  pull(
    pull.values([blob]),
    hasher,
    pull.map(function (buf) { 
      if (typeof buf == 'string')
        return btoa(buf)
      return new Buffer(new Uint8Array(buf)).toString('base64')
    }),
    ssb.blobs.add(function (err) {
      if(err) return cb(err)
      cb(null, { ext: hasher.digest, size: hasher.size })
    })
  )
}