"""Seed the single manager account on startup if it doesn't exist."""
from sqlalchemy import select

from .config import settings
from .database import SessionLocal
from .models import User
from .security import hash_password


def seed_manager() -> None:
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == settings.manager_email))
        if existing is None:
            db.add(
                User(
                    full_name=settings.manager_name,
                    email=settings.manager_email,
                    password_hash=hash_password(settings.manager_password),
                    role="Manager",
                )
            )
            db.commit()
    finally:
        db.close()
