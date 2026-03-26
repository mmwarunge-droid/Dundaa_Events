from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class GuestCheckoutQuoteRequest(BaseModel):
    event_id: int
    quantity: int = Field(..., ge=1, le=20)


class GuestCheckoutQuoteResponse(BaseModel):
    event_id: int
    event_title: str
    quantity: int
    unit_price: float
    total_amount: float
    currency: str = "KES"
    payment_methods: list[str]


class GuestCheckoutCreateRequest(BaseModel):
    event_id: int
    quantity: int = Field(..., ge=1, le=20)

    buyer_name: str = Field(..., min_length=2, max_length=100)
    buyer_email: EmailStr
    buyer_phone: str = Field(..., min_length=7, max_length=30)

    payment_method: str  # mpesa | card | bank
    referral_slug: str | None = None


class GuestCheckoutCreateResponse(BaseModel):
    order_id: int
    reference: str
    status: str
    payment_method: str
    total_amount: float
    next_action: dict


class GuestOrderResponse(BaseModel):
    id: int
    event_id: int
    buyer_name: str
    buyer_email: str
    buyer_phone: str
    quantity: int
    unit_price: float
    total_amount: float
    payment_method: str
    status: str
    reference: str
    referral_slug: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class EventShareClickRequest(BaseModel):
    source: str | None = None
    referrer: str | None = None


class EventShareClickResponse(BaseModel):
    share_slug: str
    share_url: str
    share_click_count: int