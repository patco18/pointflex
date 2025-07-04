"""
Stripe Webhook Routes
"""
from flask import Blueprint, request, jsonify, current_app
from werkzeug.exceptions import BadRequest
import stripe
from datetime import datetime, timedelta

from backend.services import stripe_service
from backend.database import db
from backend.models.invoice import Invoice
from backend.models.payment import Payment
from backend.models.company import Company # Added Company model

stripe_bp = Blueprint('stripe_bp', __name__)

# This is a placeholder. In a real app, this might come from config or a database table
# mapping Stripe Price IDs to your internal plan details.
# Ensure these Price IDs are configured in your Stripe Dashboard.
STRIPE_PRICE_TO_PLAN_MAPPING = {
    # Example: "price_1PEXAMPLE..." : {"name": "basic", "max_employees": 10, "monthly_amount_eur": 29},
    # Example: "price_1PEXAMPLE..." : {"name": "premium", "max_employees": 50, "monthly_amount_eur": 99},
    # TODO: Populate with actual Stripe Price IDs and plan details
    "price_basic_monthly_test": {"name": "basic", "max_employees": 10, "amount_eur": 10, "interval_months": 1},
    "price_premium_monthly_test": {"name": "premium", "max_employees": 50, "amount_eur": 50, "interval_months": 1},
}


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
            plan_details = STRIPE_PRICE_TO_PLAN_MAPPING.get(stripe_price_id)

            if not stripe_price_id or not plan_details:
                current_app.logger.error(f"Stripe Webhook: Invalid or missing stripe_price_id ('{stripe_price_id}') for subscription.")
                return jsonify({'error': "Invalid plan identifier"}), 400

            # Update company subscription details
            company.stripe_customer_id = session.customer
            company.stripe_subscription_id = session.subscription
            company.active_stripe_price_id = stripe_price_id # Store the active price ID
            company.subscription_plan = plan_details["name"]
            company.max_employees = plan_details["max_employees"]
            company.subscription_status = 'active'
            company.subscription_start = datetime.utcnow().date()
            # Calculate subscription_end based on interval (e.g., 1 month)
            # This is a simplified calculation. Stripe webhooks for `invoice.paid` on renewals
            # would be better for managing ongoing subscription periods.
            company.subscription_end = datetime.utcnow().date() + timedelta(days=plan_details.get("interval_months", 1) * 30)
            company.is_suspended = False
            company.suspension_reason = None

            # Create an Invoice for this initial subscription payment
            # Description could be more dynamic, e.g., "Subscription to {plan_name} plan"
            invoice_description = f"Abonnement Plan {plan_details['name'].capitalize()} ({plan_details.get('interval_months',1)} mois)"
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
                plan_details = STRIPE_PRICE_TO_PLAN_MAPPING.get(company.active_stripe_price_id or "") # Need to store active price_id on company
                # For now, let's use a generic amount and description
                renewal_amount = invoice_object.amount_paid / 100.0
                renewal_months = 1 # This needs to be derived from the plan/subscription interval

                # Ensure plan_details is not None before accessing its properties
                if plan_details:
                    renewal_months = plan_details.get("interval_months", 1)
                    invoice_description = f"Renouvellement Abonnement Plan {plan_details['name'].capitalize()} ({renewal_months} mois)"
                    payment_description = f"Paiement renouvellement abonnement {plan_details['name']}"
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
        # Generally, checkout.session.completed (for initial) or invoice.payment_succeeded (for recurring) are preferred.
        # payment_intent = event.data.object
        # Contains amount, currency, customer, metadata etc.
        # You might need to correlate this with an invoice if not using Checkout's metadata.
        current_app.logger.info(f"Stripe Webhook: Received payment_intent.succeeded: {event.data.object.id}")
        pass # Add specific handling if needed

    elif event.type == 'payment_intent.payment_failed':
        # payment_intent = event.data.object
        # Handle failed payment, e.g., notify user, update invoice status to 'failed' or 'pending'.
        current_app.logger.warning(f"Stripe Webhook: Received payment_intent.payment_failed: {event.data.object.id}")
        pass # Add specific handling if needed

    else:
        current_app.logger.info(f"Stripe Webhook: Unhandled event type {event.type}")

    return jsonify({'status': 'success'}), 200
