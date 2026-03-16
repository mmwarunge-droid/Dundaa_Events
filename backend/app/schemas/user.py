from datetime import date, datetime

from pydantic import BaseModel, Field


class ProfileUpdateRequest(BaseModel):
    """
    Editable fields for an authenticated profile update.

    Notes:
    - username remains editable here for now
    - gender is optional
    - profile_picture remains allowed for legacy/manual URL-based usage
    """
    username: str | None = Field(default=None, min_length=2, max_length=50)
    profile_picture: str | None = None
    contact_info: str | None = Field(default=None, max_length=280)
    gender: str | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    notification_consent: bool | None = None


class NotificationConsentUpdate(BaseModel):
    """
    Stores the user's notification consent decision.
    """
    notification_consent: bool


class AccountStatusUpdateRequest(BaseModel):
    """
    Used for account state changes initiated by the authenticated user.
    """
    action: str
    # allowed:
    # - deactivate
    # - reactivate
    # - delete


class UserResponse(BaseModel):
    """
    Safe user payload returned to the frontend.
    """
    id: int
    email: str
    username: str

    profile_picture: str | None = None
    contact_info: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None

    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None

    influencer_tier: str = "none"
    wallet_balance: float = 0.0

    role: str = "user"
    account_status: str = "active"
    notification_consent: bool | None = None

    created_at: datetime

    class Config:
        from_attributes = True