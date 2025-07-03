from backend.tests.test_reports import login_admin


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
