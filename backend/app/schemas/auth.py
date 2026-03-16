from datetime import date

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    """
    Incoming request body for new user registration.

    Added:
    - date_of_birth for age verification
    - optional gender
    """
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)

    date_of_birth: date
    gender: str | None = None


class LoginRequest(BaseModel):
    """
    Incoming request body for login.

    identifier:
    - email or username

    Optional location fields:
    - used to update profile context at login
    """
    identifier: str
    password: str
    latitude: float | None = None
    longitude: float | None = None
    location_name: str | None = None


class ReactivateRequest(BaseModel):
    """
    Used when a deactivated user chooses to reactivate their account.
    """
    identifier: str
    password: str


class TokenResponse(BaseModel):
    """
    JWT response returned after signup, login, or reactivation.
    """
    access_token: str
    token_type: str = "bearer"


class AuthStatusResponse(BaseModel):
    """
    Useful lightweight auth-flow response for lifecycle checks.
    """
    message: str
    account_status: str
    can_reactivate: bool = False
    name: str | None = None