from backend.tests.test_reports import login_admin
from backend.models.user import User
from backend.models.mission_user import MissionUser


def login_employee(client):
    resp = client.post(
        '/api/auth/login',
        json={'email': 'employee@pointflex.com', 'password': 'employee123'},
    )
    assert resp.status_code == 200
    return resp.get_json()['token']


def test_create_and_list_missions(client):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post('/api/missions', json={
        'order_number': 'TEST-001',
        'title': 'Mission Test'
    }, headers=headers)
    assert resp.status_code == 201

    list_resp = client.get('/api/missions', headers=headers)
    assert list_resp.status_code == 200
    missions = list_resp.get_json()['missions']
    assert any(m['order_number'] == 'TEST-001' for m in missions)


def test_assign_mission_notifies_and_pending(client, monkeypatch):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    notified = []
    monkeypatch.setattr(
        "backend.routes.mission_routes.send_notification",
        lambda user_id, message, **kwargs: notified.append(user_id),
    )

    with client.application.app_context():
        user = User.query.filter_by(email="employee@pointflex.com").first()
        user_id = user.id

    resp = client.post(
        '/api/missions',
        json={'order_number': 'TEST-002', 'title': 'Mission Assign', 'user_ids': [user_id]},
        headers=headers,
    )
    assert resp.status_code == 201
    mission = resp.get_json()['mission']
    assert notified == [user_id]
    assert mission['users'][0]['status'] == 'pending'

    with client.application.app_context():
        mu = MissionUser.query.filter_by(mission_id=mission['id'], user_id=user_id).first()
        assert mu.status == 'pending'


def test_update_mission_notifies_changes(client, monkeypatch):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    notifications = []
    logs = []

    def fake_notify(user_id, message, **kwargs):
        notifications.append((user_id, message))

    def fake_log(*args, **kwargs):
        logs.append(kwargs)

    monkeypatch.setattr(
        "backend.routes.mission_routes.send_notification",
        fake_notify,
    )
    monkeypatch.setattr(
        "backend.routes.mission_routes.log_user_action",
        fake_log,
    )

    with client.application.app_context():
        emp = User.query.filter_by(email="employee@pointflex.com").first()
        mgr = User.query.filter_by(email="manager@pointflex.com").first()
        emp_id, mgr_id = emp.id, mgr.id

    # create mission with employee assigned
    resp = client.post(
        '/api/missions',
        json={'order_number': 'TEST-003', 'title': 'Mission Update', 'user_ids': [emp_id]},
        headers=headers,
    )
    assert resp.status_code == 201
    mission_id = resp.get_json()['mission']['id']
    notifications.clear()
    logs.clear()

    # update mission: remove employee, add manager
    resp = client.put(
        f'/api/missions/{mission_id}',
        json={'user_ids': [mgr_id]},
        headers=headers,
    )
    assert resp.status_code == 200

    notified_ids = [uid for uid, _ in notifications]
    assert set(notified_ids) == {emp_id, mgr_id}
    assert any('assigné' in msg for uid, msg in notifications if uid == mgr_id)
    assert any('retiré' in msg for uid, msg in notifications if uid == emp_id)

    assert logs[0]['details']['added_user_ids'] == [mgr_id]
    assert logs[0]['details']['removed_user_ids'] == [emp_id]


def test_delete_mission_notifies_assignees(client, monkeypatch):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    notifications = []
    logs = []

    def fake_notify(user_id, message, **kwargs):
        notifications.append(user_id)

    def fake_log(*args, **kwargs):
        logs.append(kwargs)

    monkeypatch.setattr(
        "backend.routes.mission_routes.send_notification",
        fake_notify,
    )
    monkeypatch.setattr(
        "backend.routes.mission_routes.log_user_action",
        fake_log,
    )

    with client.application.app_context():
        emp = User.query.filter_by(email="employee@pointflex.com").first()
        mgr = User.query.filter_by(email="manager@pointflex.com").first()
        emp_id, mgr_id = emp.id, mgr.id

    resp = client.post(
        '/api/missions',
        json={'order_number': 'TEST-004', 'title': 'Mission Delete', 'user_ids': [emp_id, mgr_id]},
        headers=headers,
    )
    assert resp.status_code == 201
    mission_id = resp.get_json()['mission']['id']
    notifications.clear()
    logs.clear()

    resp = client.delete(f'/api/missions/{mission_id}', headers=headers)
    assert resp.status_code == 200
    assert set(notifications) == {emp_id, mgr_id}
    assert set(logs[0]['details']['notified_user_ids']) == {emp_id, mgr_id}


def test_mission_user_accepts_assignment(client, monkeypatch):
    admin_token = login_admin(client)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    notifications = []
    monkeypatch.setattr(
        "backend.routes.mission_routes.send_notification",
        lambda uid, message, **kwargs: notifications.append((uid, message)),
    )

    with client.application.app_context():
        admin = User.query.filter_by(email="admin@pointflex.com").first()
        employee = User.query.filter_by(email="employee@pointflex.com").first()
        admin_id, employee_id = admin.id, employee.id

    resp = client.post(
        '/api/missions',
        json={'order_number': 'RESP-ACC', 'title': 'Mission Accept', 'user_ids': [employee_id]},
        headers=admin_headers,
    )
    assert resp.status_code == 201
    mission_id = resp.get_json()['mission']['id']

    employee_token = login_employee(client)
    employee_headers = {"Authorization": f"Bearer {employee_token}"}

    resp = client.post(
        f'/api/missions/{mission_id}/respond',
        json={'status': 'accepted'},
        headers=employee_headers,
    )
    assert resp.status_code == 200

    with client.application.app_context():
        mu = MissionUser.query.filter_by(mission_id=mission_id, user_id=employee_id).first()
        assert mu.status == 'accepted'
        assert mu.responded_at is not None

    assert any(uid == admin_id and 'accepté' in msg for uid, msg in notifications)


def test_mission_user_declines_assignment(client, monkeypatch):
    admin_token = login_admin(client)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    notifications = []
    monkeypatch.setattr(
        "backend.routes.mission_routes.send_notification",
        lambda uid, message, **kwargs: notifications.append((uid, message)),
    )

    with client.application.app_context():
        admin = User.query.filter_by(email="admin@pointflex.com").first()
        employee = User.query.filter_by(email="employee@pointflex.com").first()
        admin_id, employee_id = admin.id, employee.id

    resp = client.post(
        '/api/missions',
        json={'order_number': 'RESP-DEC', 'title': 'Mission Decline', 'user_ids': [employee_id]},
        headers=admin_headers,
    )
    assert resp.status_code == 201
    mission_id = resp.get_json()['mission']['id']

    employee_token = login_employee(client)
    employee_headers = {"Authorization": f"Bearer {employee_token}"}

    resp = client.post(
        f'/api/missions/{mission_id}/respond',
        json={'status': 'declined'},
        headers=employee_headers,
    )
    assert resp.status_code == 200

    with client.application.app_context():
        mu = MissionUser.query.filter_by(mission_id=mission_id, user_id=employee_id).first()
        assert mu.status == 'declined'
        assert mu.responded_at is not None

    assert any(uid == admin_id and 'refusé' in msg for uid, msg in notifications)
