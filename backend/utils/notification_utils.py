"""Utility functions for sending notifications"""

from models.notification import Notification
from database import db


def send_notification(user_id: int, message: str) -> Notification:
    """Create a notification for a user and persist it."""
    notification = Notification(user_id=user_id, message=message)
    db.session.add(notification)
    db.session.commit()
    print(f"📣 Notification for user {user_id}: {message}")
    return notification
