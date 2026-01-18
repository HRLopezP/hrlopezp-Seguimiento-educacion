from flask_jwt_extended import get_jwt, verify_jwt_in_request
from functools import wraps
from flask import jsonify


def manager_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                # 1. Intentamos verificar el token
                verify_jwt_in_request()
            except Exception:
                # Si falla (token vencido, corrupto o ausente)
                return jsonify({"message": "Unauthorized access. Invalid or missing token."}), 401

            # 2. Extraemos los claims (el rol)
            current_user_claims = get_jwt()

            # 3. Verificamos que sea Gerente
            if current_user_claims.get("rol") != "Gerente":
                return jsonify({"message": "Access prohibited. Manager role required."}), 403

            # 4. ¡Todo bien! Dejamos pasar la función original
            return fn(*args, **kwargs)

        return decorator
    return wrapper
