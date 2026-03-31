import uuid
from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship
from app.db.database import Base


class Floor(Base):
    __tablename__ = "floors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)           # e.g. "Floor 1", "ICU"
    description = Column(Text, nullable=True)

    rooms = relationship("Room", back_populates="floor", lazy="selectin", cascade="all, delete")