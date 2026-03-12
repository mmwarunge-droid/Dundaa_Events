from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    """
    Safe user payload returned to clients.
    """
    id: int
    email: EmailStr
    username: str
    profile_picture: str | None = None

    # Public organizer contact details used on event pages.
    contact_info: str | None = None

    gender: str | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    influencer_tier: str
    wallet_balance: float

    class Config:
        from_attributes = True


class ProfileUpdateRequest(BaseModel):
    """
    Editable profile fields for partial update.

    Notes:
    - profile_picture remains editable by URL if needed
    - file upload is handled by a separate multipart endpoint
    """
    username: str | None = None
    profile_picture: str | None = None

    # Organizer/influencer contact information.
    contact_info: str | None = None

    gender: str | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None