from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_user, get_db
from app.models.kyc_document import KYCDocument
from app.models.kyc_submission import KYCSubmission
from app.models.user import User
from app.schemas.kyc import (
    KYCProgressResponse,
    KYCRecoverDraftResponse,
    KYCReviewRequest,
    KYCDraftSaveRequest,
    KYCDraftStatusResponse,
    KYCSubmissionResponse,
    KYCSubmitRequest,
)

router = APIRouter(prefix="/kyc", tags=["KYC"])

KYC_UPLOAD_DIR = Path("uploads/kyc")
KYC_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_DOC_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".webp"}
DRAFT_ARCHIVE_DAYS = 3


def clean_string(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped if stripped else None


def compute_kyc_progress(submission: KYCSubmission) -> tuple[int, list[str]]:
    """
    Returns:
    - progress percentage
    - missing required fields for final submission

    Validation rules:
    - common required fields
    - business-only required fields when entity_type == business
    - all declarations required
    """
    required_fields = {
        "entity_type": submission.entity_type,
        "identity_document_type": submission.identity_document_type,
        "phone_number": submission.phone_number,
        "proof_of_address_type": submission.proof_of_address_type,
        "event_description": submission.event_description,
        "venue_confirmation_text": submission.venue_confirmation_text,
        "event_date_text": submission.event_date_text,
        "event_location_text": submission.event_location_text,
        "ticket_pricing_text": submission.ticket_pricing_text,
        "event_category": submission.event_category,
        "accepted_terms": submission.accepted_terms,
        "accepted_anti_fraud": submission.accepted_anti_fraud,
        "accepted_aml": submission.accepted_aml,
        "accepted_refund_policy": submission.accepted_refund_policy,
    }

    if submission.entity_type == "business":
        required_fields.update({
            "business_name": submission.business_name,
            "trading_name": submission.trading_name,
            "business_registration_number": submission.business_registration_number,
            "tax_identification_number": submission.tax_identification_number,
            "business_address": submission.business_address,
        })

    total = len(required_fields)
    complete = 0
    missing = []

    for field_name, value in required_fields.items():
        is_complete = False

        if isinstance(value, bool):
            is_complete = value is True
        else:
            is_complete = value is not None and str(value).strip() != ""

        if is_complete:
            complete += 1
        else:
            missing.append(field_name)

    percentage = int(round((complete / total) * 100)) if total else 0
    return percentage, missing


def apply_payload_to_submission(submission: KYCSubmission, payload_dict: dict) -> None:
    for field, value in payload_dict.items():
        setattr(submission, field, clean_string(value) if isinstance(value, str) else value)

    progress, _ = compute_kyc_progress(submission)
    submission.progress_percentage = progress
    submission.last_updated_at = datetime.now(timezone.utc)


def get_latest_active_draft(db: Session, user_id: int) -> KYCSubmission | None:
    return db.query(KYCSubmission).options(
        joinedload(KYCSubmission.documents)
    ).filter(
        KYCSubmission.user_id == user_id,
        KYCSubmission.status == "draft",
        KYCSubmission.archived_at.is_(None),
    ).order_by(
        KYCSubmission.last_updated_at.desc()
    ).first()


def archive_stale_drafts_for_user(db: Session, user_id: int) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=DRAFT_ARCHIVE_DAYS)

    stale_drafts = db.query(KYCSubmission).filter(
        KYCSubmission.user_id == user_id,
        KYCSubmission.status == "draft",
        KYCSubmission.archived_at.is_(None),
        KYCSubmission.last_updated_at < cutoff,
    ).all()

    for item in stale_drafts:
        item.status = "archived"
        item.archived_at = datetime.now(timezone.utc)
        db.add(item)

    db.commit()
    return len(stale_drafts)


def save_uploaded_doc(upload: UploadFile) -> str:
    if not upload.filename:
        raise HTTPException(status_code=400, detail="Uploaded document has no filename")

    ext = Path(upload.filename).suffix.lower()
    if ext not in ALLOWED_DOC_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Document must be JPG, PNG, PDF, or WEBP")

    filename = f"{uuid4().hex}{ext}"
    destination = KYC_UPLOAD_DIR / filename

    with destination.open("wb") as buffer:
        buffer.write(upload.file.read())

    return f"/uploads/kyc/{filename}"


@router.get("/me", response_model=list[KYCSubmissionResponse])
def list_my_kyc_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    archive_stale_drafts_for_user(db, current_user.id)

    submissions = db.query(KYCSubmission).options(
        joinedload(KYCSubmission.documents)
    ).filter(
        KYCSubmission.user_id == current_user.id,
        KYCSubmission.status != "archived",
    ).order_by(
        KYCSubmission.last_updated_at.desc()
    ).all()

    return submissions


@router.get("/draft", response_model=KYCDraftStatusResponse)
def get_kyc_draft(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    archive_stale_drafts_for_user(db, current_user.id)

    active_draft = get_latest_active_draft(db, current_user.id)

    archived = db.query(KYCSubmission).options(
        joinedload(KYCSubmission.documents)
    ).filter(
        KYCSubmission.user_id == current_user.id,
        KYCSubmission.status == "archived",
    ).order_by(
        KYCSubmission.archived_at.desc()
    ).all()

    return KYCDraftStatusResponse(
        has_active_draft=active_draft is not None,
        active_draft=active_draft,
        archived_drafts=archived,
    )


@router.post("/draft", response_model=KYCSubmissionResponse)
def save_kyc_draft(
    payload: KYCDraftSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    archive_stale_drafts_for_user(db, current_user.id)

    draft = get_latest_active_draft(db, current_user.id)
    if not draft:
        draft = KYCSubmission(
            user_id=current_user.id,
            status="draft",
        )
        db.add(draft)
        db.flush()

    apply_payload_to_submission(draft, payload.model_dump())
    draft.status = "draft"
    draft.archived_at = None

    db.add(draft)
    db.commit()
    db.refresh(draft)

    return draft


@router.get("/progress", response_model=KYCProgressResponse)
def get_kyc_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    archive_stale_drafts_for_user(db, current_user.id)

    draft = get_latest_active_draft(db, current_user.id)
    if not draft:
        return KYCProgressResponse(
            progress_percentage=0,
            missing_required_fields=[],
            can_submit=False,
        )

    progress, missing = compute_kyc_progress(draft)
    return KYCProgressResponse(
        progress_percentage=progress,
        missing_required_fields=missing,
        can_submit=len(missing) == 0,
    )


@router.post("/draft/{submission_id}/recover", response_model=KYCRecoverDraftResponse)
def recover_archived_draft(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = db.query(KYCSubmission).options(
        joinedload(KYCSubmission.documents)
    ).filter(
        KYCSubmission.id == submission_id,
        KYCSubmission.user_id == current_user.id,
        KYCSubmission.status == "archived",
    ).first()

    if not submission:
        raise HTTPException(status_code=404, detail="Archived draft not found")

    active = get_latest_active_draft(db, current_user.id)
    if active:
        active.status = "archived"
        active.archived_at = datetime.now(timezone.utc)
        db.add(active)

    submission.status = "draft"
    submission.archived_at = None
    submission.last_updated_at = datetime.now(timezone.utc)

    db.add(submission)
    db.commit()
    db.refresh(submission)

    return KYCRecoverDraftResponse(
        success=True,
        submission=submission,
    )


@router.post("/submissions", response_model=KYCSubmissionResponse)
def submit_kyc(
    payload: KYCSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    archive_stale_drafts_for_user(db, current_user.id)

    draft = get_latest_active_draft(db, current_user.id)
    if not draft:
        draft = KYCSubmission(
            user_id=current_user.id,
            status="draft",
        )
        db.add(draft)
        db.flush()

    apply_payload_to_submission(draft, payload.model_dump())

    progress, missing = compute_kyc_progress(draft)
    draft.progress_percentage = progress

    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "KYC submission is incomplete.",
                "missing_required_fields": missing,
                "progress_percentage": progress,
            },
        )

    draft.status = "pending"
    draft.submitted_at = datetime.now(timezone.utc)
    draft.archived_at = None
    draft.review_notes = None

    db.add(draft)
    db.commit()
    db.refresh(draft)

    return draft


@router.post("/archive-stale")
def archive_stale_drafts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    archived_count = archive_stale_drafts_for_user(db, current_user.id)
    return {"success": True, "archived_count": archived_count}


@router.post("/submissions/{submission_id}/documents", response_model=dict)
def upload_kyc_document(
    submission_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = db.query(KYCSubmission).options(
        joinedload(KYCSubmission.documents)
    ).filter(
        KYCSubmission.id == submission_id,
        KYCSubmission.user_id == current_user.id,
    ).first()

    if not submission:
        raise HTTPException(status_code=404, detail="KYC submission not found")

    if submission.status == "archived":
        raise HTTPException(status_code=400, detail="Recover the archived draft before uploading documents")

    file_url = save_uploaded_doc(file)

    doc = KYCDocument(
        submission_id=submission.id,
        document_type=document_type.strip(),
        file_url=file_url,
    )
    db.add(doc)

    submission.last_updated_at = datetime.now(timezone.utc)
    db.add(submission)

    db.commit()

    return {
        "success": True,
        "submission_id": submission.id,
        "document_type": doc.document_type,
        "file_url": doc.file_url,
    }

def get_user_kyc_gate_state(db: Session, user_id: int) -> str:
    latest = (
        db.query(KYCSubmission)
        .filter(KYCSubmission.user_id == user_id)
        .order_by(KYCSubmission.last_updated_at.desc())
        .first()
    )
    if not latest:
        return "in_progress"
    if latest.status == "approved":
        return "success"
    if latest.status == "pending":
        return "submitted_for_review"
    return "in_progress"