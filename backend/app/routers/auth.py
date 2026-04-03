from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.dependencies import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import (
    AuthStatusResponse,
    LoginRequest,
    ReactivateRequest,
    SessionUserResponse,
    SignupRequest,
    TokenResponse,
)
from backend.app.security import create_access_token, hash_password, verify_password

router = APIRouter(tags=["Auth"])

ADMIN_ROLES = {"admin", "super_admin", "admin_kyc", "admin_analytics", "admin_operations"}


def calculate_age_years(date_of_birth: date) -> int:
    today = date.today()
    years = today.year - date_of_birth.year
    before_birthday = (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
    return years - 1 if before_birthday else years


def to_session_user(user: User) -> SessionUserResponse:
    return SessionUserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role,
        notification_consent=user.notification_consent,
        promotional_updates_consent=user.promotional_updates_consent,
        influencer_tier=user.influencer_tier,
        wallet_balance=user.wallet_balance,
    )


def issue_token_response(user: User) -> TokenResponse:
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=to_session_user(user))


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
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
                detail="Your account was previously deactivated. Would you like to reactivate it?",
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
        promotional_updates_consent=None,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return issue_token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
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

    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)

    return issue_token_response(user)


@router.post("/admin/login", response_model=TokenResponse)
def admin_login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        or_(
            User.email == payload.identifier,
            User.username == payload.identifier,
        )
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin access required")

    if user.account_status != "active":
        raise HTTPException(status_code=403, detail="Admin account is not active")

    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)

    return issue_token_response(user)


@router.post("/auth/reactivate", response_model=TokenResponse)
def reactivate_account(payload: ReactivateRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        or_(
            User.email == payload.identifier,
            User.username == payload.identifier,
        )
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.is_deleted or user.account_status == "deleted":
        raise HTTPException(status_code=403, detail="This account is no longer available.")

    if user.account_status != "deactivated":
        raise HTTPException(status_code=400, detail="This account does not require reactivation.")

    user.account_status = "active"
    user.deactivated_at = None
    user.last_login_at = datetime.now(timezone.utc)

    db.add(user)
    db.commit()
    db.refresh(user)

    return issue_token_response(user)


@router.post("/auth/check-status", response_model=AuthStatusResponse)
def check_auth_status(payload: ReactivateRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        or_(
            User.email == payload.identifier,
            User.username == payload.identifier,
        )
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

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