from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AlertOut(BaseModel):
    id: int
    device_id: str
    alert_type: str
    message: str
    is_resolved: bool
    resolved_at: Optional[datetime]
    timestamp: datetime

    class Config:
        from_attributes = True