# Medical IoT Device Fleet Management System

A full-stack hospital IoT device management platform built with **FastAPI**, **React**, **SQLite**, **MQTT**, and **WebSockets** — deployable on AWS EC2 via Docker Compose.

---

## Features

- **Real-time dashboard** — live device status, sensor charts, confidence scores via WebSocket
- **Floor → Room → Device hierarchy** — organised hospital structure
- **Device control** — turn devices ON/OFF with mandatory purpose logging
- **Sensor validation** — range checking + Z-score statistical confidence scoring
- **Audit logs** — complete who/when/how-long accountability trail
- **Alerts** — offline detection, anomaly detection, long-running warnings
- **Authentication** — local login + Google OAuth + GitHub OAuth
- **API key system** — each device gets its own token (like Ubidots)
- **Webhook forwarding** — push sensor data to AWS IoT Core or any external URL
- **OTA firmware updates** — trigger firmware updates remotely
- **Device simulator** — simulate ESP32 devices for demo without hardware

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | FastAPI (Python 3.11)             |
| Database   | SQLite + SQLAlchemy (async)       |
| Real-time  | WebSockets + MQTT (Mosquitto)     |
| Frontend   | React + Vite + Tailwind CSS       |
| Charts     | Recharts                          |
| Auth       | JWT + Google OAuth + GitHub OAuth |
| Deployment | Docker Compose + Nginx            |
| CI/CD      | GitHub Actions → AWS EC2          |

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 20+
- Git

### 1. Clone
```bash
git clone https://github.com/YOUR_USERNAME/medical-iot-fleet.git
cd medical-iot-fleet
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # edit as needed
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev                       # starts at http://localhost:5173
```

### 4. Run simulator (optional — simulates ESP32 devices)
```bash
cd simulator
pip install -r requirements.txt
# Edit sim_config.json (mqtt + floor + room_no + bed_no + device_id)
python device_sim.py
```

### 5. Access
- **Frontend:** http://localhost:5173
- **API docs:** http://localhost:8000/docs

---

## Docker Compose (All Services)

```bash
# Start everything
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f mosquitto

# Stop
docker-compose down
```

---

## AWS EC2 Deployment

### Step 1 — Launch EC2 Instance
- AMI: Ubuntu 22.04 LTS
- Type: t3.small (recommended)
- Storage: 30 GB SSD
- Security Group inbound rules:

| Port | Protocol | Source    | Purpose              |
|------|----------|-----------|----------------------|
| 22   | TCP      | Your IP   | SSH access           |
| 80   | TCP      | 0.0.0.0/0 | HTTP (→ HTTPS)       |
| 443  | TCP      | 0.0.0.0/0 | HTTPS                |
| 1883 | TCP      | 0.0.0.0/0 | MQTT (ESP32 devices) |

### Step 2 — Run setup script
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/medical-iot-fleet/main/scripts/setup_ec2.sh | bash
```

### Step 3 — Edit environment
```bash
nano /home/ubuntu/medical-iot-fleet/backend/.env
```

Key variables to set:
```env
SECRET_KEY=your-very-long-random-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
FRONTEND_URL=https://your-domain.com
```

### Step 4 — SSL Certificate (optional but recommended)
```bash
sudo certbot certonly --standalone -d your-domain.com
```
Then update `nginx/default.conf` with your domain name.

### Step 5 — Start services
```bash
cd /home/ubuntu/medical-iot-fleet
docker-compose up -d --build
docker-compose ps
```

### Step 6 — Set MQTT password
```bash
docker exec -it medical_iot_mqtt mosquitto_passwd -c /mosquitto/config/passwd admin
docker-compose restart mosquitto
```

---

## GitHub Actions CI/CD Setup

Add these secrets in your GitHub repo → Settings → Secrets:

| Secret Name     | Value                                    |
|-----------------|------------------------------------------|
| `EC2_HOST`      | Your EC2 public IP or domain             |
| `EC2_USERNAME`  | `ubuntu`                                 |
| `EC2_SSH_KEY`   | Contents of your `.pem` private key file |
| `VITE_API_URL`  | `https://your-domain.com`               |
| `VITE_WS_URL`   | `wss://your-domain.com`                  |

Every push to `main` will automatically deploy to EC2.

---

## Setting Up OAuth

### Google OAuth
1. Go to https://console.cloud.google.com
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add authorised redirect URI: `https://your-domain.com/auth/google/callback`
5. Copy Client ID and Secret to `.env`

### GitHub OAuth
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Set callback URL: `https://your-domain.com/auth/github/callback`
4. Copy Client ID and Secret to `.env`

---

## Connecting an ESP32 Device (Legacy HTTP Example)

1. Register device in dashboard → get `device_id` and `api_key`
2. In your Arduino sketch:

```cpp
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFi.h>

const char* ssid       = "YOUR_WIFI";
const char* password   = "YOUR_WIFI_PASSWORD";
const char* apiKey     = "mk_your_api_key_here";
const char* serverUrl  = "http://your-server/api/v1/data/DEV-XXXXXXXX";

void setup() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void loop() {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", apiKey);

  float temp = readTemperature();   // your sensor reading function
  String body = "{\"temperature\":" + String(temp) + "}";

  int code = http.POST(body);
  http.end();

  delay(3000);   // send every 3 seconds
}
```

---

## MQTT ESP32 Setup (Current)

This project now uses MQTT topic paths in this structure:

`hospital/{floor}/{room_no}/{bed_no}/{device_id}/data`

Example:

`hospital/floor1/room101/bed1/DEV-001/data`

### Single ESP32 (one bed)

1. Start Mosquitto broker.
2. Set MQTT values in `backend/.env`:
   - `MQTT_HOST`
   - `MQTT_PORT`
   - `MQTT_USERNAME`
   - `MQTT_PASSWORD`
3. Open `simulator/esp32_mqtt_device.ino` in Arduino IDE.
4. Update WiFi + MQTT + identity values in the sketch:
   - Use broker **LAN IP** for `MQTT_HOST` (example: `192.168.1.10`) on ESP32.
   - Do not use `localhost` inside ESP32 firmware.
5. Configure one ESP32 with one identity:
   - `floor=floor1`
   - `room_no=room101`
   - `bed_no=bed1`
   - `device_id=DEV-001`
6. Upload to ESP32, open Serial Monitor (`115200`), and verify:
   - WiFi connected
   - MQTT connected
   - publish logs printing every second
7. Publish payload every second with:
   - `device_id`, `heart_rate`, `spo2`, `temperature`, `status`, `timestamp`

### Multiple ESP32s (multiple beds)

Use one unique `device_id` and one unique bed topic per ESP32.

Examples:
- `hospital/floor1/room101/bed1/DEV-001/data`
- `hospital/floor1/room101/bed2/DEV-002/data`
- `hospital/floor1/room102/bed1/DEV-003/data`

Guidelines:
- `device_id` must be globally unique.
- One ESP32 should publish only to its own topic.
- Backend can use one wildcard subscription: `hospital/+/+/+/+/data`.

---

## First Admin + Invite-Only Onboarding

For hospital deployments, keep open signup disabled and bootstrap the first admin once.

1. In `backend/.env`, keep:
   - `PUBLIC_SIGNUP_DISABLED=true`
2. Create first admin (one-time):
   - `cd backend`
   - `python scripts/bootstrap_admin.py`
3. Admin logs in and creates staff invite links via:
   - `POST /api/invites`
4. Staff completes signup using invite link:
   - `/accept-invite?token=...`

Safety rules implemented:
- New users are `viewer` unless role is assigned in invite.
- Invite token is expiring, single-use, and revocable.
- System blocks deleting/deactivating the last active admin.

---

## Project Structure

```
medical-iot-fleet/
├── backend/            FastAPI application
│   └── app/
│       ├── api/        REST endpoints
│       ├── core/       Config, JWT, dependencies
│       ├── db/         Database engine
│       ├── models/     SQLAlchemy table models
│       ├── schemas/    Pydantic request/response schemas
│       ├── services/   Business logic
│       ├── mqtt/       MQTT client and handler
│       └── websockets/ WebSocket manager
├── frontend/           React application
│   └── src/
│       ├── api/        Axios API calls
│       ├── components/ Reusable UI components
│       ├── context/    Auth + WebSocket providers
│       ├── hooks/      Custom React hooks
│       └── pages/      Full page components
├── simulator/          ESP32 device simulator
├── nginx/              Reverse proxy config
├── mosquitto/          MQTT broker config
├── scripts/            EC2 setup + deploy + backup
└── .github/workflows/  GitHub Actions CI/CD
```

---

## Team

| Name               | Roll No           |
|--------------------|-------------------|
| Gangala Rohith Kumar | 1602-23-733-101 |
| Sohan Roy Talari   | 1602-23-733-119   |
| Navadeep           | 1602-23-735-083   |
| Sasi Kiran         | 1602-23-735-124   |

**Guide:** Dr. S. Vinay Kumar & Mr. V. Krishna Mohan
