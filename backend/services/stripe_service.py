"""Stripe API service utilities."""

import os

try:
    import stripe  # type: ignore
    stripe.api_key = os.getenv("STRIPE_API_KEY", "")
except Exception:  # pragma: no cover - Stripe may not be installed
    stripe = None


def create_checkout_session(invoice, success_url: str, cancel_url: str):
    """Create a Stripe Checkout session for an invoice."""
    if stripe is None:
        raise RuntimeError("Stripe package not available")

    return stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "eur",
                "product_data": {"name": f"Invoice {invoice.id}"},
                "unit_amount": int(invoice.amount * 100),
            },
            "quantity": 1,
        }],
        mode="payment",
        metadata={"invoice_id": invoice.id, "company_id": invoice.company_id},
        success_url=success_url,
        cancel_url=cancel_url,
    )


def verify_webhook(payload: bytes, sig_header: str):
    """Verify a Stripe webhook payload and return the event."""
    if stripe is None:
        raise RuntimeError("Stripe package not available")

    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    return stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
