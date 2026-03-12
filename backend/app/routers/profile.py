import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, ProfileUpdateRequest

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
    Update editable text-based profile fields for the authenticated user.

    This includes:
    - username
    - profile_picture URL (optional legacy/manual usage)
    - contact_info
    - gender
    - location fields
    """
    for field, value in payload.model_dump(exclude_unset=True).items():
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
            detail="Profile photo must be .jpg, .jpeg, .png, or .webp"
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