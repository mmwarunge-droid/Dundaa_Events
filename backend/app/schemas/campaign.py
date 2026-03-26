from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CampaignCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=180)
    description: str = Field(..., min_length=20, max_length=5000)
    cause_description: str | None = Field(default=None, max_length=5000)
    beneficiary_name: str | None = Field(default=None, max_length=180)

    campaign_type: str  # free_event_crowdfund | creator_fundraiser
    cover_image_url: str | None = None

    goal_amount: float = Field(..., gt=0)
    deadline: datetime | None = None

    linked_event_id: int | None = None

    allow_anonymous: bool = True
    recurring_enabled: bool = False


class CampaignUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=180)
    description: str | None = Field(default=None, min_length=20, max_length=5000)
    cause_description: str | None = Field(default=None, max_length=5000)
    beneficiary_name: str | None = Field(default=None, max_length=180)
    cover_image_url: str | None = None
    goal_amount: float | None = Field(default=None, gt=0)
    deadline: datetime | None = None
    allow_anonymous: bool | None = None
    recurring_enabled: bool | None = None
    is_live: bool | None = None


class CampaignResponse(BaseModel):
    id: int
    title: str
    description: str
    cause_description: str | None = None
    beneficiary_name: str | None = None

    campaign_type: str
    cover_image_url: str | None = None

    goal_amount: float
    current_amount: float
    progress_percentage: float = 0.0

    deadline: datetime | None = None
    linked_event_id: int | None = None

    allow_anonymous: bool = True
    recurring_enabled: bool = False

    is_live: bool = True
    approval_status: str

    share_slug: str | None = None
    share_click_count: int = 0
    search_hit_count: int = 0
    donation_count: int = 0
    share_url: str | None = None

    owner_id: int
    owner_username: str | None = None
    owner_verified: bool = False

    created_at: datetime

    class Config:
        from_attributes = True


class CampaignDiscoveryResponse(BaseModel):
    items: list[CampaignResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


class DonationCreateRequest(BaseModel):
    donor_name: str = Field(..., min_length=2, max_length=100)
    donor_email: EmailStr
    donor_phone: str = Field(..., min_length=7, max_length=30)

    amount: float = Field(..., gt=0)
    payment_method: str  # mpesa | card | bank
    contribution_type: str = "one_time"  # one_time | recurring
    is_anonymous: bool = False


class DonationCreateResponse(BaseModel):
    donation_id: int
    reference: str
    status: str
    total_amount: float
    contribution_type: str
    next_action: dict


class DonationActivityItem(BaseModel):
    id: int
    donor_display_name: str
    amount: float
    contribution_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class CampaignShareClickRequest(BaseModel):
    source: str | None = None
    referrer: str | None = None


class CampaignShareClickResponse(BaseModel):
    share_slug: str
    share_url: str
    share_click_count: int