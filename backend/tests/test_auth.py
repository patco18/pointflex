import pytest


def test_login_success(client):
    resp = client.post('/api/auth/login', json={'email': 'admin@pointflex.com', 'password': 'admin123'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'token' in data


def test_get_current_user(client):
    login_resp = client.post('/api/auth/login', json={'email': 'admin@pointflex.com', 'password': 'admin123'})
    token = login_resp.get_json()['token']
    headers = {'Authorization': f'Bearer {token}'}
    resp = client.get('/api/auth/me', headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['user']['email'] == 'admin@pointflex.com'
