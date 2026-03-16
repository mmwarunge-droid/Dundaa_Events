from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


KYCEntityType = Literal["individual", "business"]


class KYCSubmissionCreate(BaseModel):
    entity_type: KYCEntityType = "individual"

    identity_document_type: str | None = None
    phone_number: str | None = None
    email_verified: bool = False
    phone_verified: bool = False

    proof_of_address_type: str | None = None

    business_name: str | None = None
    trading_name: str | None = None
    business_registration_number: str | None = None
    tax_identification_number: str | None = None
    business_address: str | None = None
    website_or_social: str | None = None

    event_description: str | None = None
    venue_confirmation_text: str | None = None
    event_date_text: str | None = None
    event_location_text: str | None = None
    ticket_pricing_text: str | None = None
    event_category: str | None = None

    accepted_terms: bool
    accepted_anti_fraud: bool
    accepted_aml: bool
    accepted_refund_policy: bool


class KYCDocumentResponse(BaseModel):
    id: int
    submission_id: int
    document_type: str
    file_url: str
    original_filename: str | None = None
    verification_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class KYCSubmissionResponse(BaseModel):
    id: int
    user_id: int
    entity_type: str
    status: str

    identity_document_type: str | None = None
    phone_number: str | None = None
    email_verified: bool
    phone_verified: bool

    proof_of_address_type: str | None = None

    business_name: str | None = None
    trading_name: str | None = None
    business_registration_number: str | None = None
    tax_identification_number: str | None = None
    business_address: str | None = None
    website_or_social: str | None = None

    event_description: str | None = None
    venue_confirmation_text: str | None = None
    event_date_text: str | None = None
    event_location_text: str | None = None
    ticket_pricing_text: str | None = None
    event_category: str | None = None

    accepted_terms: bool
    accepted_anti_fraud: bool
    accepted_aml: bool
    accepted_refund_policy: bool

    review_notes: str | None = None
    submitted_at: datetime
    reviewed_at: datetime | None = None

    documents: list[KYCDocumentResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class KYCReviewRequest(BaseModel):
    review_notes: str | None = None