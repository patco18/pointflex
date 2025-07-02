from backend.tests.test_reports import login_admin


def test_get_employees(client):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/admin/employees", headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'employees' in data
    assert any(emp['email'] == 'employee@pointflex.com' for emp in data['employees'])
