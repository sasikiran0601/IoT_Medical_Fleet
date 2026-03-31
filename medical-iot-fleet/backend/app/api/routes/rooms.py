from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.db.database import get_db
from app.models.room import Room
from app.models.user import User
from app.schemas.room import RoomCreate, RoomOut
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])


@router.post("/", response_model=RoomOut)
async def create_room(
    data: RoomCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    room = Room(**data.model_dump())
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room


@router.get("/", response_model=List[RoomOut])
async def list_rooms(
    floor_id: str = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Room)
    if floor_id:
        query = query.where(Room.floor_id == floor_id)
    result = await db.execute(query.order_by(Room.name))
    return result.scalars().all()


@router.delete("/{room_id}")
async def delete_room(
    room_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    await db.delete(room)
    await db.commit()
    return {"message": "Room deleted"}