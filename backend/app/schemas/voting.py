from datetime import datetime

from pydantic import BaseModel, Field


class WalletResponse(BaseModel):
    cash_balance: float
    coin_balance: int


class BuyCoinsRequest(BaseModel):
    coins: int = Field(..., ge=1, le=100000)
    payment_method: str  # mpesa | card | bank


class BuyCoinsResponse(BaseModel):
    reference: str
    coins: int
    amount_kes: float
    status: str
    next_action: dict


class VotingCampaignCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=180)
    description: str | None = None
    linked_campaign_id: int | None = None
    start_at: datetime
    end_at: datetime
    prize_pool_amount: float = Field(..., ge=0)

    first_prize_percentage: float = Field(default=50.0, ge=0)
    second_prize_percentage: float = Field(default=30.0, ge=0)
    third_prize_percentage: float = Field(default=20.0, ge=0)


class VotingCampaignResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    linked_campaign_id: int | None = None
    start_at: datetime
    end_at: datetime
    prize_pool_amount: float
    first_prize_percentage: float
    second_prize_percentage: float
    third_prize_percentage: float
    is_active: bool
    prizes_distributed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ContestantJoinRequest(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=120)
    avatar_url: str | None = None


class ContestantResponse(BaseModel):
    id: int
    voting_campaign_id: int
    user_id: int
    display_name: str
    avatar_url: str | None = None
    total_votes: int
    created_at: datetime

    class Config:
        from_attributes = True


class VoteRequest(BaseModel):
    contestant_id: int
    coins: int = Field(..., ge=1, le=1000)


class VoteResponse(BaseModel):
    reference: str
    coins_used: int
    remaining_coin_balance: int
    contestant_total_votes: int


class LeaderboardItem(BaseModel):
    rank: int
    contestant_id: int
    user_id: int
    display_name: str
    avatar_url: str | None = None
    total_votes: int


class PrizeDistributionRequest(BaseModel):
    first_prize_percentage: float | None = Field(default=None, ge=0)
    second_prize_percentage: float | None = Field(default=None, ge=0)
    third_prize_percentage: float | None = Field(default=None, ge=0)


class PrizeDistributionResult(BaseModel):
    contestant_id: int
    user_id: int
    display_name: str
    rank: int
    prize_amount: float