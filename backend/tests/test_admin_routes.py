from backend.tests.test_reports import login_admin


def login_manager(client):
    resp = client.post('/api/auth/login', json={'email': 'manager@pointflex.com', 'password': 'manager123'})
    assert resp.status_code == 200
    return resp.get_json()['token']


def test_get_employees(client):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/admin/employees", headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'employees' in data
    assert any(emp['email'] == 'employee@pointflex.com' for emp in data['employees'])


def test_get_employees_as_manager(client):
    token = login_manager(client)
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/admin/employees", headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'employees' in data
