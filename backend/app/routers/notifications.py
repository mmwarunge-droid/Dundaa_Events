from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.dependencies import get_current_user, get_db
from backend.app.models.notification import Notification
from backend.app.models.user import User
from backend.app.schemas.notification import (
    NotificationBootstrapResponse,
    NotificationListResponse,
    NotificationMarkReadResponse,
    NotificationResponse,
)
from backend.app.services.notifications import maybe_create_kyc_reminder, unread_count

router = APIRouter(tags=["Notifications"])


@router.get("/notifications", response_model=NotificationListResponse)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(
        Notification.created_at.desc()
    ).limit(50).all()

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(item) for item in items],
        unread_count=unread_count(db, current_user.id),
    )


@router.post("/notifications/{notification_id}/read", response_model=NotificationMarkReadResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Notification not found")

    item.is_read = True
    db.add(item)
    db.commit()

    return NotificationMarkReadResponse(
        success=True,
        notification_id=item.id,
    )


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).all()

    for item in items:
        item.is_read = True
        db.add(item)

    db.commit()
    return {"success": True}


@router.post("/notifications/bootstrap", response_model=NotificationBootstrapResponse)
async def bootstrap_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates reminder-type notifications that should exist even without
    a business event trigger, like KYC reminders.
    """
    created = await maybe_create_kyc_reminder(db, current_user)

    return NotificationBootstrapResponse(
        created_count=created,
        unread_count=unread_count(db, current_user.id),
    )