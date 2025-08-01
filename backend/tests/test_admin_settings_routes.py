import json
from backend.tests.test_reports import login_admin

def test_notification_settings_roundtrip(client):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Get default settings
    resp = client.get("/api/admin/company/notification-settings", headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()["settings"]
    assert "email_notifications" in data

    # Update one setting
    update = {"email_notifications": not data["email_notifications"]}
    resp = client.put(
        "/api/admin/company/notification-settings",
        json=update,
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.get_json()["settings"]["email_notifications"] == update["email_notifications"]

    # Verify persistence
    resp = client.get("/api/admin/company/notification-settings", headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()["settings"]["email_notifications"] == update["email_notifications"]


def test_integration_settings_roundtrip(client):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/admin/company/integration-settings", headers=headers)
    assert resp.status_code == 200
    settings = resp.get_json()["settings"]
    assert "webhook_enabled" in settings

    update = {
        "webhook_enabled": not settings["webhook_enabled"],
        "webhook_url": "https://example.com/hook",
        "webhook_events": ["test.event"],
    }
    resp = client.put(
        "/api/admin/company/integration-settings",
        json=update,
        headers=headers,
    )
    assert resp.status_code == 200
    returned = resp.get_json()["settings"]
    assert returned["webhook_enabled"] == update["webhook_enabled"]
    assert returned["webhook_url"] == update["webhook_url"]
    assert "test.event" in returned["webhook_events"]

    resp = client.get("/api/admin/company/integration-settings", headers=headers)
    assert resp.status_code == 200
    again = resp.get_json()["settings"]
    assert again["webhook_enabled"] == update["webhook_enabled"]
    assert again["webhook_url"] == update["webhook_url"]
    assert "test.event" in again["webhook_events"]


def test_export_employees_json(client):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get(
        "/api/admin/company/export/employees?format=json",
        headers=headers,
    )
    assert resp.status_code == 200
    assert "application/json" in resp.headers.get("Content-Type", "")
