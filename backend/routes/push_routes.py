"""
Routes for managing push notification subscriptions
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from backend.middleware.auth import get_current_user
from backend.models.push_subscription import PushSubscription
from backend.database import db
from backend.services.push import webpush_service
from datetime import datetime

push_bp = Blueprint('push_bp', __name__)

@push_bp.route('/subscribe', methods=['POST'])
@jwt_required()
def subscribe_push():
    current_user = get_current_user()
    data = request.get_json()

    device_type = data.get('device_type', 'web')
    
    if device_type == 'web':
        # Handle Web Push subscription
        subscription_data = data.get('subscription')
        if not subscription_data:
            return jsonify(message="Web Push subscription data is required."), 400
        
        # Use endpoint as the token for web push
        if isinstance(subscription_data, str):
            import json
            subscription_data = json.loads(subscription_data)
            
        token = subscription_data.get('endpoint')
    else:
        # Handle FCM token for mobile devices
        token = data.get('token')
    
    if not token:
        return jsonify(message="Push notification token/endpoint is required."), 400

    if not current_user or not current_user.id:
         return jsonify(message="User context not found or user ID is missing."), 400

    # Check if this token already exists for any user and deactivate it if it's being reassigned
    existing_token_any_user = PushSubscription.query.filter_by(token=token).first()
    if existing_token_any_user and existing_token_any_user.user_id != current_user.id:
        current_app.logger.info(f"Token/endpoint {token[:30]}... was previously associated with user {existing_token_any_user.user_id}. Deactivating old subscription.")
        existing_token_any_user.is_active = False

    # Check if this token already exists for the current user
    subscription = PushSubscription.query.filter_by(user_id=current_user.id, token=token).first()

    if subscription:
        subscription.is_active = True
        subscription.device_type = device_type
        subscription.last_used_at = datetime.utcnow()
        
        # Update subscription data for web push
        if device_type == 'web' and 'subscription' in data:
            subscription.set_web_push_subscription(data['subscription'])
            
        current_app.logger.info(f"Reactivated push subscription for user {current_user.id}, device_type: {device_type}")
    else:
        subscription = PushSubscription(
            user_id=current_user.id,
            token=token,
            device_type=device_type,
            is_active=True
        )
        
        # Set subscription data for web push
        if device_type == 'web' and 'subscription' in data:
            subscription.set_web_push_subscription(data['subscription'])
            
        db.session.add(subscription)
        current_app.logger.info(f"New push subscription for user {current_user.id}, device_type: {device_type}")

    try:
        db.session.commit()
        
        # Send a test notification for web push to validate the subscription
        if device_type == 'web' and current_app.config.get('ENVIRONMENT') == 'development':
            try:
                webpush_service.send_web_push_to_user(
                    user_id=current_user.id,
                    title="Subscription Successful",
                    body="You have successfully subscribed to push notifications!",
                    icon="/favicon.ico",
                    data={"url": "/dashboard"}
                )
            except Exception as e:
                current_app.logger.warning(f"Failed to send test notification: {str(e)}")
        
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
    
    # Handle both traditional token and web push endpoint
    token = data.get('token')
    endpoint = data.get('endpoint')
    
    search_token = token or endpoint
    
    if not search_token:
        return jsonify(message="Push notification token or endpoint is required to unsubscribe."), 400

    if not current_user or not current_user.id:
         return jsonify(message="User context not found or user ID is missing."), 400

    # Try to find subscription by token or endpoint
    subscription = PushSubscription.query.filter(
        PushSubscription.user_id == current_user.id,
        (PushSubscription.token == search_token) | (PushSubscription.endpoint == search_token)
    ).first()

    if not subscription:
        return jsonify(message="Subscription not found for this token/endpoint."), 404

    subscription.is_active = False
    subscription.last_used_at = datetime.utcnow() # Update last_used_at even on unsubscribe

    try:
        db.session.commit()
        current_app.logger.info(f"Unsubscribed user {current_user.id} from push notifications, device type: {subscription.device_type}")
        return jsonify(message="Successfully unsubscribed from push notifications."), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error unsubscribing from push notifications for user {current_user.id}: {e}")
        return jsonify(message="Failed to unsubscribe from push notifications."), 500


@push_bp.route('/vapid-public-key', methods=['GET'])
@jwt_required()
def get_vapid_public_key():
    """Return the VAPID public key for web push subscriptions"""
    vapid_public_key = current_app.config.get('VAPID_PUBLIC_KEY')
    
    if not vapid_public_key:
        return jsonify(message="VAPID public key not configured."), 500
        
    return jsonify(publicKey=vapid_public_key), 200


@push_bp.route('/test-notification', methods=['POST'])
@jwt_required()
def test_notification():
    """Send a test notification to the current user"""
    current_user = get_current_user()
    
    if not current_user or not current_user.id:
        return jsonify(message="User context not found or user ID is missing."), 400
    
    data = request.get_json()
    device_type = data.get('device_type', 'web')
    
    try:
        if device_type == 'web':
            result = webpush_service.send_web_push_to_user(
                user_id=current_user.id,
                title="Test Notification",
                body="This is a test notification from PointFlex",
                icon="/favicon.ico",
                data={"url": "/dashboard"}
            )
            return jsonify(message="Test web push notification sent", result=result), 200
        else:
            return jsonify(message="Test notifications for this device type not implemented."), 501
    except Exception as e:
        current_app.logger.error(f"Error sending test notification to user {current_user.id}: {e}")
        return jsonify(message=f"Failed to send test notification: {str(e)}"), 500
