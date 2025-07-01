def login_superadmin(client):
    resp = client.post('/api/auth/login', json={'email': 'superadmin@pointflex.com', 'password': 'superadmin123'})
    assert resp.status_code == 200
    return resp.get_json()['token']


def test_extend_subscription_creates_invoice(client):
    token = login_superadmin(client)
    headers = {'Authorization': f'Bearer {token}'}

    resp = client.put('/api/superadmin/companies/1/extend-subscription', json={'months': 2}, headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['invoice']['months'] == 2
    invoice_id = data['invoice']['id']

    resp_inv = client.get('/api/superadmin/companies/1/invoices', headers=headers)
    assert resp_inv.status_code == 200
    invoices = resp_inv.get_json()['invoices']
    assert any(inv['id'] == invoice_id for inv in invoices)


def test_pay_invoice(client):
    token = login_superadmin(client)
    headers = {'Authorization': f'Bearer {token}'}

    # Créer une facture via prolongation
    resp = client.put('/api/superadmin/companies/1/extend-subscription', json={'months': 1}, headers=headers)
    invoice_id = resp.get_json()['invoice']['id']

    pay_resp = client.post(f'/api/superadmin/invoices/{invoice_id}/pay', json={'method': 'card'}, headers=headers)
    assert pay_resp.status_code == 200
    pay_data = pay_resp.get_json()
    assert pay_data['invoice']['status'] == 'paid'
    assert pay_data['payment']['invoice_id'] == invoice_id
