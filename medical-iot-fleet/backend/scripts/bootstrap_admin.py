import argparse
import asyncio
import os
import sys
from getpass import getpass


CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import select

from app.core.security import hash_password
from app.db.init_db import init_db
from app.db.database import AsyncSessionLocal
from app.models.user import User


async def bootstrap_admin(name: str, email: str, password: str) -> int:
    await init_db()
    async with AsyncSessionLocal() as db:
        existing_admin = await db.execute(select(User).where(User.role == "admin"))
        if existing_admin.scalars().first():
            print("Bootstrap blocked: an admin already exists.")
            return 1

        existing_email = await db.execute(select(User).where(User.email == email))
        if existing_email.scalars().first():
            print("Bootstrap blocked: email already exists.")
            return 1

        admin = User(
            name=name,
            email=email,
            hashed_password=hash_password(password),
            role="admin",
            is_active=True,
            email_verified=True,
            auth_provider="local",
        )
        db.add(admin)
        await db.commit()
        print(f"Bootstrap complete: admin user '{email}' created.")
        return 0


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create first admin user (one-time).")
    parser.add_argument("--name", help="Admin full name")
    parser.add_argument("--email", help="Admin email")
    parser.add_argument("--password", help="Admin password")
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    name = args.name or input("Admin name: ").strip()
    email = args.email or input("Admin email: ").strip().lower()
    password = args.password or getpass("Admin password: ")

    if not name or not email or not password:
        print("Name, email, and password are required.")
        raise SystemExit(1)

    raise SystemExit(asyncio.run(bootstrap_admin(name, email, password)))
