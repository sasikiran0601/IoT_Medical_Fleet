from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import require_admin
from app.db.database import get_db
from app.models.invite_token import InviteToken
from app.models.user import User, UserRole
from app.schemas.invite import InviteCreate, InviteOut, InviteValidateOut
from app.services.email_service import send_invite_email
from app.services.invite_service import create_invite_token, get_valid_invite_token, revoke_invite_token

router = APIRouter(prefix="/api/invites", tags=["Invites"])


@router.post("/", response_model=InviteOut)
async def create_invite(
    data: InviteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    valid_roles = {r.value for r in UserRole}
    role = data.role if data.role in valid_roles else "viewer"

    invite, raw_token = await create_invite_token(
        db,
        email=data.email,
        role=role,
        assigned_floor=data.assigned_floor,
        invited_by_user=current_user,
        expires_hours=data.expires_hours,
    )

    base = settings.INVITE_ACCEPT_URL or f"{settings.FRONTEND_URL}/accept-invite"
    invite_url = f"{base}?{urlencode({'token': raw_token})}"

    sent = await send_invite_email(
        to_email=data.email,
        inviter_name=current_user.name,
        role=role,
        invite_url=invite_url,
        expires_at=invite.expires_at,
    )
    if not sent:
        await revoke_invite_token(db, invite.id)
        raise HTTPException(
            status_code=502,
            detail="Invite created but email delivery failed. Check SMTP settings and retry.",
        )
    return invite


@router.get("/", response_model=list[InviteOut])
async def list_invites(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(InviteToken).order_by(InviteToken.created_at.desc()).limit(200))
    return result.scalars().all()


@router.get("/validate", response_model=InviteValidateOut)
async def validate_invite(
    token: str = Query(..., min_length=10),
    db: AsyncSession = Depends(get_db),
):
    invite = await get_valid_invite_token(db, token)
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation")
    return InviteValidateOut(
        email=invite.email,
        role=invite.role,
        assigned_floor=invite.assigned_floor,
        expires_at=invite.expires_at,
    )


@router.delete("/{invite_id}", response_model=InviteOut)
async def revoke_invite(
    invite_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    invite = await revoke_invite_token(db, invite_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    return invite
