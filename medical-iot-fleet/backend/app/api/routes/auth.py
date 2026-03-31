import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserRegister, TokenResponse, UserOut
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Helper ─────────────────────────────────────────────────────────────────
def _make_token_response(user: User) -> dict:
    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserOut.model_validate(user),
    }


# ── Local Register ─────────────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        assigned_floor=data.assigned_floor,
        auth_provider="local",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _make_token_response(user)


# ── Local Login ────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
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
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    redirect_uri = str(request.url_for("google_callback"))
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
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    redirect_uri = str(request.url_for("google_callback"))

    # Exchange code for tokens
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

    email     = user_info.get("email")
    name      = user_info.get("name", email)
    oauth_id  = user_info.get("sub")
    avatar    = user_info.get("picture")

    # Find or create user
    result = await db.execute(select(User).where(User.email == email))
    user   = result.scalar_one_or_none()

    if not user:
        user = User(
            name=name,
            email=email,
            auth_provider="google",
            oauth_id=oauth_id,
            avatar_url=avatar,
            role="viewer",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    # Redirect to frontend with token in query param
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/success?token={token}")


# ── GitHub OAuth ───────────────────────────────────────────────────────────
@router.get("/github")
async def github_login(request: Request):
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")
    redirect_uri = str(request.url_for("github_callback"))
    url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        "&scope=user:email"
        f"&redirect_uri={redirect_uri}"
    )
    return RedirectResponse(url)


@router.get("/github/callback")
async def github_callback(code: str, db: AsyncSession = Depends(get_db)):
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
        emails    = email_resp.json()
        primary   = next((e["email"] for e in emails if e.get("primary")), None)

    email    = primary or f"github_{user_info['id']}@noemail.com"
    name     = user_info.get("name") or user_info.get("login", "GitHub User")
    oauth_id = str(user_info.get("id"))
    avatar   = user_info.get("avatar_url")

    result = await db.execute(select(User).where(User.email == email))
    user   = result.scalar_one_or_none()

    if not user:
        user = User(
            name=name,
            email=email,
            auth_provider="github",
            oauth_id=oauth_id,
            avatar_url=avatar,
            role="viewer",
        )
        db.add(user)
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
