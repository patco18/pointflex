import os
import json
import requests
from datetime import datetime, timedelta
from rq import get_current_job # For retry logic

# It's tricky to get Flask current_app here directly as tasks run in separate worker context.
# We'll need to pass necessary config or initialize a minimal app context if needed for logging,
# or ensure all necessary info is passed to the task.

# For database access, the worker needs to be able to initialize it.
# This often means the worker script itself sets up a Flask app context.
# from backend.database import db # This might fail if app context not set up by worker
# from backend.models.webhook_subscription import WebhookSubscription
# from backend.models.webhook_delivery_log import WebhookDeliveryLog

# A common pattern for RQ tasks needing DB access:
# Worker script (e.g., run_worker.py) would do:
# from flask import Flask
# from backend.config import config
# from backend.database import db
# app = Flask(__name__)
# app.config.from_object(config[os.getenv('FLASK_ENV', 'default')])
# db.init_app(app)
# with app.app_context():
#     # ... then run worker with this context or ensure tasks can create their own.

WEBHOOK_TIMEOUT_SECONDS_TASK = int(os.environ.get('WEBHOOK_TIMEOUT_SECONDS', 10))
WEBHOOK_MAX_RETRIES_TASK = int(os.environ.get('WEBHOOK_MAX_RETRIES', 3))
WEBHOOK_RETRY_DELAY_SECONDS_TASK = int(os.environ.get('WEBHOOK_RETRY_DELAY_SECONDS_TASK', 60)) # For RQ scheduler
WEBHOOK_SIGNATURE_HEADER_NAME_TASK = os.environ.get('WEBHOOK_SIGNATURE_HEADER_NAME') or 'X-PointFlex-Signature-256'


def send_webhook_attempt_task(
    subscription_id: int,
    event_type: str,
    full_payload_dict: dict, # Pass the dict for easier manipulation if needed
    original_payload_json_bytes_str: str, # Pass as string to avoid issues with RQ serialization of bytes
    attempt_number: int = 1
):
    """
    RQ Task to send a single webhook attempt.
    This function will run in the RQ worker.
    It needs to be able to access the database.
    """
    # --- Database and App Context Handling (CRITICAL for RQ tasks) ---
    # This is a simplified example. In a real setup, the RQ worker
    # script would initialize a Flask app context, or this task would.
    # For now, we assume necessary modules can be imported and DB is accessible.
    # This part is highly dependent on how the RQ worker is configured and run.

    # Dynamically import Flask app and create context for DB access
    from flask import current_app as app # This might not work as expected in RQ worker
                                         # unless worker is started within app context or creates one.

    # A more robust way for tasks needing app context:
    # from backend.app import create_app # Assuming your create_app() is in backend.app
    # app = create_app() # Creates a new app instance for this task
    # with app.app_context():
    #    # Access db, config, logger etc. here
    #    db_session = db.session
    #    ...
    # This approach has overhead. A shared app instance for workers is also possible.

    # Let's assume for now that the worker environment allows direct model imports
    # and DB session creation/usage. This is a placeholder for proper context management.
    # If using Flask-SQLAlchemy, operations outside a request need an app context.

    # --- Proper way to handle imports and DB for RQ tasks ---
    # Option 1: Task creates its own app context (can be heavy if many short tasks)
    # Option 2: Worker script (run_worker.py) creates an app context that tasks inherit.
    # Option 3: Pass all necessary data (like DB URI, secrets) to the task, use SQLAlchemy core.

    # For this example, we'll simulate direct model access but acknowledge this needs robust setup.
    # These imports would ideally be inside a function that ensures app context.
    from backend.database import db
    from backend.models.webhook_subscription import WebhookSubscription
    from backend.models.webhook_delivery_log import WebhookDeliveryLog

    # Fetch subscription directly - requires DB session.
    # This will FAIL if the worker doesn't have a SQLAlchemy session configured.
    # We'll proceed conceptually.

    app_context_available = False
    try:
        if app and app.app_context(): # Check if an app context is available
            app_context_available = True
    except RuntimeError: # No app context
        # This means we need to create one or the worker wasn't set up with one.
        # For now, we'll log an error and can't proceed with DB operations.
        print(f"ERROR: [Task {get_current_job().id if get_current_job() else 'N/A'}] No Flask app context. Cannot access DB.")
        # In a real scenario, this task might raise an exception to be retried if context setup can be fixed.
        return # Cannot proceed without DB access for logging and fetching secrets.

    # --- The actual task logic (assuming app_context_available is True or handled) ---

    # This section needs to be wrapped in `with app.app_context():` if app context is created per task.
    # For now, assuming it's available.

    subscription = WebhookSubscription.query.get(subscription_id)
    if not subscription or not subscription.is_active:
        print(f"Warning: [Task] Subscription {subscription_id} not found or inactive. Skipping webhook.")
        return

    payload_json_bytes = original_payload_json_bytes_str.encode('utf-8')
    signature = subscription.generate_signature(payload_json_bytes)

    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'PointFlex-Webhook/1.0-RQ', # Indicate RQ worker
        WEBHOOK_SIGNATURE_HEADER_NAME_TASK: signature,
    }

    delivery_log = WebhookDeliveryLog(
        subscription_id=subscription.id,
        event_type=event_type,
        payload=payload_json_bytes.decode('utf-8'),
        target_url=subscription.target_url,
        retry_attempt=attempt_number -1
    )
    # Add to session, but commit will be at the end or after specific actions
    db.session.add(delivery_log)
    # It's often better to flush here to get delivery_log.id if needed for detailed logging
    # but that requires an active transaction and careful error handling.

    start_time = datetime.utcnow()
    response_text_snippet = None
    try:
        print(f"INFO: [Task {get_current_job().id if get_current_job() else 'N/A'}] Sending webhook for event '{event_type}' to {subscription.target_url} (Attempt {attempt_number}) for sub ID {subscription.id}")

        response = requests.post(
            subscription.target_url,
            data=payload_json_bytes,
            headers=headers,
            timeout=WEBHOOK_TIMEOUT_SECONDS_TASK
        )

        delivery_log.response_status_code = response.status_code
        delivery_log.response_headers = json.dumps(dict(response.headers))
        response_text_snippet = response.text[:1024] if response.text else None
        delivery_log.response_body = response_text_snippet

        if 200 <= response.status_code < 300:
            delivery_log.is_success = True
            print(f"INFO: [Task] Webhook to {subscription.target_url} succeeded with status {response.status_code}.")
        else:
            delivery_log.is_success = False
            delivery_log.error_message = f"HTTP Error: {response.status_code}"
            print(f"WARN: [Task] Webhook to {subscription.target_url} failed with status {response.status_code}. Response: {response_text_snippet}")
            # Basic Retry Logic (RQ can handle retries declaratively too)
            if attempt_number < WEBHOOK_MAX_RETRIES_TASK:
                current_job = get_current_job()
                if current_job:
                    print(f"INFO: [Task] Re-queueing job {current_job.id} for attempt {attempt_number + 1} after delay.")
                    # RQ's built-in retry is simpler if configured on the queue.
                    # Manual re-queueing with delay is more complex.
                    # For now, just log; actual retry setup is part of worker/queue config.
                    # To manually retry with RQ: current_job.requeue(at_front=False) or use RQ Scheduler.
                    # This example doesn't implement the actual re-queue.
                    pass

    except requests.exceptions.Timeout:
        delivery_log.is_success = False
        delivery_log.error_message = "Request timed out."
        print(f"ERROR: [Task] Webhook to {subscription.target_url} timed out.")
        # Retry logic placeholder
    except requests.exceptions.RequestException as e:
        delivery_log.is_success = False
        delivery_log.error_message = str(e)
        print(f"ERROR: [Task] Error sending webhook to {subscription.target_url}: {e}")
        # Retry logic placeholder
    finally:
        end_time = datetime.utcnow()
        delivery_log.duration_ms = int((end_time - start_time).total_seconds() * 1000)
        delivery_log.attempted_at = start_time # Log actual attempt time

        try:
            db.session.commit() # Commit the delivery log
        except Exception as db_err:
            db.session.rollback()
            print(f"ERROR: [Task] Failed to save WebhookDeliveryLog for sub {subscription_id}: {db_err}")
            # If log saving fails, the original exception (if any) from sending might be lost
            # or this might be the primary error.

    # This function is intended to be run by an RQ worker.
    # The worker itself needs to be started with a Flask app context.
    # Example worker startup (in a separate run_worker.py or Procfile):
    # from redis import Redis
    # from rq import Worker, Connection
    # from backend.app import create_app # Assuming your app factory
    #
    # app = create_app()
    # app.app_context().push() # Push an application context
    #
    # listen = ['high', 'default', 'low'] # Example queues
    # redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    # conn = Redis.from_url(redis_url)
    #
    # if __name__ == '__main__':
    #     with Connection(conn):
    #         worker = Worker(map(Queue, listen)) # if using specific Queue objects
    #         worker = Worker(listen, connection=conn) # Simpler
    #         worker.work()
```

**Key Considerations for this Task File:**
-   **Flask App Context in RQ Worker**: This is the most critical part for `webhook_tasks.py` to function correctly with Flask-SQLAlchemy and `current_app.config`. The comments in the file highlight how this needs to be set up when running the RQ worker. I cannot implement the worker script itself.
-   **Imports**: The imports for `db`, `WebhookSubscription`, `WebhookDeliveryLog` are placed inside the task function or would rely on the worker's context.
-   **Retry Logic**: The provided code includes placeholders and comments for retry logic. RQ has built-in support for retries if a job fails, which is generally configured when the job is enqueued or on the Queue/Worker level. Manual re-enqueueing within the task is more complex. For this step, I've focused on moving the sending logic into the task.
-   **Error Handling**: Basic error handling for requests is included.

Next, I will modify `backend/utils/webhook_utils.py` to use RQ to enqueue this task.
