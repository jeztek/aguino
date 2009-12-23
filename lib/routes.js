/* routes.js
 * 
 * A regex-based router for the node.js http server
 * 
 * Ted Morse
 * 12/23/2009
 */

var sys = require('sys');

var Router = function() { 
  this.handlers = [];
};
sys.inherits(Router, process.EventEmitter);
exports.Router = Router;

Router.prototype.addRoute = function(regex, fn, id) {
  this.handlers.push({ 
    'regex': regex, 
    'handler': fn,
    'id': id || this.handlers.length
  });

  return id || this.handlers.length - 1;
};

// Default request handler. Passes the actual request to whatever handler's
// regex property first passes the test on the URI
Router.prototype._httpHandler = function(req, res) {
  for(i in this.handlers) {
    var matches = this.handlers[i].regex.exec(req.uri.path);
    if( matches != null ) {
      matches.shift();
      return this.handlers[i].handler.apply(this.handlers[i].handler, [ req, res ].concat(matches));
    }
  }

  // If any handler doesn't succeed, treat it as a 404.  Add a handler for
  // the / url to remove the 404 on an empty url
  var response = '404 Not Found';
  //res.sendStaticBody(404, { 'Content-type': 'text/plain' }, response);
  res.sendHeader(404, { 
    'Content-type': 'text/plain',
    'Content-length': response.length });
  res.sendBody(response);
  res.finish();
};

// Create a wrapper function to make sure the httpHandler runs within 
// the context of this router object
Router.prototype.createHandler = function() {
  var self = this;
  return function (req, res) {
    return self._httpHandler(req, res);
  }
};

exports.createRouter = function() {
  return new exports.Router();
};

