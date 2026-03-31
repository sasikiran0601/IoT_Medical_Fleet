from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    readings = Column(Text, nullable=False)             # JSON string of sensor values
    confidence_score = Column(Float, nullable=True)     # 0-100 accuracy confidence
    is_anomaly = Column(Integer, default=0)             # 0=normal, 1=anomaly
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    device = relationship("Device", back_populates="sensor_data")