from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from typing import List

from app.db.database import get_db
from app.models.floor import Floor
from app.models.user import User
from app.schemas.floor import FloorCreate, FloorOut, FloorWithRooms
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/api/floors", tags=["Floors"])


@router.post("/", response_model=FloorOut)
async def create_floor(
    data: FloorCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    floor = Floor(**data.model_dump())
    try:
        db.add(floor)
        await db.commit()
        await db.refresh(floor)
        return floor
    except SQLAlchemyError as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create floor") from exc


@router.get("/", response_model=List[FloorWithRooms])
async def list_floors(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Floor).order_by(Floor.name))
    return result.scalars().all()


@router.get("/{floor_id}", response_model=FloorWithRooms)
async def get_floor(
    floor_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Floor).where(Floor.id == floor_id))
    floor = result.scalar_one_or_none()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    return floor


@router.delete("/{floor_id}")
async def delete_floor(
    floor_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Floor).where(Floor.id == floor_id))
    floor = result.scalar_one_or_none()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    await db.delete(floor)
    await db.commit()
    return {"message": "Floor deleted"}
