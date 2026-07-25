from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User
from app.services.email_service import send_notification_email

logger = logging.getLogger(__name__)


def create_notification(db: Session, user_id: int, message: str, ntype: str, paper_id: int | None = None) -> Notification:
    notification = Notification(
        user_id=user_id,
        paper_id=paper_id,
        type=ntype,
        message=message,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    user = db.query(User).filter(User.id == user_id).first()
    if user and user.email:
        delivered = send_notification_email(
            to_email=user.email,
            to_name=user.full_name,
            subject=_notification_subject(ntype),
            message=message,
        )
        if not delivered:
            logger.warning("Notification email was not delivered for user_id=%s, type=%s", user_id, ntype)
    else:
        logger.warning("Notification email skipped: user_id=%s has no email", user_id)
    return notification


def list_notifications(db: Session, user_id: int, limit: int = 50) -> list[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(limit)
        .all()
    )


def mark_notification_read(db: Session, notification: Notification) -> Notification:
    notification.is_read = True
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_notification(db: Session, notification_id: int) -> Notification | None:
    return db.query(Notification).filter(Notification.id == notification_id).first()


def _notification_subject(ntype: str) -> str:
    subjects = {
        "paper_submission": "New paper submitted for your review",
        "paper_review": "Update on your paper submission",
        "workflow_update": "Gimpa Research Repository workflow update",
        "account_activation_required": "New account pending activation",
        "account_activated": "Your Gimpa Research Repository account is now active",
    }
    return subjects.get(ntype, "New Gimpa Research Repository notification")
