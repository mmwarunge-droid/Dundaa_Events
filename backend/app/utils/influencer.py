from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from backend.app.models.influencer_star import InfluencerStar
from backend.app.models.user import User


THREE_STAR_CONVERSION = 0.25
FOUR_STAR_CONVERSION = 0.50
FIVE_STAR_CONVERSION = 1.00

STAR_DECAY_DAYS = 90

# Tier thresholds based on active five-star equivalent score.
# You can tune these later as platform volume grows.
TIER_THRESHOLDS = {
    "none": 0.0,
    "rising": 3.0,
    "advanced": 8.0,
    "super": 15.0,
}


def star_equivalent_from_source(source_rating: int) -> float:
    """
    Convert raw source rating into five-star equivalent contribution.
    """
    if source_rating == 5:
        return FIVE_STAR_CONVERSION
    if source_rating == 4:
        return FOUR_STAR_CONVERSION
    if source_rating == 3:
        return THREE_STAR_CONVERSION
    return 0.0


def get_active_stars(db: Session, user: User) -> List[InfluencerStar]:
    """
    Return only active stars inside the decay window.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=STAR_DECAY_DAYS)

    stars = (
        db.query(InfluencerStar)
        .filter(
            InfluencerStar.user_id == user.id,
            InfluencerStar.created_at >= cutoff,
        )
        .all()
    )

    return stars


def calculate_active_five_star_equivalent(stars: List[InfluencerStar]) -> float:
    """
    Sum active stars into a normalized five-star equivalent total.
    """
    total = 0.0

    for star in stars:
        if star.equivalent_five_star_value:
            total += float(star.equivalent_five_star_value)
        else:
            total += star_equivalent_from_source(star.source_rating)

    return round(total, 2)


def determine_influencer_tier(active_five_star_equivalent: float) -> str:
    """
    Super influencer algorithm.

    Tier mapping:
    - none
    - rising
    - advanced
    - super
    """
    if active_five_star_equivalent >= TIER_THRESHOLDS["super"]:
        return "super"
    if active_five_star_equivalent >= TIER_THRESHOLDS["advanced"]:
        return "advanced"
    if active_five_star_equivalent >= TIER_THRESHOLDS["rising"]:
        return "rising"
    return "none"


def calculate_wallet_bonus_for_tier(tier: str) -> float:
    """
    Placeholder helper for future monetization logic.

    This does not mutate wallet balance automatically.
    It only centralizes future tier bonus rules.
    """
    if tier == "super":
        return 1.0
    if tier == "advanced":
        return 0.5
    if tier == "rising":
        return 0.2
    return 0.0


def recalculate_user_tier(db: Session, user: User | None) -> Dict[str, Any]:
    """
    Recalculate and persist a user's influencer tier.

    Returns a summary object suitable for:
    - /stars endpoint
    - dashboard widgets
    """
    if user is None:
        return {
            "tier": "none",
            "active_five_star_equivalent": 0.0,
            "active_star_count": 0,
            "decay_window_days": STAR_DECAY_DAYS,
        }

    active_stars = get_active_stars(db, user)
    active_five_star_equivalent = calculate_active_five_star_equivalent(active_stars)
    tier = determine_influencer_tier(active_five_star_equivalent)

    user.influencer_tier = tier
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "tier": tier,
        "active_five_star_equivalent": active_five_star_equivalent,
        "active_star_count": len(active_stars),
        "decay_window_days": STAR_DECAY_DAYS,
    }