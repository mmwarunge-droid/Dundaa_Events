from datetime import datetime

from pydantic import BaseModel, Field


class KYCReviewRequest(BaseModel):
    review_notes: str | None = None


class KYCSubmissionBase(BaseModel):
    entity_type: str = "individual"
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

    accepted_terms: bool = False
    accepted_anti_fraud: bool = False
    accepted_aml: bool = False
    accepted_refund_policy: bool = False


class KYCDraftSaveRequest(KYCSubmissionBase):
    """
    Save/update a KYC draft without requiring full completion.
    """


class KYCSubmitRequest(KYCSubmissionBase):
    """
    Submit KYC for review.
    Full required validation is enforced server-side before submission.
    """


class KYCDocumentResponse(BaseModel):
    id: int
    submission_id: int
    document_type: str
    file_url: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class KYCSubmissionResponse(KYCSubmissionBase):
    id: int
    user_id: int
    status: str
    progress_percentage: int = 0
    last_updated_at: datetime | None = None
    archived_at: datetime | None = None
    review_notes: str | None = None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    reviewed_by_user_id: int | None = None
    documents: list[KYCDocumentResponse] = []

    class Config:
        from_attributes = True


class KYCDraftStatusResponse(BaseModel):
    has_active_draft: bool
    active_draft: KYCSubmissionResponse | None = None
    archived_drafts: list[KYCSubmissionResponse] = []


class KYCProgressResponse(BaseModel):
    progress_percentage: int
    missing_required_fields: list[str]
    can_submit: bool


class KYCRecoverDraftResponse(BaseModel):
    success: bool
    submission: KYCSubmissionResponse