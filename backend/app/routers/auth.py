from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.dependencies import get_db
from app.models.user import User
from app.schemas.auth import SignupRequest, LoginRequest, TokenResponse
from app.security import hash_password, verify_password, create_access_token


# Auth routes are grouped under a single router.
router = APIRouter(tags=["Auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    """
    Register a new user and immediately return an access token.

    Rules:
    - email must be unique
    - username must be unique
    - password is hashed before saving
    """
    existing = db.query(User).filter(
        (User.email == payload.email) | (User.username == payload.username)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email or username already exists"
        )

    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user using either:
    - email
    - username

    Also optionally updates stored location during login for
    event recommendation features.
    """
    # Search by either email or username.
    user = db.query(User).filter(
        or_(
            User.email == payload.identifier,
            User.username == payload.identifier,
        )
    ).first()

    # Reject if user is not found or password is invalid.
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Update location if provided by the frontend/browser.
    if payload.latitude is not None and payload.longitude is not None:
        user.latitude = payload.latitude
        user.longitude = payload.longitude
        user.location_name = payload.location_name
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)