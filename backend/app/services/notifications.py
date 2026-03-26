from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from backend.app.models.kyc_submission import KYCSubmission
from backend.app.models.notification import Notification
from backend.app.models.user import User
from backend.app.services.websocket_manager import notification_ws_manager


async def create_notification(
    db: Session,
    *,
    user_id: int,
    type: str,
    title: str,
    message: str,
    link: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> Notification:
    """
    Persist notification and push it over WebSocket.
    """
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link,
        entity_type=entity_type,
        entity_id=entity_id,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    await notification_ws_manager.send_to_user(
        user_id,
        {
            "event": "notification.created",
            "notification": {
                "id": notification.id,
                "type": notification.type,
                "title": notification.title,
                "message": notification.message,
                "link": notification.link,
                "entity_type": notification.entity_type,
                "entity_id": notification.entity_id,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat() if notification.created_at else None,
            },
        },
    )

    return notification


def unread_count(db: Session, user_id: int) -> int:
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    ).count()


async def maybe_create_kyc_reminder(db: Session, current_user: User) -> int:
    """
    Creates at most one recent reminder within 24h.

    Rules:
    - if no KYC exists and user is likely a creator → remind
    - if latest KYC is pending → remind
    - if latest KYC is rejected → remind to review notes
    """
    latest = db.query(KYCSubmission).filter(
        KYCSubmission.user_id == current_user.id
    ).order_by(
        KYCSubmission.submitted_at.desc()
    ).first()

    recent_cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    existing_recent = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.type == "kyc_reminder",
        Notification.created_at >= recent_cutoff,
    ).first()

    if existing_recent:
        return 0

    if latest is None:
        await create_notification(
            db,
            user_id=current_user.id,
            type="kyc_reminder",
            title="Complete your KYC",
            message="Submit your KYC to unlock ticketed events and creator monetization features.",
            link="/dashboard",
            entity_type="kyc",
            entity_id=None,
        )
        return 1

    if latest.status == "pending":
        await create_notification(
            db,
            user_id=current_user.id,
            type="kyc_reminder",
            title="Your KYC is still pending",
            message="Your KYC submission is awaiting admin review.",
            link="/dashboard",
            entity_type="kyc",
            entity_id=latest.id,
        )
        return 1

    if latest.status == "rejected":
        await create_notification(
            db,
            user_id=current_user.id,
            type="kyc_reminder",
            title="Your KYC needs attention",
            message="Your KYC was rejected. Review the notes and resubmit.",
            link="/dashboard",
            entity_type="kyc",
            entity_id=latest.id,
        )
        return 1

    return 0