from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_user, get_db
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventResponse
from app.utils.ranking import average_rating, ranking_score

router = APIRouter(tags=["Event Search"])


@router.get("/events/search")
def search_events(
    q: str = Query(default="", description="Search text"),
    category: str | None = Query(default=None),
    location_name: str | None = Query(default=None),
    ticketed_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dedicated event search API.

    Supports:
    - free-text search
    - category filtering
    - location filtering
    - ticketed-only filtering

    Visibility:
    - public users see only live events
    - owner can still see own non-live events if they happen to match
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
        is_public = getattr(event, "is_live", True)
        is_owner = event.owner_id == current_user.id

        if not is_public and not is_owner:
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

        score, distance = ranking_score(
            event,
            q,
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

    results.sort(key=lambda item: -item["ranking_score"])

    return results[:limit]