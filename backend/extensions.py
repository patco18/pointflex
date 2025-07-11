from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Initialize Limiter without app; configuration happens in create_app
limiter = Limiter(key_func=get_remote_address)
