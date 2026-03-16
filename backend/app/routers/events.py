import shutil
from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_user, get_db
from app.models.comment import Comment
from app.models.event import Event
from app.models.influencer_star import InfluencerStar
from app.models.kyc_submission import KYCSubmission
from app.models.rating import Rating
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.event import EventDetailResponse, EventResponse, EventUpdate
from app.schemas.rating import RatingCreate, RatingResponse
from app.utils.influencer import recalculate_user_tier
from app.utils.ranking import average_rating, ranking_score

router = APIRouter(tags=["Events"])

POSTER_UPLOAD_DIR = Path("uploads/posters")
POSTER_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_POSTER_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}


def infer_poster_type_from_url(url: str | None) -> str | None:
    if not url:
        return None

    lower = url.lower()
    if ".pdf" in lower:
        return "pdf"
    if ".png" in lower:
        return "png"
    if ".jpg" in lower or ".jpeg" in lower:
        return "jpg"
    return None


def save_uploaded_poster(upload: UploadFile) -> tuple[str, str]:
    if not upload.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename")

    extension = Path(upload.filename).suffix.lower()

    if extension not in ALLOWED_POSTER_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Poster file must be .jpg, .jpeg, .png, or .pdf",
        )

    generated_name = f"{uuid4().hex}{extension}"
    destination = POSTER_UPLOAD_DIR / generated_name

    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)

    poster_type = "pdf" if extension == ".pdf" else "png" if extension == ".png" else "jpg"
    public_url = f"/uploads/posters/{generated_name}"

    return public_url, poster_type


def user_has_approved_kyc(db: Session, user_id: int) -> bool:
    approved = db.query(KYCSubmission).filter(
        KYCSubmission.user_id == user_id,
        KYCSubmission.status == "approved",
    ).first()

    return approved is not None


@router.get("/events")
def list_events(
    query: str | None = None,
    include_non_live: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns live events for everyone, plus hidden/pending events owned by
    the current user. This preserves dashboard compatibility.
    """
    events = db.query(Event).options(
        joinedload(Event.comments),
        joinedload(Event.ratings),
        joinedload(Event.owner),
    ).all()

    results = []

    for event in events:
        is_public = event.is_live
        is_owner = event.owner_id == current_user.id

        if not include_non_live and not is_public and not is_owner:
            continue

        score, distance = ranking_score(
            event,
            query,
            current_user.latitude,
            current_user.longitude,
        )

        results.append({
            **EventResponse.model_validate(event).model_dump(),
            "owner_username": event.owner.username if event.owner else None,
            "owner_contact_info": event.owner.contact_info if event.owner else None,
            "average_rating": average_rating(event),
            "ranking_score": score,
            "distance_km": distance,
        })

    results.sort(key=lambda x: -x["ranking_score"])
    return results


@router.post("/events", response_model=EventResponse)
def create_event(
    title: str = Form(...),
    description: str = Form(...),
    poster_url: str | None = Form(default=None),
    poster_file: UploadFile | None = File(default=None),
    google_map_link: str | None = Form(default=None),
    location_name: str | None = Form(default=None),
    category: str | None = Form(default=None),
    event_date: date | None = Form(default=None),
    price: float | None = Form(default=None),
    payment_method: str | None = Form(default=None),
    payment_link: str | None = Form(default=None),
    has_ticket_sales: bool = Form(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resolved_poster_url = poster_url
    resolved_poster_type = infer_poster_type_from_url(poster_url)

    if poster_file is not None:
        resolved_poster_url, resolved_poster_type = save_uploaded_poster(poster_file)

    if has_ticket_sales and not user_has_approved_kyc(db, current_user.id):
        raise HTTPException(
            status_code=400,
            detail=(
                "KYC approval is required before publishing an event with ticket sales. "
                "Please complete your KYC submission first."
            ),
        )

    approval_status = "approved"
    is_live = True

    if has_ticket_sales:
        approval_status = "pending_review"
        is_live = False

    event = Event(
        title=title,
        description=description,
        poster_url=resolved_poster_url,
        poster_type=resolved_poster_type,
        google_map_link=google_map_link,
        location_name=location_name,
        category=category,
        event_date=event_date,
        price=price,
        payment_method=payment_method,
        payment_link=payment_link,
        has_ticket_sales=has_ticket_sales,
        approval_status=approval_status,
        is_live=is_live,
        owner_id=current_user.id,
    )

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/events/{event_id}", response_model=EventDetailResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).options(
        joinedload(Event.comments),
        joinedload(Event.ratings),
        joinedload(Event.owner),
    ).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not event.is_live and event.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="This event is not currently live")

    score, distance = ranking_score(
        event,
        None,
        current_user.latitude,
        current_user.longitude,
    )

    return EventDetailResponse(
        **EventResponse.model_validate(event).model_dump(),
        owner_username=event.owner.username if event.owner else None,
        owner_contact_info=event.owner.contact_info if event.owner else None,
        comments=[CommentResponse.model_validate(c) for c in event.comments],
        ratings=[RatingResponse.model_validate(r) for r in event.ratings],
        average_rating=average_rating(event),
        ranking_score=score,
        distance_km=distance,
    )


@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found or access denied")

    update_data = payload.model_dump(exclude_unset=True)

    if "poster_url" in update_data:
        update_data["poster_type"] = infer_poster_type_from_url(update_data["poster_url"])

    if "has_ticket_sales" in update_data:
        turning_on_ticket_sales = bool(update_data["has_ticket_sales"]) and not event.has_ticket_sales

        if turning_on_ticket_sales:
            if not user_has_approved_kyc(db, current_user.id):
                raise HTTPException(
                    status_code=400,
                    detail="KYC approval is required before enabling ticket sales for this event.",
                )

            update_data["approval_status"] = "pending_review"
            update_data["is_live"] = False
            update_data["approved_at"] = None
            update_data["approved_by_user_id"] = None
            update_data["rejection_reason"] = None

    for field, value in update_data.items():
        setattr(event, field, value)

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found or access denied")

    db.delete(event)
    db.commit()
    return {"message": "Event deleted successfully"}


@router.post("/events/{event_id}/comment", response_model=CommentResponse)
def add_comment(
    event_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not event.is_live and event.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Comments are unavailable for this event")

    comment = Comment(
        body=payload.body[:280],
        event_id=event_id,
        user_id=current_user.id,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.post("/events/{event_id}/rate", response_model=RatingResponse)
def add_rating(
    event_id: int,
    payload: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.value not in [1, 2, 3, 4, 5]:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not event.is_live and event.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ratings are unavailable for this event")

    existing = db.query(Rating).filter(
        Rating.event_id == event_id,
        Rating.user_id == current_user.id,
    ).first()

    if existing:
        existing.value = payload.value
        db.add(existing)
        db.commit()
        db.refresh(existing)
        rating = existing
    else:
        rating = Rating(
            value=payload.value,
            event_id=event_id,
            user_id=current_user.id,
            event_owner_id=event.owner_id,
        )
        db.add(rating)
        db.commit()
        db.refresh(rating)

    if payload.value in [3, 4, 5]:
        star = InfluencerStar(
            user_id=event.owner_id,
            source_rating=payload.value,
            equivalent_five_star_value=1 if payload.value == 5 else 0,
            rating_id=rating.id,
        )
        db.add(star)
        db.commit()

    owner = db.query(User).filter(User.id == event.owner_id).first()
    recalculate_user_tier(db, owner)

    return rating