from pydantic import BaseModel
from typing import Optional, List


class FloorCreate(BaseModel):
    name: str
    description: Optional[str] = None


class FloorOut(BaseModel):
    id: str
    name: str
    description: Optional[str]

    class Config:
        from_attributes = True


class FloorWithRooms(FloorOut):
    rooms: List["RoomOut"] = []


from app.schemas.room import RoomOut  # noqa
FloorWithRooms.model_rebuild()