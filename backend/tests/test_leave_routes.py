from backend.tests.test_admin_routes import login_manager
from backend.tests.test_attendance import login_employee
from backend.tests.test_reports import login_admin
from backend.database import db
from backend.models.user import User


def test_create_leave_type_denied_for_employee(client):
    token = login_employee(client)
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post("/api/leave/types", json={"name": "RTT"}, headers=headers)
    assert resp.status_code == 403


def test_create_leave_type_denied_for_manager(client):
    token = login_manager(client)
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post("/api/leave/types", json={"name": "RTT"}, headers=headers)
    assert resp.status_code == 403


def test_create_leave_type_dispatch_event(client, monkeypatch):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    events = []
    monkeypatch.setattr(
        "backend.utils.webhook_utils.dispatch_webhook_event",
        lambda event_type, payload_data, company_id: events.append(event_type),
    )

    resp = client.post("/api/leave/types", json={"name": "Vacation"}, headers=headers)
    assert resp.status_code == 201
    assert "leave_type.created" in events


def test_submit_leave_request_dispatch_event(client, monkeypatch):
    admin_token = login_admin(client)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    events = []
    monkeypatch.setattr(
        "backend.utils.webhook_utils.dispatch_webhook_event",
        lambda event_type, payload_data, company_id: events.append(event_type),
    )
    monkeypatch.setattr(
        "backend.routes.leave_routes.send_notification",
        lambda *a, **k: None,
    )

    # Create leave type
    resp = client.post("/api/leave/types", json={"name": "Vacation"}, headers=admin_headers)
    leave_type_id = resp.get_json()["id"]

    # Give employee balance
    with client.application.app_context():
        employee = User.query.filter_by(email="employee@pointflex.com").first()
        employee_id = employee.id
    client.post(
        f"/api/leave/admin/users/{employee_id}/balances",
        json={"leave_type_id": leave_type_id, "balance_days": 5},
        headers=admin_headers,
    )

    employee_token = login_employee(client)
    employee_headers = {"Authorization": f"Bearer {employee_token}"}

    resp = client.post(
        "/api/leave/requests",
        json={"leave_type_id": leave_type_id, "start_date": "2024-01-02", "end_date": "2024-01-02"},
        headers=employee_headers,
    )
    assert resp.status_code == 201
    assert "leave_request.created" in events


def test_submit_leave_request_triggers_notification(client, monkeypatch):
    admin_token = login_admin(client)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    monkeypatch.setattr(
        "backend.utils.webhook_utils.dispatch_webhook_event",
        lambda *a, **k: None,
    )

    notified = []

    def fake_notify(user_id, message, **kwargs):
        notified.append(user_id)

    monkeypatch.setattr(
        "backend.routes.leave_routes.send_notification",
        fake_notify,
    )

    resp = client.post("/api/leave/types", json={"name": "Vacation"}, headers=admin_headers)
    leave_type_id = resp.get_json()["id"]

    with client.application.app_context():
        employee = User.query.filter_by(email="employee@pointflex.com").first()
        admin_user = User.query.filter_by(email="admin@pointflex.com").first()
        employee_id = employee.id
        admin_id = admin_user.id

    client.post(
        f"/api/leave/admin/users/{employee_id}/balances",
        json={"leave_type_id": leave_type_id, "balance_days": 5},
        headers=admin_headers,
    )

    employee_token = login_employee(client)
    employee_headers = {"Authorization": f"Bearer {employee_token}"}

    resp = client.post(
        "/api/leave/requests",
        json={"leave_type_id": leave_type_id, "start_date": "2024-01-02", "end_date": "2024-01-02"},
        headers=employee_headers,
    )
    assert resp.status_code == 201
    assert admin_id in notified
