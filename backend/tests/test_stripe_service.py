import types
import pytest
from backend.services import stripe_service

class Invoice:
    def __init__(self, id, amount, company_id):
        self.id = id
        self.amount = amount
        self.company_id = company_id

def test_create_checkout_session(monkeypatch):
    captured = {}

    class FakeSession:
        @staticmethod
        def create(**kwargs):
            captured['kwargs'] = kwargs
            return {'id': 'sess_123'}

    fake_stripe = types.SimpleNamespace(checkout=types.SimpleNamespace(Session=FakeSession))
    monkeypatch.setattr(stripe_service, 'stripe', fake_stripe)

    invoice = Invoice(1, 10.5, 2)
    session = stripe_service.create_checkout_session(invoice, 'ok', 'ko')
    assert session == {'id': 'sess_123'}
    assert captured['kwargs']['metadata']['invoice_id'] == 1
    assert captured['kwargs']['metadata']['company_id'] == 2
    assert captured['kwargs']['line_items'][0]['price_data']['unit_amount'] == 1050

def test_create_checkout_session_no_stripe(monkeypatch):
    monkeypatch.setattr(stripe_service, 'stripe', None)
    invoice = Invoice(1, 5, 1)
    with pytest.raises(RuntimeError):
        stripe_service.create_checkout_session(invoice, 'ok', 'ko')

def test_verify_webhook(monkeypatch):
    events = {}
    def construct_event(payload, sig, secret):
        events['payload'] = payload
        events['sig'] = sig
        events['secret'] = secret
        return {'id': 'evt_1'}
    fake_stripe = types.SimpleNamespace(Webhook=types.SimpleNamespace(construct_event=construct_event))
    monkeypatch.setattr(stripe_service, 'stripe', fake_stripe)
    monkeypatch.setenv('STRIPE_WEBHOOK_SECRET', 'whsec')
    event = stripe_service.verify_webhook(b'data', 'sig')
    assert event == {'id': 'evt_1'}
    assert events['secret'] == 'whsec'

def test_verify_webhook_no_stripe(monkeypatch):
    monkeypatch.setattr(stripe_service, 'stripe', None)
    with pytest.raises(RuntimeError):
        stripe_service.verify_webhook(b'data', 'sig')
