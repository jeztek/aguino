// server.js
//
// node.js server for aguino.
//
// Ted Morse
// 12/21/2009

// Default settings
var server_port = 8003;
var client_timeout = 10000;

// Imports
var sys = require('sys'),
  http = require('http'),
  routes = require('./lib/routes');

// The client ID is a colon-separated tuple of the client's IP address and 
// the self-assigned ID of the client.  For example: an arduino board 
// on the same host as the server with the ID of 1 would have a client ID of
// 127.0.0.1:1
 
// Clients:
//   This ad-hoc dictionary holds currently connected/registered clients.
//   Each property is named after the ID of the client that is connected.
//   Each property is itself an object representing the following properties
//   of the client:
//     - id: another copy of the client ID string
//     - request: the http.request object that this client connected with
//     - response: the http.response object that goes to this client
//     - timeout: the ID of the timeout object
var clients = {};

// Helper extension to ServerResponse to handle one-off responses which also
// disables chunked encoding by setting the content-length header. Finishes
// the response.
http.ServerResponse.prototype.sendStaticBody = function(statusCode, headers, data) {
  headers['Content-length'] = data.length;
  this.sendHeader(statusCode, headers);
  this.sendBody(data);
  this.finish();
}

var router = routes.createRouter();

// Handles /status
router.addRoute(/^\/status\/.*/, function(req, res) {
  var response = "Status: All Good";
  res.sendStaticBody(200, { 'Content-type': 'text/plain' }, response);
});

// Water action handler.  Tells the arduino client to water the plants
router.addRoute(/\/control\/(\S+)\/water/, function(req, res, id) {
  //    id = req.uri.path.split('/')[2];

  // Make sure the client exists/connected
  if (clients[id] == undefined) {
    var response = '404 Not Found';
    res.sendStaticBody(404, { 'Content-type': 'text/plain' }, response);
    return;
  }

  // If this is a post request, actually perform the action
  if (req.method == 'POST') {
    clearTimeout(clients[id].timeout);

    var response = '{ "status": "ok", "action": "water" }';
    clients[id].response.sendStaticBody(200, { 'Content-type': 'text/json' }, response);

    delete clients[id];

    // Tell the client we succeeded
    // TODO: Make a nice webpage
    response = '<html><h3>OK</h3></html>';
    res.sendStaticBody(200, { 'Content-type': 'text/html' }, response);
    return;
  }

  // If this is a get request, display a form that the user can
  // Post the action to.
  // TODO: Make a nice webpage
  var response = 
    '<html><form name="water" method="post"><button name="water">Water</button></form></html>';
  res.sendStaticBody(200, { 'Content-type': 'text/html' }, response);
});

// Handles client (arduino) connections
router.addRoute(/\/client\/connect\/(\S+)\//, function(req, res, client_id) {
  // Client-assigned id
  //client_id = req.uri.path.split('/')[3];

  // Construct the internal client id
  id = req.connection.remoteAddress + ':' + client_id;
  sys.debug('Client connected: ' + id);

  // If this arduino board has already connected, tell them to bugger off
  if( clients[id] != undefined ) {
    var response = 
      '{ "status": "error", "error": "duplicate", "msg": "client already connected with that id" }';
    res.sendStaticBody(200, { 'Content-type': 'text/json' }, response);
    return;
  }
    
  // Construct the client object
  clients[id] = { 
    id: id,
    request: req, 
    response: res,
    timeout: setTimeout(
      function() {
        sys.debug('Client timed out: ' + id);
        delete clients[id];

        var response = '{ "status": "timeout", "msg": "connection timed out" }';
        res.sendStaticBody(200, { 'Content-type': 'text/json' }, response);
      }, client_timeout)
  };

  // Handle the case of the client disconnecting for whatever reason
  req.connection.addListener('eof', function() {
    if (clients[id] != undefined) {
      sys.debug('Client disconnected: ' + id);
      clearTimeout(clients[id].timeout);
      delete clients[id];
      res.finish();
    }
  });
});

// Handles /static/blah
// TODO: Create a static file handler.

// Parse command-line options
while (process.ARGV.length > 0) {
  arg = process.ARGV.shift();
  switch(arg) {
  case '-p':
  case '--port':
    server_port = parseInt(process.ARGV.shift());
    break;
  case '-t':
  case '--timeout':
    client_timeout = parseInt(process.ARGV.shift()) * 1000;
    break;
  }
}

// Create the server
var server = http.createServer(router.createHandler());

server.listen(server_port);

// Handle Ctrl-C nicely
process.addListener('SIGINT', function() {
  sys.puts('Server exiting...');
  server.close();
});

// Informative statement about server status
sys.puts('Server running at http://localhost:' + server_port + '/');
sys.puts('Clients have a ' + client_timeout/1000 + ' second timeout.');

