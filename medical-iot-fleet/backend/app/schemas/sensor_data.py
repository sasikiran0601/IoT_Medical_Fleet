from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime


class SensorDataIn(BaseModel):
    # Flexible dict — any sensor fields allowed
    readings: Dict[str, Any]


class SensorDataOut(BaseModel):
    id: int
    device_id: str
    readings: str
    confidence_score: Optional[float]
    is_anomaly: int
    timestamp: datetime

    class Config:
        from_attributes = True
