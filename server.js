var sys = require('sys'),
   http = require('http');

var clients = {};

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

// Water handler
handlers.push({
  regex: /\/control\/\S+\/water/,
  handler: function(req, res) {
    id = req.uri.path.split('/')[2];
    if (clients[id] == undefined) {
      res.sendHeader(404, {'Content-type': 'text/plain'});
      res.sendBody('404 - Document not found');
      res.finish();
      return;
    }

    if (req.method == 'POST') {
      clearTimeout(clients[id].timeout);
      clients[id].response.sendHeader(200, 
                                      { 'Content-type': 'text/json',
                                        'Content-length': 25 });
      clients[id].response.sendBody('{ "status": "ok", "action": "water" }');
      clients[id].response.finish();
      delete clients[id];

      res.sendHeader(200, { 'Content-type': 'text/html' });
      res.sendBody('<html><h3>OK</h3></html>');
      res.finish();
      return;
    }

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

    id = req.connection.remoteAddress + ':' + client_id;
    sys.debug('Client connected: ' + id);

    if( clients[id] != undefined ) {
      res.sendHeader(200, { 'Content-type': 'text/json' });
      res.sendBody('{ "status": "error", "error": "duplicate", "msg": "client already connected with that id" }');
      res.finish();
      return;
    }
    
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
        }, 10000)
    };

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
http.createServer(
  function (req, res) {
    for(i in handlers) {
      if( handlers[i].regex.test(req.uri.path) )
        return handlers[i].handler(req, res);
    }

    res.sendHeader(404, {'Content-type': 'text/plain'});
    res.sendBody('404: Document not Found');
    res.finish();
  }
).listen(8003);


sys.puts('Server running at http://localhost:8003/');