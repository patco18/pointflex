
def test_health_endpoint(client):
    resp = client.get('/api/health')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['status'] == 'healthy'


def test_login_failure(client):
    resp = client.post('/api/auth/login', json={'email': 'admin@pointflex.com', 'password': 'wrong'})
    assert resp.status_code == 401
