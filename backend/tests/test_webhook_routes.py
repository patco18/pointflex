import json
from backend.tests.test_reports import login_admin
from backend.models.webhook_delivery_log import WebhookDeliveryLog
from backend.database import db


def test_subscription_ping_and_logs(client, monkeypatch):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        "/api/webhooks/subscriptions",
        json={
            "target_url": "https://example.com/webhook",
            "subscribed_events": ["ping.test"],
        },
        headers=headers,
    )
    assert resp.status_code == 201
    sub_id = resp.get_json()["id"]

    resp = client.get("/api/webhooks/subscriptions", headers=headers)
    assert resp.status_code == 200
    assert any(sub["id"] == sub_id for sub in resp.get_json())

    dispatched = {}

    def fake_dispatch(event_type, payload_data, company_id):
        dispatched["event_type"] = event_type
        with client.application.app_context():
            log = WebhookDeliveryLog(
                subscription_id=sub_id,
                event_type=event_type,
                payload=json.dumps(payload_data),
                target_url="https://example.com/webhook",
                is_success=True,
            )
            db.session.add(log)
            db.session.commit()

    monkeypatch.setattr(
        "backend.utils.webhook_utils.dispatch_webhook_event", fake_dispatch
    )

    resp = client.post(f"/api/webhooks/subscriptions/{sub_id}/ping", headers=headers)
    assert resp.status_code == 200
    assert dispatched["event_type"] == "ping.test"

    resp = client.get(
        f"/api/webhooks/subscriptions/{sub_id}/delivery-logs", headers=headers
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["logs"]) == 1
    assert data["logs"][0]["event_type"] == "ping.test"

    resp = client.delete(f"/api/webhooks/subscriptions/{sub_id}", headers=headers)
    assert resp.status_code == 200
