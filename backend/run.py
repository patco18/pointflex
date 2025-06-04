from flask import Flask

def create_app():
    app = Flask(__name__)

    with app.app_context():
        # Import routes
        from app.routes import *

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)