from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.influencer_star import InfluencerStar
from app.models.user import User


# Tier thresholds measured in active five-star equivalents.
NANO_THRESHOLD = 20
MEGA_THRESHOLD = 50
SUPER_THRESHOLD = 100
# Star activity expires after roughly 3 months.
DECAY_DAYS = 90


def get_active_stars(db: Session, user_id: int) -> list[InfluencerStar]:
    """Return non-expired star rows for a user."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=DECAY_DAYS)
    return db.query(InfluencerStar).filter(
        InfluencerStar.user_id == user_id,
        InfluencerStar.created_at >= cutoff,
        InfluencerStar.equivalent_five_star_value > 0,
    ).all()


def compute_equivalent_five_star(five_count: int, four_count: int, three_count: int) -> int:
    """Convert raw 3-star and 4-star counts to five-star equivalents."""
    converted_from_four = four_count // 5
    converted_from_three = three_count // 10
    return five_count + converted_from_four + converted_from_three


def tier_from_star_count(stars: int) -> str:
    """Map active star count to Dundaa influencer tier."""
    if stars >= SUPER_THRESHOLD:
        return "super"
    if stars >= MEGA_THRESHOLD:
        return "mega"
    if stars >= NANO_THRESHOLD:
        return "nano"
    return "none"


def recalculate_user_tier(db: Session, user: User) -> dict:
    """Apply decay and recompute the user's tier and active star summary."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=DECAY_DAYS)
    star_rows = db.query(InfluencerStar).filter(
        InfluencerStar.user_id == user.id,
        InfluencerStar.created_at >= cutoff,
    ).all()

    five_count = sum(1 for s in star_rows if s.source_rating == 5)
    four_count = sum(1 for s in star_rows if s.source_rating == 4)
    three_count = sum(1 for s in star_rows if s.source_rating == 3)
    active_equivalent = compute_equivalent_five_star(five_count, four_count, three_count)
    user.influencer_tier = tier_from_star_count(active_equivalent)
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "active_five_star_equivalent": active_equivalent,
        "tier": user.influencer_tier,
        "raw_five_star_count": five_count,
        "raw_four_star_count": four_count,
        "raw_three_star_count": three_count,
    }
