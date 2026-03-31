from pydantic import BaseModel
from typing import Optional


class RoomCreate(BaseModel):
    name: str
    floor_id: str


class RoomOut(BaseModel):
    id: str
    name: str
    floor_id: str

    class Config:
        from_attributes = True