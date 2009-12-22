int ledPin = 8;
int inByte = 0;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600); 
  Serial.print("hello\n");
  Serial.flush();
}

void loop() {
  if (Serial.available() > 0) {
    inByte = Serial.read();
    if (inByte == 'A') {
      digitalWrite(ledPin, HIGH);
      delay(1000);
      digitalWrite(ledPin, LOW);      
      Serial.print(".");
    }
  }
}


