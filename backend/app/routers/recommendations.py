from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.event import Event
from app.schemas.event import EventResponse
from app.utils.ranking import average_rating, ranking_score

router = APIRouter(tags=["Recommendations"])


@router.get("/recommendations")
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return the strongest recommended events for the current user.

    Since event latitude/longitude have been removed, recommendations are now
    based on:
    - event date priority
    - ratings
    - general ranking score
    """
    events = db.query(Event).options(
        joinedload(Event.ratings),
        joinedload(Event.comments)
    ).all()

    scored = []

    for event in events:
        score, distance = ranking_score(
            event,
            None,
            current_user.latitude,
            current_user.longitude
        )

        scored.append({
            **EventResponse.model_validate(event).model_dump(),
            "average_rating": average_rating(event),
            "ranking_score": score,
            "distance_km": distance,
        })

    scored.sort(key=lambda x: -x["ranking_score"])
    return scored[:10]