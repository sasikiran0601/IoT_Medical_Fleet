from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AuditLogOut(BaseModel):
    id: int
    device_id: str
    user_id: Optional[str]
    action: str
    purpose: Optional[str]
    duration_minutes: Optional[float]
    timestamp: datetime
    user_name: Optional[str] = None
    device_name: Optional[str] = None

    class Config:
        from_attributes = True