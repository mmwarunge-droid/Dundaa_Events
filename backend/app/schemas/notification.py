from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    link: str | None = None
    entity_type: str | None = None
    entity_id: int | None = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int


class NotificationMarkReadResponse(BaseModel):
    success: bool
    notification_id: int


class NotificationBootstrapResponse(BaseModel):
    created_count: int
    unread_count: int