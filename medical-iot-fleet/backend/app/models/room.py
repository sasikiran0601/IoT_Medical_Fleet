import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)           # e.g. "Room 101"
    floor_id = Column(String, ForeignKey("floors.id", ondelete="CASCADE"), nullable=False)

    floor = relationship("Floor", back_populates="rooms")
    devices = relationship("Device", back_populates="room", lazy="selectin", cascade="all, delete")