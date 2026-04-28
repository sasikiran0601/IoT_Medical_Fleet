import httpx
from datetime import datetime
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserRegister, TokenResponse, UserOut
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.core.rate_limit import enforce_request_rate_limit
from app.services.invite_service import get_valid_invite_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Helper ─────────────────────────────────────────────────────────────────
def _make_token_response(user: User) -> dict:
    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserOut.model_validate(user),
    }


def _oauth_error_redirect(message: str) -> RedirectResponse:
    query = urlencode({"error": message})
    return RedirectResponse(f"{settings.FRONTEND_URL}/login?{query}")


def _resolve_oauth_redirect_uri(request: Request, provider: str) -> str:
    if provider == "google" and settings.GOOGLE_REDIRECT_URI:
        return settings.GOOGLE_REDIRECT_URI.strip()
    if provider == "github" and settings.GITHUB_REDIRECT_URI:
        return settings.GITHUB_REDIRECT_URI.strip()

    callback_name = "google_callback" if provider == "google" else "github_callback"
    redirect_uri = str(request.url_for(callback_name))

    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower()
    if forwarded_proto == "https" and redirect_uri.startswith("http://"):
        redirect_uri = "https://" + redirect_uri[len("http://"):]

    return redirect_uri


# ── Local Register ─────────────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse)
async def register(
    request: Request,
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    enforce_request_rate_limit(
        request,
        "auth_register",
        settings.RATE_LIMIT_REGISTER_REQUESTS,
        settings.RATE_LIMIT_REGISTER_WINDOW_SECONDS,
        scope_key=data.email.strip().lower(),
    )

    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    role = "viewer"
    assigned_floor = data.assigned_floor
    email_verified = True
    invite = None

    if settings.PUBLIC_SIGNUP_DISABLED:
        if not data.invite_token:
            raise HTTPException(status_code=403, detail="Registration is by invitation only")

        invite = await get_valid_invite_token(db, data.invite_token)
        if not invite or invite.email.strip().lower() != data.email.strip().lower():
            raise HTTPException(status_code=403, detail="Invalid or expired invitation")

        valid_roles = {r.value for r in UserRole}
        role = invite.role if invite.role in valid_roles else "viewer"
        assigned_floor = invite.assigned_floor
        email_verified = True

    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=role,
        assigned_floor=assigned_floor,
        auth_provider="local",
        email_verified=email_verified,
    )
    db.add(user)

    if invite:
        invite.is_used = True
        invite.used_at = datetime.utcnow()

    await db.commit()
    await db.refresh(user)
    return _make_token_response(user)


# ── Local Login ────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    enforce_request_rate_limit(
        request,
        "auth_login",
        settings.RATE_LIMIT_AUTH_REQUESTS,
        settings.RATE_LIMIT_AUTH_WINDOW_SECONDS,
        scope_key=form.username.strip().lower(),
    )

    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    return _make_token_response(user)


# ── Google OAuth ───────────────────────────────────────────────────────────
@router.get("/google")
async def google_login(request: Request):
    enforce_request_rate_limit(
        request,
        "auth_google",
        settings.RATE_LIMIT_AUTH_REQUESTS,
        settings.RATE_LIMIT_AUTH_WINDOW_SECONDS,
    )
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    redirect_uri = _resolve_oauth_redirect_uri(request, "google")
    params = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        "&response_type=code"
        "&scope=openid email profile"
    )
    return RedirectResponse(params)


@router.get("/google/callback")
async def google_callback(
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    enforce_request_rate_limit(
        request,
        "auth_google_callback",
        settings.RATE_LIMIT_AUTH_REQUESTS,
        settings.RATE_LIMIT_AUTH_WINDOW_SECONDS,
    )
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    redirect_uri = _resolve_oauth_redirect_uri(request, "google")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_resp.json()

        user_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        user_info = user_resp.json()

    email    = user_info.get("email")
    name     = user_info.get("name", email)
    oauth_id = user_info.get("sub")
    avatar   = user_info.get("picture")

    result = await db.execute(select(User).where(User.email == email))
    user   = result.scalar_one_or_none()

    if not user:
        if settings.PUBLIC_SIGNUP_DISABLED:
            return _oauth_error_redirect("Invite required. Contact your admin.")
        user = User(
            name=name,
            email=email,
            auth_provider="google",
            oauth_id=oauth_id,
            avatar_url=avatar,
            email_verified=True,
            role="viewer",      # all new OAuth accounts start as viewer
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif not user.is_active:
        return _oauth_error_redirect("Account unavailable. Contact your admin.")
    else:
        # Update avatar on every login in case it changed
        if avatar and user.avatar_url != avatar:
            user.avatar_url = avatar
            await db.commit()
            await db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/success?token={token}")


# ── GitHub OAuth ───────────────────────────────────────────────────────────
@router.get("/github")
async def github_login(request: Request):
    enforce_request_rate_limit(
        request,
        "auth_github",
        settings.RATE_LIMIT_AUTH_REQUESTS,
        settings.RATE_LIMIT_AUTH_WINDOW_SECONDS,
    )
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")
    redirect_uri = _resolve_oauth_redirect_uri(request, "github")
    url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        "&scope=user:email"
        f"&redirect_uri={redirect_uri}"
    )
    return RedirectResponse(url)


@router.get("/github/callback")
async def github_callback(request: Request, code: str, db: AsyncSession = Depends(get_db)):
    enforce_request_rate_limit(
        request,
        "auth_github_callback",
        settings.RATE_LIMIT_AUTH_REQUESTS,
        settings.RATE_LIMIT_AUTH_WINDOW_SECONDS,
    )
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")

        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_info = user_resp.json()

        email_resp = await client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        emails  = email_resp.json()
        primary = next((e["email"] for e in emails if e.get("primary")), None)

    email    = primary or f"github_{user_info['id']}@noemail.com"
    name     = user_info.get("name") or user_info.get("login", "GitHub User")
    oauth_id = str(user_info.get("id"))
    avatar   = user_info.get("avatar_url")

    result = await db.execute(select(User).where(User.email == email))
    user   = result.scalar_one_or_none()

    if not user:
        if settings.PUBLIC_SIGNUP_DISABLED:
            return _oauth_error_redirect("Invite required. Contact your admin.")
        user = User(
            name=name,
            email=email,
            auth_provider="github",
            oauth_id=oauth_id,
            avatar_url=avatar,
            email_verified=True,
            role="viewer",      # all new OAuth accounts start as viewer
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif not user.is_active:
        return _oauth_error_redirect("Account unavailable. Contact your admin.")
    else:
        # Update avatar on every login
        if avatar and user.avatar_url != avatar:
            user.avatar_url = avatar
            await db.commit()
            await db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/success?token={token}")


# ── Me ─────────────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserOut)
async def get_me(request: Request, db: AsyncSession = Depends(get_db)):
    from app.core.dependencies import get_current_user
    user = await get_current_user(
        token=request.headers.get("Authorization", "").replace("Bearer ", ""),
        db=db,
    )
    return user
