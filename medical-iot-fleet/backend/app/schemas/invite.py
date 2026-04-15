from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class InviteCreate(BaseModel):
    email: EmailStr
    role: str = Field(default="viewer")
    assigned_floor: Optional[str] = None
    expires_hours: Optional[int] = Field(default=None, ge=1, le=720)


class InviteOut(BaseModel):
    id: str
    email: str
    role: str
    assigned_floor: Optional[str]
    expires_at: datetime
    is_used: bool
    is_revoked: bool
    created_at: datetime

    class Config:
        from_attributes = True


class InviteValidateOut(BaseModel):
    email: str
    role: str
    assigned_floor: Optional[str]
    expires_at: datetime
