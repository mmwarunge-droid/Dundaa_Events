from __future__ import annotations

from math import ceil

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_db, get_optional_current_user
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventDiscoveryResponse, EventResponse
from app.utils.ranking import average_rating, ranking_score

router = APIRouter(tags=["Event Search"])


def can_guest_checkout(event: Event) -> bool:
    return bool(
        event.has_ticket_sales
        and event.is_live
        and event.approval_status == "approved"
        and event.price is not None
        and event.price > 0
    )


def event_visible_to_user(event: Event, current_user: User | None) -> bool:
    is_public = event.is_live and event.approval_status == "approved"
    is_owner = current_user is not None and event.owner_id == current_user.id
    return is_public or is_owner


def build_share_url(event: Event) -> str:
    if event.share_slug:
        return f"/events/{event.id}?share={event.share_slug}"
    return f"/events/{event.id}"


@router.get("/events/search", response_model=EventDiscoveryResponse)
def search_events(
    q: str = Query(default="", description="Search text"),
    category: str | None = Query(default=None),
    location_name: str | None = Query(default=None),
    ticketed_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """
    Paginated event search API with guest support.
    """
    events = (
        db.query(Event)
        .options(
            joinedload(Event.comments),
            joinedload(Event.ratings),
            joinedload(Event.owner),
        )
        .all()
    )

    q_lower = (q or "").strip().lower()
    category_lower = (category or "").strip().lower()
    location_lower = (location_name or "").strip().lower()

    results = []

    for event in events:
        if not event_visible_to_user(event, current_user):
            continue

        if ticketed_only and not getattr(event, "has_ticket_sales", False):
            continue

        if category_lower and (event.category or "").strip().lower() != category_lower:
            continue

        if location_lower and location_lower not in (event.location_name or "").strip().lower():
            continue

        if q_lower:
            haystack = " ".join([
                event.title or "",
                event.description or "",
                event.category or "",
                event.location_name or "",
            ]).lower()

            if q_lower not in haystack and not all(token in haystack for token in q_lower.split()):
                continue

            event.search_hit_count = (event.search_hit_count or 0) + 1

        score, distance = ranking_score(
            event,
            q,
            current_user.latitude if current_user else None,
            current_user.longitude if current_user else None,
        )

        payload = {
            **EventResponse.model_validate(event).model_dump(),
            "owner_username": event.owner.username if event.owner else None,
            "owner_contact_info": event.owner.contact_info if event.owner else None,
            "average_rating": average_rating(event),
            "ranking_score": score,
            "distance_km": distance,
            "share_url": build_share_url(event),
            "can_guest_checkout": can_guest_checkout(event),
        }
        results.append(payload)

    db.commit()

    results.sort(
        key=lambda item: (
            -(1 if item.get("can_guest_checkout") else 0),
            -(item.get("search_hit_count", 0) + item.get("share_click_count", 0)),
            item.get("event_date") or "9999-12-31",
        )
    )

    total = len(results)
    total_pages = max(1, ceil(total / page_size))
    start = (page - 1) * page_size
    end = start + page_size

    return EventDiscoveryResponse(
        items=results[start:end],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )