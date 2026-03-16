from datetime import datetime

from pydantic import BaseModel


class TransactionResponse(BaseModel):
    """
    Read-only transaction payload returned to clients.
    """
    id: int
    tx_type: str
    provider: str
    gross_amount: float
    tax_fee_amount: float
    platform_fee_amount: float
    influencer_amount: float
    status: str
    reference: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True