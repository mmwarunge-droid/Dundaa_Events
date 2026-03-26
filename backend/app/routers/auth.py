from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.dependencies import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import (
    AuthStatusResponse,
    LoginRequest,
    ReactivateRequest,
    SignupRequest,
    TokenResponse,
)
from backend.app.security import create_access_token, hash_password, verify_password

router = APIRouter(tags=["Auth"])


def calculate_age_years(date_of_birth: date) -> int:
    """
    Calculate age in completed years.
    """
    today = date.today()
    years = today.year - date_of_birth.year
    before_birthday = (today.month, today.day) < (date_of_birth.month, date_of_birth.day)

    return years - 1 if before_birthday else years


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    """
    Register a new user and return an access token.
    """
    age = calculate_age_years(payload.date_of_birth)
    if age < 18:
        raise HTTPException(
            status_code=400,
            detail="Sorry, Dundaa is only available to people over the age of 18.",
        )

    existing_email = db.query(User).filter(User.email == payload.email).first()
    if existing_email:
        if existing_email.account_status == "deactivated":
            raise HTTPException(
                status_code=409,
                detail=(
                    "Your account was previously deactivated. "
                    "Would you like to reactivate it?"
                ),
            )
        raise HTTPException(status_code=400, detail="Email already exists")

    existing_username = db.query(User).filter(User.username == payload.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        role="user",
        account_status="active",
        notification_consent=None,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate using email or username.
    """
    user = db.query(User).filter(
        or_(
            User.email == payload.identifier,
            User.username == payload.identifier,
        )
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if user.is_deleted or user.account_status == "deleted":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is no longer available.",
        )

    if user.account_status == "deactivated":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account was previously deactivated. Would you like to reactivate it?",
        )

    if user.account_status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is suspended.",
        )

    if payload.latitude is not None and payload.longitude is not None:
        user.latitude = payload.latitude
        user.longitude = payload.longitude
        user.location_name = payload.location_name
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post("/auth/reactivate", response_model=TokenResponse)
def reactivate_account(payload: ReactivateRequest, db: Session = Depends(get_db)):
    """
    Reactivate a previously deactivated account and return a fresh token.
    """
    user = db.query(User).filter(
        or_(
            User.email == payload.identifier,
            User.username == payload.identifier,
        )
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if user.is_deleted or user.account_status == "deleted":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is no longer available.",
        )

    if user.account_status != "deactivated":
        raise HTTPException(
            status_code=400,
            detail="This account does not require reactivation.",
        )

    user.account_status = "active"
    user.deactivated_at = None

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post("/auth/check-status", response_model=AuthStatusResponse)
def check_auth_status(payload: ReactivateRequest, db: Session = Depends(get_db)):
    """
    Optional helper endpoint for frontend auth flows.
    """
    user = db.query(User).filter(
        or_(
            User.email == payload.identifier,
            User.username == payload.identifier,
        )
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if user.account_status == "deactivated":
        return AuthStatusResponse(
            message="Your account was previously deactivated. Would you like to reactivate it?",
            account_status="deactivated",
            can_reactivate=True,
            name=user.username,
        )

    return AuthStatusResponse(
        message="Account is active",
        account_status=user.account_status,
        can_reactivate=False,
        name=user.username,
    )


@router.post("/auth/dev/promote-admin")
def promote_user_to_admin(identifier: str, db: Session = Depends(get_db)):
    """
    DEVELOPMENT HELPER ONLY.

    Promote an existing user to admin using email or username.
    Remove this endpoint in production, or protect it properly.
    """
    user = db.query(User).filter(
        or_(
            User.email == identifier,
            User.username == identifier,
        )
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = "admin"
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "User promoted to admin successfully",
        "user_id": user.id,
        "email": user.email,
        "username": user.username,
        "role": user.role,
    }