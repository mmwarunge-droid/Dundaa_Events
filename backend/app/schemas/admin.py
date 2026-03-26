from datetime import datetime

from pydantic import BaseModel

from backend.app.schemas.kyc import KYCDocumentResponse


class AdminKycDocumentSummary(BaseModel):
    total_documents: int
    has_identity_document: bool
    has_proof_of_address: bool
    has_selfie: bool
    business_supporting_docs_count: int
    completeness_label: str


class AdminKycHistoryItem(BaseModel):
    id: int
    user_id: int
    entity_type: str
    status: str
    progress_percentage: int
    review_notes: str | None = None

    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    last_updated_at: datetime | None = None
    archived_at: datetime | None = None

    documents: list[KYCDocumentResponse] = []
    document_summary: AdminKycDocumentSummary


class AdminKycReviewQueueItem(BaseModel):
    user_id: int
    username: str | None = None
    email: str | None = None

    latest_submission_id: int | None = None
    latest_status: str | None = None
    latest_progress_percentage: int = 0
    latest_submitted_at: datetime | None = None
    latest_reviewed_at: datetime | None = None
    latest_last_updated_at: datetime | None = None

    attempts_count: int = 0
    archived_attempts_count: int = 0
    pending_attempts_count: int = 0
    approved_attempts_count: int = 0
    rejected_attempts_count: int = 0
    draft_attempts_count: int = 0

    latest_review_notes: str | None = None
    history: list[AdminKycHistoryItem]