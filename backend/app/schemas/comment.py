from pydantic import BaseModel
from datetime import datetime


class CommentCreate(BaseModel):
    body: str


class CommentResponse(BaseModel):

    id: int
    body: str
    user_id: int
    event_id: int
    created_at: datetime

    class Config:
        from_attributes = True