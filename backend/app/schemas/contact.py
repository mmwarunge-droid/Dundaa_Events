from pydantic import BaseModel, EmailStr, Field


class ContactFormRequest(BaseModel):
    to_email: EmailStr = "hello@dundaa.com"
    sender_email: EmailStr | None = None
    message: str = Field(..., min_length=1, max_length=500)


class ContactFormResponse(BaseModel):
    success: bool
    message: str