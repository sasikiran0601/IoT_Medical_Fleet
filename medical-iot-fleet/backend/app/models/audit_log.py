from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)         # TURN_ON, TURN_OFF, REGISTERED, OTA_UPDATE
    purpose = Column(Text, nullable=True)           # Why device was turned on
    duration_minutes = Column(Float, nullable=True) # Filled on TURN_OFF
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    device = relationship("Device", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")