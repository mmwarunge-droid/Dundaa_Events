import shutil
from pathlib import Path
from uuid import uuid4
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.event import Event
from app.models.comment import Comment
from app.models.rating import Rating
from app.models.influencer_star import InfluencerStar
from app.schemas.event import EventUpdate, EventResponse, EventDetailResponse
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.rating import RatingCreate, RatingResponse
from app.utils.ranking import average_rating, ranking_score
from app.utils.influencer import recalculate_user_tier

router = APIRouter(tags=["Events"])

# Local upload folder for event posters.
POSTER_UPLOAD_DIR = Path("uploads/posters")
POSTER_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed poster extensions.
ALLOWED_POSTER_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}


def infer_poster_type_from_url(url: str | None) -> str | None:
    """
    Infer poster type from a URL or local path.
    This helps the frontend decide whether to render an image preview
    or a PDF preview card.
    """
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
    """
    Save an uploaded poster file locally and return:
    - public URL path
    - detected poster type
    """
    if not upload.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename")

    extension = Path(upload.filename).suffix.lower()

    if extension not in ALLOWED_POSTER_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Poster file must be .jpg, .jpeg, .png, or .pdf"
        )

    generated_name = f"{uuid4().hex}{extension}"
    destination = POSTER_UPLOAD_DIR / generated_name

    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)

    poster_type = "pdf" if extension == ".pdf" else "png" if extension == ".png" else "jpg"
    public_url = f"/uploads/posters/{generated_name}"

    return public_url, poster_type


@router.get("/events")
def list_events(
    query: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return ranked event listings using:
    - keyword relevance
    - average rating
    - event date priority

    Also includes organizer username and organizer contact info
    so the frontend can surface event-owner details.
    """
    events = db.query(Event).options(
        joinedload(Event.comments),
        joinedload(Event.ratings),
        joinedload(Event.owner),
    ).all()

    results = []

    for event in events:
        score, distance = ranking_score(
            event,
            query,
            current_user.latitude,
            current_user.longitude
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new event owned by the authenticated user.

    This endpoint supports:
    - external poster URL
    - local poster upload

    If both are supplied, the uploaded file is prioritized.
    """
    resolved_poster_url = poster_url
    resolved_poster_type = infer_poster_type_from_url(poster_url)

    if poster_file is not None:
        resolved_poster_url, resolved_poster_type = save_uploaded_poster(poster_file)

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
    current_user: User = Depends(get_current_user)
):
    """
    Return full event details including:
    - comments
    - ratings
    - ranking score
    - organizer username
    - organizer contact info
    """
    event = db.query(Event).options(
        joinedload(Event.comments),
        joinedload(Event.ratings),
        joinedload(Event.owner),
    ).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    score, distance = ranking_score(
        event,
        None,
        current_user.latitude,
        current_user.longitude
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
    current_user: User = Depends(get_current_user)
):
    """
    Update an event, but only if the authenticated user owns it.

    In this version, quick edit remains JSON-based.
    Poster editing here still uses a poster_url string.
    """
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found or access denied")

    update_data = payload.model_dump(exclude_unset=True)

    # If poster_url changes, keep poster_type in sync automatically.
    if "poster_url" in update_data:
        update_data["poster_type"] = infer_poster_type_from_url(update_data["poster_url"])

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
    current_user: User = Depends(get_current_user)
):
    """
    Delete an event, but only if the authenticated user owns it.
    """
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id
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
    current_user: User = Depends(get_current_user)
):
    """
    Add a short comment to an event.
    """
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    comment = Comment(
        body=payload.body[:280],
        event_id=event_id,
        user_id=current_user.id
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
    current_user: User = Depends(get_current_user)
):
    """
    Create or update a user's rating for an event.

    Also:
    - awards influencer stars to the event owner
    - recalculates the owner's influencer tier
    """
    if payload.value not in [1, 2, 3, 4, 5]:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    existing = db.query(Rating).filter(
        Rating.event_id == event_id,
        Rating.user_id == current_user.id
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
            event_owner_id=event.owner_id
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