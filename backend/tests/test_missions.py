from backend.tests.test_reports import login_admin
from backend.models.user import User
from backend.models.mission_user import MissionUser


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
