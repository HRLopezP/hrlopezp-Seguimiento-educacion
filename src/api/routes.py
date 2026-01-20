"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, Rol, Project, Indicator, Location, Activity
from api.utils import generate_sitemap, APIException,  val_email, val_password, generate_reset_token, confirm_reset_token
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from .manager_decorator import manager_required
from flask_jwt_extended import jwt_required
from flask_mail import Message
from api.extensions import mail
import os

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)


@api.route("/health-check", methods=["GET"])
def health_check():
    return jsonify({"status": "OK"}), 200


@api.route("/register", methods=["POST"])
def register_user():
    data = request.get_json(silent=True)

    if data is None:
        return jsonify({"message": "Invalid JSON or no data provided"}), 400

    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    lastname = data.get("lastname")

    # 1. Validaciones básicas
    if not email or not name or not lastname or not password:
        return jsonify({"message": "Email, name, lastname and password are required"}), 400

    if not val_email(email):
        return jsonify({"message": "Email is invalid"}), 400

    if not val_password(password):
        return jsonify({"message": "Password is invalid. Requires 8+ chars, upper/lower case, number and special char."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "The email address is already registered."}), 422

    # 2. Lógica de asignación de Rol
    # Definimos qué nombre de rol vamos a buscar
    rol_name_to_assign = "Oficial"  # Por defecto todos son Oficiales
    is_active_status = False       # Por defecto entran desactivados hasta que los apruebes

    if email == "maliliana173@gmail.com":
        rol_name_to_assign = "Gerente"  # Tu correo especial
        is_active_status = True        # Tú entras activa de una vez

    # Buscamos el objeto Rol en la base de datos
    target_rol = Rol.query.filter_by(name_rol=rol_name_to_assign).first()

    if not target_rol:
        return jsonify({"message": f"Critical Error: Role '{rol_name_to_assign}' not found in database. Please create roles first."}), 500

    # 3. Creación del usuario
    hashed_password = generate_password_hash(password)

    new_user = User(
        email=email,
        password=hashed_password,
        name=name,
        lastname=lastname,
        rol_id=target_rol.id_rol,  # Usamos el ID numérico
        is_active=is_active_status
    )

    db.session.add(new_user)

    try:
        db.session.commit()
        return jsonify({
            "message": "User created successfully",
            "user": new_user.serialize()
        }), 201
    except Exception as error:
        db.session.rollback()
        return jsonify({"message": "Error creating user", "error": str(error)}), 500


@api.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)

    # 1. Primero verificamos si hay datos, para evitar errores al intentar leerlos
    if data is None:
        return jsonify({"message": "No data was provided"}), 400

    # 2. Obtenemos los datos y usamos .strip() para limpiar espacios accidentales
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    # 3. Verificamos que vengan los datos básicos
    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    # 4. Buscamos al usuario por su email
    user = User.query.filter_by(email=email).first()

    # 5. Validaciones de seguridad (Credenciales)
    if not user or not check_password_hash(user.password, password):
        return jsonify({"message": "Incorrect email or password"}), 401

    # 6. Verificamos si el usuario está activo (Estrategia SIGSSEP)
    # - Todos los usuarios entran inactivos por defecto excepto la gerente.
    if not user.is_active:
        return jsonify({"message": "Your account is pending activation by a manager."}), 403

    # 7. Preparamos las "Additional Claims" para el frontend
    # - Validamos si el rol es 'Gerente' según nuestra tabla Rol.
    is_admin = user.rol.name_rol == "Gerente"

    additional_claims = {
        "is_administrator": is_admin,
        "rol": user.rol.name_rol
    }

    # 8. Creamos el token de acceso con la identidad y los claims
    access_token = create_access_token(
        identity=str(user.id_user),
        additional_claims=additional_claims
    )

    return jsonify({
        "message": "Login successful",
        "token": access_token,
        "user": user.serialize()
    }), 200


@api.route('/request-password-reset', methods=['POST'])
def request_password_reset():
    try:
        data = request.get_json()
        email = data.get('email')
        user = User.query.filter_by(email=email).first()

        if user:
            token = generate_reset_token(email)
            frontend_url = os.getenv("FRONTEND_URL").rstrip('/')
            reset_url = f"{frontend_url}/reset-password?token={token}"

            msg = Message("Recuperación de Contraseña - SIGSSEP",
                          recipients=[email])
            msg.html = f"<b>Haz clic aquí:</b> {reset_url}"

            mail.send(msg)
            return jsonify({"message": "Correo enviado con éxito"}), 200

        return jsonify({"message": "Usuario no encontrado"}), 404

    except Exception as e:
        # Esto nos dirá en la terminal de Gitpod qué falló exactamente
        print(f"ERROR ENVIANDO CORREO: {str(e)}")
        return jsonify({"message": "Error interno al enviar el correo", "error": str(e)}), 500


@api.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('password')

    # 1. Verificación básica de datos
    if not token or not new_password:
        return jsonify({"message": "Token y contraseña son requeridos"}), 400

    # 2. Validar que la contraseña sea segura (usando tu función de utils)
    if not val_password(new_password):
        return jsonify({"message": "La contraseña no cumple con los requisitos de seguridad (8+ caracteres, mayúsculas, números y caracteres especiales)."}), 400

    # 3. Validar el token (Aquí el "notario" confirma si el email es real y no expiró)
    email = confirm_reset_token(token)
    if not email:
        return jsonify({"message": "El enlace ha expirado o es inválido. Por favor, solicita uno nuevo."}), 400

    # 4. Buscar al usuario por el email que venía dentro del token
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "Usuario no encontrado en el sistema"}), 404

    # 5. Cambiar la contraseña (siempre hasheada, ¡nunca en texto plano!)
    user.password = generate_password_hash(new_password)
    
    try:
        db.session.commit()
        return jsonify({"message": "Contraseña actualizada correctamente. Ya puedes iniciar sesión."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error interno al guardar la contraseña", "error": str(e)}), 500


        
# 1. Obtener todos los usuarios para la tabla de control
@api.route("/manager/users", methods=["GET"])
@jwt_required()
@manager_required()
def get_all_users():
    # Buscamos a todos los usuarios en la base de datos
    users = User.query.all()
    # Los devolvemos serializados para que React los pueda listar
    return jsonify([user.serialize() for user in users]), 200

# 2. Activar o desactivar un usuario (El "Visto Bueno" del Gerente)


@api.route("/manager/users/<int:user_id>/status", methods=["PATCH"])
@jwt_required()
@manager_required()
def toggle_user_status(user_id):
    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    # Cambiamos el estado: si estaba False pasa a True, y viceversa
    user.is_active = not user.is_active

    try:
        db.session.commit()
        status_text = "activado" if user.is_active else "desactivado"
        return jsonify({"message": f"Usuario {user.name} {status_text} con éxito"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error al actualizar el estado", "error": str(e)}), 500
