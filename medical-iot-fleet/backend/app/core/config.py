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

    # GitHub OAuth
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None

    FRONTEND_URL: str = "http://localhost:5173"

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
