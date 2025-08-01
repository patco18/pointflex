from flask import Blueprint, request, jsonify
from datetime import datetime
from backend.database import db
from backend.models.invoice import Invoice
from backend.models.payment import Payment
from backend.models.company import Company

mobile_money_bp = Blueprint('mobile_money_bp', __name__)

@mobile_money_bp.route('/pay', methods=['POST'])
def process_mobile_money_payment():
    """Enregistre un paiement Mobile Money pour une facture."""
    data = request.get_json()
    required = ['invoice_id', 'company_id', 'operator', 'amount', 'transaction_id']
    if not all(k in data for k in required):
        return jsonify(message='Champs manquants'), 400

    invoice = Invoice.query.get(data['invoice_id'])
    if not invoice or invoice.company_id != data['company_id']:
        return jsonify(message='Facture introuvable'), 404

    payment = Payment(
        invoice_id=invoice.id,
        company_id=data['company_id'],
        amount=data['amount'],
        payment_method='mobile_money',
        mobile_money_operator=data['operator'],
        transaction_id=data['transaction_id'],
        status='completed',
        payment_date=datetime.utcnow().date()
    )

    try:
        db.session.add(payment)
        invoice.status = 'paid'
        invoice.paid_date = datetime.utcnow().date()
        db.session.commit()
        return jsonify(payment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify(message='Erreur lors du traitement du paiement'), 500
