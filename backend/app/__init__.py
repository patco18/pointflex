# backend/app/__init__.py

from flask import Flask

app = Flask(__name__)

# Load configurations
app.config.from_object('config.Config')

# Import routes
from app.routes import *

# Import models
from app.models import *