from datetime import datetime

from pydantic import BaseModel, Field


class TransactionResponse(BaseModel):
    id: int
    tx_type: str
    provider: str
    gross_amount: float
    tax_fee_amount: float
    platform_fee_amount: float
    influencer_amount: float
    status: str
    reference: str | None = None
    destination_reference: str | None = None
    mfa_required: str | None = None
    mfa_verified_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class WithdrawalInitiateRequest(BaseModel):
    amount: float = Field(..., gt=0)
    provider: str
    destination_reference: str
    mfa_method: str  # email | sms


class WithdrawalInitiateResponse(BaseModel):
    transaction_id: int
    challenge_id: int
    message: str


class WithdrawalVerifyRequest(BaseModel):
    challenge_id: int
    code: str


class WithdrawalVerifyResponse(BaseModel):
    success: bool
    transaction_id: int
    status: str