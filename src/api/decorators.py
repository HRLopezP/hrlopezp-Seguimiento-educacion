# decorators.py
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from functools import wraps
from flask import jsonify

def roles_required(*authorized_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("rol")

            if user_role not in authorized_roles:
                return jsonify({
                    "message": f"Acceso denegado. Se requiere uno de estos roles: {', '.join(authorized_roles)}."
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator