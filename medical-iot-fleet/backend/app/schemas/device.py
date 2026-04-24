from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DeviceCreate(BaseModel):
    name: str
    device_type: str
    room_id: Optional[str] = None


class DeviceOut(BaseModel):
    id: str
    device_id: str
    name: str
    device_type: str
    room_id: Optional[str]
    is_online: bool
    is_on: bool
    presence_source: str
    connection_state: str
    data_state: str
    webhook_url: Optional[str]
    last_seen: Optional[datetime]
    last_status_at: Optional[datetime]
    last_data_at: Optional[datetime]
    firmware_version: str
    created_at: datetime

    class Config:
        from_attributes = True


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    room_id: Optional[str] = None
    webhook_url: Optional[str] = None


class DeviceControl(BaseModel):
    action: str           # "turn_on" or "turn_off"
    purpose: Optional[str] = None


class WebhookUpdate(BaseModel):
    webhook_url: str
