from pydantic import BaseModel
from datetime import datetime


class CommentCreate(BaseModel):
    """Incoming comment body."""
    body: str


class CommentResponse(BaseModel):
    """Comment payload returned to clients."""
    id: int
    body: str
    user_id: int
    event_id: int
    created_at: datetime

    class Config:
        from_attributes = True
