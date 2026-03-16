from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.comment import CommentResponse
from app.schemas.rating import RatingResponse

EventCategory = Literal[
    "Club",
    "Church",
    "Outdoor Activities",
    "Restaurant",
    "Indoor Activities",
    "Corporate",
    "Hobbies",
    "Sports",
    "Restaurants and Cafes",
    "Club Events",
    "Church Events",
    "Corporate Events",
]

PaymentMethod = Literal["MoMo", "Bank", "Card", "M-Pesa"]


class EventCreate(BaseModel):
    title: str
    description: str
    poster_url: str | None = None
    google_map_link: str | None = None
    location_name: str | None = None
    category: EventCategory | None = None
    event_date: date | None = None
    price: float | None = Field(default=None, ge=0)
    payment_method: PaymentMethod | None = None
    payment_link: str | None = None
    has_ticket_sales: bool = False


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    poster_url: str | None = None
    google_map_link: str | None = None
    location_name: str | None = None
    category: EventCategory | None = None
    event_date: date | None = None
    price: float | None = Field(default=None, ge=0)
    payment_method: PaymentMethod | None = None
    payment_link: str | None = None
    has_ticket_sales: bool | None = None


class EventResponse(BaseModel):
    id: int
    title: str
    description: str
    poster_url: str | None = None
    poster_type: str | None = None
    google_map_link: str | None = None
    location_name: str | None = None
    category: EventCategory | None = None
    event_date: date | None = None
    price: float | None = None
    payment_method: PaymentMethod | None = None
    payment_link: str | None = None

    has_ticket_sales: bool = False
    approval_status: str
    rejection_reason: str | None = None
    is_live: bool = True

    owner_id: int
    owner_username: str | None = None
    owner_contact_info: str | None = None

    created_at: datetime

    class Config:
        from_attributes = True


class EventDetailResponse(EventResponse):
    comments: list[CommentResponse] = Field(default_factory=list)
    ratings: list[RatingResponse] = Field(default_factory=list)
    average_rating: float = 0.0
    ranking_score: float = 0.0
    distance_km: float | None = None