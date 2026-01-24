from flask_jwt_extended import get_jwt, verify_jwt_in_request
from functools import wraps
from flask import jsonify

def manager_required(fn):
    @wraps(fn)
    def decorator(*args, **kwargs):
        # 1. Verificamos que el JWT sea válido
        # No hace falta el try/except manual si confías en el manejo de flask-jwt-extended,
        # pero dejarlo así es seguro si quieres personalizar el mensaje.
        verify_jwt_in_request()

        # 2. Obtenemos la información extra (claims) del token
        claims = get_jwt()

        # 1. Definimos los roles con "superpoderes"
        authorized_roles = ["Administrador", "Gerente"]

        # 2. Verificamos si el rol del usuario está en la lista
        if claims.get("rol") not in authorized_roles:
            return jsonify({
                "message": f"Acceso prohibido. Se requiere perfil de {', '.join(authorized_roles)}."
            }), 403

        # 4. Continuar con la función original
        return fn(*args, **kwargs)

    return decorator