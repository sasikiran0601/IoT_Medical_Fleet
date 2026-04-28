from pydantic import model_validator
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./medical_iot.db"
    SECRET_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None

    # GitHub OAuth
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    GITHUB_REDIRECT_URI: Optional[str] = None

    FRONTEND_URL: str = "http://localhost:5173"
    API_BASE_URL: Optional[str] = None
    PUBLIC_SIGNUP_DISABLED: bool = True
    INVITE_TOKEN_EXPIRE_HOURS: int = 72
    INVITE_ACCEPT_URL: Optional[str] = None

    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_AUTH_REQUESTS: int = 10
    RATE_LIMIT_AUTH_WINDOW_SECONDS: int = 60
    RATE_LIMIT_REGISTER_REQUESTS: int = 5
    RATE_LIMIT_REGISTER_WINDOW_SECONDS: int = 300
    RATE_LIMIT_ADMIN_REQUESTS: int = 60
    RATE_LIMIT_ADMIN_WINDOW_SECONDS: int = 60
    RATE_LIMIT_SENSOR_HISTORY_REQUESTS: int = 120
    RATE_LIMIT_SENSOR_HISTORY_WINDOW_SECONDS: int = 60
    RATE_LIMIT_EXPORT_REQUESTS: int = 20
    RATE_LIMIT_EXPORT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_DEVICE_HTTP_INGEST_REQUESTS: int = 300
    RATE_LIMIT_DEVICE_HTTP_INGEST_WINDOW_SECONDS: int = 60
    RATE_LIMIT_MQTT_REQUESTS: int = 120
    RATE_LIMIT_MQTT_ECG_REQUESTS: int = 360
    RATE_LIMIT_MQTT_WINDOW_SECONDS: int = 60

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # MQTT
    MQTT_HOST: str = "localhost"
    MQTT_PORT: int = 1883
    MQTT_USERNAME: str = "admin"
    MQTT_PASSWORD: str = "admin123"
    MQTT_MIN_INGEST_INTERVAL_MS: int = 1000
    MQTT_ECG_MIN_INGEST_INTERVAL_MS: int = 250
    MQTT_PROCESS_MAX_CONCURRENCY: int = 2
    MQTT_ANOMALY_ALERT_COOLDOWN_SECONDS: int = 30
    DEVICE_OFFLINE_SECONDS: int = 45
    DEVICE_PRESENCE_SWEEP_SECONDS: int = 5
    DEVICE_STALE_SWEEPS_REQUIRED: int = 3
    DEVICE_STATUS_TIMEOUT_SECONDS: int = 25
    DEVICE_DATA_STALE_SECONDS: int = 20
    MQTT_REJECT_TOPIC_IDENTITY_MISMATCH: bool = False

    # DB Pool (critical when using hosted Postgres poolers)
    DB_POOL_SIZE: int = 3
    DB_MAX_OVERFLOW: int = 2
    DB_POOL_TIMEOUT_SECONDS: int = 30
    DB_POOL_RECYCLE_SECONDS: int = 1800

    @model_validator(mode="after")
    def validate_security_settings(self):
        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY must be set in the backend environment or .env file")
        if self.SECRET_KEY == "dev-secret-key-change-in-production":
            raise ValueError("SECRET_KEY must not use the default development placeholder")
        return self

    class Config:
        env_file = ".env"


settings = Settings()
