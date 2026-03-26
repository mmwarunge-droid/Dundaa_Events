from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from backend.app.dependencies import get_current_admin_user, get_db
from backend.app.models.event import Event
from backend.app.models.kyc_submission import KYCSubmission
from backend.app.models.user import User
from backend.app.schemas.admin import (
    AdminKycDocumentSummary,
    AdminKycHistoryItem,
    AdminKycReviewQueueItem,
)
from backend.app.schemas.event import EventResponse, AdminEventApproveRequest
from backend.app.schemas.kyc import KYCReviewRequest, KYCSubmissionResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


def should_expose_payment_link(event: Event) -> bool:
    return bool(
        event.has_ticket_sales
        and event.approval_status == "approved"
        and event.is_live
        and event.payment_link
    )


def serialize_admin_event_response(event: Event) -> dict:
    data = EventResponse.model_validate(event).model_dump()

    if not should_expose_payment_link(event):
        data["payment_link"] = None

    return data


def build_document_summary(submission: KYCSubmission) -> AdminKycDocumentSummary:
    docs = submission.documents or []
    doc_types = {doc.document_type for doc in docs}

    identity_doc_types = {"passport", "national_id", "drivers_license"}
    proof_doc_types = {"utility_bill", "bank_statement", "lease_agreement"}
    business_doc_types = {
        "certificate_of_incorporation",
        "director_id",
        "shareholder_list",
        "bank_verification_statement",
        "venue_agreement",
        "event_permit",
        "insurance",
        "security_plan",
    }

    has_identity_document = bool(doc_types & identity_doc_types)
    has_proof_of_address = bool(doc_types & proof_doc_types)
    has_selfie = "selfie" in doc_types
    business_supporting_docs_count = len(doc_types & business_doc_types)

    if has_identity_document and has_proof_of_address and has_selfie:
      completeness_label = "good"
    elif has_identity_document or has_proof_of_address:
      completeness_label = "partial"
    else:
      completeness_label = "weak"

    return AdminKycDocumentSummary(
        total_documents=len(docs),
        has_identity_document=has_identity_document,
        has_proof_of_address=has_proof_of_address,
        has_selfie=has_selfie,
        business_supporting_docs_count=business_supporting_docs_count,
        completeness_label=completeness_label,
    )


@router.get("/events/pending", response_model=list[EventResponse])
def list_pending_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    events = db.query(Event).options(
        joinedload(Event.owner)
    ).filter(
        Event.approval_status == "pending_review"
    ).order_by(
        Event.created_at.desc()
    ).all()

    results = []
    for event in events:
        results.append({
            **serialize_admin_event_response(event),
            "owner_username": event.owner.username if event.owner else None,
            "owner_contact_info": event.owner.contact_info if event.owner else None,
        })

    return results


@router.post("/events/{event_id}/approve")
def approve_event(
    event_id: int,
    payload: AdminEventApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.has_ticket_sales:
        if not payload.payment_link or not payload.payment_link.strip():
            raise HTTPException(
                status_code=400,
                detail="A payment link is required before approving a ticketed event.",
            )
        event.payment_link = payload.payment_link.strip()
    else:
        event.payment_link = None

    if payload.price is not None:
        event.price = payload.price

    if payload.payment_method is not None:
        event.payment_method = payload.payment_method

    event.approval_status = "approved"
    event.rejection_reason = None
    event.approved_at = datetime.now(timezone.utc)
    event.approved_by_user_id = current_user.id
    event.is_live = True

    db.add(event)
    db.commit()
    db.refresh(event)

    return {
        "message": "Event approved successfully",
        "event_id": event.id,
        "is_live": event.is_live,
        "approval_status": event.approval_status,
    }


@router.post("/events/{event_id}/reject")
def reject_event(
    event_id: int,
    payload: KYCReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.approval_status = "rejected"
    event.rejection_reason = payload.review_notes or "Event rejected by admin review"
    event.approved_at = None
    event.approved_by_user_id = None
    event.is_live = False
    event.payment_link = None

    db.add(event)
    db.commit()

    return {"message": "Event rejected successfully"}


@router.get("/kyc/pending", response_model=list[KYCSubmissionResponse])
def list_pending_kyc(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    submissions = db.query(KYCSubmission).options(
        joinedload(KYCSubmission.documents)
    ).filter(
        KYCSubmission.status == "pending"
    ).order_by(
        KYCSubmission.submitted_at.desc()
    ).all()

    return submissions


@router.get("/kyc/review-queue", response_model=list[AdminKycReviewQueueItem])
def list_kyc_review_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    users = db.query(User).order_by(User.created_at.desc()).all()

    queue = []

    for user in users:
        attempts = db.query(KYCSubmission).options(
            joinedload(KYCSubmission.documents)
        ).filter(
            KYCSubmission.user_id == user.id
        ).order_by(
            KYCSubmission.last_updated_at.desc().nullslast(),
            KYCSubmission.submitted_at.desc().nullslast(),
            KYCSubmission.id.desc(),
        ).all()

        if not attempts:
            continue

        latest = attempts[0]

        history = [
            AdminKycHistoryItem(
                id=item.id,
                user_id=item.user_id,
                entity_type=item.entity_type,
                status=item.status,
                progress_percentage=item.progress_percentage or 0,
                review_notes=item.review_notes,
                submitted_at=item.submitted_at,
                reviewed_at=item.reviewed_at,
                last_updated_at=item.last_updated_at,
                archived_at=item.archived_at,
                documents=item.documents or [],
                document_summary=build_document_summary(item),
            )
            for item in attempts
        ]

        queue.append(
            AdminKycReviewQueueItem(
                user_id=user.id,
                username=user.username,
                email=user.email,
                latest_submission_id=latest.id,
                latest_status=latest.status,
                latest_progress_percentage=latest.progress_percentage or 0,
                latest_submitted_at=latest.submitted_at,
                latest_reviewed_at=latest.reviewed_at,
                latest_last_updated_at=latest.last_updated_at,
                attempts_count=len(attempts),
                archived_attempts_count=sum(1 for item in attempts if item.status == "archived"),
                pending_attempts_count=sum(1 for item in attempts if item.status == "pending"),
                approved_attempts_count=sum(1 for item in attempts if item.status == "approved"),
                rejected_attempts_count=sum(1 for item in attempts if item.status == "rejected"),
                draft_attempts_count=sum(1 for item in attempts if item.status == "draft"),
                latest_review_notes=latest.review_notes,
                history=history,
            )
        )

    queue.sort(
        key=lambda item: (
            0 if item.latest_status == "pending" else 1,
            -(item.latest_last_updated_at.timestamp() if item.latest_last_updated_at else 0),
        )
    )

    return queue


@router.post("/kyc/{submission_id}/approve")
def approve_kyc(
    submission_id: int,
    payload: KYCReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    submission = db.query(KYCSubmission).filter(
        KYCSubmission.id == submission_id
    ).first()

    if not submission:
        raise HTTPException(status_code=404, detail="KYC submission not found")

    submission.status = "approved"
    submission.review_notes = payload.review_notes
    submission.reviewed_at = datetime.now(timezone.utc)
    submission.reviewed_by_user_id = current_user.id

    db.add(submission)
    db.commit()

    return {"message": "KYC approved successfully"}


@router.post("/kyc/{submission_id}/reject")
def reject_kyc(
    submission_id: int,
    payload: KYCReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    submission = db.query(KYCSubmission).filter(
        KYCSubmission.id == submission_id
    ).first()

    if not submission:
        raise HTTPException(status_code=404, detail="KYC submission not found")

    submission.status = "rejected"
    submission.review_notes = payload.review_notes or "KYC rejected by admin review"
    submission.reviewed_at = datetime.now(timezone.utc)
    submission.reviewed_by_user_id = current_user.id

    db.add(submission)
    db.commit()

    return {"message": "KYC rejected successfully"}