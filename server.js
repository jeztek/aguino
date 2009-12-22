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
   http = require('http');

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

// Handlers:
//   This array holds all of the different handlers for the httpServer instance
//   Each element in the array is an object containing the following properties:
//     - regex: A RegExp object containing the formats of queries this handler
//              supports.
//     - handler: A function (receives the same arguments as the request event
//                handler of httpServer.
var handlers = [];

// Handles /status
handlers.push({ 
  regex: /\/status\/.*/,
  handler: function(req, res) {
    res.sendHeader(200, {'Content-type': 'text/plain'});
    res.sendBody('Status: All Good');
    res.finish();
  }
});

// Water action handler.  Tells the arduino client to water the plants
handlers.push({
  regex: /\/control\/\S+\/water/,
  handler: function(req, res) {
    id = req.uri.path.split('/')[2];

    // Make sure the client exists/connected
    if (clients[id] == undefined) {
      res.sendHeader(404, {'Content-type': 'text/plain'});
      res.sendBody('404 - Document not found');
      res.finish();
      return;
    }

    // If this is a post request, actually perform the action
    if (req.method == 'POST') {
      clearTimeout(clients[id].timeout);
      clients[id].response.sendHeader(200, 
                                      { 'Content-type': 'text/json',
                                        'Content-length': 25 });
      clients[id].response.sendBody('{ "status": "ok", "action": "water" }');
      clients[id].response.finish();
      delete clients[id];

      // Tell the client we succeeded
      // TODO: Make a nice webpage
      res.sendHeader(200, { 'Content-type': 'text/html' });
      res.sendBody('<html><h3>OK</h3></html>');
      res.finish();
      return;
    }

    // If this is a get request, display a form that the user can
    // Post the action to.
    // TODO: Make a nice webpage
    res.sendHeader(200, { 'Content-type': 'text/html' });
    res.sendBody('<html><form name="water" method="post"><button name="water">Water</button></form></html>');
    res.finish();  
  }
});

// Handles client (arduino) connections
handlers.push({ 
  regex: /\/client\/connect\/\d+/,
  handler: function(req, res) {
    client_id = req.uri.path.split('/')[3];

    // Construct the Client ID
    id = req.connection.remoteAddress + ':' + client_id;
    sys.debug('Client connected: ' + id);

    // If this arduino board has already connected, tell them to bugger off
    if( clients[id] != undefined ) {
      res.sendHeader(200, { 'Content-type': 'text/json' });
      res.sendBody('{ "status": "error", "error": "duplicate", "msg": "client already connected with that id" }');
      res.finish();
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

          res.sendHeader(200, { 'Content-type': 'text/json',
                'Content-length': 36 });
          res.sendBody('{ "status": "timeout", "msg": "connection timed out" }');
          res.finish();
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

  }
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
http.createServer(

  // Default request handler. Passes the actual request to whatever handler's
  // regex property first passes the test on the URI
  function (req, res) {
    for(i in handlers) {
      if( handlers[i].regex.test(req.uri.path) )
        return handlers[i].handler(req, res);
    }

    // If any handler doesn't succeed, treat it as a 404.  Add a handler for
    // the / url to remove the 404 on an empty url
    res.sendHeader(404, {'Content-type': 'text/plain'});
    res.sendBody('404: Document not Found');
    res.finish();
  }

).listen(server_port);

// Handle Ctrl-C nicely
process.addListener('SIGINT', function() {
  sys.puts('Server exiting...');
  process.exit(); 
});

// Informative statement about server status
sys.puts('Server running at http://localhost:' + server_port + '/');
sys.puts('Clients have a ' + client_timeout/1000 + ' second timeout.');

