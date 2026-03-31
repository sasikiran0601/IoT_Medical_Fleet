from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "nurse"
    assigned_floor: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    assigned_floor: Optional[str]
    is_active: bool
    auth_provider: str
    avatar_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    assigned_floor: Optional[str] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut