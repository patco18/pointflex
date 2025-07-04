"""
Utilities for dispatching webhooks
"""
import json
import requests
from datetime import datetime, timedelta
from flask import current_app

from database import db # Corrected import
from backend.models.webhook_subscription import WebhookSubscription # This import is fine as it's a sibling package
from backend.models.webhook_delivery_log import WebhookDeliveryLog # This import is fine

# Configuration for webhook delivery
WEBHOOK_TIMEOUT_SECONDS = 10
WEBHOOK_MAX_RETRIES = 3 # For a more advanced system; initial implementation might not auto-retry
WEBHOOK_RETRY_DELAY_SECONDS = 60 # Initial delay for retries

def dispatch_webhook_event(event_type: str, payload_data: dict, company_id: int | None = None):
    """
    Finds relevant webhook subscriptions and attempts to dispatch the event.

    :param event_type: The type of event (e.g., "user.created").
    :param payload_data: A dictionary representing the event payload.
    :param company_id: The ID of the company this event pertains to (if applicable).
                       If None, only global webhooks (if any) might be triggered, or it's an error.
    """
    if not company_id:
        current_app.logger.warning(f"dispatch_webhook_event called for event '{event_type}' without a company_id. No company-specific webhooks will be sent.")
        # Depending on policy, you might want to fetch global webhooks if company_id is None
        # For now, assuming events are typically company-scoped.
        # query = WebhookSubscription.query.filter(
        #     WebhookSubscription.is_active == True,
        #     WebhookSubscription.company_id == None # Global webhooks
        # )
        return

    query = WebhookSubscription.query.filter(
        WebhookSubscription.is_active == True,
        WebhookSubscription.company_id == company_id
    )

    subscriptions_to_notify = []
    for sub in query.all():
        if event_type in sub.subscribed_events:
            subscriptions_to_notify.append(sub)

    if not subscriptions_to_notify:
        current_app.logger.info(f"No active subscriptions for event '{event_type}' in company {company_id}.")
        return

    # Prepare the base payload structure
    full_payload = {
        "event_id": f"evt_{datetime.utcnow().timestamp()}_{secrets.token_hex(8)}", # Unique event ID
        "event_type": event_type,
        "created_at": datetime.utcnow().isoformat(),
        "data": payload_data,
        "company_id": company_id
    }

    payload_json_bytes = json.dumps(full_payload, sort_keys=True, default=str).encode('utf-8')

    for sub in subscriptions_to_notify:
        send_single_webhook(sub, event_type, full_payload, payload_json_bytes)


def send_single_webhook(subscription: WebhookSubscription, event_type: str, full_payload: dict, payload_json_bytes: bytes, attempt: int = 1):
    """
    Sends a single webhook to the subscription's target URL.
    Logs the delivery attempt.
    """
    signature = subscription.generate_signature(payload_json_bytes)
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'PointFlex-Webhook/1.0',
        f'X-{current_app.config.get("WEBHOOK_SIGNATURE_HEADER_NAME", "PointFlex")}-Signature-256': signature,
        # Could add a request ID header for better tracing
    }

    delivery_log = WebhookDeliveryLog(
        subscription_id=subscription.id,
        event_type=event_type,
        payload=payload_json_bytes.decode('utf-8'), # Store the JSON string
        target_url=subscription.target_url,
        retry_attempt=attempt -1 # 0-indexed attempts
    )
    db.session.add(delivery_log)
    # Commit early to get delivery_log.id if needed, or commit after response.
    # For now, let's commit after getting response.

    start_time = datetime.utcnow()
    try:
        current_app.logger.info(f"Sending webhook for event '{event_type}' to {subscription.target_url} (Attempt {attempt}) for sub ID {subscription.id}")
        response = requests.post(
            subscription.target_url,
            data=payload_json_bytes,
            headers=headers,
            timeout=WEBHOOK_TIMEOUT_SECONDS
        )
        end_time = datetime.utcnow()

        delivery_log.duration_ms = int((end_time - start_time).total_seconds() * 1000)
        delivery_log.response_status_code = response.status_code
        delivery_log.response_headers = json.dumps(dict(response.headers))
        # Log only a part of the response body to avoid storing too much data
        delivery_log.response_body = response.text[:1024] if response.text else None

        if 200 <= response.status_code < 300:
            delivery_log.is_success = True
            current_app.logger.info(f"Webhook to {subscription.target_url} succeeded with status {response.status_code}.")
        else:
            delivery_log.is_success = False
            delivery_log.error_message = f"HTTP Error: {response.status_code}"
            current_app.logger.warning(f"Webhook to {subscription.target_url} failed with status {response.status_code}. Response: {response.text[:200]}")
            # Basic retry logic placeholder (would be better with a task queue)
            # if attempt < WEBHOOK_MAX_RETRIES:
            #     current_app.logger.info(f"Scheduling retry for webhook to {subscription.target_url}")
            #     # This is where you'd schedule a background task
            #     # e.g., schedule_webhook_retry(delivery_log.id, delay=WEBHOOK_RETRY_DELAY_SECONDS * attempt)

    except requests.exceptions.RequestException as e:
        end_time = datetime.utcnow()
        delivery_log.duration_ms = int((end_time - start_time).total_seconds() * 1000)
        delivery_log.is_success = False
        delivery_log.error_message = str(e)
        current_app.logger.error(f"Error sending webhook to {subscription.target_url}: {e}")
        # Retry logic placeholder
        # if attempt < WEBHOOK_MAX_RETRIES:
        #     current_app.logger.info(f"Scheduling retry for webhook to {subscription.target_url} due to exception.")

    finally:
        try:
            db.session.commit() # Commit the delivery log
        except Exception as db_err:
            db.session.rollback()
            current_app.logger.error(f"Failed to save WebhookDeliveryLog: {db_err}")


# Need to import secrets for event_id generation in dispatch_webhook_event
import secrets
