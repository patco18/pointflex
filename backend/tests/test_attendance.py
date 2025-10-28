import pytest
from datetime import datetime, timedelta, date

from backend.database import db
from backend.models.geolocation_accuracy_stats import GeolocationAccuracyStats
from backend.models.pointage import Pointage


def login_employee(client):
    resp = client.post('/api/auth/login', json={'email': 'employee@pointflex.com', 'password': 'employee123'})
    assert resp.status_code == 200
    return resp.get_json()['token']


def login_admin(client):
    resp = client.post('/api/auth/login', json={'email': 'admin@pointflex.com', 'password': 'admin123'})
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
    with client.application.app_context():
        created_pointage = Pointage.query.get(body['pointage']['id'])
        assert created_pointage.accuracy == data['coordinates']['accuracy']


def test_office_checkin_respects_company_accuracy(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}
    from backend.models.company import Company
    from backend.database import db
    with client.application.app_context():
        company = Company.query.first()
        company.geolocation_max_accuracy = 10
        db.session.commit()
    resp = client.post(
        '/api/attendance/checkin/office',
        json={'coordinates': {'latitude': 48.8566, 'longitude': 2.3522, 'accuracy': 50}},
        headers=headers,
    )
    assert resp.status_code == 400


def test_qr_checkin_respects_office_accuracy(client):
    admin_token = login_admin(client)
    employee_token = login_employee(client)
    from backend.models.company import Company
    from backend.models.office import Office
    from backend.database import db
    with client.application.app_context():
        company = Company.query.first()
        office = Office(
            company_id=company.id,
            name='HQ',
            address='A',
            city='Paris',
            country='FR',
            latitude=48.8566,
            longitude=2.3522,
            radius=200,
            geolocation_max_accuracy=5,
        )
        db.session.add(office)
        db.session.commit()
        office_id = office.id
    admin_headers = {'Authorization': f'Bearer {admin_token}'}
    resp = client.post(
        '/api/attendance/generate-qr-token',
        json={'office_id': office_id},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    token = resp.get_json()['token']
    headers = {'Authorization': f'Bearer {employee_token}'}
    loc = {'latitude': 48.8566, 'longitude': 2.3522, 'accuracy': 10}
    resp = client.post(
        '/api/attendance/qr-checkin',
        json={'token': token, 'location': loc},
        headers=headers,
    )
    assert resp.status_code == 400


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
        json={'mission_id': mission_id, 'coordinates': {'latitude': 0.0, 'longitude': 0.0, 'accuracy': 5}},
        headers=headers,
    )
    assert resp.status_code == 403


def test_mission_checkin_accepts_within_radius(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}

    from backend.models.user import User
    from backend.models.mission import Mission
    from backend.models.mission_user import MissionUser
    from backend.database import db

    with client.application.app_context():
        user = User.query.filter_by(email="employee@pointflex.com").first()
        mission = Mission(
            company_id=user.company_id,
            order_number='MISSION-NEAR',
            title='Mission Near',
            latitude=0.0,
            longitude=0.0,
            radius=1000,
        )
        db.session.add(mission)
        db.session.flush()
        mu = MissionUser(mission_id=mission.id, user_id=user.id, status='accepted')
        db.session.add(mu)
        db.session.commit()
        mission_id = mission.id

    resp = client.post(
        '/api/attendance/checkin/mission',
        json={'mission_id': mission_id, 'coordinates': {'latitude': 0.0, 'longitude': 0.0, 'accuracy': 10}},
        headers=headers,
    )
    assert resp.status_code == 201
    with client.application.app_context():
        mission_pointage = Pointage.query.filter_by(mission_id=mission_id).order_by(Pointage.id.desc()).first()
        assert mission_pointage is not None
        assert mission_pointage.accuracy == 10


def test_mission_checkin_rejects_outside_radius(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}

    from backend.models.user import User
    from backend.models.mission import Mission
    from backend.models.mission_user import MissionUser
    from backend.database import db

    with client.application.app_context():
        user = User.query.filter_by(email="employee@pointflex.com").first()
        mission = Mission(
            company_id=user.company_id,
            order_number='MISSION-FAR',
            title='Mission Far',
            latitude=0.0,
            longitude=0.0,
            radius=100,
        )
        db.session.add(mission)
        db.session.flush()
        mu = MissionUser(mission_id=mission.id, user_id=user.id, status='accepted')
        db.session.add(mu)
        db.session.commit()
        mission_id = mission.id

    resp = client.post(
        '/api/attendance/checkin/mission',
        json={'mission_id': mission_id, 'coordinates': {'latitude': 1.0, 'longitude': 1.0, 'accuracy': 10}},
        headers=headers,
    )
    assert resp.status_code == 403


def test_mission_checkin_rejects_when_accuracy_too_high(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}

    from backend.models.user import User
    from backend.models.mission import Mission
    from backend.models.mission_user import MissionUser
    from backend.database import db

    with client.application.app_context():
        user = User.query.filter_by(email="employee@pointflex.com").first()
        mission = Mission(
            company_id=user.company_id,
            order_number='MISSION-ACCURACY',
            title='Mission Accuracy',
            geolocation_max_accuracy=15,
        )
        db.session.add(mission)
        db.session.flush()
        mu = MissionUser(mission_id=mission.id, user_id=user.id, status='accepted')
        db.session.add(mu)
        db.session.commit()
        mission_id = mission.id

    resp = client.post(
        '/api/attendance/checkin/mission',
        json={
            'mission_id': mission_id,
            'coordinates': {'latitude': 0.0, 'longitude': 0.0, 'accuracy': 42},
        },
        headers=headers,
    )

    assert resp.status_code == 400
    assert 'Précision de localisation insuffisante' in resp.get_json()['message']




def test_mission_checkin_uses_company_accuracy_when_missing_on_mission(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}

    from backend.models.user import User
    from backend.models.mission import Mission
    from backend.models.mission_user import MissionUser


    with client.application.app_context():
        user = User.query.filter_by(email="employee@pointflex.com").first()
        user.company.geolocation_max_accuracy = 25
        mission = Mission(
            company_id=user.company_id,
            order_number='MISSION-COMPANY',
            title='Mission Company Accuracy',
        )
        db.session.add(mission)
        db.session.flush()
        mu = MissionUser(mission_id=mission.id, user_id=user.id, status='accepted')
        db.session.add(mu)
        db.session.commit()
        mission_id = mission.id

    resp = client.post(
        '/api/attendance/checkin/mission',
        json={
            'mission_id': mission_id,
            'coordinates': {'latitude': 0.0, 'longitude': 0.0, 'accuracy': 40},
        },
        headers=headers,
    )

    assert resp.status_code == 400
    body = resp.get_json()
    assert str(25) in body['message']





def test_multiple_checkins_same_day(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}

    from backend.models.user import User
    from backend.models.mission import Mission
    from backend.models.mission_user import MissionUser
    from backend.models.pointage import Pointage
    from backend.database import db
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
        json={'mission_id': mission_id, 'coordinates': {'latitude': 1.0, 'longitude': 2.0, 'accuracy': 5}},
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
    client.post(
        '/api/attendance/checkin/office',
        json={'coordinates': {'latitude': 48.8566, 'longitude': 2.3522, 'accuracy': 5}},
        headers=headers,
    )
    resp = client.get('/api/attendance/stats', headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'stats' in data


def test_geofencing_context_returns_company_data(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}

    from backend.models.user import User
    from backend.models.company import Company
    from backend.models.office import Office
    from backend.models.mission import Mission
    from backend.models.mission_user import MissionUser

    with client.application.app_context():
        user = User.query.filter_by(email="employee@pointflex.com").first()
        company = Company.query.get(user.company_id)
        company.office_latitude = 48.8566
        company.office_longitude = 2.3522
        company.office_radius = 150
        db.session.add(company)

        office = Office(
            company_id=company.id,
            name='Siège',
            address='Adresse',
            city='Paris',
            country='FR',
            latitude=48.8566,
            longitude=2.3522,
            radius=120,
            geolocation_max_accuracy=25,
            is_active=True,
        )
        db.session.add(office)
        db.session.flush()

        mission = Mission(
            company_id=company.id,
            order_number='MISSION-CONTEXT',
            title='Mission Contexte',
            latitude=48.857,
            longitude=2.353,
            radius=300,
            geolocation_max_accuracy=35,
        )
        db.session.add(mission)
        db.session.flush()

        mission_link = MissionUser(mission_id=mission.id, user_id=user.id, status='accepted')
        db.session.add(mission_link)
        db.session.commit()

    resp = client.get('/api/attendance/geofencing/context', headers=headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert 'context' in body
    context = body['context']
    assert context['offices'], 'Expected at least one office in context'
    assert context['fallback'] is not None
    assert any(m['order_number'] == 'MISSION-CONTEXT' for m in context['missions'])



