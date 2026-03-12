from datetime import datetime, date
from typing import Literal

from pydantic import BaseModel, Field
from app.schemas.comment import CommentResponse
from app.schemas.rating import RatingResponse

# Allowed event categories for consistent platform data.
EventCategory = Literal[
    "Club",
    "Church",
    "Outdoor Activities",
    "Restaurant",
    "Indoor Activities",
    "Corporate",
    "Hobbies",
]

# Allowed payment methods shown in the form.
PaymentMethod = Literal["MoMo", "Bank", "Card"]


class EventCreate(BaseModel):
    """
    Kept for reference / future reuse.
    In the current upload-enabled implementation, POST /events uses multipart/form-data
    rather than this direct JSON model.
    """
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


class EventUpdate(BaseModel):
    """
    Payload for partial event updates.

    Quick edits from the frontend still use JSON PUT requests.
    Poster updates here remain URL-based for simplicity.
    """
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


class EventResponse(BaseModel):
    """
    Basic event response returned in event listings.
    """
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

    owner_id: int

    # Event owner details for display on frontend.
    owner_username: str | None = None
    owner_contact_info: str | None = None

    created_at: datetime

    class Config:
        from_attributes = True


class EventDetailResponse(EventResponse):
    """
    Expanded event response including engagement and ranking metadata.
    """
    comments: list[CommentResponse] = Field(default_factory=list)
    ratings: list[RatingResponse] = Field(default_factory=list)
    average_rating: float = 0.0
    ranking_score: float = 0.0
    distance_km: float | None = None