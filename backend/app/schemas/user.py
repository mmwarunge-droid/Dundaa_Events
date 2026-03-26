from datetime import date, datetime

from pydantic import BaseModel, Field


class ProfileUpdateRequest(BaseModel):
    username: str | None = Field(default=None, min_length=2, max_length=50)
    profile_picture: str | None = None
    contact_info: str | None = Field(default=None, max_length=280)
    gender: str | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    notification_consent: bool | None = None


class NotificationConsentUpdate(BaseModel):
    notification_consent: bool


class AccountStatusUpdateRequest(BaseModel):
    action: str


class UserResponse(BaseModel):
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
    coin_balance: int = 0

    role: str = "user"
    account_status: str = "active"
    notification_consent: bool | None = None

    created_at: datetime

    class Config:
        from_attributes = True