import pytest


def login_employee(client):
    resp = client.post('/api/auth/login', json={'email': 'employee@pointflex.com', 'password': 'employee123'})
    assert resp.status_code == 200
    return resp.get_json()['token']


def test_office_checkin(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}
    data = {'coordinates': {'latitude': 48.8566, 'longitude': 2.3522}}
    resp = client.post('/api/attendance/checkin/office', json=data, headers=headers)
    assert resp.status_code == 201
    body = resp.get_json()
    assert body['pointage']['type'] == 'office'
    assert 'is_equalized' in body['pointage']


def test_get_attendance_stats(client):
    token = login_employee(client)
    headers = {'Authorization': f'Bearer {token}'}
    client.post('/api/attendance/checkin/office', json={'coordinates': {'latitude': 48.8566, 'longitude': 2.3522}}, headers=headers)
    resp = client.get('/api/attendance/stats', headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'stats' in data
