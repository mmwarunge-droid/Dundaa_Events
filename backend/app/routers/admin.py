from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_user, get_db
from app.models.event import Event
from app.models.kyc_submission import KYCSubmission
from app.models.user import User
from app.schemas.event import EventResponse
from app.schemas.kyc import KYCReviewRequest, KYCSubmissionResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


def ensure_admin(user: User) -> None:
    if user.role not in {"admin", "super_admin"}:
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/events/pending", response_model=list[EventResponse])
def list_pending_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)

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
            **EventResponse.model_validate(event).model_dump(),
            "owner_username": event.owner.username if event.owner else None,
            "owner_contact_info": event.owner.contact_info if event.owner else None,
        })

    return results


@router.post("/events/{event_id}/approve")
def approve_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.approval_status = "approved"
    event.rejection_reason = None
    event.approved_at = datetime.now(timezone.utc)
    event.approved_by_user_id = current_user.id
    event.is_live = True

    db.add(event)
    db.commit()

    return {"message": "Event approved successfully"}


@router.post("/events/{event_id}/reject")
def reject_event(
    event_id: int,
    payload: KYCReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.approval_status = "rejected"
    event.rejection_reason = payload.review_notes or "Event rejected by admin review"
    event.approved_at = None
    event.approved_by_user_id = None
    event.is_live = False

    db.add(event)
    db.commit()

    return {"message": "Event rejected successfully"}


@router.get("/kyc/pending", response_model=list[KYCSubmissionResponse])
def list_pending_kyc(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)

    submissions = db.query(KYCSubmission).options(
        joinedload(KYCSubmission.documents)
    ).filter(
        KYCSubmission.status == "pending"
    ).order_by(
        KYCSubmission.submitted_at.desc()
    ).all()

    return submissions


@router.post("/kyc/{submission_id}/approve")
def approve_kyc(
    submission_id: int,
    payload: KYCReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)

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
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)

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