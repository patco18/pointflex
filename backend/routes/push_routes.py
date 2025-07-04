"""
Routes for managing push notification subscriptions
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from backend.middleware.auth import get_current_user
from backend.models.push_subscription import PushSubscription
from backend.database import db
from datetime import datetime

push_bp = Blueprint('push_bp', __name__)

@push_bp.route('/subscribe', methods=['POST'])
@jwt_required()
def subscribe_push():
    current_user = get_current_user()
    data = request.get_json()

    token = data.get('token')
    device_type = data.get('device_type', 'web')

    if not token:
        return jsonify(message="Push notification token is required."), 400

    if not current_user or not current_user.id:
         return jsonify(message="User context not found or user ID is missing."), 400


    # Check if this token already exists for any user and deactivate it if it's being reassigned
    existing_token_any_user = PushSubscription.query.filter_by(token=token).first()
    if existing_token_any_user and existing_token_any_user.user_id != current_user.id:
        current_app.logger.info(f"Token {token} was previously associated with user {existing_token_any_user.user_id}. Deactivating old subscription.")
        existing_token_any_user.is_active = False
        # db.session.add(existing_token_any_user) # Not needed if commit is below for new one

    # Check if this token already exists for the current user
    subscription = PushSubscription.query.filter_by(user_id=current_user.id, token=token).first()

    if subscription:
        subscription.is_active = True
        subscription.device_type = device_type
        subscription.last_used_at = datetime.utcnow()
        current_app.logger.info(f"Reactivated push subscription for user {current_user.id}, token: {token[:20]}...")
    else:
        subscription = PushSubscription(
            user_id=current_user.id,
            token=token,
            device_type=device_type,
            is_active=True
        )
        db.session.add(subscription)
        current_app.logger.info(f"New push subscription for user {current_user.id}, token: {token[:20]}...")

    try:
        db.session.commit()
        return jsonify(message="Successfully subscribed to push notifications."), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error subscribing to push notifications for user {current_user.id}: {e}")
        return jsonify(message="Failed to subscribe to push notifications."), 500


@push_bp.route('/unsubscribe', methods=['POST'])
@jwt_required()
def unsubscribe_push():
    current_user = get_current_user()
    data = request.get_json()
    token = data.get('token')

    if not token:
        return jsonify(message="Push notification token is required to unsubscribe."), 400

    if not current_user or not current_user.id:
         return jsonify(message="User context not found or user ID is missing."), 400

    subscription = PushSubscription.query.filter_by(user_id=current_user.id, token=token).first()

    if not subscription:
        return jsonify(message="Subscription not found for this token."), 404

    subscription.is_active = False
    subscription.last_used_at = datetime.utcnow() # Update last_used_at even on unsubscribe

    try:
        db.session.commit()
        current_app.logger.info(f"Unsubscribed user {current_user.id} from push notifications for token: {token[:20]}...")
        return jsonify(message="Successfully unsubscribed from push notifications."), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error unsubscribing from push notifications for user {current_user.id}: {e}")
        return jsonify(message="Failed to unsubscribe from push notifications."), 500
