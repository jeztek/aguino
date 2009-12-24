import serial, time

try:
        import json
except ImportError:
        import simplejson as json

from async_http import AsyncHttpManager, AsyncConsumer

ARDUINO_ID		= 12345

# Serial
SERIAL_PORT		= "/dev/cu.usbserial-A6008jjv"
SERIAL_SPEED	= 9600

SERIAL_COMMAND_OPEN = "O"
SERIAL_COMMAND_CLOSE = "C"

# Server
SERVER_URL		= "http://localhost:8003/client/connect"
SERVER_COMMAND	= "{ \"status\": \"ok\", \"action\": \"water\" }"

class AguinoSerial():
	def scan(self):
		available = []
		for i in range(256):
			try:
				s = serial.Serial(i)
				avaiable.append((i, s.portstr))
				s.close()
			except serial.SerialException:
				pass
		return available

	def connect(self, port=SERIAL_PORT, baud=SERIAL_SPEED):
		try:
                        print "Sending command to serial port"
			ser = serial.Serial(port, baud)

                        # Wait for the arduino to initialize
			print ser.readline(),

			ser.write(SERIAL_COMMAND_OPEN)
			print ser.read()

                        time.sleep(5)
                        ser.write(SERIAL_COMMAND_CLOSE)
                        print ser.read()

			ser.close()
		except serial.SerialException:
			print "Ack!"
			

class AguinoConsumer(AsyncConsumer):
	def __init__(self):
		AsyncConsumer.__init__(self)

	def close(self):
		print "Data: " + self.data
		obj = json.loads(self.data)
		print obj
		if obj.has_key('action') and obj['action'] == 'water':
			print "got water command"
			ser = AguinoSerial()
			ser.connect()
			

def loop(manager, url):
	manager.request(url, AguinoConsumer())
	while manager.poll(1):
		pass
	loop(manager, url)
	
def main():
	import sys
	manager = AsyncHttpManager(max_connections=1, max_time=60, \
							   max_size=1000000)
	loop(manager, SERVER_URL + "/" + str(ARDUINO_ID) + "/")
	
if __name__ == "__main__":
	main()
