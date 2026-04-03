from datetime import date

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)
    date_of_birth: date
    gender: str | None = None


class LoginRequest(BaseModel):
    identifier: str
    password: str
    latitude: float | None = None
    longitude: float | None = None
    location_name: str | None = None


class ReactivateRequest(BaseModel):
    identifier: str
    password: str


class SessionUserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str
    notification_consent: bool | None = None
    promotional_updates_consent: bool | None = None
    influencer_tier: str | None = None
    wallet_balance: float | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: SessionUserResponse


class AuthStatusResponse(BaseModel):
    message: str
    account_status: str
    can_reactivate: bool = False
    name: str | None = None