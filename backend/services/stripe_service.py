"""Stripe API service utilities."""

import os

try:
    import stripe  # type: ignore
    stripe.api_key = os.getenv("STRIPE_API_KEY", "")
except Exception:  # pragma: no cover - Stripe may not be installed
    stripe = None

# Forward declaration for type hinting
if False:
    from backend.models.company import Company # type: ignore
    from backend.models.invoice import Invoice # type: ignore

def get_or_create_stripe_customer(company: 'Company'):
    """Get existing Stripe customer or create a new one."""
    if stripe is None:
        raise RuntimeError("Stripe package not available")

    if company.stripe_customer_id:
        try:
            customer = stripe.Customer.retrieve(company.stripe_customer_id)
            if customer.get('deleted'): # Check if customer was deleted in Stripe
                raise stripe.error.StripeError("Customer deleted in Stripe, creating a new one.")
            return customer
        except stripe.error.StripeError as e:
            # Invalid ID or other Stripe error, try to create a new one
            print(f"Error retrieving Stripe customer {company.stripe_customer_id}: {e}. Creating a new one.")
            pass # Fall through to create a new customer

    # Create a new customer in Stripe
    customer = stripe.Customer.create(
        email=company.email,
        name=company.name,
        metadata={'company_id': company.id}
    )
    company.stripe_customer_id = customer.id
    # Note: The caller should commit the session if this is within a DB session context
    # For now, this service won't directly interact with db.session.commit()
    # This might need to be handled by the calling route.
    # from backend.database import db
    # db.session.add(company)
    # db.session.commit()
    return customer


def create_invoice_checkout_session(invoice: 'Invoice', success_url: str, cancel_url: str):
    """Create a Stripe Checkout session for a one-time invoice payment."""
    if stripe is None:
        raise RuntimeError("Stripe package not available")

    customer_id = None
    if invoice.company and invoice.company.stripe_customer_id:
        customer_id = invoice.company.stripe_customer_id
    elif invoice.company:
        # If company exists but no stripe_customer_id, we could create one
        # For now, let checkout create a guest customer or handle it based on email
        pass


    return stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "eur", # Consider making currency configurable
                "product_data": {"name": f"Invoice {invoice.id} for {invoice.company.name if invoice.company else 'N/A'}"},
                "unit_amount": int(invoice.amount * 100), # Amount in cents
            },
            "quantity": 1,
        }],
        mode="payment",
        customer=customer_id, # Optional: associate with existing Stripe customer
        customer_email=invoice.company.email if invoice.company and not customer_id else None, # Pre-fill email if no customer
        metadata={
            "invoice_id": invoice.id,
            "company_id": invoice.company_id,
            "payment_type": "invoice"
        },
        success_url=success_url,
        cancel_url=cancel_url,
    )


def create_checkout_session(invoice: 'Invoice', success_url: str, cancel_url: str):
    """Backward compatible alias for invoice checkout sessions."""
    return create_invoice_checkout_session(invoice, success_url, cancel_url)

def create_subscription_checkout_session(company: 'Company', stripe_price_id: str, success_url: str, cancel_url: str):
    """Create a Stripe Checkout session for a new subscription."""
    if stripe is None:
        raise RuntimeError("Stripe package not available")

    stripe_customer = get_or_create_stripe_customer(company)
    # Important: The company object might have been updated with stripe_customer_id
    # The caller (route) will be responsible for committing this change to the DB.

    checkout_session_params = {
        "payment_method_types": ["card"],
        "line_items": [{"price": stripe_price_id, "quantity": 1}],
        "mode": "subscription",
        "customer": stripe_customer.id,
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": {
            "company_id": company.id,
            "stripe_price_id": stripe_price_id,
            "payment_type": "subscription"
        }
    }

    # Check if the company has an active subscription to manage upgrades/downgrades
    # This is a more advanced scenario. For now, we assume new subscriptions.
    # If company.subscription_id (Stripe subscription ID, needs to be added to Company model):
    #   session_params["subscription_data"] = {"items": [{"id": company.existing_stripe_subscription_item_id, "deleted": True}],} # Example
    #   session_params["subscription_data"]["items"].append({"price": stripe_price_id})

    return stripe.checkout.Session.create(**checkout_session_params)


def verify_webhook(payload: bytes, sig_header: str):
    """Verify a Stripe webhook payload and return the event."""
    if stripe is None:
        raise RuntimeError("Stripe package not available")

    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    return stripe.Webhook.construct_event(payload, sig_header, webhook_secret)


def create_customer_portal_session(stripe_customer_id: str, return_url: str):
    """Create a Stripe Customer Portal session."""
    if stripe is None:
        raise RuntimeError("Stripe package not available")

    if not stripe_customer_id:
        raise ValueError("Stripe customer ID is required to create a portal session.")

    return stripe.billing_portal.Session.create(
        customer=stripe_customer_id,
        return_url=return_url,
    )
