import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.invite_token import InviteToken
from app.models.user import User


def _hash_invite_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


async def create_invite_token(
    db: AsyncSession,
    *,
    email: str,
    role: str,
    assigned_floor: Optional[str],
    invited_by_user: User,
    expires_hours: Optional[int] = None,
) -> tuple[InviteToken, str]:
    expiry_hours = expires_hours or settings.INVITE_TOKEN_EXPIRE_HOURS

    # Revoke previous pending invites for same email to keep one active link.
    pending_result = await db.execute(
        select(InviteToken).where(
            InviteToken.email == email,
            InviteToken.is_used == False,  # noqa: E712
            InviteToken.is_revoked == False,  # noqa: E712
        )
    )
    for inv in pending_result.scalars().all():
        inv.is_revoked = True
        inv.revoked_at = datetime.utcnow()

    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_invite_token(raw_token)
    invite = InviteToken(
        email=email,
        role=role,
        assigned_floor=assigned_floor,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(hours=expiry_hours),
        invited_by=invited_by_user.id,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return invite, raw_token


async def get_valid_invite_token(db: AsyncSession, raw_token: str) -> Optional[InviteToken]:
    token_hash = _hash_invite_token(raw_token)
    result = await db.execute(select(InviteToken).where(InviteToken.token_hash == token_hash))
    invite = result.scalar_one_or_none()
    if not invite:
        return None
    if invite.is_used or invite.is_revoked:
        return None
    if invite.expires_at < datetime.utcnow():
        return None
    return invite


async def consume_invite_token(
    db: AsyncSession,
    *,
    raw_token: str,
    expected_email: str,
) -> Optional[InviteToken]:
    invite = await get_valid_invite_token(db, raw_token)
    if not invite:
        return None
    if invite.email.strip().lower() != expected_email.strip().lower():
        return None

    invite.is_used = True
    invite.used_at = datetime.utcnow()
    await db.commit()
    await db.refresh(invite)
    return invite


async def revoke_invite_token(db: AsyncSession, invite_id: str) -> Optional[InviteToken]:
    result = await db.execute(select(InviteToken).where(InviteToken.id == invite_id))
    invite = result.scalar_one_or_none()
    if not invite:
        return None

    invite.is_revoked = True
    invite.revoked_at = datetime.utcnow()
    await db.commit()
    await db.refresh(invite)
    return invite
