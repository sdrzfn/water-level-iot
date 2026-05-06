/*
Sensor yang dipakai:
1. Ultrasonic (tipe yang dipakai antara JSN-SR04 atau HC-SR04)
2. ESP Board (Bisa memakai ESP32 atau ESP8266)
3. Light/LED Lamps

Flow
1. Sensor ultrasonic merekam ketinggian yang ada di jalanan protokol surabaya
2. Sensor akan mengirim sinyal ke board
3. Perhitungan matematika dari ketinggian air adalah sebagai berikut
    Ketinggian air = Jarak antara alat dan tanah - ketinggian yang dibaca sensor
4. Setelah itu akan dikirim datanya melalui internet dengan menggunakan SIM-GSM800L
5. Pakai websocket ga ya enak nya?
6. MQTT or HTTP? HTTP IT IS!
7. Dikirim ke server lalu di fetch oleh frontend untuk ditampilkan oleh website
*/

// Kode dibawah ini akan kugunakan jika sudah menggunakan GSM SIM800L
// #define TINY_GSM_MODEL_SIM800
// #define TINY_GSM_MODEL_SIM800
// #include <TinyGsmClient.h>
#include <SoftwareSerial.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define trigPin D0
#define echoPin D1
#define led1 D4 // Merah
#define led2 D3 // Kuning
#define led3 D6 // Hijau
#define LCD_SDA D2
#define LCD_SCL D5

LiquidCrystal_I2C lcd(0x27, 16, 2);
const char* ssid = "Redmi Note 9"; // Nama wifi
const char* password = "akuadalahmanusia"; // Password
WiFiServer server(80);

const int SAMPLE_SIZE = 5;        // Jumlah sampel untuk Median Filter
int distanceSamples[SAMPLE_SIZE]; // Array penampung sampel
float smoothDistance = 0;         // Hasil akhir Moving Average
const float m_slope = 1.0;
const float c_intercept = 0.0;

const char* serverUrl = "http://192.168.235.239:4000/app/api/sensor/ketinggian"; // my hp guwe
const char* apiKey = "SKRIPSINDANGMARI";
const char* serialNumber = "SN-SRBY-001";
const int sensorHeight = 400;

long duration;
int distance = 0;

// byte charSignal[8] = {
//   0b00000,
//   0b00100,
//   0b01110,
//   0b10101,
//   0b00100,
//   0b00100,
//   0b00000,
//   0b00000
// };

// void updateLCD(int dist, int waterH, String status) {
//   lcd.clear();

//   // Baris 1: Jarak dan tinggi air
//   lcd.setCursor(0, 0);
//   lcd.print("Jr:");
//   lcd.print(dist);
//   lcd.print("cm");
//   lcd.setCursor(8, 0);
//   lcd.print("Tg:");
//   lcd.print(waterH);
//   lcd.print("cm");

//   // Baris 2: Status
//   lcd.setCursor(0, 1);
//   if (status == "BAHAYA") {
//     lcd.print("!! BAHAYA !!    ");
//   } else if (status == "SIAGA") {
//     lcd.print("~~ SIAGA ~~     ");
//   } else {
//     lcd.print("** AMAN **      ");
//   }
// }

// void splashScreen() {
//   lcd.clear();
//   lcd.setCursor(2, 0);
//   lcd.print("FLOOD SENSOR");
//   lcd.setCursor(1, 1);
//   lcd.print(serialNumber);
//   delay(2000);

//   lcd.clear();
//   lcd.setCursor(0, 0);
//   lcd.print("Connecting WiFi.");
//   lcd.setCursor(0, 1);
//   lcd.print("Please wait.....");
// }

// void wifiConnectedScreen() {
//   lcd.clear();
//   lcd.setCursor(1, 0);
//   lcd.print("WiFi Terhubung!");
//   lcd.setCursor(0, 1);
//   lcd.print(WiFi.localIP());
//   delay(2000);

//   lcd.clear();
//   lcd.setCursor(2, 0);
//   lcd.print("Memulai");
//   lcd.setCursor(3, 1);
//   lcd.print("Sensor...");
//   delay(1500);
// }

void sortArray(int a[], int size) {
  for(int i=0; i<size-1; i++) {
    for(int j=i+1; j<size; j++) {
      if(a[i] > a[j]) {
        int temp = a[i];
        a[i] = a[j];
        a[j] = temp;
      }
    }
  }
}

int getFilteredDistance() {
  for(int i=0; i<SAMPLE_SIZE; i++) {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    
    long duration = pulseIn(echoPin, HIGH);
    int raw = duration * 0.034 / 2;
    distanceSamples[i] = (raw > 0 && raw < 450) ? raw : sensorHeight; 
    delay(30);
  }

  // Cari Median
  sortArray(distanceSamples, SAMPLE_SIZE);
  int medianDist = distanceSamples[SAMPLE_SIZE / 2];

  // Menghaluskan transisi data antara interval 5 detik
  if (smoothDistance == 0) smoothDistance = medianDist; // Inisialisasi awal
  smoothDistance = (smoothDistance * 0.7) + (medianDist * 0.3);

  return (int)smoothDistance;
}

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(led1, OUTPUT);
  pinMode(led2, OUTPUT);
  pinMode(led3, OUTPUT);
  
  Serial.begin(9600);
  Wire.begin(LCD_SDA, LCD_SCL);
  lcd.init();
  lcd.backlight();
  lcd.createChar(0, charSignal);

  splashScreen();

  // Monitoring sambungan WiFi
  Serial.println("\nConnecting to WiFi...");
  WiFi.begin(ssid, password); 
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    static int dotCount = 0;
    lcd.setCursor(dotCount % 16, 1);
    lcd.print(".");
    dotCount++;
  }

  Serial.println("\nWiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  wifiConnectedScreen();
}

void loop() {
  int filteredDist = getFilteredDistance();
  int calibratedDist = (filteredDist * m_slope) + c_intercept; // Kalibrasi Linear (mX + c) untuk mengatasi bias
  int waterHeight = sensorHeight - calibratedDist; // Rumus utama genangan
  if (waterHeight < 0) waterHeight = 0; 

  // Penentuan Status
  String status;
  if (waterHeight > 150) status = "BAHAYA";
  else if (waterHeight > 75) status = "SIAGA";
  else status = "AMAN";

  Serial.printf("Jarak dengan objek: 
  %d cm | Jarak terkalibari: %d cm | Tinggi air: %d cm\n", filteredDist, calibratedDist, waterHeight);
  updateLCD(calibratedDist, waterHeight, status);
  handleLEDs(waterHeight);

  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;

    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-KEY", apiKey);

    StaticJsonDocument<200> doc;
    doc["deviceId"] = serialNumber;
    doc["height"] = waterHeight;
    doc["status"] = status;

    String requestBody;
    serializeJson(doc, requestBody);

    Serial.println("Sending data...");
    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      Serial.println("Response: " + response);
    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }

  delay(5000);
}

void handleLEDs(int dist) {
  if (dist > 150) {
    digitalWrite(led1, HIGH); digitalWrite(led2, LOW); digitalWrite(led3, LOW);
  } else if (dist <= 150 && dist > 75) {
    digitalWrite(led1, LOW); digitalWrite(led2, HIGH); digitalWrite(led3, LOW);
  } else {
    digitalWrite(led1, LOW); digitalWrite(led2, LOW); digitalWrite(led3, HIGH);
  }
}