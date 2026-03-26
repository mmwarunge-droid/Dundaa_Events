from __future__ import annotations

from datetime import date, datetime, timezone
from math import radians, sin, cos, sqrt, atan2
from typing import Optional, Tuple

from backend.app.models.event import Event


def safe_lower(value: Optional[str]) -> str:
    """
    Normalize text safely for case-insensitive matching.
    """
    return (value or "").strip().lower()


def haversine_km(
    lat1: Optional[float],
    lon1: Optional[float],
    lat2: Optional[float],
    lon2: Optional[float],
) -> Optional[float]:
    """
    Compute the great-circle distance between two points on Earth in kilometers.

    Returns None if either point is incomplete.
    """
    if None in (lat1, lon1, lat2, lon2):
        return None

    earth_radius_km = 6371.0

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    )
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return earth_radius_km * c


def average_rating(event: Event) -> float:
    """
    Compute average rating for an event from its related ratings.
    """
    ratings = getattr(event, "ratings", []) or []
    if not ratings:
        return 0.0

    total = sum(r.value for r in ratings)
    return round(total / len(ratings), 2)


def keyword_match_score(event: Event, query: Optional[str]) -> float:
    """
    Score keyword relevance using simple weighted text matching.

    Fields used:
    - title
    - description
    - category
    - location_name
    """
    if not query or not query.strip():
        return 0.0

    q = safe_lower(query)
    title = safe_lower(getattr(event, "title", None))
    description = safe_lower(getattr(event, "description", None))
    category = safe_lower(getattr(event, "category", None))
    location_name = safe_lower(getattr(event, "location_name", None))

    score = 0.0

    if q in title:
        score += 35.0
    if q in category:
        score += 20.0
    if q in location_name:
        score += 15.0
    if q in description:
        score += 10.0

    query_tokens = [token for token in q.split() if token]
    for token in query_tokens:
        if token in title:
            score += 8.0
        if token in category:
            score += 5.0
        if token in location_name:
            score += 3.0
        if token in description:
            score += 2.0

    return score


def engagement_score(event: Event) -> float:
    """
    Lightweight engagement score based on social proof.

    Current inputs:
    - number of ratings
    - number of comments
    """
    ratings = getattr(event, "ratings", []) or []
    comments = getattr(event, "comments", []) or []

    rating_count = len(ratings)
    comment_count = len(comments)

    return (rating_count * 3.0) + (comment_count * 1.5)


def freshness_score(event: Event) -> float:
    """
    Favor upcoming events and recent event records.

    Rules:
    - upcoming events get a higher score
    - older past events get penalized
    """
    score = 0.0

    event_date = getattr(event, "event_date", None)
    today = date.today()

    if event_date:
        days_diff = (event_date - today).days

        if days_diff < 0:
            score -= min(abs(days_diff) * 1.5, 30.0)
        elif days_diff == 0:
            score += 25.0
        elif days_diff <= 7:
            score += 20.0
        elif days_diff <= 30:
            score += 12.0
        elif days_diff <= 90:
            score += 6.0
        else:
            score += 2.0

    created_at = getattr(event, "created_at", None)
    if created_at:
        if isinstance(created_at, datetime):
            now = datetime.now(timezone.utc)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)

            age_days = (now - created_at).days
            if age_days <= 7:
                score += 6.0
            elif age_days <= 30:
                score += 3.0

    return score


def quality_score(event: Event) -> float:
    """
    Reward higher-quality listings.

    Signals:
    - average rating
    - poster
    - location
    - map link
    - description length
    """
    score = 0.0

    avg = average_rating(event)
    score += avg * 8.0

    if getattr(event, "poster_url", None):
        score += 4.0

    if getattr(event, "location_name", None):
        score += 4.0

    if getattr(event, "google_map_link", None):
        score += 4.0

    description = getattr(event, "description", "") or ""
    if len(description.strip()) >= 80:
        score += 5.0
    elif len(description.strip()) >= 30:
        score += 2.0

    return score


def distance_score(distance_km: Optional[float]) -> float:
    """
    Convert distance into a ranking contribution.

    If distance is unknown, return neutral score.
    """
    if distance_km is None:
        return 0.0

    if distance_km <= 5:
        return 20.0
    if distance_km <= 15:
        return 12.0
    if distance_km <= 50:
        return 6.0
    if distance_km <= 100:
        return 2.0

    return -4.0


def ranking_score(
    event: Event,
    query: Optional[str],
    user_latitude: Optional[float],
    user_longitude: Optional[float],
) -> Tuple[float, Optional[float]]:
    """
    Main ranking function for Dundaa events.

    Returns:
    - total score
    - optional distance in km

    Current algorithm blends:
    - keyword relevance
    - rating quality
    - engagement
    - freshness
    - listing quality
    - distance, when available
    """
    # Current data model does not store event lat/lng.
    # We keep distance as None until event coordinates are introduced.
    distance_km = None

    total = 0.0
    total += keyword_match_score(event, query)
    total += quality_score(event)
    total += engagement_score(event)
    total += freshness_score(event)
    total += distance_score(distance_km)

    if getattr(event, "has_ticket_sales", False):
        total += 3.0

    if getattr(event, "approval_status", None) == "approved":
        total += 2.0

    return round(total, 2), distance_km