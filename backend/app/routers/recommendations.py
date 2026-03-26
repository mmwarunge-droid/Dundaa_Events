from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from backend.app.dependencies import get_db, get_current_user
from backend.app.models.user import User
from backend.app.models.event import Event
from backend.app.schemas.event import EventResponse
from backend.app.utils.ranking import average_rating, ranking_score

router = APIRouter(tags=["Recommendations"])


@router.get("/recommendations")
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return recommended events.

    Ranking uses:
    - rating
    - event popularity
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
            "distance_km": distance
        })

    scored.sort(key=lambda x: -x["ranking_score"])

    return scored[:10]