module.exports = function(server) {
  return function(req, res, next) {
    // Access token
    if (req.url == '/access.json') {
      // generate access secret according to host and assigned perms
      var accessSecret = server.createAccessKey({ allow: ['add', 'createLogStream', 'relatedMessages'] })

      // respond with token
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(200)
      var accessToken = server.options.signObjHmac(accessSecret, {
        role: 'client',
        ts: Date.now(),
        keyId: server.options.hash(accessSecret)
      })
      return res.end(JSON.stringify(accessToken))
    }
    next()
  }
}