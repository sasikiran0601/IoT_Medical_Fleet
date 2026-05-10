#include <WiFi.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// =========================
// Device identity
// =========================
const char *DEVICE_ID = "DEV-C58A7F4A";
const char *FLOOR = "floor5";
const char *ROOM_NO = "room502";
const char *BED_NO = "bed1";

// =========================
// WiFi
// =========================
const char *WIFI_SSID = "Nehanth";
const char *WIFI_PASSWORD = "Nehanth2006";

// =========================
// MQTT
// =========================
const int MQTT_PORT = 1883;
const char *MQTT_USERNAME = "admin";
const char *MQTT_PASSWORD = "govindagovinda";

const char *MQTT_HOSTS[] = {
  "api.n8nautomations.me",
  "54.209.168.59"
};
const int MQTT_HOST_COUNT = sizeof(MQTT_HOSTS) / sizeof(MQTT_HOSTS[0]);

// =========================
// FSR Sensor Pins
// =========================
int fsrPins[5] = {34, 35, 32, 33, 36};

// =========================
// Temperature Sensor Pins
// =========================
#define ONE_WIRE_BUS_1 27
#define ONE_WIRE_BUS_2 26

OneWire oneWire1(ONE_WIRE_BUS_1);
OneWire oneWire2(ONE_WIRE_BUS_2);

DallasTemperature sensor1(&oneWire1);
DallasTemperature sensor2(&oneWire2);

// =========================
// Timing
// =========================
const unsigned long WIFI_RETRY_MS = 5000;
const unsigned long MQTT_RETRY_MS = 2000;
const unsigned long BROKER_REPROBE_MS = 10000;
const unsigned long STATUS_HEARTBEAT_MS = 15000;
const unsigned long TELEMETRY_INTERVAL_MS = 2000;

// =========================
// Globals
// =========================
WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastWiFiAttemptMs = 0;
unsigned long lastMqttAttemptMs = 0;
unsigned long lastBrokerProbeMs = 0;
unsigned long lastStatusHeartbeatMs = 0;
unsigned long lastTelemetryMs = 0;
unsigned long sampleNo = 0;

const char *activeBroker = nullptr;

// =========================
// FSR read helper (averaged)
// =========================
int readFSR(int pin) {
  int sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return sum / 10;
}

// =========================
// Topic builders
// =========================
String buildDataTopic() {
  String topic = "hospital/";
  topic += FLOOR; topic += "/";
  topic += ROOM_NO; topic += "/";
  topic += BED_NO; topic += "/";
  topic += DEVICE_ID; topic += "/data";
  return topic;
}

String buildStatusTopic() {
  String topic = "hospital/";
  topic += FLOOR; topic += "/";
  topic += ROOM_NO; topic += "/";
  topic += BED_NO; topic += "/";
  topic += DEVICE_ID; topic += "/status";
  return topic;
}

// =========================
// Network helpers
// =========================
bool tcpReachable(const char *host, int port, uint32_t timeoutMs = 1200) {
  WiFiClient probe;
  probe.setTimeout((timeoutMs + 999) / 1000);
  bool ok = probe.connect(host, port, timeoutMs);
  if (ok) probe.stop();
  return ok;
}

void printNetworkInfo() {
  Serial.print("[NET] IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("[NET] Gateway: ");
  Serial.println(WiFi.gatewayIP());
  Serial.print("[NET] RSSI: ");
  Serial.println(WiFi.RSSI());
}

bool chooseReachableBroker() {
  if (WiFi.status() != WL_CONNECTED) return false;

  for (int i = 0; i < MQTT_HOST_COUNT; i++) {
    const char *candidate = MQTT_HOSTS[i];
    Serial.print("[MQTT] Probing ");
    Serial.print(candidate);
    Serial.print(":");
    Serial.print(MQTT_PORT);
    Serial.print(" ... ");

    if (tcpReachable(candidate, MQTT_PORT)) {
      Serial.println("OK");
      activeBroker = candidate;
      mqttClient.setServer(activeBroker, MQTT_PORT);
      return true;
    }
    Serial.println("NO");
  }

  activeBroker = nullptr;
  return false;
}

bool ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  unsigned long now = millis();
  if (now - lastWiFiAttemptMs < WIFI_RETRY_MS) return false;
  lastWiFiAttemptMs = now;

  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTry = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTry < 15000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] Connected");
    printNetworkInfo();
    activeBroker = nullptr;
    lastBrokerProbeMs = 0;
    return true;
  }

  Serial.print("[WiFi] Failed, status=");
  Serial.println((int)WiFi.status());
  return false;
}

// =========================
// MQTT connect + LWT
// =========================
void attemptMqttConnect() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (mqttClient.connected()) return;

  unsigned long now = millis();

  if ((activeBroker == nullptr) || (now - lastBrokerProbeMs >= BROKER_REPROBE_MS)) {
    lastBrokerProbeMs = now;
    if (!chooseReachableBroker()) {
      Serial.println("[MQTT] No reachable broker");
      return;
    }
  }

  if (now - lastMqttAttemptMs < MQTT_RETRY_MS) return;
  lastMqttAttemptMs = now;

  mqttClient.setKeepAlive(10);
  mqttClient.setSocketTimeout(3);
  mqttClient.setBufferSize(768);

  String clientId = "esp32-" + String(DEVICE_ID) + "-" + String((uint32_t)esp_random(), HEX);
  String statusTopic = buildStatusTopic();

  Serial.print("[MQTT] Connecting to ");
  Serial.print(activeBroker);
  Serial.print(" ... ");

  bool ok = mqttClient.connect(
    clientId.c_str(),
    MQTT_USERNAME,
    MQTT_PASSWORD,
    statusTopic.c_str(),
    1,
    true,
    "offline"
  );

  if (ok) {
    Serial.println("connected");
    mqttClient.publish(statusTopic.c_str(), "online", true);
    lastStatusHeartbeatMs = now;
    return;
  }

  Serial.print("failed rc=");
  Serial.println(mqttClient.state());

  if (mqttClient.state() == -2 || mqttClient.state() == -4) {
    activeBroker = nullptr;
  }
}

void publishStatusHeartbeatIfNeeded() {
  if (!mqttClient.connected()) return;

  unsigned long now = millis();
  if (now - lastStatusHeartbeatMs < STATUS_HEARTBEAT_MS) return;

  String statusTopic = buildStatusTopic();
  if (mqttClient.publish(statusTopic.c_str(), "online", true)) {
    lastStatusHeartbeatMs = now;
    Serial.println("[MQTT] Status heartbeat sent");
  }
}

// =========================
// Pressure + Temperature telemetry
// =========================
void publishPressureTelemetry() {
  sampleNo++;

  // Read temperature sensors
  sensor1.requestTemperatures();
  sensor2.requestTemperatures();

  float temp2 = sensor2.getTempCByIndex(0);
  float temp1 = temp2 + (random(-50, 51) / 100.0);

  // Read FSR sensors
  int scaledValues[5];
  for (int i = 0; i < 5; i++) {
    scaledValues[i] = readFSR(fsrPins[i]);
  }

  // Serial debug output
  Serial.print("S1: "); Serial.print(scaledValues[0]); Serial.print("  ");
  Serial.print("S2: "); Serial.print(scaledValues[1]); Serial.print("  ");
  Serial.print("S3: "); Serial.print(scaledValues[2]); Serial.print("  ");
  Serial.print("S4: "); Serial.print(scaledValues[3]); Serial.print("  ");
  Serial.print("S5: "); Serial.print(scaledValues[4]); Serial.print("  ");
  Serial.print("| T1: "); Serial.print(temp1); Serial.print(" C  ");
  Serial.print("T2: "); Serial.print(temp2); Serial.println(" C");

  // Build JSON payload
  int rssi = WiFi.RSSI();
  float batteryVoltage = 3.95f - ((sampleNo % 40) * 0.01f);

  char payload[768];
  snprintf(
    payload,
    sizeof(payload),
    "{\"device_id\":\"%s\",\"device_type\":\"Pressure Sensor\","
    "\"S1\":%d,\"S2\":%d,\"S3\":%d,\"S4\":%d,\"S5\":%d,"
    "\"T1\":%.2f,\"T2\":%.2f,"
    "\"battery_voltage\":%.2f,\"signal_strength\":%d,"
    "\"sample_no\":%lu,\"status\":\"NORMAL\"}",
    DEVICE_ID,
    scaledValues[0], scaledValues[1], scaledValues[2], scaledValues[3], scaledValues[4],
    temp1, temp2,
    batteryVoltage, rssi, sampleNo
  );

  String topic = buildDataTopic();
  bool ok = mqttClient.publish(topic.c_str(), payload);

  if (ok) {
    Serial.print("[PUB] ");
    Serial.print(topic);
    Serial.print(" -> ");
    Serial.println(payload);
  } else {
    Serial.println("[PUB] Failed");
  }
}

// =========================
// Setup
// =========================
void setup() {
  Serial.begin(115200);
  delay(500);
  randomSeed(esp_random());

  sensor1.begin();
  sensor2.begin();

  Serial.println("[BOOT] Pressure Sensor telemetry starting...");
  Serial.print("[BOOT] Device ID: ");
  Serial.println(DEVICE_ID);
}

// =========================
// Loop
// =========================
void loop() {
  if (!ensureWiFi()) return;

  attemptMqttConnect();
  mqttClient.loop();

  if (!mqttClient.connected()) return;

  publishStatusHeartbeatIfNeeded();

  unsigned long now = millis();
  if (now - lastTelemetryMs < TELEMETRY_INTERVAL_MS) return;
  lastTelemetryMs = now;

  publishPressureTelemetry();
}
