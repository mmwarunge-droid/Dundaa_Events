from pydantic import BaseModel, Field


class StarsResponse(BaseModel):
    """
    Summary of a creator's current active influencer state.

    Notes:
    - active_five_star_equivalent is float because converted 3-star and 4-star
      values are fractional.
    - raw_* counts are included for transparency in dashboards.
    - active_star_count and decay_window_days support better product UX.
    """
    active_five_star_equivalent: float = Field(default=0.0, ge=0)
    tier: str = "none"

    raw_five_star_count: int = 0
    raw_four_star_count: int = 0
    raw_three_star_count: int = 0

    active_star_count: int = 0
    decay_window_days: int = 90


class CashoutRequest(BaseModel):
    """
    Request body used by eligible influencers to request a cashout.

    provider examples:
    - mpesa
    - bank
    - card
    """
    amount: float = Field(..., gt=0)
    provider: str
    destination_reference: str