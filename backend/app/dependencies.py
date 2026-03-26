from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.user import User
from app.security import decode_token

# Strict bearer extractor for protected routes.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# Optional bearer extractor for public routes that can still benefit
# from an authenticated user context when a token exists.
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/login", auto_error=False)


def get_db() -> Generator:
    """
    Yield a DB session for each request and close it afterward.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _resolve_user_from_token(token: str | None, db: Session) -> User | None:
    """
    Shared token -> user resolver.

    Returns None if token is missing.
    Raises auth errors if token is invalid or the account is not usable.
    """
    if not token:
        return None

    payload = decode_token(token)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.is_deleted or user.account_status == "deleted":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is no longer available.",
        )

    if user.account_status == "deactivated":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Please reactivate it to continue.",
        )

    if user.account_status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is suspended.",
        )

    return user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Resolve the current authenticated user from the JWT token.
    """
    user = _resolve_user_from_token(token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user


def get_optional_current_user(
    token: str | None = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Public routes can use this to optionally personalize results when a valid
    token exists, while still allowing guest access.
    """
    return _resolve_user_from_token(token, db)


def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Restrict access to admin users only.
    """
    if current_user.role not in {"admin", "super_admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user