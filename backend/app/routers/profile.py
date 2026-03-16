import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.user import UserResponse, ProfileUpdateRequest, NotificationConsentUpdate
from app.schemas.user import ProfileUpdateRequest, UserResponse

router = APIRouter(tags=["Profile"])

# Local upload folder for profile pictures.
PROFILE_UPLOAD_DIR = Path("uploads/profiles")
PROFILE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed image extensions for profile pictures.
ALLOWED_PROFILE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """
    Return the authenticated user's profile.
    """
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update editable profile fields for the authenticated user.

    Added safeguards:
    - if username is being changed, ensure uniqueness
    """
    update_data = payload.model_dump(exclude_unset=True)

    new_username = update_data.get("username")
    if new_username and new_username != current_user.username:
        existing = db.query(User).filter(User.username == new_username).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="Username already exists")

    for field, value in update_data.items():
        setattr(current_user, field, value)

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
    Upload a cropped profile picture for the authenticated user.

    Expected input:
    - multipart/form-data
    - field name: "photo"

    The frontend is responsible for image cropping/zoom before upload.
    """
    if not photo.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename")

    extension = Path(photo.filename).suffix.lower()

    if extension not in ALLOWED_PROFILE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Profile photo must be .jpg, .jpeg, .png, or .webp",
        )

    generated_name = f"{uuid4().hex}{extension}"
    destination = PROFILE_UPLOAD_DIR / generated_name

    with destination.open("wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    current_user.profile_picture = f"/uploads/profiles/{generated_name}"

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
    Persist the user's YES/NO notification choice.

    This route is intended to be called immediately after the welcome banner
    disappears during the post-auth flow.
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
    Temporarily deactivate the authenticated user's account.

    Behavior:
    - user data remains stored
    - account is marked deactivated
    - future protected requests are blocked
    """
    current_user.account_status = "deactivated"
    current_user.deactivated_at = datetime.now(timezone.utc)

    db.add(current_user)
    db.commit()

    return {
        "message": "Account deactivated successfully."
    }


@router.delete("/profile/account")
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Permanently delete the authenticated user's account.

    In the current implementation, this is a hard delete.
    Because relationships already use cascade delete, related records such as:
    - events
    - comments
    - transactions
    - stars
    will also be removed.

    Future production hardening:
    - require password confirmation
    - anonymize retained audit records if needed
    """
    db.delete(current_user)
    db.commit()

    return {
        "message": "Account deleted permanently."
    }