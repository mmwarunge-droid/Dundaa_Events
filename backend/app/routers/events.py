import os
import shutil
from datetime import date
from math import ceil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload, load_only

from backend.app.services.cache_service import cache_get, cache_set, cache_delete_prefix
from backend.app.dependencies import get_current_user, get_db, get_optional_current_user
from backend.app.models.comment import Comment
from backend.app.models.event import Event
from backend.app.models.event_share_click import EventShareClick
from backend.app.models.influencer_star import InfluencerStar
from backend.app.models.kyc_submission import KYCSubmission
from backend.app.models.rating import Rating
from backend.app.models.user import User
from backend.app.schemas.comment import CommentCreate, CommentResponse
from backend.app.schemas.event import (
    EventDetailResponse,
    EventDiscoveryResponse,
    EventResponse,
    EventUpdate,
)
from backend.app.schemas.guest_checkout import EventShareClickRequest, EventShareClickResponse
from backend.app.schemas.rating import RatingCreate, RatingResponse
from backend.app.services.notifications import create_notification
from backend.app.utils.influencer import recalculate_user_tier
from backend.app.utils.ranking import average_rating, ranking_score

router = APIRouter(tags=["Events"])

POSTER_UPLOAD_DIR = Path("uploads/posters")
POSTER_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_POSTER_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")


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


def ensure_share_slug(event: Event) -> str:
    """
    Generate a stable share slug if missing.
    """
    if event.share_slug:
        return event.share_slug

    event.share_slug = f"evt-{event.id}-{uuid4().hex[:8]}"
    return event.share_slug


def user_has_approved_kyc(db: Session, user_id: int) -> bool:
    approved = db.query(KYCSubmission).filter(
        KYCSubmission.user_id == user_id,
        KYCSubmission.status == "approved",
    ).first()

    return approved is not None


def should_expose_payment_link(event: Event) -> bool:
    return bool(
        event.has_ticket_sales
        and event.approval_status == "approved"
        and event.is_live
        and event.payment_link
    )


def can_guest_checkout(event: Event) -> bool:
    """
    Guest checkout is only allowed for live approved ticketed events with a valid price.
    """
    return bool(
        event.has_ticket_sales
        and event.is_live
        and event.approval_status == "approved"
        and event.price is not None
        and event.price > 0
    )


def build_share_url(event: Event) -> str:
    slug = event.share_slug or ensure_share_slug(event)
    return f"{FRONTEND_BASE_URL}/events/{event.id}?share={slug}"


def serialize_event_response(event: Event) -> dict:
    """
    Central serializer.

    Important:
    - payment_link stays hidden unless event is approved + live + ticketed
    - share_url is always exposed for live events
    - guest checkout flag is exposed so frontend can show guest purchase CTA
    """
    data = EventResponse.model_validate(event).model_dump()

    if not should_expose_payment_link(event):
        data["payment_link"] = None

    data["share_slug"] = event.share_slug
    data["share_click_count"] = event.share_click_count or 0
    data["search_hit_count"] = event.search_hit_count or 0
    data["share_url"] = build_share_url(event)
    data["can_guest_checkout"] = can_guest_checkout(event)

    return data


def event_visible_to_user(event: Event, current_user: User | None) -> bool:
    """
    Public users can see only live approved events.
    Owners can still see their own hidden/pending events when authenticated.
    """
    is_public = event.is_live and event.approval_status == "approved"
    is_owner = current_user is not None and event.owner_id == current_user.id
    return is_public or is_owner


@router.get("/events")
def list_events(
    query: str | None = Query(default=None),
    category: str | None = Query(default=None),
    location_name: str | None = Query(default=None),
    ticketed_only: bool = Query(default=False),
    include_non_live: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """
    Backward-compatible list endpoint used by existing screens.

    Notes:
    - guests can browse public events without login
    - authenticated owners still see their own non-live events
    - returns a plain list to avoid breaking current frontend
    """
    events = db.query(Event).options(
        joinedload(Event.comments),
        joinedload(Event.ratings),
        joinedload(Event.owner),
    ).all()

    query_lower = (query or "").strip().lower()
    category_lower = (category or "").strip().lower()
    location_lower = (location_name or "").strip().lower()

    results = []

    for event in events:
        visible = event_visible_to_user(event, current_user)
        is_owner = current_user is not None and event.owner_id == current_user.id

        if not visible:
            continue

        if not include_non_live and not event.is_live and not is_owner:
            continue

        if ticketed_only and not getattr(event, "has_ticket_sales", False):
            continue

        if category_lower and (event.category or "").strip().lower() != category_lower:
            continue

        if location_lower and location_lower not in (event.location_name or "").strip().lower():
            continue

        if query_lower:
            haystack = " ".join([
                event.title or "",
                event.description or "",
                event.category or "",
                event.location_name or "",
            ]).lower()

            if query_lower not in haystack and not all(token in haystack for token in query_lower.split()):
                continue

            event.search_hit_count = (event.search_hit_count or 0) + 1

        score, distance = ranking_score(
            event,
            query,
            current_user.latitude if current_user else None,
            current_user.longitude if current_user else None,
        )

        payload = serialize_event_response(event)
        payload.update({
            "owner_username": event.owner.username if event.owner else None,
            "owner_contact_info": event.owner.contact_info if event.owner else None,
            "average_rating": average_rating(event),
            "ranking_score": score,
            "distance_km": distance,
        })
        results.append(payload)

    db.commit()

    results.sort(key=lambda item: item["title"].lower() if item.get("title") else "")
    return results[:limit]


@router.get("/events/discover", response_model=EventDiscoveryResponse)
def discover_events(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=4, ge=1, le=20),
    query: str | None = Query(default=None),
    category: str | None = Query(default=None),
    location_name: str | None = Query(default=None),
    ticketed_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """
    Optimized paginated discovery endpoint.

    Public users see only live approved events.
    This endpoint is public-focused and optimized for event card rendering.
    """
    cache_key = (
        f"events:discover:"
        f"page={page}:"
        f"page_size={page_size}:"
        f"query={query or ''}:"
        f"category={category or ''}:"
        f"location={location_name or ''}:"
        f"ticketed={ticketed_only}"
    )

    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    query_lower = (query or "").strip().lower()
    category_lower = (category or "").strip().lower()
    location_lower = (location_name or "").strip().lower()

    query_builder = db.query(Event).options(
        load_only(
            Event.id,
            Event.title,
            Event.description,
            Event.poster_url,
            Event.poster_type,
            Event.location_name,
            Event.category,
            Event.event_date,
            Event.price,
            Event.payment_method,
            Event.payment_link,
            Event.has_ticket_sales,
            Event.approval_status,
            Event.is_live,
            Event.share_slug,
            Event.share_click_count,
            Event.search_hit_count,
            Event.owner_id,
            Event.created_at,
        ),
        joinedload(Event.owner).load_only(
            User.id,
            User.username,
            User.contact_info,
        ),
    ).filter(
        Event.is_live.is_(True),
        Event.approval_status == "approved",
    )

    if ticketed_only:
        query_builder = query_builder.filter(Event.has_ticket_sales.is_(True))

    if category_lower:
        query_builder = query_builder.filter(func.lower(Event.category) == category_lower)

    if location_lower:
        query_builder = query_builder.filter(
            func.lower(Event.location_name).contains(location_lower)
        )

    if query_lower:
        like_value = f"%{query_lower}%"
        query_builder = query_builder.filter(
            or_(
                func.lower(Event.title).like(like_value),
                func.lower(Event.description).like(like_value),
                func.lower(Event.category).like(like_value),
                func.lower(Event.location_name).like(like_value),
            )
        )

    total = query_builder.count()
    total_pages = max(1, ceil(total / page_size))

    selected = (
        query_builder
        .order_by(Event.event_date.asc().nullslast(), Event.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for event in selected:
        payload = serialize_event_response(event)
        payload.update({
            "owner_username": event.owner.username if event.owner else None,
            "owner_contact_info": event.owner.contact_info if event.owner else None,
        })
        items.append(payload)

    response_payload = {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }

    cache_set(cache_key, response_payload, ttl=180)
    return response_payload


@router.post("/events/{event_id}/share/click", response_model=EventShareClickResponse)
def track_event_share_click(
    event_id: int,
    payload: EventShareClickRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Record a share click for analytics / viral loop measurement.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not event.is_live or event.approval_status != "approved":
        raise HTTPException(status_code=403, detail="This event is not publicly shareable")

    ensure_share_slug(event)

    click = EventShareClick(
        event_id=event.id,
        share_slug=event.share_slug,
        source=payload.source,
        referrer=payload.referrer,
        clicked_ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    event.share_click_count = (event.share_click_count or 0) + 1

    db.add(click)
    db.add(event)
    db.commit()
    db.refresh(event)

    return EventShareClickResponse(
        share_slug=event.share_slug,
        share_url=build_share_url(event),
        share_click_count=event.share_click_count,
    )


@router.get("/events/{event_id}", response_model=EventDetailResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """
    Public detail endpoint with optional owner personalization.

    Guests can view live approved events.
    Owners can still view their own non-live events.
    """
    event = db.query(Event).options(
        joinedload(Event.comments),
        joinedload(Event.ratings),
        joinedload(Event.owner),
    ).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not event_visible_to_user(event, current_user):
        raise HTTPException(status_code=403, detail="This event is not currently available")

    score, distance = ranking_score(
        event,
        None,
        current_user.latitude if current_user else None,
        current_user.longitude if current_user else None,
    )

    serialized = serialize_event_response(event)

    return EventDetailResponse(
        **serialized,
        owner_username=event.owner.username if event.owner else None,
        owner_contact_info=event.owner.contact_info if event.owner else None,
        comments=[CommentResponse.model_validate(c) for c in event.comments],
        ratings=[RatingResponse.model_validate(r) for r in event.ratings],
        average_rating=average_rating(event),
        ranking_score=score,
        distance_km=distance,
    )


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
        payment_link=None,
        has_ticket_sales=has_ticket_sales,
        approval_status=approval_status,
        is_live=is_live,
        owner_id=current_user.id,
        share_slug=None,
        share_click_count=0,
        search_hit_count=0,
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    ensure_share_slug(event)
    db.add(event)
    db.commit()
    db.refresh(event)

    cache_delete_prefix("events:discover:")

    return EventResponse(**serialize_event_response(event))


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
    update_data.pop("payment_link", None)

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

        if update_data["has_ticket_sales"] is False:
            update_data["price"] = None
            update_data["payment_method"] = None

    for field, value in update_data.items():
        setattr(event, field, value)

    ensure_share_slug(event)

    db.add(event)
    db.commit()
    db.refresh(event)

    cache_delete_prefix("events:discover:")

    return EventResponse(**serialize_event_response(event))


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

    cache_delete_prefix("events:discover:")

    return {"message": "Event deleted successfully"}


@router.post("/events/{event_id}/comment", response_model=CommentResponse)
async def add_comment(
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

    if event.owner_id != current_user.id:
        await create_notification(
            db,
            user_id=event.owner_id,
            type="comment",
            title="New comment on your event",
            message=f"{current_user.username} commented on {event.title}.",
            link=f"/events/{event.id}",
            entity_type="event",
            entity_id=event.id,
        )

    return comment


@router.post("/events/{event_id}/rate", response_model=RatingResponse)
async def add_rating(
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

    if event.owner_id != current_user.id:
        await create_notification(
            db,
            user_id=event.owner_id,
            type="rating",
            title="New rating on your event",
            message=f"{current_user.username} rated {event.title} {payload.value}/5.",
            link=f"/events/{event.id}",
            entity_type="event",
            entity_id=event.id,
        )

    return rating