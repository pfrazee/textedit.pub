var stack = require('stack')
var server = require('scuttlebot').init(require('./config'))
server.on('request', stack(
  function (req, res, next) {
    // CSPs
    res.setHeader('Content-Security-Policy', 'default-src \'self\' data:; connect-src \'self\' ws://localhost:'+server.config.port)
    next()
  },
  require('stack-assets-builder')({ enabled: server.config.dev, root: __dirname }),
  require('stack-assets-static')({ root: __dirname })
))