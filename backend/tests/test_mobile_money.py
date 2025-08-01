from backend.tests.test_billing import login_superadmin


def test_mobile_money_payment(client):
    token = login_superadmin(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Créer une facture via prolongation d'abonnement
    resp = client.put(
        "/api/superadmin/companies/1/extend-subscription",
        json={"months": 1},
        headers=headers,
    )
    assert resp.status_code == 200
    invoice_id = resp.get_json()["invoice"]["id"]

    # Payer la facture en Mobile Money
    pay_resp = client.post(
        "/api/mobile-money/pay",
        json={
            "invoice_id": invoice_id,
            "company_id": 1,
            "operator": "orange",
            "amount": 10.0,
            "transaction_id": "tx-123",
        },
    )
    assert pay_resp.status_code == 201
    payment = pay_resp.get_json()
    assert payment["invoice_id"] == invoice_id
    assert payment["mobile_money_operator"] == "orange"

    # Vérifier que la facture est marquée comme payée
    inv_resp = client.get(
        "/api/superadmin/companies/1/invoices",
        headers=headers,
    )
    assert inv_resp.status_code == 200
    invoices = inv_resp.get_json()["invoices"]
    status = next(inv for inv in invoices if inv["id"] == invoice_id)["status"]
    assert status == "paid"
