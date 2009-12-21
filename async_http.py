import asyncore
import socket, time
import StringIO
import mimetools, urlparse

# Usage:
#	manager = AsyncHttpManager(max_connections=20, max_time=15, max_size=1000000)
#	manager.request(<request URL>, <event handler class with callback methods>)
#		...
# 	while manager.poll(1):
#		pass
#	
# manager.poll(1) blocks until all requests return


# Asynchronous HTTP client 
class AsyncHttp(asyncore.dispatcher_with_send):

    def __init__(self, host, port, path, consumer):
        asyncore.dispatcher_with_send.__init__(self)

        self.host = host
        self.port = port
        self.path = path

        self.consumer = consumer

        self.status = None
        self.header = None

        self.data = ""

        self.bytes_in = 0
        self.bytes_out = 0
        self.timestamp = time.time()

        self.create_socket(socket.AF_INET, socket.SOCK_STREAM)
        self.connect((host, port))

    def handle_connect(self):
        # Connect succeeded
        text = "GET %s HTTP/1.0\r\nHost: %s\r\n\r\n" % (self.path, self.host)
        self.send(text)
        self.bytes_out = self.bytes_out + len(text)

    def handle_expt(self):
        # Connection failed, notify consumer
        self.close()
        self.consumer.http_failed(self)

    def handle_read(self):
        self.timestamp = time.time()
        data = self.recv(2048)
        self.bytes_in = self.bytes_in + len(data)

        # Check to see if we've received a full header
        if not self.header:
            self.data = self.data + data

            header = self.data.split("\r\n\r\n", 1)
            if len(header) <= 1:
                return

            header, data = header

            # Parse header
            fp = StringIO.StringIO(header)
            self.status = fp.readline().split(" ", 2)
            self.header = mimetools.Message(fp)

            self.data = ""

            self.consumer.http_header(self)

            if not self.connected:
                # Channel was closed by consumer
                return 

        if data:
            self.consumer.feed(data)

    def handle_close(self):
        self.consumer.close()
        self.close()


# Helper function to parse uri
def async_request(uri, consumer):
	# Turn the uri into a valid request
	scheme, host, path, params, query, fragment = urlparse.urlparse(uri)
	assert scheme == "http", "only HTTP requests are supported"
	try:
		host, port = host.split(":", 1)
		port = int(port)
	except (TypeError, ValueError):
		port = 80
	
	if not path:
		path = "/"
	if params:
		path = path + ";" + params
	if query:
		path = path + "?" + query

	#print "path: " + path
	return AsyncHttp(host, port, path, consumer)


class AsyncHttpManager:

	# max_time (seconds), max_size (bytes)
	def __init__(self, max_connections=10, max_time=15, max_size=1000000):
		self.max_connections = max_connections
		self.max_time = max_time
		self.max_size = max_size
	
		self._queue = []
	
	def request(self, uri, consumer):
		self._queue.append((uri, consumer))
	
	def poll(self, timeout=0.1):
		# Activate up to max_connections channels
		while self._queue and len(asyncore.socket_map) < self.max_connections:
			async_request(*self._queue.pop(0))
		
		now = time.time()
		for channel in asyncore.socket_map.values():
			if channel.bytes_in > self.max_size:
				print "exceeded max size"
				channel.close()
			if now - channel.timestamp > self.max_time:
				print "exceeded max time"
				channel.close()
		
		# Keep the network running
		asyncore.poll(timeout)
		
		# Return non-zero if we should keep polling
		return len(self._queue) or len(asyncore.socket_map)


class AsyncConsumer:
	def __init__(self):
		self.data = ""

	def http_header(self, client):
		if (client.status[1] != "200"):
			print "error on connect: " + str(client.status[1])
			client.close()
			client.connected = 0
			return

	def http_failed(self, client):
		print "http failed"

	def feed(self, data):
		self.data = self.data + data

	def close(self):
		pass

