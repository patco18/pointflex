from flask import Blueprint, jsonify

main = Blueprint('main', __name__)

@main.route('/api/hello', methods=['GET'])
def hello():
    return jsonify({"message": "Connexion au backend Flask réussie ✅"})

@main.route('/api/echo', methods=['POST'])
def echo():
    from flask import request
    data = request.get_json()
    message = data.get('message', '')
    return jsonify({"response": f"Message reçu : {message}"})
