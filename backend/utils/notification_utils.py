"""Utility functions for sending notifications"""

import os
from flask import current_app
from pyfcm import FCMNotification # type: ignore

from backend.models.notification import Notification
from backend.models.push_subscription import PushSubscription
from backend.database import db
from backend.sse import sse

# Initialize FCM
# The API key should be stored in an environment variable
FCM_API_KEY = os.getenv("FCM_SERVER_KEY")
if FCM_API_KEY:
    push_service = FCMNotification(api_key=FCM_API_KEY)
    _push_warning_logged = True  # prevent warning when send_notification called
else:
    push_service = None
    _push_warning_logged = False
    print("⚠️ FCM_SERVER_KEY not set. Push notifications will be disabled.")


def send_notification(
    user_id: int,
    message: str,
    title: str = "Nouvelle Notification",
    data_payload: dict | None = None,
    send_push: bool = True # Control whether to attempt sending a push notification
) -> Notification:
    """
    Create a notification for a user, persist it, send via SSE, and optionally send a push notification.
    """
    # 1. Create and persist the database notification
    notification = Notification(user_id=user_id, message=message)
    db.session.add(notification)
    # It's often better to commit after attempting push, or make it transactional
    # For now, commit early for SSE.
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saving notification to DB for user {user_id}: {e}")
        raise # Re-raise to indicate failure

    # 2. Send real-time notification via SSE (if app is open)
    try:
        sse.publish(notification.to_dict(), type='notification', channel=f'user_{user_id}')
        current_app.logger.info(f"📣 SSE Notification for user {user_id}: {message}")
    except Exception as e:
        # Log SSE error but don't necessarily fail the whole notification process
        current_app.logger.error(f"Error sending SSE for user {user_id}: {e}")

    # 3. Send push notification (if app is backgrounded/closed)
    if send_push and push_service:
        subscriptions = PushSubscription.query.filter_by(user_id=user_id, is_active=True).all()
        registration_ids = [sub.token for sub in subscriptions]

        if registration_ids:
            # Default payload for click action, can be overridden by data_payload
            default_click_action = current_app.config.get('FRONTEND_URL', 'http://localhost:5173') + '/notifications'

            message_title = title
            message_body = message
            click_action = data_payload.get("click_action", default_click_action) if data_payload else default_click_action

            extra_notification_kwargs = {
                'sound': 'default',
                # 'icon': 'myicon' # Name of an icon resource in your Android app's drawable folder
            }
            if data_payload and data_payload.get('icon'):
                 extra_notification_kwargs['icon'] = data_payload['icon']


            # Send to multiple devices (if user has multiple tokens)
            result = push_service.notify_multiple_devices(
                registration_ids=registration_ids,
                message_title=message_title,
                message_body=message_body,
                data_message=data_payload, # Custom data for the app to handle
                click_action=click_action, # URL to open when notification is clicked
                extra_notification_kwargs=extra_notification_kwargs,
            )

            current_app.logger.info(f"📱 Push Notification attempt for user {user_id}. Result: {result}")

            # Handle results: Deactivate bad tokens, etc.
            if result and 'results' in result:
                for idx, res in enumerate(result['results']):
                    if 'error' in res:
                        error_type = res['error']
                        failed_token = registration_ids[idx]
                        current_app.logger.warning(f"Failed to send push to token {failed_token[:20]}...: {error_type}")
                        if error_type in ['NotRegistered', 'InvalidRegistration']:
                            # Deactivate or delete the token
                            failed_subscription = PushSubscription.query.filter_by(token=failed_token).first()
                            if failed_subscription:
                                failed_subscription.is_active = False
                                db.session.add(failed_subscription)
                                current_app.logger.info(f"Deactivated token: {failed_token[:20]}...")
                    else:
                        current_app.logger.info(f"Successfully sent push to token {registration_ids[idx][:20]}...")
                try:
                    db.session.commit() # Commit deactivation of tokens
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Error deactivating FCM tokens: {e}")
        else:
            current_app.logger.info(f"📱 No active push subscriptions found for user {user_id}.")
    elif send_push and not push_service:
        global _push_warning_logged
        if not _push_warning_logged:
            current_app.logger.warning(
                "Push service not initialized (FCM_SERVER_KEY missing). Skipping push notification."
            )
            _push_warning_logged = True

    return notification
