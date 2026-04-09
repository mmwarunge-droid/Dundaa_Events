from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.comment import CommentResponse
from app.schemas.rating import RatingResponse

# Allowed categories for event creation/update.
EventCategory = Literal[
    "Nightlife",
    "Church",
    "Outdoor Activities",
    "Restaurant",
    "Indoor Activities",
    "Shopping",
    "Corporate",
    "Hobbies",
    "Music",
    "Arts and Culture",
    "Movies and Theater",
    "Sports",
    "Restaurants and Cafes",
    "Club Events",
    "Church Events",
    "Corporate Events",
    "Business Networking",
    "Board Game Nights",
    "Political Rallies",
    "Hobbies and Interest Groups",
]

# Allowed payment methods for ticketed events.
PaymentMethod = Literal["MoMo", "Bank", "Card", "M-Pesa"]


class EventCreate(BaseModel):
    """
    Schema for event creation payloads when JSON is used.
    Note: your current create route uses Form/File, but keeping this schema aligned
    is still useful for internal consistency and future API use.
    """
    title: str
    description: str

    # Poster fields
    poster_url: str | None = None

    # Optional featured promo fields
    featured_promo_image_url: str | None = None
    featured_promo_click_url: str | None = None

    # Event metadata
    google_map_link: str | None = None
    location_name: str | None = None
    category: EventCategory | None = None
    event_date: date | None = None
    price: float | None = Field(default=None, ge=0)
    payment_method: PaymentMethod | None = None
    has_ticket_sales: bool = False


class EventUpdate(BaseModel):
    """
    Schema for event updates.
    All fields are optional because updates are partial.
    """
    title: str | None = None
    description: str | None = None

    # Poster fields
    poster_url: str | None = None

    # Optional featured promo fields
    featured_promo_image_url: str | None = None
    featured_promo_click_url: str | None = None

    # Event metadata
    google_map_link: str | None = None
    location_name: str | None = None
    category: EventCategory | None = None
    event_date: date | None = None
    price: float | None = Field(default=None, ge=0)
    payment_method: PaymentMethod | None = None
    has_ticket_sales: bool | None = None


class AdminEventApproveRequest(BaseModel):
    """
    Schema used by admin approval flows for ticketed events.
    """
    payment_link: str | None = None
    price: float | None = Field(default=None, ge=0)
    payment_method: PaymentMethod | None = None


class EventResponse(BaseModel):
    """
    Standard event response returned to the frontend.
    """
    id: int
    title: str
    description: str

    # Poster fields
    poster_url: str | None = None
    poster_thumb_url: str | None = None
    poster_storage_key: str | None = None
    poster_type: str | None = None
    poster_width: int | None = None
    poster_height: int | None = None
    poster_bytes: int | None = None

    # Optional featured promo fields
    featured_promo_image_url: str | None = None
    featured_promo_click_url: str | None = None

    # Event metadata
    google_map_link: str | None = None
    location_name: str | None = None
    category: EventCategory | None = None
    event_date: date | None = None
    price: float | None = None
    payment_method: PaymentMethod | None = None
    payment_link: str | None = None

    # Ticketing / moderation
    has_ticket_sales: bool = False
    approval_status: str
    rejection_reason: str | None = None
    is_live: bool = True

    # Discovery / sharing fields
    share_slug: str | None = None
    share_click_count: int = 0
    search_hit_count: int = 0
    share_url: str | None = None
    can_guest_checkout: bool = False

    # Owner metadata
    owner_id: int
    owner_username: str | None = None
    owner_contact_info: str | None = None

    # Audit metadata
    created_at: datetime

    class Config:
        from_attributes = True


class EventDetailResponse(EventResponse):
    """
    Expanded response for a single event detail page.
    """
    comments: list[CommentResponse] = Field(default_factory=list)
    ratings: list[RatingResponse] = Field(default_factory=list)
    average_rating: float = 0.0
    ranking_score: float = 0.0
    distance_km: float | None = None


class EventDiscoveryResponse(BaseModel):
    """
    Paginated discovery/listing response.
    """
    items: list[EventResponse]
    page: int
    page_size: int
    total: int
    total_pages: int