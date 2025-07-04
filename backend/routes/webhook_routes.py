"""
Routes for managing Webhook Subscriptions and viewing Delivery Logs
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
import jsonschema # For validating subscribed_events structure

from backend.middleware.auth import get_current_user, require_admin
from backend.models.company import Company
from backend.models.webhook_subscription import WebhookSubscription
from backend.models.webhook_delivery_log import WebhookDeliveryLog
from backend.database import db

webhook_bp = Blueprint('webhook_bp', __name__)

# Define a list of valid event types your system can emit.
# This should be kept in sync with the events you actually trigger.
VALID_EVENT_TYPES = [
    "user.created", "user.updated", "user.deleted",
    "company.created", "company.updated",
    "pointage.created", "pointage.updated",
    "invoice.created", "invoice.paid", "invoice.payment_failed",
    "subscription.created", "subscription.updated", "subscription.cancelled",
    "leave_request.created", "leave_request.approved", "leave_request.rejected",
    "mission.created", "mission.updated"
    # Add more as your system evolves
]

subscribed_events_schema = {
    "type": "array",
    "items": {"type": "string", "enum": VALID_EVENT_TYPES},
    "minItems": 1,
    "uniqueItems": True
}


@webhook_bp.route('/subscriptions', methods=['POST'])
@require_admin # Company admin can manage webhooks for their company
def create_webhook_subscription():
    current_user = get_current_user()
    data = request.get_json()

    target_url = data.get('target_url')
    subscribed_events = data.get('subscribed_events') # Should be a list of event strings

    if not target_url or not subscribed_events:
        return jsonify(message="target_url and subscribed_events are required."), 400

    # Validate target_url format (basic check)
    if not (target_url.startswith('http://') or target_url.startswith('https://')):
        return jsonify(message="Invalid target_url format. Must be http or https."), 400

    # Validate subscribed_events
    try:
        jsonschema.validate(instance=subscribed_events, schema=subscribed_events_schema)
    except jsonschema.exceptions.ValidationError as e:
        return jsonify(message=f"Invalid subscribed_events: {e.message}"), 400

    if not current_user.company_id:
        return jsonify(message="User must be associated with a company to create webhooks."), 400

    subscription = WebhookSubscription(
        company_id=current_user.company_id,
        target_url=target_url
    )
    subscription.subscribed_events = subscribed_events # Use the setter for JSON conversion

    db.session.add(subscription)
    db.session.commit()

    try:
        from backend.middleware.audit import log_user_action
        log_user_action(
            action='CREATE_WEBHOOK_SUBSCRIPTION',
            resource_type='WebhookSubscription',
            resource_id=subscription.id,
            new_values=subscription.to_dict(include_secret=False), # Don't log the secret itself
            details={'target_url': subscription.target_url, 'events': subscription.subscribed_events}
        )
        # db.session.commit() # Covered by main commit
    except Exception as e:
        current_app.logger.error(f"Error logging webhook creation for sub {subscription.id}: {e}")


    # Return the secret only upon creation. It won't be shown again.
    return jsonify(subscription.to_dict(include_secret=True)), 201


@webhook_bp.route('/subscriptions', methods=['GET'])
@require_admin
def list_webhook_subscriptions():
    current_user = get_current_user()
    if not current_user.company_id:
         return jsonify(message="User must be associated with a company."), 400

    subscriptions = WebhookSubscription.query.filter_by(
        company_id=current_user.company_id,
        is_active=True # Optionally filter by active, or add a query param
    ).order_by(WebhookSubscription.created_at.desc()).all()

    # Exclude secret by default when listing
    return jsonify([sub.to_dict(include_secret=False) for sub in subscriptions]), 200

# TODO: Implement other CRUD endpoints for subscriptions:
# GET /subscriptions/<id>
# PUT /subscriptions/<id> (update target_url, events, is_active)
# DELETE /subscriptions/<id> (or set is_active=False)
# GET /subscriptions/<id>/delivery-logs (with pagination)
# POST /subscriptions/<id>/ping (send a test event)
