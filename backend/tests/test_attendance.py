import pytest
from datetime import datetime, timedelta


def login_employee(client):
    resp = client.post('/api/auth/login', json={'email': 'employee@pointflex.com', 'password': 'employee123'})
    assert resp.status_code == 200
    return resp.get_json()['token']


def test_office_checkin(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}
    data = {'coordinates': {'latitude': 48.8566, 'longitude': 2.3522, 'accuracy': 5}}
    resp = client.post('/api/attendance/checkin/office', json=data, headers=headers)
    assert resp.status_code == 201
    body = resp.get_json()
    assert body['pointage']['type'] == 'office'
    assert 'is_equalized' in body['pointage']


def test_mission_checkin_requires_acceptance(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}

    from backend.models.user import User
    from backend.models.mission import Mission
    from backend.models.mission_user import MissionUser
    from backend.database import db

    with client.application.app_context():
        user = User.query.filter_by(email="employee@pointflex.com").first()
        mission = Mission(company_id=user.company_id, order_number='MISSION-NA', title='Mission NA')
        db.session.add(mission)
        db.session.flush()
        mu = MissionUser(mission_id=mission.id, user_id=user.id, status='pending')
        db.session.add(mu)
        db.session.commit()
        mission_id = mission.id

    resp = client.post(
        '/api/attendance/checkin/mission',
        json={'mission_id': mission_id, 'coordinates': {'latitude': 0.0, 'longitude': 0.0}},
        headers=headers,
    )
    assert resp.status_code == 403


def test_multiple_checkins_same_day(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}

    from backend.models.user import User
    from backend.models.mission import Mission
    from backend.models.mission_user import MissionUser
    from backend.models.pointage import Pointage
    from backend.database import db
    from datetime import date

    with client.application.app_context():
        user = User.query.filter_by(email="employee@pointflex.com").first()
        mission = Mission(company_id=user.company_id, order_number='MISSION-MULTI', title='Mission Multi')
        db.session.add(mission)
        db.session.flush()
        mu = MissionUser(mission_id=mission.id, user_id=user.id, status='accepted')
        db.session.add(mu)
        db.session.commit()
        mission_id = mission.id
        user_id = user.id

    resp1 = client.post(
        '/api/attendance/checkin/office',
        json={'coordinates': {'latitude': 48.8566, 'longitude': 2.3522, 'accuracy': 5}},
        headers=headers,
    )
    assert resp1.status_code == 201

    resp2 = client.post(
        '/api/attendance/checkin/mission',
        json={'mission_id': mission_id, 'coordinates': {'latitude': 1.0, 'longitude': 2.0}},
        headers=headers,
    )
    assert resp2.status_code == 201
    assert resp2.get_json()['pointage']['type'] == 'mission'

    with client.application.app_context():
        cnt = Pointage.query.filter_by(user_id=user_id, date_pointage=date.today()).count()
    assert cnt == 2


def test_get_attendance_stats(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}
    client.post('/api/attendance/checkin/office', json={'coordinates': {'latitude': 48.8566, 'longitude': 2.3522}}, headers=headers)
    resp = client.get('/api/attendance/stats', headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'stats' in data


def test_offline_checkin_records_data(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}
    ts_dt = datetime.utcnow() - timedelta(hours=1)
    data = {
        'timestamp': ts_dt.isoformat(),
        'coordinates': {'latitude': 48.8566, 'longitude': 2.3522, 'accuracy': 5},
        'device_id': 'dev123'
    }
    resp = client.post('/api/attendance/checkin/offline', json=data, headers=headers)
    assert resp.status_code == 201
    with client.application.app_context():
        from backend.models.user import User
        from backend.models.pointage import Pointage
        user = User.query.filter_by(email='employee@pointflex.com').first()
        p = Pointage.query.filter_by(user_id=user.id, date_pointage=ts_dt.date()).first()
        assert p is not None
        assert p.latitude == 48.8566
        assert p.longitude == 2.3522
        assert p.device_id == 'dev123'
        assert p.offline_timestamp.replace(microsecond=0) == ts_dt.replace(microsecond=0)


def test_offline_checkin_future_timestamp(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}
    future_ts = (datetime.utcnow() + timedelta(hours=1)).isoformat()
    data = {
        'timestamp': future_ts,
        'coordinates': {'latitude': 48.8566, 'longitude': 2.3522, 'accuracy': 5}
    }
    resp = client.post('/api/attendance/checkin/offline', json=data, headers=headers)
    assert resp.status_code == 400


def test_offline_checkin_old_timestamp(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}
    old_ts = (datetime.utcnow() - timedelta(days=2)).isoformat()
    data = {
        'timestamp': old_ts,
        'coordinates': {'latitude': 48.8566, 'longitude': 2.3522, 'accuracy': 5}
    }
    resp = client.post('/api/attendance/checkin/offline', json=data, headers=headers)
    assert resp.status_code == 400


def test_offline_checkin_requires_accuracy(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}
    ts = (datetime.utcnow() - timedelta(hours=1)).isoformat()
    data = {
        'timestamp': ts,
        'coordinates': {'latitude': 48.8566, 'longitude': 2.3522}
    }
    resp = client.post('/api/attendance/checkin/offline', json=data, headers=headers)
    assert resp.status_code == 400


def test_offline_checkin_distance_check(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}
    ts = (datetime.utcnow() - timedelta(hours=1)).isoformat()
    data = {
        'timestamp': ts,
        'coordinates': {'latitude': 0.0, 'longitude': 0.0, 'accuracy': 5}
    }
    resp = client.post('/api/attendance/checkin/offline', json=data, headers=headers)
    assert resp.status_code == 403
