"""
Stripe Webhook Routes
"""
from flask import Blueprint, request, jsonify, current_app
from werkzeug.exceptions import BadRequest
import stripe
from datetime import datetime, timedelta
import os
import json

from backend.services import stripe_service
from backend.database import db
from backend.models.invoice import Invoice
from backend.models.payment import Payment
from backend.models.company import Company  # Added Company model
from backend.models.system_settings import SystemSettings
from backend.middleware.audit import log_user_action

stripe_bp = Blueprint('stripe_bp', __name__)


def get_stripe_price_to_plan_mapping():
    """Return mapping of Stripe price IDs to internal plan details.
    
    This function now builds the mapping from the SubscriptionPlan model in the database.
    It maintains backward compatibility with code that expects the older format.
    """
    from backend.models.subscription_plan import SubscriptionPlan
    
    # Créer un mapping à partir des plans d'abonnement en base de données
    mapping = {}
    try:
        subscription_plans = SubscriptionPlan.query.filter_by(is_active=True).all()
        
        for plan in subscription_plans:
            if plan.stripe_price_id:
                # Créer une entrée compatible avec l'ancien format
                mapping[plan.stripe_price_id] = {
                    "name": plan.name,
                    "max_employees": plan.max_employees,
                    "amount_eur": plan.price,
                    "interval_months": plan.duration_months,
                    "description": plan.description
                }
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des plans d'abonnement: {e}")
    
    # Si aucun plan n'est trouvé, tenter d'utiliser la configuration ou les paramètres système
    if not mapping:
        mapping_json = (
            current_app.config.get('STRIPE_PRICE_MAP')
            or os.getenv('STRIPE_PRICE_MAP')
        )
        if mapping_json:
            try:
                if isinstance(mapping_json, str):
                    return json.loads(mapping_json)
                return mapping_json
            except json.JSONDecodeError as e:
                current_app.logger.error(f"Invalid STRIPE_PRICE_MAP JSON: {e}")

        # Fallback to SystemSettings stored configuration
        return SystemSettings.get_setting('billing', 'stripe_price_mapping', {})
    
    return mapping


@stripe_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe_service.verify_webhook(payload, sig_header)
    except ValueError as e:
        # Invalid payload
        current_app.logger.error(f"Stripe Webhook ValueError: {e}")
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        current_app.logger.error(f"Stripe Webhook SignatureVerificationError: {e}")
        return jsonify({'error': 'Invalid signature'}), 400
    except RuntimeError as e:
        # Stripe not configured
        current_app.logger.error(f"Stripe Webhook RuntimeError: {e}")
        return jsonify({'error': str(e)}), 500

    current_app.logger.info(f"Received Stripe event: {event.type}")

    # Handle the event
    if event.type == 'checkout.session.completed':
        session = event.data.object
        metadata = session.get('metadata', {})
        payment_type = metadata.get('payment_type')
        company_id_str = metadata.get('company_id')

        if not company_id_str:
            current_app.logger.error("Stripe Webhook: 'company_id' not found in session metadata.")
            return jsonify({'error': "Missing company_id in metadata"}), 400

        try:
            company_id = int(company_id_str)
        except ValueError:
            current_app.logger.error(f"Stripe Webhook: Invalid company_id ('{company_id_str}') in metadata.")
            return jsonify({'error': "Invalid company_id format"}), 400

        company = Company.query.get(company_id)
        if not company:
            current_app.logger.error(f"Stripe Webhook: Company with ID {company_id} not found.")
            return jsonify({'status': 'error', 'message': f'Company {company_id} not found'}), 200 # Ack to Stripe

        # --- Handle Subscription Payment ---
        if payment_type == 'subscription':
            stripe_price_id = metadata.get('stripe_price_id')
            
            # Récupérer le plan d'abonnement depuis la base de données
            from backend.models.subscription_plan import SubscriptionPlan
            subscription_plan = SubscriptionPlan.query.filter_by(stripe_price_id=stripe_price_id).first()

            if not stripe_price_id or not subscription_plan:
                current_app.logger.error(f"Stripe Webhook: Invalid or missing stripe_price_id ('{stripe_price_id}') for subscription.")
                return jsonify({'error': "Invalid plan identifier"}), 400

            # Update company subscription details
            company.stripe_customer_id = session.customer
            company.stripe_subscription_id = session.subscription
            company.active_stripe_price_id = stripe_price_id # Store the active price ID
            company.subscription_plan = subscription_plan.name
            company.max_employees = subscription_plan.max_employees
            company.subscription_status = 'active'
            company.subscription_start = datetime.utcnow().date()
            # Calculate subscription_end based on duration_months
            company.subscription_end = datetime.utcnow().date() + timedelta(days=subscription_plan.duration_months * 30)
            company.is_suspended = False
            company.suspension_reason = None

            # Create an Invoice for this initial subscription payment
            # Description could be more dynamic, e.g., "Subscription to {plan_name} plan"
            invoice_description = f"Abonnement Plan {subscription_plan.name.capitalize()} ({subscription_plan.duration_months} mois)"
            new_invoice = Invoice(
                company_id=company.id,
                amount=session.amount_total / 100.0, # Amount from Stripe session
                months=plan_details.get("interval_months",1),
                description=invoice_description,
                status='pending' # Will be marked paid shortly
            )
            db.session.add(new_invoice)
            db.session.flush() # To get new_invoice.id for the payment

            invoice_to_pay = new_invoice
            invoice_to_pay.mark_paid()

            payment_description = f"Paiement initial abonnement {plan_details['name']}"

        # --- Handle One-Time Invoice Payment ---
        elif payment_type == 'invoice':
            invoice_id_str = metadata.get('invoice_id')
            if not invoice_id_str:
                current_app.logger.error("Stripe Webhook: 'invoice_id' not found in session metadata for invoice payment.")
                return jsonify({'error': "Missing invoice_id in metadata for invoice payment"}), 400
            try:
                invoice_id = int(invoice_id_str)
            except ValueError:
                current_app.logger.error(f"Stripe Webhook: Invalid invoice_id ('{invoice_id_str}') for invoice payment.")
                return jsonify({'error': "Invalid invoice_id format for invoice payment"}), 400

            invoice_to_pay = Invoice.query.get(invoice_id)
            if not invoice_to_pay:
                current_app.logger.error(f"Stripe Webhook: Invoice with ID {invoice_id} not found.")
                return jsonify({'status': 'error', 'message': f'Invoice {invoice_id} not found'}), 200

            if invoice_to_pay.status == 'paid':
                current_app.logger.info(f"Stripe Webhook: Invoice {invoice_id} is already marked as paid.")
                return jsonify({'status': 'success', 'message': 'Invoice already paid'}), 200

            invoice_to_pay.mark_paid()
            payment_description = f"Paiement Facture #{invoice_to_pay.id}"

        else:
            current_app.logger.error(f"Stripe Webhook: Unknown payment_type '{payment_type}' in metadata.")
            return jsonify({'error': "Unknown payment_type"}), 400

        # --- Create Payment Record (Common for both types) ---
        if invoice_to_pay:
            payment = Payment(
                invoice_id=invoice_to_pay.id,
                company_id=company.id,
                amount=session.amount_total / 100.0, # Amount is in cents
                payment_method='card', # Assuming card payments from Checkout
                transaction_id=session.payment_intent or session.subscription,
                status='completed',
                payment_date=datetime.utcnow().date(),
                description=payment_description
            )
            db.session.add(payment)

        try:
            db.session.commit()
            log_message = (f"Stripe Webhook: Successfully processed checkout.session.completed "
                           f"for company {company_id}, type '{payment_type}'.")
            if payment_type == 'invoice':
                log_message += f" Invoice ID: {invoice_to_pay.id}."
            elif payment_type == 'subscription':
                log_message += f" New Invoice ID: {invoice_to_pay.id}, Sub ID: {session.subscription}."
            current_app.logger.info(log_message)

            # Dispatch webhook for invoice.paid or subscription.created
            webhook_event_type = None
            webhook_payload = {}
            if payment_type == 'invoice':
                webhook_event_type = 'invoice.paid'
                webhook_payload = invoice_to_pay.to_dict()
                webhook_payload['payment_details'] = payment.to_dict() # Add payment info
            elif payment_type == 'subscription':
                webhook_event_type = 'subscription.created' # Or invoice.paid for the first invoice
                # For subscription.created, the main object is the company's updated subscription status
                webhook_payload = company.to_dict(include_sensitive=True) # Send updated company subscription details
                webhook_payload['invoice'] = invoice_to_pay.to_dict() # Include the first invoice
                webhook_payload['payment_details'] = payment.to_dict()

                # Also dispatch invoice.created for the first invoice of the subscription
                try:
                    from backend.utils.webhook_utils import dispatch_webhook_event
                    dispatch_webhook_event(
                        event_type='invoice.created',
                        payload_data=invoice_to_pay.to_dict(), # The new_invoice object
                        company_id=company.id
                    )
                except Exception as webhook_error:
                    current_app.logger.error(f"Failed to dispatch invoice.created (subscription) webhook for company {company.id}: {webhook_error}")


            if webhook_event_type:
                try:
                    from backend.utils.webhook_utils import dispatch_webhook_event
                    dispatch_webhook_event(
                        event_type=webhook_event_type,
                        payload_data=webhook_payload,
                        company_id=company.id
                    )
                except Exception as webhook_error:
                    current_app.logger.error(f"Failed to dispatch {webhook_event_type} webhook for company {company.id}: {webhook_error}")

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Stripe Webhook: Database error processing company {company_id}, type '{payment_type}': {e}")
            return jsonify({'error': 'Database processing failed'}), 500

    elif event.type == 'invoice.payment_succeeded':
        # This is important for recurring subscription payments
        invoice_object = event.data.object
        stripe_subscription_id = invoice_object.get('subscription')
        stripe_customer_id = invoice_object.get('customer')

        if stripe_subscription_id and stripe_customer_id:
            company = Company.query.filter_by(stripe_customer_id=stripe_customer_id,
                                              stripe_subscription_id=stripe_subscription_id).first()
            if company:
                # Create a new Invoice and Payment record for the renewal
                # Récupérer le plan d'abonnement depuis la base de données
                from backend.models.subscription_plan import SubscriptionPlan
                subscription_plan = SubscriptionPlan.query.filter_by(stripe_price_id=company.active_stripe_price_id).first()
                
                # For now, let's use a generic amount and description
                renewal_amount = invoice_object.amount_paid / 100.0
                renewal_months = 1 # Default value

                # Ensure subscription_plan is not None before accessing its properties
                if subscription_plan:
                    renewal_months = subscription_plan.duration_months
                    invoice_description = f"Renouvellement Abonnement Plan {subscription_plan.name.capitalize()} ({renewal_months} mois)"
                    payment_description = f"Paiement renouvellement abonnement {subscription_plan.name}"
                else: # Fallback if plan_details not found (e.g. price_id changed or not in mapping)
                    current_app.logger.warning(f"Stripe Webhook: Plan details not found for price ID associated with company {company.id} during renewal.")
                    invoice_description = f"Renouvellement Abonnement (ID: {stripe_subscription_id})"
                    payment_description = f"Paiement renouvellement abonnement (ID: {stripe_subscription_id})"


                renewal_invoice = Invoice(
                    company_id=company.id,
                    amount=renewal_amount,
                    months=renewal_months, # Or derive from subscription
                    description=invoice_description,
                    status='paid', # Mark as paid directly
                    paid_date=datetime.utcnow().date(),
                    due_date=datetime.utcnow().date()
                )
                db.session.add(renewal_invoice)
                db.session.flush() # Get ID for payment

                renewal_payment = Payment(
                    invoice_id=renewal_invoice.id,
                    company_id=company.id,
                    amount=renewal_amount,
                    payment_method='card', # Assumption
                    transaction_id=invoice_object.payment_intent or invoice_object.id,
                    status='completed',
                    payment_date=datetime.utcnow().date(),
                    description=payment_description
                )
                db.session.add(renewal_payment)

                # Extend company's subscription_end date
                # This should ideally be based on the subscription period from Stripe
                company.subscription_end = (company.subscription_end or datetime.utcnow().date()) + timedelta(days=renewal_months * 30)
                company.subscription_status = 'active'

                try:
                    db.session.commit()
                    current_app.logger.info(f"Stripe Webhook: Successfully processed invoice.payment_succeeded for renewal of company {company.id}, subscription {stripe_subscription_id}.")

                    # Dispatch webhook for invoice.paid (for renewal)
                    try:
                        from backend.utils.webhook_utils import dispatch_webhook_event
                        webhook_payload = renewal_invoice.to_dict()
                        webhook_payload['payment_details'] = renewal_payment.to_dict()
                        webhook_payload['subscription_id'] = stripe_subscription_id # Add subscription context
                        dispatch_webhook_event(
                            event_type='invoice.paid', # Could also be 'subscription.renewed'
                            payload_data=webhook_payload,
                            company_id=company.id
                        )
                    except Exception as webhook_error:
                        current_app.logger.error(f"Failed to dispatch invoice.paid (renewal) webhook for company {company.id}: {webhook_error}")

                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Stripe Webhook: DB error on renewal for company {company.id}: {e}")
            else:
                current_app.logger.warning(f"Stripe Webhook: Company not found for renewal. Customer: {stripe_customer_id}, Subscription: {stripe_subscription_id}")
        else:
            current_app.logger.info(f"Stripe Webhook: Received invoice.payment_succeeded without subscription/customer ID. Invoice ID: {invoice_object.id}")


    elif event.type == 'payment_intent.succeeded':
        current_app.logger.info(f"Stripe Webhook: Received payment_intent.succeeded: {event.data.object.id}")
        # This event might be too generic if not tied to a Checkout session with metadata.
        # Usually handled by checkout.session.completed or invoice.payment_succeeded.
        pass

    elif event.type == 'invoice.payment_failed' or event.type == 'checkout.session.async_payment_failed':
        current_app.logger.warning(f"Stripe Webhook: Received {event.type}")
        session_data = event.data.object
        invoice_id_from_stripe_invoice = None
        company_id_from_stripe_invoice = None

        if event.type == 'invoice.payment_failed':
            stripe_invoice_object = session_data
            # Try to find our local invoice if Stripe invoice ID is stored, or via customer ID and subscription
            # This part requires more robust linking if we store stripe_invoice_id on our Invoice model.
            # For now, let's assume we can get company_id from customer if present
            stripe_customer_id = stripe_invoice_object.get('customer')
            if stripe_customer_id:
                company = Company.query.filter_by(stripe_customer_id=stripe_customer_id).first()
                if company:
                    company_id_from_stripe_invoice = company.id
                    # Try to find a relevant PENDING invoice for this customer. This is not ideal.
                    # A better way is to store stripe_invoice_id on our Invoice model.
                    # For now, we'll dispatch a generic company-level event.
                    invoice_obj_for_webhook = stripe_invoice_object # Send stripe's invoice object

        elif event.type == 'checkout.session.async_payment_failed':
            # This event has metadata from the checkout session
            metadata = session_data.get('metadata', {})
            invoice_id_str = metadata.get('invoice_id') # If it was for a one-time invoice
            company_id_str = metadata.get('company_id')
            if company_id_str:
                try:
                    company_id_from_stripe_invoice = int(company_id_str)
                    if invoice_id_str:
                        local_invoice = Invoice.query.get(int(invoice_id_str))
                        if local_invoice:
                            local_invoice.status = 'failed' # Or keep 'pending' and notify admin
                            db.session.add(local_invoice)
                            db.session.commit()
                            invoice_obj_for_webhook = local_invoice.to_dict()
                        else: # No local invoice found, send generic session data
                            invoice_obj_for_webhook = {"checkout_session_id": session_data.id, "failure_reason": session_data.get("last_payment_error", {}).get("message")}
                    else: # Subscription setup failed async
                         invoice_obj_for_webhook = {"checkout_session_id": session_data.id, "failure_reason": session_data.get("last_payment_error", {}).get("message"), "type": "subscription_setup"}

                except ValueError:
                    current_app.logger.error("Invalid company_id or invoice_id in async_payment_failed metadata.")
                    return jsonify({'status': 'error', 'message': 'Invalid metadata'}), 400

        if company_id_from_stripe_invoice and invoice_obj_for_webhook:
            try:
                from backend.utils.webhook_utils import dispatch_webhook_event
                dispatch_webhook_event(
                    event_type='invoice.payment_failed',
                    payload_data=invoice_obj_for_webhook,
                    company_id=company_id_from_stripe_invoice
                )
            except Exception as webhook_error:
                current_app.logger.error(f"Failed to dispatch invoice.payment_failed webhook for company {company_id_from_stripe_invoice}: {webhook_error}")
        else:
            current_app.logger.warning(f"Could not determine company or relevant invoice for {event.type} to dispatch webhook.")

    elif event.type == 'customer.subscription.updated' or event.type == 'customer.subscription.deleted':
        stripe_subscription = event.data.object
        stripe_customer_id = stripe_subscription.customer
        company = Company.query.filter_by(stripe_customer_id=stripe_customer_id).first()

        if company:
            old_company_sub_details = company.to_dict(include_sensitive=True) # For old_values in audit

            if event.type == 'customer.subscription.updated':
                company.subscription_status = stripe_subscription.status # e.g., active, past_due, canceled
                company.active_stripe_price_id = stripe_subscription.items.data[0].price.id if stripe_subscription.items.data else None
                # Update plan name based on new price ID if mapping exists
                mapping = get_stripe_price_to_plan_mapping()
                if company.active_stripe_price_id and company.active_stripe_price_id in mapping:
                    plan_details = mapping[company.active_stripe_price_id]
                    company.subscription_plan = plan_details['name']
                    company.max_employees = plan_details['max_employees']

                if stripe_subscription.current_period_end:
                    company.subscription_end = datetime.fromtimestamp(stripe_subscription.current_period_end).date()

                webhook_event_type = 'subscription.updated'
                action_log = 'SUBSCRIPTION_UPDATED_VIA_STRIPE'
                current_app.logger.info(f"Stripe Webhook: Subscription updated for company {company.id} to status {company.subscription_status}")

            else: # customer.subscription.deleted
                company.subscription_status = 'cancelled' # Or 'expired' depending on context
                company.stripe_subscription_id = None # Clear the Stripe subscription ID
                # company.active_stripe_price_id = None # Clear price ID
                # Consider setting subscription_end to now or period end if not already past
                webhook_event_type = 'subscription.cancelled'
                action_log = 'SUBSCRIPTION_CANCELLED_VIA_STRIPE'
                current_app.logger.info(f"Stripe Webhook: Subscription cancelled for company {company.id}")

            db.session.add(company)
            db.session.commit()

            # Audit Log
            log_user_action(
                user_email="stripe.webhook@system.com", # System action
                action=action_log,
                resource_type='CompanySubscription',
                resource_id=company.id,
                details={'stripe_subscription_id': stripe_subscription.id, 'new_status': company.subscription_status},
                old_values=old_company_sub_details, # This might not be perfectly aligned if only partial data is in old_company_sub_details
                new_values=company.to_dict(include_sensitive=True)
            )

            # Dispatch internal webhook
            try:
                from backend.utils.webhook_utils import dispatch_webhook_event
                dispatch_webhook_event(
                    event_type=webhook_event_type,
                    payload_data=company.to_dict(include_sensitive=True), # Send full updated company object
                    company_id=company.id
                )
            except Exception as webhook_error:
                current_app.logger.error(f"Failed to dispatch internal {webhook_event_type} webhook for company {company.id}: {webhook_error}")
        else:
            current_app.logger.warning(f"Stripe Webhook: Received {event.type} for unknown customer {stripe_customer_id}")

    else:
        current_app.logger.info(f"Stripe Webhook: Unhandled event type {event.type}")

    return jsonify({'status': 'success'}), 200
