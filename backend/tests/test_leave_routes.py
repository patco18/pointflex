from backend.tests.test_admin_routes import login_manager
from backend.tests.test_attendance import login_employee


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
