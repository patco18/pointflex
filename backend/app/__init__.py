from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
import os

db = SQLAlchemy()

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='')

    app.config.from_object('config.Config')
    db.init_app(app)

    # Enregistrement des blueprints
    from app.routes.hello import main
    app.register_blueprint(main)

    # Route pour l'accueil (serveur frontend compilé)
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')

    return app
