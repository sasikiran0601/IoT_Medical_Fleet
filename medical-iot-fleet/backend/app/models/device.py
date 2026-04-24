import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


def generate_device_id():
    return f"DEV-{uuid.uuid4().hex[:8].upper()}"


def generate_api_key():
    return f"mk_{uuid.uuid4().hex}"


class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String, unique=True, default=generate_device_id, index=True)
    name = Column(String, nullable=False)
    device_type = Column(String, nullable=False)    # ECG, Ventilator, Pulse Oximeter, etc.
    room_id = Column(String, ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    is_online = Column(Boolean, default=False)
    is_on = Column(Boolean, default=False)
    presence_source = Column(String, default="unknown")
    connection_state = Column(String, default="unknown")
    data_state = Column(String, default="unknown")
    api_key = Column(String, unique=True, default=generate_api_key, index=True)
    webhook_url = Column(Text, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    last_status_at = Column(DateTime, nullable=True)
    last_data_at = Column(DateTime, nullable=True)
    firmware_version = Column(String, default="1.0.0")
    created_at = Column(DateTime, default=datetime.utcnow)

    room = relationship("Room", back_populates="devices")
    sensor_data = relationship("SensorData", back_populates="device", lazy="dynamic", cascade="all, delete")
    audit_logs = relationship("AuditLog", back_populates="device", lazy="dynamic", cascade="all, delete")
    alerts = relationship("Alert", back_populates="device", lazy="dynamic", cascade="all, delete")
