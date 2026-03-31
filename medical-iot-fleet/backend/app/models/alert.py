from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(String, nullable=False)     # OFFLINE, LONG_RUNNING, ANOMALY, LOW_CONFIDENCE
    message = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    device = relationship("Device", back_populates="alerts")