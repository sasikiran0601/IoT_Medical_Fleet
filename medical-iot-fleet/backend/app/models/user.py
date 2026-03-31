import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base
import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    doctor = "doctor"
    nurse = "nurse"
    viewer = "viewer"


class AuthProvider(str, enum.Enum):
    local = "local"
    google = "google"
    github = "github"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=True)          # null for OAuth users
    role = Column(String, default=UserRole.nurse)
    assigned_floor = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    auth_provider = Column(String, default=AuthProvider.local)
    oauth_id = Column(String, nullable=True)                 # Google/GitHub user ID
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    audit_logs = relationship("AuditLog", back_populates="user", lazy="selectin")