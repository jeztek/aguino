#include <Servo.h>

int ledPin = 8;
int inByte = 0;
int servoPin = 7;

Servo water_servo;

#define VALVE_CLOSED 155
#define VALVE_OPEN 90

void setup() {
  pinMode(ledPin, OUTPUT);
  
  water_servo.attach(servoPin);
  water_servo.write(VALVE_CLOSED + 10);
  delay(500);
  water_servo.write(VALVE_CLOSED);
  
  Serial.begin(9600); 
  Serial.print("ready\n");
  Serial.flush();

}

void loop() {
  if (Serial.available() > 0) {
    inByte = Serial.read();
    if (inByte == 'O') {
      water_servo.write(VALVE_OPEN);
      digitalWrite(ledPin, HIGH);
      Serial.print(".");
    } else if (inByte == 'C') {
      water_servo.write(VALVE_CLOSED + 10);
      delay(750);
      digitalWrite(ledPin, LOW);
      Serial.print(".");
      water_servo.write(VALVE_CLOSED);
    }
  }
}


