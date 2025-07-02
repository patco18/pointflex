def login_admin(client):
    resp = client.post('/api/auth/login', json={'email': 'admin@pointflex.com', 'password': 'admin123'})
    assert resp.status_code == 200
    return resp.get_json()['token']


def test_attendance_pdf(client):
    token = login_admin(client)
    headers = {'Authorization': f'Bearer {token}'}
    resp = client.get('/api/admin/attendance-report/pdf', headers=headers)
    assert resp.status_code == 200
    assert resp.headers['Content-Type'] == 'application/pdf'

