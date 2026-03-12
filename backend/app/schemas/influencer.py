from pydantic import BaseModel


class StarsResponse(BaseModel):
    """Summary of current active star state and tier."""
    active_five_star_equivalent: int
    tier: str
    raw_five_star_count: int
    raw_four_star_count: int
    raw_three_star_count: int


class CashoutRequest(BaseModel):
    """Request body used by super influencers to cash out."""
    amount: float
    provider: str  # mpesa, bank, card
    destination_reference: str
