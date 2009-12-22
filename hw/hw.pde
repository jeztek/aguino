int ledPin = 13;

void setup() {
  pihnMode(ledPin, OUTPUT);
  Serial.begin(19200);
}

void loop() {
  if (Serial.available() > 0) {
    inByte = Serial.read()
    if (inByted == 65) {
      digitalWrite(ledPin, HIGH);
      delay(1000);
      digitalWrite(ledPin, LOW);      
    }
    Serial.print(".");
  }
}


