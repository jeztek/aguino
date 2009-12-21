import serial
from async_http import AsyncHttpManager, AsyncConsumer

ARDUINO_ID		= 12345

# Serial
SERIAL_PORT		= "/dev/ttyUSB0"
SERIAL_SPEED	= 19200
SERIAL_COMMAND	= "water me"

# Server
SERVER_URL		= "http://localhost:8000/client/connect"
SERVER_COMMAND	= "water authorized"


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

	def connect(self, port=SERIAL_PORT, baud=SERIAL_SPEED, timeout=0.1):
		ser = serial.Serial(port=port, baud=baud, timeout=timeout)
		ser.write(COMMAND_STRING)
		ser.close()


class AguinoConsumer(AsyncConsumer):
	def __init__(self):
		AsyncConsumer.__init__(self)

	def close(self):
		print self.data
		if self.data == SERVER_COMMAND:
			ser = AguinoSerial()
			ser.connect()


def loop(manager, url):
	manager.request(url, AguinoConsumer())
	while manager.poll(1):
		pass
	loop(manager, url)
	
def main():
	import sys
	manager = AsyncHttpManager(max_connections=1, max_time=5, \
							   max_size=1000000)
	loop(manager, SERVER_URL + "/" + ARDUINO_ID + "/")
	
if __name__ == "__main__":
	main()
