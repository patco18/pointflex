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

    payload_json_bytes_str = json.dumps(full_payload, sort_keys=True, default=str)
    # No longer encode to bytes here, task will do it. Pass string to RQ.

    # Get RQ queue
    # This assumes Redis is configured for the Flask app.
    # RQ connection and queue should ideally be managed globally or via Flask extension.
    try:
        redis_url = current_app.config.get('REDIS_URL', os.environ.get('REDIS_URL', 'redis://localhost:6379/0'))
        redis_conn = Redis.from_url(redis_url)
        # Using a dedicated queue for webhooks
        webhook_queue = Queue("pointflex_webhooks", connection=redis_conn)
    except Exception as e:
        current_app.logger.error(f"Failed to connect to Redis for RQ: {e}. Webhooks will not be queued.")
        return

    for sub in subscriptions_to_notify:
        try:
            # Enqueue the task
            # The task path is 'backend.tasks.webhook_tasks.send_webhook_attempt_task'
            job = webhook_queue.enqueue(
                'backend.tasks.webhook_tasks.send_webhook_attempt_task',
                args=(sub.id, event_type, full_payload, payload_json_bytes_str),
                job_timeout=current_app.config.get('WEBHOOK_TIMEOUT_SECONDS', 10) * 2, # Give task more time than single HTTP timeout
                retry=Retry(max=current_app.config.get('WEBHOOK_MAX_RETRIES', 3), interval=[10, 30, 60]), # Example retry strategy
                # result_ttl=3600, # How long to keep job result
                # failure_ttl=... # How long to keep failed job info
                job_id=f"webhook_{sub.id}_{full_payload.get('event_id', secrets.token_hex(4))}" # Optional: custom job ID
            )
            current_app.logger.info(f"Enqueued webhook job {job.id} for event '{event_type}' to sub ID {sub.id}, URL {sub.target_url}")

            # Optionally, create an initial WebhookDeliveryLog here with 'queued' status
            # This ensures a log exists even if the worker never picks up the task.
            # However, the task itself also creates a log upon actual attempt.
            # For simplicity, we'll let the task create its own log.

        except Exception as e:
            current_app.logger.error(f"Failed to enqueue webhook task for sub ID {sub.id}, event '{event_type}': {e}", exc_info=True)

# The send_single_webhook function is now effectively replaced by the RQ task in webhook_tasks.py
# We can remove it or keep it for non-RQ/testing purposes if clearly marked.
# For this refactor, it's assumed to be replaced.

# Need to import secrets for event_id generation in dispatch_webhook_event
import secrets
from redis import Redis # For RQ connection
from rq import Queue, Retry # For RQ
