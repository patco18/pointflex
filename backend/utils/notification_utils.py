"""Utility functions for sending notifications"""

from models.notification import Notification
from database import db
from flask_sse import sse


def send_notification(user_id: int, message: str) -> Notification:
    """Create a notification for a user and persist it."""
    notification = Notification(user_id=user_id, message=message)
    db.session.add(notification)
    db.session.commit()
    sse.publish(notification.to_dict(), type='notification', channel=f'user_{user_id}')
    print(f"📣 Notification for user {user_id}: {message}")
    return notification
