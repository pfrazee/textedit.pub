
exports.handler = function (cb, allowDefault) {
  return function (e) {
    if (!allowDefault)
      e.preventDefault()
    cb && cb(e)
  }
}