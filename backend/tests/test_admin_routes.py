from backend.tests.test_reports import login_admin
from backend.tests.test_attendance import login_employee


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


def get_user_id(client, token, email):
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/admin/employees", headers=headers)
    assert resp.status_code == 200
    employees = resp.get_json()["employees"]
    return next(emp["id"] for emp in employees if emp["email"] == email)


def test_prevent_manager_cycle(client):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    manager_id = get_user_id(client, token, "manager@pointflex.com")
    employee_id = get_user_id(client, token, "employee@pointflex.com")

    # Assign manager as the supervisor of the employee
    resp = client.put(f"/api/admin/employees/{employee_id}/manager", json={"manager_id": manager_id}, headers=headers)
    assert resp.status_code == 200

    # Attempt to assign the employee back as manager of the manager -> should fail
    resp = client.put(f"/api/admin/employees/{manager_id}/manager", json={"manager_id": employee_id}, headers=headers)
    assert resp.status_code == 400


def test_prevent_indirect_manager_cycle(client):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    admin_id = get_user_id(client, token, "admin@pointflex.com")
    manager_id = get_user_id(client, token, "manager@pointflex.com")
    employee_id = get_user_id(client, token, "employee@pointflex.com")

    # employee -> manager
    resp = client.put(f"/api/admin/employees/{employee_id}/manager", json={"manager_id": manager_id}, headers=headers)
    assert resp.status_code == 200

    # manager -> admin
    resp = client.put(f"/api/admin/employees/{manager_id}/manager", json={"manager_id": admin_id}, headers=headers)
    assert resp.status_code == 200

    # Attempt to set admin -> employee (which would create a cycle)
    resp = client.put(f"/api/admin/employees/{admin_id}/manager", json={"manager_id": employee_id}, headers=headers)
    assert resp.status_code == 400


def test_get_company_attendance(client):
    admin_token = login_admin(client)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    employee_token = login_employee(client)
    employee_headers = {"Authorization": f"Bearer {employee_token}"}

    # Employee performs a check-in so there is at least one attendance record
    client.post(
        "/api/attendance/checkin/office",
        json={"coordinates": {"latitude": 48.8566, "longitude": 2.3522}},
        headers=employee_headers,
    )

    resp = client.get("/api/admin/attendance", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert any(r["user_name"] == "Test Employé" for r in data["records"])

