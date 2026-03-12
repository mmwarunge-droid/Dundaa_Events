from pydantic import BaseModel
from datetime import datetime


class RatingCreate(BaseModel):
    """Incoming rating request."""
    value: int


class RatingResponse(BaseModel):
    """Rating payload returned to clients."""
    id: int
    value: int
    user_id: int
    event_id: int
    created_at: datetime

    class Config:
        from_attributes = True
