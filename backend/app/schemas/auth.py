from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    """
    Incoming request body for new user registration.
    - email must be a valid email address
    - username is the public login/display name
    - password is stored only after hashing
    """
    email: EmailStr
    username: str
    password: str


class LoginRequest(BaseModel):
    """
    Incoming request body for login.

    identifier:
    - can be either the user's email or username
    - this gives users flexibility at sign-in

    Optional location fields:
    - stored during login so Dundaa can recommend nearby events
    """
    identifier: str
    password: str
    latitude: float | None = None
    longitude: float | None = None
    location_name: str | None = None


class TokenResponse(BaseModel):
    """
    JWT response returned after signup or login.
    The frontend stores access_token and uses it for authenticated requests.
    """
    access_token: str
    token_type: str = "bearer"