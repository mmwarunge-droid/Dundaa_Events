# ---------------------------
# Imports
# ---------------------------
import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.user import (
    UserResponse,
    ProfileUpdateRequest,
    NotificationConsentUpdate,
)

# ---------------------------
# Router Initialization (FIXED ORDER)
# ---------------------------
router = APIRouter(tags=["Profile"])


# ---------------------------
# Constants & Config
# ---------------------------
PROFILE_UPLOAD_DIR = Path("uploads/profiles")
PROFILE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_PROFILE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Only allow safe fields to be updated
ALLOWED_PROFILE_FIELDS = {"username", "gender", "bio"}


# ---------------------------
# Response Schemas
# ---------------------------
class SessionUserResponse(BaseModel):
    """
    Lightweight session response for frontend auth state.
    """
    id: int
    username: str
    email: str
    role: str
    promotional_consent: bool | None = None
    notification_consent: bool | None = None
    influencer_tier: str | None = None
    wallet_balance: float | None = None

    class Config:
        from_attributes = True  # Allows ORM objects to be returned directly


# ---------------------------
# Helper Functions
# ---------------------------
def validate_file_extension(filename: str):
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_PROFILE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile photo must be .jpg, .jpeg, .png, or .webp",
        )
    return ext


def validate_file_size(contents: bytes):
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large (max 5MB)",
        )


def save_profile_photo(file: UploadFile) -> str:
    """
    Save uploaded file securely and return public path.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename")

    extension = validate_file_extension(file.filename)

    contents = file.file.read()
    validate_file_size(contents)

    filename = f"{uuid4().hex}{extension}"
    filepath = PROFILE_UPLOAD_DIR / filename

    with filepath.open("wb") as buffer:
        buffer.write(contents)

    file.file.close()

    return f"/uploads/profiles/{filename}"


def update_user_fields(user: User, update_data: dict, db: Session):
    """
    Safely update only allowed user fields.
    """
    # Username uniqueness check
    if "username" in update_data and update_data["username"] != user.username:
        existing = db.query(User).filter(User.username == update_data["username"]).first()
        if existing and existing.id != user.id:
            raise HTTPException(status_code=400, detail="Username already exists")

    for field, value in update_data.items():
        if field in ALLOWED_PROFILE_FIELDS:
            setattr(user, field, value)


# ---------------------------
# Routes
# ---------------------------

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """
    Retrieve the authenticated user's profile.
    """
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update user profile fields.

    Security:
    - Only allows whitelisted fields
    - Prevents duplicate usernames
    """
    update_data = payload.model_dump(exclude_unset=True)

    update_user_fields(current_user, update_data, db)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/profile/photo", response_model=UserResponse)
def upload_profile_photo(
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload and save a user profile picture.

    Features:
    - Validates file type
    - Enforces file size limit
    - Generates unique filename
    """
    photo_url = save_profile_photo(photo)

    current_user.profile_picture = photo_url

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user


@router.put("/profile/notification-consent", response_model=UserResponse)
def update_notification_consent(
    payload: NotificationConsentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update user's notification consent preference.
    """
    current_user.notification_consent = payload.notification_consent

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/profile/deactivate")
def deactivate_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Soft deactivate account.

    - Keeps user data
    - Prevents login/access
    """
    current_user.account_status = "deactivated"
    current_user.deactivated_at = datetime.now(timezone.utc)

    db.add(current_user)
    db.commit()

    return {"message": "Account deactivated successfully."}


@router.delete("/profile/account")
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Soft delete account (recommended over hard delete).

    - Preserves audit trail
    - Prevents data loss
    """
    current_user.is_deleted = True
    current_user.account_status = "deleted"
    current_user.deleted_at = datetime.now(timezone.utc)

    db.add(current_user)
    db.commit()

    return {"message": "Account deleted successfully."}


# ---------------------------
# ⚠️ OPTIONAL (Move to auth.py ideally)
# ---------------------------
@router.get("/auth/session", response_model=SessionUserResponse)
def get_auth_session(current_user: User = Depends(get_current_user)):
    """
    Return minimal session data for frontend use.
    """
    return current_user