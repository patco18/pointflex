"""
Script simple pour tester la connexion au backend sans utiliser le frontend complet
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

BACKEND_API = "http://localhost:5000/api"  # L'URL de votre backend Flask principal

@app.route('/test-login', methods=['POST'])
def test_login():
    """
    Route pour tester la connexion à l'API backend
    """
    data = request.json
    
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"message": "Email et mot de passe requis"}), 400
    
    try:
        # Transmettre les informations de connexion au backend réel
        response = requests.post(
            f"{BACKEND_API}/auth/login",
            json={"email": data['email'], "password": data['password']}
        )
        
        # Renvoyer la réponse du backend réel
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"message": f"Erreur lors de la connexion au backend: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(port=5001, debug=True)
