"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint, json
from api.models import db, User, Rol, Competence, ProjectStatus, ActivityCatalog, SystemChangeLog, AchievementRecord, ActivityStatus, TheoryTemplate, ResultTemplate, IndicatorTemplate, Project, ProjectCompetence, Activity, IndicatorLocationGoal, Location, Indicator, Province, Municipality, Parish, ProjectProvinceGoal, ProjectTheory, ProjectResult, MasterVerificationMean
from api.utils import generate_sitemap, APIException, paginate_query, val_email, val_password, generate_reset_token, confirm_reset_token
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from .manager_decorator import manager_required
from .decorators import roles_required
from flask_mail import Message
from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta
from api.extensions import mail
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload
import os
from .CloudinaryService import CloudinaryService

api = Blueprint('api', __name__)

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

    # 2. Lógica de "Excepción de Administrador"
    ADMIN_EMAIL = "sigssep@gmail.com"

    if email == ADMIN_EMAIL:
        rol_to_find = "Administrador"
        is_active_status = True
    else:
        rol_to_find = "Oficial"
        is_active_status = False

    # 3. Búsqueda del ID del Rol en la tabla 'Rol'
    target_rol = Rol.query.filter_by(name_rol=rol_to_find).first()

    if not target_rol:
        return jsonify({"message": f"Error: El rol '{rol_to_find}' no existe en la DB"}), 500

    # 4. Creación con Seguridad
    hashed_password = generate_password_hash(password)

    new_user = User(
        email=email,
        password=hashed_password,
        name=name,
        lastname=lastname,
        rol_id=target_rol.id_rol,
        is_active=is_active_status
    )

    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "Registro exitoso. ¡Bienvenida, Administrador!" if is_active_status else "Registro exitoso. Espere activación."}), 201
    except Exception as error:
        db.session.rollback()
        return jsonify({"message": "Error al guardar", "error": str(error)}), 500


@api.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)

    # 1. Primero verificamos si hay datos.
    if data is None:
        return jsonify({"message": "No data was provided"}), 400

    # 2. Obtenemos los datos-
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    # 3. Verificar que vengan los datos básicos
    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    # 4. Buscar al usuario por su email
    user = User.query.filter_by(email=email).first()

    # 5. Validaciones de seguridad (Credenciales)
    if not user or not check_password_hash(user.password, password):
        return jsonify({"message": "Incorrect email or password"}), 401

    # 6. Verificar si el usuario está activo.
    if not user.is_active:
        return jsonify({"message": "Your account is pending activation by a manager."}), 403

    # 7. Preparar las "Additional Claims"
    user_role_name = user.rol.name_rol if user.rol else "Oficial"
    is_admin = user_role_name == "Administrador"
    user_competences = [{"id": c.id_competence, "name": c.name}
                        for c in user.competences]

    additional_claims = {
        "is_administrator": is_admin,
        "rol": user_role_name,
        "competences": user_competences
    }

    # 8. Crear el token de acceso con la identidad y los claims
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

            user_name = f"{user.name} {user.lastname}"

            msg = Message("Recuperación de Contraseña - SIGSSEP",
                          recipients=[email])
            msg.html = f"""
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; padding: 40px 10px; color: #1B263B;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 1px solid #e0e1dd;">
                    
                    <div style="background-color: #1B263B; padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px;">SIGSSEP</h1>
                        <p style="color: #e0e1dd; margin: 5px 0 0 0; font-weight: 300;">Gestión de Supervisión y Seguimiento</p>
                    </div>

                    <div style="padding: 40px; text-align: center;">
                        <h2 style="color: #1B263B; margin-top: 0;">Hola, {user_name}</h2>
                        <p style="font-size: 16px; line-height: 1.6; color: #415A77;">
                            Has solicitado restablecer tu contraseña para acceder al sistema. No te preocupes, haz clic en el botón de abajo para configurar una nueva.
                        </p>
                        
                        <div style="margin: 35px 0;">
                            <a href="{reset_url}" 
                               style="background-color: #2D6A4F; color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.3s ease;">
                               Restablecer Contraseña
                            </a>
                        </div>

                        <p style="font-size: 13px; color: #778DA9;">
                            Este enlace expirará en poco tiempo por razones de seguridad.<br>
                            Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                        </p>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e1dd;">
                        <p style="font-size: 12px; color: #778DA9; margin: 0;">
                            &copy; 2026 SIGSSEP - Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
            """

            mail.send(msg)
            return jsonify({"message": "Correo enviado con éxito"}), 200

        return jsonify({"message": "Usuario no encontrado"}), 404

    except Exception as e:
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

    # 2. Validar que la contraseña sea segura
    if not val_password(new_password):
        return jsonify({"message": "La contraseña no cumple con los requisitos de seguridad (8+ caracteres, mayúsculas, números y caracteres especiales)."}), 400

    # 3. Validar el token
    email = confirm_reset_token(token)
    if not email:
        return jsonify({"message": "El enlace ha expirado o es inválido. Por favor, solicita uno nuevo."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "Usuario no encontrado en el sistema"}), 404

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
@manager_required
def get_all_users():
    # 1. Iniciamos la consulta base
    query = User.query

    # 2. Capturamos los filtros de la URL (si vienen)
    search = request.args.get('search', None)
    role_id = request.args.get('role_id', None)
    status = request.args.get('status', None)

    # 3. Aplicamos lógica de filtrado
    if search:
        # Buscamos coincidencias en nombre O apellido (insensible a mayúsculas con .ilike)
        query = query.filter(
            (User.name.ilike(f'%{search}%')) |
            (User.lastname.ilike(f'%{search}%'))
        )

    if role_id:
        query = query.filter(User.rol_id == role_id)

    if status:
        # Convertimos el string 'active'/'inactive' a Booleano
        is_active = True if status == 'active' else False
        query = query.filter(User.is_active == is_active)

    # 4. Ordenamos por ID descendente (como lo tenías) y paginamos
    query = query.order_by(User.id_user.desc())
    data = paginate_query(query, lambda user: user.serialize())

    return jsonify(data), 200


# 2. Activar o desactivar un usuario
@api.route("/manager/users/<int:user_id>/status", methods=["PATCH"])
@jwt_required()
@manager_required
def toggle_user_status(user_id):
    current_manager_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    if user.rol.name_rol == "Administrador" or int(current_manager_id) == user_id:
        return jsonify({
            "message": "Acción denegada. No se puede desactivar una cuenta de Administrador por seguridad."
        }), 403
    # Cambiamos el estado
    user.is_active = not user.is_active

    try:
        db.session.commit()
        status_text = "activado" if user.is_active else "desactivado"
        return jsonify({"message": f"Usuario {user.name} {status_text} con éxito"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error al actualizar el estado", "error": str(e)}), 500


@api.route("/manager/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
@manager_required
def delete_user(user_id):
    current_manager_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    # 1. PROTECCIÓN: No borrar al Administrador ni a uno mismo
    if user.rol.name_rol == "Administrador" or int(current_manager_id) == user_id:
        return jsonify({"message": "Acción denegada por seguridad"}), 403

    if len(user.activities) > 0:
        return jsonify({
            "message": f"No se puede eliminar a {user.name} porque tiene actividades asignadas. Primero desactívalo o reasigna sus tareas."
        }), 400

    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "Usuario eliminado permanentemente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error en el servidor", "error": str(e)}), 500


@api.route('/roles', methods=['GET'])
@jwt_required()
@manager_required
def get_roles():
    roles = Rol.query.all()
    return jsonify([role.serialize() for role in roles]), 200


@api.route('/roles', methods=['POST'])
@jwt_required()
@manager_required
def create_role():
    data = request.get_json()
    new_role_name = data.get("name_rol")

    if not new_role_name:
        return jsonify({"message": "El nombre del rol es obligatorio"}), 400

    exists = Rol.query.filter_by(name_rol=new_role_name).first()
    if exists:
        return jsonify({"message": "Este rol ya existe"}), 400

    new_role = Rol(name_rol=new_role_name)
    db.session.add(new_role)
    db.session.commit()

    return jsonify({"message": f"Rol '{new_role_name}' creado exitosamente"}), 201


@api.route('/roles/<int:role_id>', methods=['PUT'])
@jwt_required()
@manager_required
def update_role(role_id):
    role = Rol.query.get(role_id)
    if not role:
        return jsonify({"message": "Rol no encontrado"}), 404

    data = request.get_json()
    new_name = data.get("name_rol")

    if not new_name:
        return jsonify({"message": "El nuevo nombre es requerido"}), 400

    role.name_rol = new_name
    db.session.commit()

    return jsonify({"message": "Rol actualizado correctamente"}), 200


@api.route('/roles/<int:role_id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_role(role_id):
    role = Rol.query.get(role_id)
    if not role:
        return jsonify({"message": "Rol no encontrado"}), 404
    user_with_role = User.query.filter_by(rol_id=role_id).first()
    if user_with_role:
        return jsonify({"message": "No se puede eliminar un rol que está asignado a usuarios"}), 400

    db.session.delete(role)
    db.session.commit()

    return jsonify({"message": f"Rol '{role.name_rol}' eliminado"}), 200


@api.route("/manager/users/<int:user_id>/role", methods=["PATCH"])
@jwt_required()
@manager_required
def update_user_role(user_id):
    data = request.get_json()
    new_role_id = data.get("rol_id")

    if not new_role_id:
        return jsonify({"message": "El ID del rol es requerido"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    if user.rol.name_rol == "Administrador":
        return jsonify({
            "message": "Seguridad de SIGSSEP: El rol de Administrador no puede ser modificado."
        }), 403

    role = Rol.query.get(new_role_id)
    if not role:
        return jsonify({"message": "El rol especificado no existe"}), 404
    try:
        user.rol_id = new_role_id
        db.session.commit()
        return jsonify({"message": f"Rol de {user.name} actualizado a {role.name_rol}"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error al actualizar el rol", "error": str(e)}), 500


# 1. Endpoint para obtener los datos del perfil
@api.route('/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"message": "Usuario no encontrado"}), 404

        return jsonify(user.serialize()), 200

    except Exception as e:
        print(f"DEBUG SIGSSEP - Error en profile: {str(e)}")
        return jsonify({"message": "Error interno"}), 500


@api.route('/user/update-photo', methods=['PATCH'])
@jwt_required()
def update_photo():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.json
    new_url = data.get("profile_picture")

    if not new_url:
        return jsonify({"message": "URL no válida"}), 400
    user.profile = new_url
    db.session.commit()

    return jsonify({"message": "Imagen actualizada", "image": user.profile}), 200


@api.route('/user/update-profile', methods=['PATCH'])
@jwt_required()
def update_profile_data():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"message": "Usuario no encontrado"}), 404

        data = request.json
        user.name = data.get("name", user.name)
        user.lastname = data.get("lastname", user.lastname)

        db.session.commit()

        return jsonify({
            "message": "Perfil actualizado exitosamente",
            "user": user.serialize()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error actualizando perfil: {str(e)}")
        return jsonify({"message": "Error al actualizar los datos"}), 500


@api.route('/user/change-password', methods=['PATCH'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.json

    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not check_password_hash(user.password, current_password):
        return jsonify({"message": "La contraseña actual es incorrecta"}), 400

    user.password = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({"message": "Contraseña actualizada correctamente"}), 200


@api.route('/user/update-avatar', methods=['PATCH'])
@jwt_required()
def update_avatar():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    data = request.json
    new_image_url = data.get("image_url")
    new_public_id = data.get("public_id")

    if not new_image_url:
        return jsonify({"msg": "URL de imagen requerida"}), 400
    if not CloudinaryService.validate_cloudinary_url(new_image_url):
        return jsonify({"msg": "URL de imagen no válida"}), 400

    if user.profile_public_id:
        if user.profile_public_id != new_public_id:
            CloudinaryService.delete_file(user.profile_public_id)

    user.profile = new_image_url
    user.profile_public_id = new_public_id

    try:
        db.session.commit()
        return jsonify({
            "msg": "Avatar actualizado con éxito",
            "user": user.serialize()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al guardar en base de datos"}), 500


@api.route('/competences', methods=['GET'])
@jwt_required()
def get_competences():
    """Cualquier usuario logueado puede ver el catálogo"""
    competences = Competence.query.all()
    return jsonify([c.serialize() for c in competences]), 200


@api.route('/competences', methods=['POST'])
@manager_required
def create_competence():
    data = request.json
    name = data.get("name")

    if not name:
        return jsonify({"message": "El nombre de la competencia es obligatorio"}), 400

    if Competence.query.filter_by(name=name).first():
        return jsonify({"message": "Esta competencia ya está registrada"}), 400

    new_comp = Competence(name=name)
    db.session.add(new_comp)
    db.session.commit()

    return jsonify(new_comp.serialize()), 201


@api.route('/competences/<int:id>', methods=['PUT'])
@manager_required
def update_competence(id):
    competence = Competence.query.get(id)
    if not competence:
        return jsonify({"message": "Competencia no encontrada"}), 404

    data = request.json
    competence.name = data.get("name", competence.name)

    db.session.commit()
    return jsonify(competence.serialize()), 200


@api.route('/competences/<int:id>', methods=['DELETE'])
@manager_required
def delete_competence(id):
    competence = Competence.query.get(id)
    if not competence:
        return jsonify({"message": "Competencia no encontrada"}), 404

    try:
        db.session.delete(competence)
        db.session.commit()
        return jsonify({"message": "Competencia eliminada exitosamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "No se puede eliminar: está asignada a un proyecto"}), 400


@api.route("/user/<int:user_id>/competences", methods=["PUT"])
@jwt_required()
def assign_user_competences(user_id):
    data = request.get_json(silent=True)

    if data is None:
        return jsonify({"message": "No data provided"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    competence_ids = data.get("competence_ids", [])

    if not isinstance(competence_ids, list):
        return jsonify({"message": "competence_ids must be a list"}), 400

    try:
        selected_competences = Competence.query.filter(
            Competence.id_competence.in_(competence_ids)).all()
        user.competences = selected_competences

        db.session.commit()

        return jsonify({
            "message": f"Competences updated for user {user.name}",
            "user": user.serialize()
        }), 200

    except Exception as error:
        db.session.rollback()
        return jsonify({"message": "Error assigning competences", "error": str(error)}), 500


@api.route('/theories', methods=['GET'])
@jwt_required()
def get_theories():
    theories = TheoryTemplate.query.all()
    return jsonify([t.serialize() for t in theories]), 200


@api.route('/theories', methods=['POST'])
@manager_required
def create_theory():
    data = request.json
    name = data.get("name")
    competence_id = data.get("competence_id")

    if not name or not competence_id:
        return jsonify({"message": "Nombre y ID de competencia son obligatorios"}), 400
    if not Competence.query.get(competence_id):
        return jsonify({"message": "La competencia especificada no existe"}), 404

    new_theory = TheoryTemplate(name=name, competence_id=competence_id)
    db.session.add(new_theory)
    db.session.commit()

    return jsonify(new_theory.serialize()), 201


@api.route('/theories/<int:id>', methods=['PUT'])
@manager_required
def update_theory(id):
    theory = TheoryTemplate.query.get(id)
    if not theory:
        return jsonify({"message": "Teoría no encontrada"}), 404

    data = request.json
    theory.name = data.get("name", theory.name)
    theory.competence_id = data.get("competence_id", theory.competence_id)

    db.session.commit()
    return jsonify(theory.serialize()), 200


@api.route('/theories/<int:id>', methods=['DELETE'])
@manager_required
def delete_theory(id):
    theory = TheoryTemplate.query.get(id)
    if not theory:
        return jsonify({"message": "Teoría no encontrada"}), 404

    db.session.delete(theory)
    db.session.commit()
    return jsonify({"message": "Teoría de cambio eliminada"}), 200


@api.route('/results', methods=['POST'])
@manager_required
def create_result():
    data = request.json
    name = data.get("name")
    result_type = data.get("type")
    theory_id = data.get("theory_id")

    if not all([name, result_type, theory_id]):
        return jsonify({"message": "Faltan datos obligatorios (nombre, tipo o teoría)"}), 400

    new_result = ResultTemplate(
        name=name, type=result_type, theory_id=theory_id)
    db.session.add(new_result)
    db.session.commit()
    return jsonify(new_result.serialize()), 201


@api.route('/results/<int:id>', methods=['DELETE'])
@manager_required
def delete_result(id):
    result = ResultTemplate.query.get(id)
    if not result:
        return jsonify({"message": "Resultado no encontrado"}), 404

    db.session.delete(result)
    db.session.commit()
    return jsonify({"message": f"{result.type.capitalize()} eliminado correctamente"}), 200


@api.route('/results/<int:id>', methods=['PUT'])
@manager_required
def update_result(id):
    result = ResultTemplate.query.get(id)
    if not result:
        return jsonify({"message": "Resultado no encontrado"}), 404

    data = request.json
    result.name = data.get("name", result.name)

    db.session.commit()
    return jsonify(result.serialize()), 200


@api.route('/indicators', methods=['POST'])
@manager_required
def create_indicator():
    data = request.json
    name = data.get("name")
    code = data.get("code")
    description = data.get("description")
    result_id = data.get("result_id")

    if not all([code, description, result_id]):
        return jsonify({"message": "Código, nombre, descripción y ID de resultado son obligatorios"}), 400

    if IndicatorTemplate.query.filter_by(code=code).first():
        return jsonify({"message": f"El código de indicador {code} ya está en uso"}), 400

    new_indicator = IndicatorTemplate(
        code=code, name=name, description=description, result_id=result_id)
    try:
        db.session.add(new_indicator)
        db.session.commit()
        return jsonify(new_indicator.serialize()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al guardar", "error": str(e)}), 500


@api.route('/indicators/<int:id>', methods=['PUT'])
@manager_required
def update_indicator(id):
    indicator = IndicatorTemplate.query.get(id)
    if not indicator:
        return jsonify({"message": "Indicador no encontrado"}), 404

    data = request.json
    new_code = data.get("code")

    if new_code and new_code != indicator.code:
        if IndicatorTemplate.query.filter_by(code=new_code).first():
            return jsonify({"message": f"El código {new_code} ya existe"}), 400
        indicator.code = new_code

    indicator.description = data.get("description", indicator.description)

    db.session.commit()
    return jsonify({"id": indicator.id, "code": indicator.code, "description": indicator.description}), 200


@api.route('/indicators/<int:id>', methods=['DELETE'])
@manager_required
def delete_indicator(id):
    indicator = IndicatorTemplate.query.get(id)
    if not indicator:
        return jsonify({"message": "Indicador no encontrado"}), 404

    db.session.delete(indicator)
    db.session.commit()
    return jsonify({"message": "Indicador eliminado correctamente"}), 200


@api.route('/theories/<int:id>/details', methods=['GET'])
@jwt_required()
def get_theory_full_details(id):
    theory = TheoryTemplate.query.get(id)
    if not theory:
        return jsonify({"message": "Teoría no encontrada"}), 404

    return jsonify(theory.serialize()), 200

# Crear un nuevo proyecto


@api.route('/projects', methods=['POST'])
@jwt_required()
@manager_required
def create_project():
    data = request.json

    if not data or not data.get("code"):
        return jsonify({"msg": "El código único del proyecto es obligatorio"}), 400
    try:
        targets = data.get("unique_targets", {})

        status_from_front = data.get("status")
        new_project = Project(
            code=data.get("code"),
            donor_name=data.get("donor_name"),
            project_name=data.get("project_name"),
            main_objective=data.get("main_objective"),
            results_summary=data.get("results_summary"),
            target_total=float(targets.get("total", 0)),
            target_men=float(targets.get("men", 0)),
            target_women=float(targets.get("women", 0)),
            target_disability=float(targets.get("disability", 0)),
            start_date=datetime.strptime(
                data['start_date'], '%Y-%m-%d') if data.get('start_date') else None,
            end_date=datetime.strptime(
                data['end_date'], '%Y-%m-%d') if data.get('end_date') else None,
            status=next((s for s in ProjectStatus if s.value ==
                        status_from_front), ProjectStatus.BORRADOR)
        )

        db.session.add(new_project)
        db.session.flush()

        if data.get("locations"):
            for loc in data["locations"]:
                if not loc.get('province_id') or not loc.get('municipality_id'):
                    continue

                new_loc = Location(
                    province_id=int(loc['province_id']),
                    municipality_id=int(loc['municipality_id']),
                    parish_id=int(loc['parish_id']) if loc.get(
                        'parish_id') else None,
                    project_id=new_project.id_project
                )
                db.session.add(new_loc)

        province_targets = data.get("province_unique_targets", [])
        for p_target in province_targets:
            new_p_goal = ProjectProvinceGoal(
                project_id=new_project.id_project,
                province_id=int(p_target['province_id']),
                target_total=float(p_target.get('total', 0)),
                target_men=float(p_target.get('men', 0)),
                target_women=float(p_target.get('women', 0))
            )
            db.session.add(new_p_goal)

        if data.get("indicators"):
            for ind_data in data["indicators"]:
                t_id = ind_data.get('id') or ind_data.get('template_id')
                if not t_id:
                    continue

                new_indicator = Indicator(
                    template_id=int(t_id),
                    project_id=new_project.id_project,
                    target_total=float(ind_data.get('target', 0)),
                    target_men=float(ind_data.get('men', 0)),
                    target_women=float(ind_data.get('women', 0))
                )
                db.session.add(new_indicator)
                db.session.flush()
                loc_targets = ind_data.get("location_targets", [])
                for loc_t in loc_targets:
                    new_goal = IndicatorLocationGoal(
                        indicator_id=new_indicator.id_indicator,
                        province_id=int(loc_t['province_id']),
                        total_target=float(loc_t.get('total', 0)),
                        men=float(loc_t.get('men', 0)),
                        women=float(loc_t.get('women', 0))
                    )
                    db.session.add(new_goal)
        if data.get("competences"):
            for comp in data["competences"]:
                c_id = comp.get('competence_id')
                m_id = comp.get('manager_id')

                if c_id and m_id:
                    new_pc = ProjectCompetence(
                        project_id=new_project.id_project,
                        competence_id=int(c_id),
                        manager_id=int(m_id)
                    )
                    db.session.add(new_pc)
        db.session.commit()
        return jsonify({
            "msg": "Proyecto y metas guardados con éxito",
            "project_id": new_project.id_project
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "msg": "Error al procesar los datos",
            "error": str(e)
        }), 500


@api.route('/manager/projects', methods=['GET'])
@jwt_required()
@roles_required("Administrador", "Gerente", "Monitoreo")
def get_manager_projects():
    search = request.args.get('search', None)
    
    query = Project.query

    if search:
        query = query.filter(
            or_(
                Project.project_name.ilike(f'%{search}%'),
                Project.code.ilike(f'%{search}%')
            )
        )

    query = query.order_by(Project.id_project.desc())

    def process_project(project):
        total_goal = sum(ind.target_total for ind in project.indicators) or 1
        total_achieved = 0

        for indicator in project.indicators:
            activities = Activity.query.filter_by(
                indicator_id=indicator.id_indicator,
                status=ActivityStatus.APROBADA
            ).all()
            
            for act in activities:
                for rec in act.achievements:
                    total_achieved += (rec.men_reached or 0) + (rec.women_reached or 0)

        progress_percentage = round((total_achieved / total_goal) * 100, 2)

        if progress_percentage >= 100 and project.status != ProjectStatus.COMPLETADO:
            project.status = ProjectStatus.COMPLETADO

        project_data = project.serialize()
        project_data["progress"] = min(progress_percentage, 100)
        project_data["total_achieved"] = total_achieved
        return project_data

    data = paginate_query(query, process_project)

    db.session.commit() 
    return jsonify(data), 200


@api.route('/manager/projects/<int:id>', methods=['GET'])
@jwt_required()
@manager_required
def get_project_detail_manager(id):
    try:
        project = Project.query.get_or_404(id)
        data = project.serialize()

        if project.end_date:
            now = datetime.now()
            if project.end_date > now:
                rd = relativedelta(project.end_date, now)
                data["remaining_time_detailed"] = {
                    "years": rd.years,
                    "months": rd.months,
                    "days": rd.days
                }
            else:
                data["remaining_time_detailed"] = {
                    "years": 0, "months": 0, "days": 0}

        return jsonify(data), 200

    except Exception as e:
        print(f"❌ Error en SIGSSEP Detail: {str(e)}")
        return jsonify({"error": "Error al cargar detalles", "details": str(e)}), 500


@api.route('/projects/<int:id>', methods=['GET'])
@jwt_required()
def get_project_detail(id):
    project = Project.query.get(id)
    if not project:
        return jsonify({"msg": "Proyecto no encontrado"}), 404

    return jsonify(project.serialize()), 200


@api.route('/projects/<int:id>', methods=['PATCH'])
@jwt_required()
def update_project(id):
    project = Project.query.get(id)
    if not project:
        return jsonify({"msg": "Proyecto no encontrado"}), 404

    data = request.json

    try:
        fields = ['project_name', 'donor_name', 'main_objective',
                  'results_summary', 'code']
        for field in fields:
            if field in data:
                setattr(project, field, data[field])

        if 'status' in data:
            status_value = data['status']
            # Buscamos el Enum que coincida con el texto que viene del Front ("Borrador", "En Progreso", etc.)
            matched_status = next(
                (s for s in ProjectStatus if s.value == status_value), None)

            if matched_status:
                project.status = matched_status
            else:
                # Si no lo encuentra, por seguridad le ponemos Borrador
                project.status = ProjectStatus.BORRADOR

        if 'unique_targets' in data:
            targets = data['unique_targets']
            project.target_total = float(
                targets.get('total', project.target_total))
            project.target_men = float(targets.get('men', project.target_men))
            project.target_women = float(
                targets.get('women', project.target_women))
            project.target_disability = float(targets.get(
                'disability', project.target_disability))

        if data.get('start_date'):
            project.start_date = datetime.strptime(
                data['start_date'], '%Y-%m-%d')
        if data.get('end_date'):
            project.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d')

        if 'locations' in data:
            Location.query.filter_by(project_id=id).delete(
                synchronize_session=False)
            for loc in data['locations']:
                new_loc = Location(
                    project_id=id,
                    province_id=int(loc['province_id']),
                    municipality_id=int(loc['municipality_id']),
                    parish_id=int(loc['parish_id']) if loc.get(
                        'parish_id') else None,
                    community_institution=loc.get('community_institution')
                )
                db.session.add(new_loc)

        if 'province_unique_targets' in data:
            ProjectProvinceGoal.query.filter_by(project_id=id).delete()
            for p_goal in data['province_unique_targets']:
                new_p_goal = ProjectProvinceGoal(
                    project_id=id,
                    province_id=int(p_goal['province_id']),
                    target_total=float(p_goal.get('total', 0)),
                    target_men=float(p_goal.get('men', 0)),
                    target_women=float(p_goal.get('women', 0))
                )
                db.session.add(new_p_goal)

        if 'competences' in data:
            ProjectCompetence.query.filter_by(project_id=id).delete()
            for comp in data['competences']:
                if comp.get('competence_id') and comp.get('manager_id'):
                    new_pc = ProjectCompetence(
                        project_id=id,
                        competence_id=int(comp['competence_id']),
                        manager_id=int(comp['manager_id'])
                    )
                    db.session.add(new_pc)

        db.session.commit()
        return jsonify({
            "msg": "Proyecto actualizado exitosamente",
            "project": project.serialize()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error en PATCH project: {str(e)}")
        return jsonify({"error": str(e)}), 500


@api.route('/indicators/bulk', methods=['PATCH', 'POST'])
@jwt_required()
def bulk_indicators():
    data = request.json
    project_id = data.get("project_id")
    indicators_list = data.get("indicators", [])

    if not project_id:
        return jsonify({"msg": "Falta el ID del proyecto"}), 400

    try:
        received_template_ids = [item['template_id']
                                 for item in indicators_list]
        to_delete = Indicator.query.filter(
            Indicator.project_id == project_id,
            ~Indicator.template_id.in_(received_template_ids)
        ).all()

        for ind in to_delete:
            IndicatorLocationGoal.query.filter_by(
                indicator_id=ind.id_indicator).delete()
            ind.selected_means_list = []
            db.session.delete(ind)

        for item in indicators_list:
            from api.models import IndicatorTemplate, ProjectResult, ProjectTheory, MasterVerificationMean

            template_info = IndicatorTemplate.query.get(item['template_id'])
            if not template_info:
                continue

            is_outcome = template_info.result.type == 'outcome' if template_info.result else False
            real_project_result = ProjectResult.query.join(ProjectTheory).filter(
                ProjectTheory.project_id == project_id,
                ProjectResult.result_template_id == template_info.result_id
            ).first()

            if not real_project_result:
                print(
                    f"⚠️ Alerta: El indicador {template_info.name} no encontró un ProjectResult coincidente.")

            project_res_id = real_project_result.id if real_project_result else None
            indicator = Indicator.query.filter_by(
                project_id=project_id,
                template_id=item['template_id']
            ).first()

            t_total = item.get('target_total', 0)
            t_men = item.get('target_men', 0) if not is_outcome else None
            t_women = item.get('target_women', 0) if not is_outcome else None

            if indicator:
                indicator.target_total = t_total
                indicator.target_men = t_men
                indicator.target_women = t_women
                indicator.calculation_type = item.get(
                    'calculation_type', 'direct')
                indicator.measurement_unit = item.get(
                    'measurement_unit', 'absolute')
                indicator.verification_means = item.get(
                    'verification_means', indicator.verification_means)
                indicator.observations = item.get(
                    'observations', indicator.observations)
                indicator.project_result_id = project_res_id
            else:
                indicator = Indicator(
                    project_id=project_id,
                    template_id=item['template_id'],
                    target_total=t_total,
                    target_men=t_men,
                    target_women=t_women,
                    calculation_type=item.get('calculation_type', 'direct'),
                    measurement_unit=item.get('measurement_unit', 'absolute'),
                    verification_means=item.get('verification_means', ""),
                    observations=item.get('observations', ""),
                    project_result_id=project_res_id,
                )
                db.session.add(indicator)

            if 'means_ids' in item:
                selected_means = MasterVerificationMean.query.filter(
                    MasterVerificationMean.id.in_(item['means_ids'])
                ).all()
                indicator.selected_means_list = selected_means

            db.session.flush()

            if 'goals_by_province' in item:
                IndicatorLocationGoal.query.filter_by(
                    indicator_id=indicator.id_indicator).delete()
                for goal in item['goals_by_province']:
                    new_goal = IndicatorLocationGoal(
                        indicator_id=indicator.id_indicator,
                        province_id=goal['province_id'],
                        total_target=goal.get('target', 0),
                        men=goal.get(
                            'target_men', 0) if not is_outcome else None,
                        women=goal.get(
                            'target_women', 0) if not is_outcome else None
                    )
                    db.session.add(new_goal)

        for item in indicators_list:
            if 'depends_on_ids' in item:
                current_indicator = Indicator.query.filter_by(
                    project_id=project_id,
                    template_id=item['template_id']
                ).first()

                if current_indicator:
                    ids_a_conectar = item.get('depends_on_ids')

                    if ids_a_conectar is not None:
                        parent_indicators = Indicator.query.filter(
                            Indicator.project_id == project_id,
                            Indicator.template_id.in_(ids_a_conectar)
                        ).all()

                        current_indicator.depends_on = parent_indicators

        db.session.commit()
        return jsonify({
            "msg": "SIGSSEP: Configuración de indicadores sincronizada con éxito",
            "status": "success"
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error crítico en SIGSSEP: {str(e)}")
        return jsonify({"msg": f"Error en la base de datos: {str(e)}"}), 500


@api.route('/projects/<int:id>/summary', methods=['GET'])
@jwt_required()
def get_project_summary(id):
    project = Project.query.get(id)
    if not project:
        return jsonify({"msg": "No existe"}), 404

    return jsonify({
        "project_name": project.project_name,
        "total_locations": len(project.locations),
        "status": project.status.value if hasattr(project.status, 'value') else project.status,
        "indicators": [ind.serialize() for ind in project.indicators]
    }), 200


@api.route('/projects/<int:id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_project(id):
    project = Project.query.get(id)
    if not project:
        return jsonify({"msg": "Proyecto no encontrado"}), 404

    try:
        Location.query.filter_by(project_id=id).delete()
        ProjectProvinceGoal.query.filter_by(project_id=id).delete()
        ProjectCompetence.query.filter_by(project_id=id).delete()

        indicators = Indicator.query.filter_by(project_id=id).all()
        for ind in indicators:
            IndicatorLocationGoal.query.filter_by(
                indicator_id=ind.id_indicator).delete()
            db.session.delete(ind)

        db.session.delete(project)
        db.session.commit()

        return jsonify({"msg": "Proyecto eliminado permanentemente"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL ELIMINAR PROYECTO: {str(e)}")
        return jsonify({"error": "No se pudo eliminar el proyecto", "details": str(e)}), 500


@api.route('/competence-templates', methods=['GET'])
@jwt_required()
def get_templates():
    competences = Competence.query.all()
    return jsonify([c.serialize() for c in competences]), 200

# Endpoints de ver provincias


@api.route('/provinces', methods=['GET'])
@jwt_required()
def get_provinces():
    provinces = Province.query.all()
    return jsonify([p.serialize() for p in provinces]), 200

# 2-C


@api.route('/provinces', methods=['POST'])
@jwt_required()
@manager_required
def add_province():
    data = request.json
    if not data.get("name"):
        return jsonify({"msg": "Nombre requerido"}), 400

    new_province = Province(name=data["name"])
    db.session.add(new_province)
    db.session.commit()
    return jsonify(new_province.serialize()), 201

# 3-E


@api.route('/provinces/<int:id>', methods=['PUT'])
@jwt_required()
@manager_required
def update_province(id):
    province = Province.query.get(id)
    if not province:
        return jsonify({"msg": "No encontrada"}), 404

    data = request.json
    province.name = data.get("name", province.name)
    db.session.commit()
    return jsonify(province.serialize()), 200

# 4-B


@api.route('/provinces/<int:id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_province(id):
    province = Province.query.get(id)
    if not province:
        return jsonify({"msg": "No encontrada"}), 404

    db.session.delete(province)
    db.session.commit()
    return jsonify({"msg": "Provincia eliminada"}), 200


@api.route('/provinces/<int:province_id>/municipalities', methods=['GET'])
@jwt_required()
def get_municipalities_by_province(province_id):
    municipalities = Municipality.query.filter_by(
        province_id=province_id).all()
    return jsonify([m.serialize() for m in municipalities]), 200


@api.route('/municipalities', methods=['POST'])
@jwt_required()
@manager_required
def add_municipality():
    data = request.json
    if not data.get("name") or not data.get("province_id"):
        return jsonify({"msg": "Faltan datos requeridos (name, province_id)"}), 400

    new_muni = Municipality(
        name=data["name"],
        province_id=data["province_id"]
    )
    db.session.add(new_muni)
    db.session.commit()
    return jsonify(new_muni.serialize()), 201


# --- ENDPOINTS PARA PARROQUIAS ---
@api.route('/municipalities/<int:municipality_id>/parishes', methods=['GET'])
@jwt_required()
def get_parishes_by_municipality(municipality_id):
    parishes = Parish.query.filter_by(municipality_id=municipality_id).all()
    return jsonify([p.serialize() for p in parishes]), 200


@api.route('/parishes', methods=['POST'])
@jwt_required()
@manager_required
def add_parish():
    data = request.json
    if not data.get("name") or not data.get("municipality_id"):
        return jsonify({"msg": "Faltan datos requeridos"}), 400

    new_parish = Parish(
        name=data["name"],
        municipality_id=data["municipality_id"]
    )
    db.session.add(new_parish)
    db.session.commit()
    return jsonify(new_parish.serialize()), 201


@api.route('/municipalities/<int:id>', methods=['PUT'])
@jwt_required()
@manager_required
def update_municipality(id):
    municipality = Municipality.query.get(id)
    if not municipality:
        return jsonify({"msg": "Municipio no encontrado"}), 404

    data = request.json
    municipality.name = data.get("name", municipality.name)
    municipality.province_id = data.get(
        "province_id", municipality.province_id)

    db.session.commit()
    return jsonify(municipality.serialize()), 200


@api.route('/municipalities/<int:id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_municipality(id):
    municipality = Municipality.query.get(id)
    if not municipality:
        return jsonify({"msg": "Municipio no encontrado"}), 404
    try:
        db.session.delete(municipality)
        db.session.commit()
        return jsonify({"msg": "Municipio y sus parroquias eliminados correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al eliminar", "error": str(e)}), 500


# --- ENDPOINTS PARA PARROQUIAS ---
@api.route('/parishes/<int:id>', methods=['PUT'])
@jwt_required()
@manager_required
def update_parish(id):
    parish = Parish.query.get(id)
    if not parish:
        return jsonify({"msg": "Parroquia no encontrada"}), 404

    data = request.json
    parish.name = data.get("name", parish.name)
    parish.municipality_id = data.get(
        "municipality_id", parish.municipality_id)

    db.session.commit()
    return jsonify(parish.serialize()), 200


@api.route('/parishes/<int:id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_parish(id):
    parish = Parish.query.get(id)
    if not parish:
        return jsonify({"msg": "Parroquia no encontrada"}), 404

    db.session.delete(parish)
    db.session.commit()
    return jsonify({"msg": "Parroquia eliminada correctamente"}), 200


@api.route('/users/managers', methods=['GET'])
@jwt_required()
def get_managers():
    managers = User.query.join(Rol).filter(
        Rol.name_rol == 'Gerente', User.is_active == True).all()
    return jsonify([m.serialize() for m in managers]), 200


@api.route('/project/<int:proj_id>/assign-technical-data', methods=['POST'])
@jwt_required()
@manager_required
def assign_technical_data(proj_id):
    data = request.json
    current_user_id = get_jwt_identity()

    comp_id = data.get("competence_id")
    theory_temp_id = data.get("theory_id")
    selected_ind_ids = data.get("indicator_ids", [])

    pc = ProjectCompetence.query.filter_by(
        project_id=proj_id,
        competence_id=comp_id,
        manager_id=current_user_id
    ).first()

    if not pc:
        return jsonify({"message": "No tienes permiso para esta competencia"}), 403

    try:
        proj_theory = ProjectTheory.query.filter_by(
            project_id=proj_id,
            theory_template_id=theory_temp_id
        ).first()

        if not proj_theory:
            proj_theory = ProjectTheory(
                project_id=proj_id,
                project_competence_id=pc.id_pc,
                theory_template_id=theory_temp_id
            )
            db.session.add(proj_theory)
            db.session.flush()
        ind_templates = IndicatorTemplate.query.filter(
            IndicatorTemplate.id.in_(selected_ind_ids)).all()

        result_template_ids = set([it.result_id for it in ind_templates])

        for r_temp_id in result_template_ids:
            p_res = ProjectResult.query.filter_by(
                project_theory_id=proj_theory.id,
                result_template_id=r_temp_id
            ).first()

            if not p_res:
                p_res = ProjectResult(
                    project_theory_id=proj_theory.id,
                    result_template_id=r_temp_id
                )
                db.session.add(p_res)
                db.session.flush()
            for it in ind_templates:
                if it.result_id == r_temp_id:
                    exists = Indicator.query.filter_by(
                        project_id=proj_id,
                        template_id=it.id
                    ).first()

                    if not exists:
                        new_ind = Indicator(
                            project_id=proj_id,
                            template_id=it.id,
                            project_result_id=p_res.id,
                            target_total=0.0
                        )
                        db.session.add(new_ind)

        db.session.commit()
        return jsonify({"message": "¡SIGSSEP actualizado! Plan técnico vinculado."}), 201

    except Exception as e:
        db.session.rollback()
        print(f"ERROR EN BACKEND: {str(e)}")
        return jsonify({"error": str(e)}), 500


@api.route('/competence/<int:comp_id>/theories', methods=['GET'])
@jwt_required()
def get_competence_theories(comp_id):
    competence = Competence.query.get(comp_id)

    if not competence:
        return jsonify({"message": "Competencia no encontrada"}), 404
    return jsonify([theory.serialize() for theory in competence.theories]), 200


# proyectos por gerente
@api.route('/my-assigned-projects', methods=['GET'])
@jwt_required()
@manager_required
def get_my_assignments():
    current_user_id = get_jwt_identity()
    assignments = ProjectCompetence.query.filter_by(
        manager_id=current_user_id).all()

    results = []
    for asig in assignments:
        results.append({
            "project_id": asig.project_id,
            "project_name": asig.project.project_name,
            "project_code": asig.project.code,
            "competence_id": asig.competence_id,
            "competence_name": asig.competence.name,
            "status": asig.project.status.value
        })

    return jsonify(results), 200


# agregar datos técnicos al indicador
@api.route('/indicators/<int:ind_id>/complete-data', methods=['PUT'])
@jwt_required()
@manager_required
def complete_indicator_data(ind_id):
    data = request.json
    indicator = Indicator.query.get(ind_id)

    if not indicator:
        return jsonify({"message": "Indicador no encontrado"}), 404

    indicator.target_total = data.get("target_total", indicator.target_total)
    indicator.target_men = data.get("target_men", indicator.target_men)
    indicator.target_women = data.get("target_women", indicator.target_women)

    if hasattr(indicator, 'verification_means'):
        indicator.verification_means = data.get(
            "verification_means", indicator.verification_means)
    if hasattr(indicator, 'observations'):
        indicator.observations = data.get(
            "observations", indicator.observations)

    if 'province_goals' in data:
        IndicatorLocationGoal.query.filter_by(indicator_id=ind_id).delete()

        for pg in data['province_goals']:
            new_goal = IndicatorLocationGoal(
                indicator_id=ind_id,
                province_id=pg['province_id'],
                total_target=pg['total_target'],
                men=pg.get('men', 0),
                women=pg.get('women', 0)
            )
            db.session.add(new_goal)

    try:
        db.session.commit()
        return jsonify({"message": "Datos técnicos actualizados correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# Obtener progreso de una competencia en un proyecto
@api.route('/project/<int:proj_id>/competence/<int:comp_id>/technical-status', methods=['GET'])
@jwt_required()
def get_technical_status(proj_id, comp_id):
    pc = ProjectCompetence.query.filter_by(
        project_id=proj_id, competence_id=comp_id).first()

    if not pc:
        return jsonify({"message": "No hay datos para esta competencia en este proyecto"}), 404

    theories = ProjectTheory.query.filter_by(
        project_competence_id=pc.id_pc).all()

    return jsonify([t.serialize() for t in theories]), 200


# para mostrar los indicadores de un proyecto en específico
@api.route('/projects/<int:project_id>/indicators', methods=['GET'])
@jwt_required()
def get_project_indicatores(project_id):
    indicators = Indicator.query.filter_by(project_id=project_id).all()

    return jsonify([ind.serialize() for ind in indicators]), 200


# 1. Listado de medios de verificación 1
@api.route('/verification-means', methods=['GET'])
@jwt_required()
def get_verification_means():
    # 1. Iniciamos la consulta base ordenada por ID asc
    query = MasterVerificationMean.query

    # 2. Capturamos el parámetro de búsqueda (si viene)
    search = request.args.get('search', None)

    # 3. Aplicamos el filtro si hay búsqueda
    if search:
        # Buscamos coincidencias en el campo 'name' (.ilike para insensible a mayúsculas)
        query = query.filter(MasterVerificationMean.name.ilike(f'%{search}%'))

    # 4. Ordenamos obligatoriamente (importante para una paginación consistente)
    query = query.order_by(MasterVerificationMean.id.asc())

    # 5. Mantenemos tu lógica original: Si no hay parámetro 'page', devolvemos todo
    if not request.args.get('page'):
        # (Aquí también aplicamos el filtro si existía)
        means = query.all()
        return jsonify([m.serialize() for m in means]), 200

    # 6. Si hay parámetro 'page', paginamos el resultado (ya filtrado)
    data = paginate_query(query, lambda m: m.serialize())
    return jsonify(data), 200


# 2-C
@api.route('/verification-means', methods=['POST'])
@manager_required
def create_verification_mean():
    data = request.json
    name = data.get("name")

    if not name:
        return jsonify({"message": "El nombre del medio es obligatorio"}), 400
    if MasterVerificationMean.query.filter_by(name=name).first():
        return jsonify({"message": "Este medio de verificación ya existe"}), 400

    new_mean = MasterVerificationMean(name=name)
    db.session.add(new_mean)
    db.session.commit()

    return jsonify(new_mean.serialize()), 201

# 3-E


@api.route('/verification-means/<int:id>', methods=['PUT'])
@manager_required
def update_verification_mean(id):
    mean = MasterVerificationMean.query.get(id)
    if not mean:
        return jsonify({"message": "Medio de verificación no encontrado"}), 404

    data = request.json
    mean.name = data.get("name", mean.name)
    db.session.commit()
    return jsonify(mean.serialize()), 200

# 4-B


@api.route('/verification-means/<int:id>', methods=['DELETE'])
@manager_required
def delete_verification_mean(id):
    mean = MasterVerificationMean.query.get(id)
    if not mean:
        return jsonify({"message": "Medio de verificación no encontrado"}), 404
    try:
        db.session.delete(mean)
        db.session.commit()
        return jsonify({"message": "Medio de verificación eliminado exitosamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "message": "No se puede eliminar: este medio está siendo utilizado en indicadores activos"
        }), 400


@api.route('/indicators/<int:id>', methods=['PATCH'])
@jwt_required()
def patch_indicator(id):
    indicator = Indicator.query.get(id)
    if not indicator:
        return jsonify({"message": "Indicador no encontrado"}), 404

    data = request.json

    if "verification_means" in data:
        indicator.verification_means = data.get("verification_means")

    if "observations" in data:
        indicator.observations = data.get("observations")

    if "means_ids" in data:
        new_means_ids = data.get("means_ids")
        selected_means = MasterVerificationMean.query.filter(
            MasterVerificationMean.id.in_(new_means_ids)
        ).all()
        indicator.selected_means_list = selected_means

    try:
        db.session.commit()
        return jsonify(indicator.serialize()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error al actualizar: {str(e)}"}), 500


@api.route("/project/<int:project_id>/my-indicators", methods=["GET"])
@jwt_required()
def get_my_indicators(project_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    user_comp_ids = [c.id_competence for c in user.competences]

    all_project_indicators = Indicator.query.filter_by(
        project_id=project_id).all()

    filtered_indicators = []
    for ind in all_project_indicators:
        res = ind.project_result.result_template if ind.project_result else (
            ind.template.result if ind.template else None)
        comp_id = res.theory.competence_id if res and res.theory else None

        if comp_id in user_comp_ids:
            filtered_indicators.append(ind.serialize())

    return jsonify(filtered_indicators), 200

# Enpoints para generar listado de actividades 1-C


@api.route('/activities', methods=['POST'])
@jwt_required()
def create_activity():
    user_id = get_jwt_identity()
    data = request.json
    required = ["description", "start_date", "end_date", "planned_target",
                "indicator_id", "project_id", "location_id", "project_competence_id"]
    if not all(field in data for field in required):
        return jsonify({"message": "Faltan datos obligatorios para la planificación"}), 400
    try:
        new_activity = Activity(
            description=data['description'],
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d'),
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d'),
            planned_target=data['planned_target'],
            indicator_id=data['indicator_id'],
            project_id=data['project_id'],
            location_id=data['location_id'],
            project_competence_id=data['project_competence_id'],
            # Auditoría: Quién la crea
            created_by_id=user_id,
            status=ActivityStatus.PLANIFICADA
        )

        db.session.add(new_activity)
        db.session.commit()
        return jsonify(new_activity.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error al crear planificación: {str(e)}"}), 500

# 2-E


@api.route('/activities/<int:id>', methods=['PATCH'])
@jwt_required()
def patch_activity(id):
    user_id = get_jwt_identity()
    activity = Activity.query.get(id)
    if not activity:
        return jsonify({"message": "No encontrada"}), 404

    data = request.json
    for field in ["description", "planned_target", "status", "start_date", "end_date"]:
        if field in data:
            old_val = str(getattr(activity, field))
            new_val = str(data[field])

            if old_val != new_val:
                log = SystemChangeLog(
                    entity_type="Activity",
                    entity_id=activity.id_activity,
                    user_id=user_id,
                    field_changed=field,
                    old_value=old_val,
                    new_value=new_val
                )
                db.session.add(log)
                if "date" in field:
                    setattr(activity, field, datetime.strptime(
                        data[field], '%Y-%m-%d'))
                else:
                    setattr(activity, field, data[field])

    activity.updated_by_id = user_id
    db.session.commit()
    return jsonify({"message": "Planificación editada con historial"}), 200

# 3-B


@api.route('/activities/<int:id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_activity(id):
    activity = Activity.query.get(id)
    if not activity:
        return jsonify({"message": "Actividad no encontrada"}), 404
    try:
        db.session.delete(activity)
        db.session.commit()
        return jsonify({"message": "Actividad eliminada por el Gerente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error: {str(e)}"}), 500


# Endpoints de logros 1
@api.route('/achievements', methods=['POST'])
@jwt_required()
def create_achievement():
    user_id = get_jwt_identity()
    data = request.json
    activity = Activity.query.get_or_404(data.get('activity_id'))

    try:
        new_record = AchievementRecord(
            activity_id=activity.id_activity,
            men_reached=float(data.get('men_reached', 0)),
            women_reached=float(data.get('women_reached', 0)),
            disability_reached=float(data.get('disability_reached', 0)),
            attended_count=float(data.get('attended_count', 0)),
            approved_count=float(data.get('approved_count', 0)),
            evidence_url=data.get('evidence_url'),
            evidence_public_id=data.get('evidence_public_id'),
            observations=data.get('observations'),
            user_id=user_id
        )

        activity.status = ActivityStatus.EN_REVISION
        db.session.add(new_record)
        db.session.flush()

        audit_entry = SystemChangeLog(
            entity_type="AchievementRecord",
            entity_id=new_record.id,
            user_id=user_id,
            field_changed="status",
            old_value="N/A",
            new_value="Creado / En Revisión"
        )
        db.session.add(audit_entry)

        db.session.commit()

        return jsonify({
            "message": "Logro registrado exitosamente",
            "record": new_record.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error en el servidor: {str(e)}"}), 500

# 2-E


@api.route('/achievements/<int:id>', methods=['PATCH'])
@jwt_required()
def patch_achievement(id):
    user_id = get_jwt_identity()
    record = AchievementRecord.query.get_or_404(id)
    activity = record.activity

    if activity.status == ActivityStatus.APROBADA:
        return jsonify({"message": "No se pueden editar logros de una actividad ya aprobada"}), 403

    data = request.json
    # 1. Agregamos TODOS los campos que quieres vigilar
    fields_to_track = [
        'men_reached', 'women_reached', 'disability_reached',
        'attended_count', 'approved_count', 'observations'
    ]

    try:
        for field in fields_to_track:
            if field in data:
                old_val = str(getattr(record, field) or "")
                new_val = str(data[field])

                if old_val != new_val:
                    # Guardamos el rastro en el historial
                    audit = SystemChangeLog(
                        entity_type="AchievementRecord",
                        entity_id=record.id,
                        user_id=user_id,
                        field_changed=field,
                        old_value=old_val,
                        new_value=new_val
                    )
                    db.session.add(audit)
                    # Actualizamos el valor dinámicamente
                    setattr(record, field, data[field])

        # 2. Lógica especial para la evidencia (Cloudinary)
        if 'evidence_url' in data:
            new_url = data.get('evidence_url')
            new_public_id = data.get('evidence_public_id')

            if new_url and new_url != record.evidence_url:
                # Si hay una imagen vieja, la borramos
                if record.evidence_public_id:
                    CloudinaryService.delete_file(record.evidence_public_id)

                # Registramos el cambio de URL en auditoría
                audit_img = SystemChangeLog(
                    entity_type="AchievementRecord",
                    entity_id=record.id,
                    user_id=user_id,
                    field_changed="evidence_url",
                    old_value=record.evidence_url,
                    new_value=new_url
                )
                db.session.add(audit_img)

                record.evidence_url = new_url
                record.evidence_public_id = new_public_id

        # 3. Reset de revisión
        activity.status = ActivityStatus.EN_REVISION
        record.monitoring_comment = None
        record.updated_by_id = user_id

        db.session.commit()
        return jsonify({"message": "Logro actualizado y auditado", "record": record.serialize()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error: {str(e)}"}), 500

# 3-B


@api.route('/achievements/<int:id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_achievement(id):
    achievement = AchievementRecord.query.get(id)
    if not achievement:
        return jsonify({"message": "Registro de logro no encontrado"}), 404

    try:
        db.session.delete(achievement)
        db.session.commit()
        return jsonify({"message": "Logro eliminado permanentemente por el Gerente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error al eliminar el registro: {str(e)}"}), 500


# subir evidencias a Cloudinary
@api.route('/upload-evidence', methods=['POST'])
@jwt_required()
def upload_evidence():
    if 'file' not in request.files:
        return jsonify({"message": "No se encontró ningún archivo"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "El archivo no tiene nombre"}), 400

    folder = request.form.get("folder", "sigssep_evidences")

    try:
        secure_url, public_id = CloudinaryService.upload_file(
            file, folder=folder)

        if secure_url is None or public_id is None:
            return jsonify({"message": "Cloudinary no pudo procesar el archivo"}), 500

        return jsonify({
            "message": "Archivo subido con éxito",
            "url": secure_url,
            "public_id": public_id
        }), 200

    except Exception as e:
        print(f"Error crítico en endpoint upload: {str(e)}")
        return jsonify({"message": "Error interno al procesar la subida"}), 500


@api.route('/project/<int:project_id>/progress-summary', methods=['GET'])
@jwt_required()
def get_project_progress(project_id):
    print(
        f"DEBUG: Total indicadores en DB para este proyecto: {Indicator.query.filter_by(project_id=project_id).count()}")
    try:
        competence_id = request.args.get('competence_id')
        query = Indicator.query.filter_by(project_id=project_id)

        if competence_id:
            from api.models import ProjectResult, IndicatorTemplate, ResultTemplate, TheoryTemplate
            query = query.join(IndicatorTemplate, Indicator.template_id == IndicatorTemplate.id)\
                         .join(ResultTemplate, IndicatorTemplate.result_id == ResultTemplate.id)\
                         .join(TheoryTemplate, ResultTemplate.theory_id == TheoryTemplate.id)\
                         .outerjoin(ProjectResult, Indicator.project_result_id == ProjectResult.id)\
                         .filter(
                             db.or_(
                                 TheoryTemplate.competence_id == competence_id,
                                 ProjectResult.id != None
                             )
            )

        indicators = query.all()
        print(f"DEBUG: Indicadores tras el join corregido: {len(indicators)}")

        if not indicators:
            return jsonify([]), 200

        # 2. Consultamos logros agrupados por indicador y provincia
        results = db.session.query(
            Indicator.id_indicator,
            Province.id.label("province_id"),
            Province.name.label("province_name"),
            func.sum(func.coalesce(
                AchievementRecord.men_reached, 0)).label("men"),
            func.sum(func.coalesce(AchievementRecord.women_reached, 0)
                     ).label("women"),
            func.sum(func.coalesce(AchievementRecord.attended_count, 0)).label(
                "attended"),
            func.sum(func.coalesce(AchievementRecord.approved_count, 0)).label(
                "approved")
        ).select_from(Indicator)\
         .join(Activity, Activity.indicator_id == Indicator.id_indicator)\
         .join(Location, Activity.location_id == Location.id_location)\
         .join(Province, Location.province_id == Province.id)\
         .join(AchievementRecord, AchievementRecord.activity_id == Activity.id_activity)\
         .filter(
             Indicator.project_id == project_id,
             Activity.status == ActivityStatus.APROBADA
        )\
            .group_by(Indicator.id_indicator, Province.id, Province.name).all()

        achievements_map = {}
        for r in results:
            if r.id_indicator not in achievements_map:
                achievements_map[r.id_indicator] = {}
            achievements_map[r.id_indicator][r.province_id] = r

        summary = []

        for ind in indicators:
            is_outcome = ind.type == 'outcome'
            is_dependent = ind.calculation_type == 'dependent'
            is_independent_outcome = is_outcome and not is_dependent

            provincias_data = []
            total_ind_men, total_ind_women, total_ind_att, total_ind_app = 0.0, 0.0, 0.0, 0.0

            final_men, final_women = 0.0, 0.0

            # --- LÓGICA ESPECIAL PARA OUTCOMES DEPENDIENTES ---
            parent_goals_by_prov = {}
            global_parent_men_goal = 0.0
            global_parent_women_goal = 0.0

            if is_dependent:
                for parent in ind.depends_on:
                    for g in parent.location_goals:
                        p_id = g.province_id
                        if p_id not in parent_goals_by_prov:
                            parent_goals_by_prov[p_id] = {
                                'men': 0, 'women': 0, 'total': 0}
                        parent_goals_by_prov[p_id]['men'] += g.men
                        parent_goals_by_prov[p_id]['women'] += g.women
                        parent_goals_by_prov[p_id]['total'] += g.total_target
                        global_parent_men_goal += g.men
                        global_parent_women_goal += g.women

            # --- PROCESAR CADA PROVINCIA DEL INDICADOR ACTUAL ---
            for goal in ind.location_goals:
                p_id = goal.province_id
                p_men, p_women, p_att, p_app = 0.0, 0.0, 0.0, 0.0

                # Obtener logros (si es dependiente, sumamos los de sus hijos/dependencias)
                if is_dependent:
                    for child in ind.depends_on:
                        c_res = achievements_map.get(
                            child.id_indicator, {}).get(p_id)
                        if c_res:
                            p_men += float(c_res.men)
                            p_women += float(c_res.women)
                            p_att += float(c_res.attended)
                            p_app += float(c_res.approved)
                else:
                    res = achievements_map.get(ind.id_indicator, {}).get(p_id)
                    if res:
                        p_men, p_women = float(res.men), float(res.women)
                        p_att, p_app = float(res.attended), float(res.approved)

                if is_outcome and is_dependent:
                    p_target = parent_goals_by_prov.get(
                        p_id, {}).get('total', 0)
                    p_advance = ((p_men + p_women) / p_target *
                                 100) if p_target > 0 else 0
                    p_men_val = (p_men / parent_goals_by_prov[p_id]['men'] * 100) if parent_goals_by_prov.get(
                        p_id, {}).get('men', 0) > 0 else 0
                    p_women_val = (p_women / parent_goals_by_prov[p_id]['women'] * 100) if parent_goals_by_prov.get(
                        p_id, {}).get('women', 0) > 0 else 0
                else:
                    p_advance = (
                        p_app / p_att * 100) if is_outcome and p_att > 0 else (p_men + p_women)
                    p_men_val, p_women_val = p_men, p_women

                provincias_data.append({
                    "province_id": p_id,
                    "province_name": goal.province.name,
                    "target": goal.total_target,
                    "target_men": goal.men,
                    "target_women": goal.women,
                    "achieved": round(p_advance, 2),
                    "men": round(p_men_val, 2),
                    "women": round(p_women_val, 2),
                    "attended": p_att,
                    "approved": p_app
                })

                total_ind_men += p_men
                total_ind_women += p_women
                total_ind_att += p_att
                total_ind_app += p_app

            # --- CÁLCULO GLOBAL ---
            if is_outcome:
                provincias_con_meta = [
                    g.total_target for g in ind.location_goals if g.total_target > 0]
                display_target = sum(
                    provincias_con_meta) / len(provincias_con_meta) if provincias_con_meta else 0

                if is_dependent:
                    g_target_total = global_parent_men_goal + global_parent_women_goal
                    global_achieved = ((total_ind_men + total_ind_women) /
                                       g_target_total * 100) if g_target_total > 0 else 0
                    final_men = (total_ind_men / global_parent_men_goal *
                                 100) if global_parent_men_goal > 0 else 0
                    final_women = (total_ind_women / global_parent_women_goal *
                                   100) if global_parent_women_goal > 0 else 0
                else:
                    global_achieved = (
                        total_ind_app / total_ind_att * 100) if total_ind_att > 0 else 0
                    final_men, final_women = total_ind_men, total_ind_women

            else:
                global_achieved = (total_ind_men + total_ind_women)
                final_men, final_women = total_ind_men, total_ind_women
                display_target = sum(
                    g.total_target for g in ind.location_goals)

            summary.append({
                "id": ind.id_indicator,
                "code": ind.template.code if ind.template else "N/A",
                "name": ind.template.name if ind.template else "Sin nombre",
                "description": ind.template.description if ind.template else "",
                "type": ind.type,
                "is_dependent": is_dependent,
                "global_target": round(display_target, 2),
                "global_target_men": sum(g.men for g in ind.location_goals),
                "global_target_women": sum(g.women for g in ind.location_goals),
                "global_achieved": round(global_achieved, 2),
                "total_men": round(final_men, 2),
                "total_women": round(final_women, 2),
                "total_attended": total_ind_att if is_independent_outcome else 0,
                "total_approved": total_ind_app if is_independent_outcome else 0,
                "provinces": provincias_data
            })

        return jsonify(summary), 200
    except Exception as e:
        print(f"Error en progress-summary: {str(e)}")
        return jsonify({"error": str(e)}), 500


@api.route('/audit-logs', methods=['GET'])
@jwt_required()
@manager_required
def get_audit_logs():
    entity_type = request.args.get('type')
    entity_id = request.args.get('id')
    user_id = request.args.get('user_id')

    query = SystemChangeLog.query

    if entity_type:
        query = query.filter_by(entity_type=entity_type)
    if entity_id:
        query = query.filter_by(entity_id=entity_id)
    if user_id:
        query = query.filter_by(user_id=user_id)

    logs = query.order_by(SystemChangeLog.change_date.desc()).all()

    results = []
    for log in logs:
        results.append({
            "id": log.id,
            "entity": log.entity_type,
            "entity_id": log.entity_id,
            "field": log.field_changed,
            "old": log.old_value,
            "new": log.new_value,
            "date": log.change_date.strftime("%Y-%m-%d %H:%M:%S"),
            "user": f"{log.user.name} {log.user.lastname}"
        })

    return jsonify(results), 200


@api.route('/official/competences', methods=['GET'])
@jwt_required()
def get_oficial_competencias():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404
    competencias = [
        {"id": comp.id_competence, "name": comp.name}
        for comp in user.competences
    ]

    return jsonify(competencias), 200


@api.route('/official/projects', methods=['GET'])
@jwt_required()
def get_proyectos_por_competencia():
    competencia_id = request.args.get('competencia_id')

    if not competencia_id:
        return jsonify({"msg": "Falta el ID de la competencia"}), 400

    proyectos_ids = ProjectCompetence.query.filter_by(
        competence_id=competencia_id).all()

    proyectos_data = []
    for rel in proyectos_ids:
        p = rel.project
        if p:
            proyectos_data.append({
                "id": p.id_project,
                "project_name": p.project_name,
                "code": p.code
            })

    return jsonify(proyectos_data), 200


# Oficial crea actividades/planificar 1
@api.route('/official/activities', methods=['POST'])
@jwt_required()
def create_activitys():
    user_id = get_jwt_identity()
    data = request.json

    required_fields = ['description', 'indicator_id',
                       'location_id', 'project_id', 'start_date', 'end_date']
    if not all(field in data for field in required_fields):
        return jsonify({"msg": "Faltan campos obligatorios"}), 400

    try:
        total_meta = data.get('planned_target') or data.get(
            'planned_total') or 0

        # 1. Buscamos el indicador para validar que existe
        indicador = Indicator.query.get(data['indicator_id'])
        if not indicador:
            return jsonify({"msg": "Indicador no encontrado"}), 404

        # 2. Creamos la actividad
        new_activity = Activity(
            description=data.get('description', ''),
            observations=data.get('observations', ''),
            start_date=datetime.strptime(
                data['start_date'].split('T')[0], '%Y-%m-%d'),
            end_date=datetime.strptime(
                data['end_date'].split('T')[0], '%Y-%m-%d'),
            planned_target=float(total_meta),
            planned_men=float(data.get('planned_men', 0)),
            planned_women=float(data.get('planned_women', 0)),
            status=ActivityStatus.PLANIFICADA,

            # --- CORRECCIÓN FINAL DE CABLES ---
            indicator_id=indicador.id_indicator,
            project_id=int(data['project_id']),
            location_id=int(data['location_id']),

            # Usamos el project_competence_id que viene del frontend (el Selector de Contexto)
            # que es exactamente lo que hacía el endpoint viejo que sí te servía
            project_competence_id=data.get('project_competence_id'),
            # ----------------------------------

            created_by_id=user_id
        )

        db.session.add(new_activity)
        db.session.commit()

        return jsonify({
            "msg": "Actividad planificada exitosamente",
            "activity": new_activity.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error en create_activity: {str(e)}")
        return jsonify({"msg": "Error interno", "error": str(e)}), 500


# Función auxiliar para usar en el siguiente endpoint
def create_log(entity_id, field_name, old, new, user_id):
    log = SystemChangeLog(
        entity_type='activity',
        entity_id=entity_id,
        user_id=user_id,
        field_changed=field_name,
        old_value=str(old),
        new_value=str(new)
    )
    db.session.add(log)

# 2-E


@api.route('/official/activities/<int:activity_id>', methods=['PATCH'])
@jwt_required()
def update_activity(activity_id):
    user_id = get_jwt_identity()
    data = request.json

    activity = Activity.query.get(activity_id)
    if not activity:
        return jsonify({"msg": "Actividad no encontrada"}), 404

    if activity.created_by_id != user_id:
        print(f"Aviso: Usuario {user_id} editando actividad ajena")

    try:
        if 'planned_total' in data and 'planned_target' not in data:
            data['planned_target'] = data['planned_total']

        fields_to_track = {
            'description': 'Descripción',
            'observations': 'Observaciones',
            'planned_target': 'Meta Total',
            'planned_men': 'Meta Hombres',
            'planned_women': 'Meta Mujeres',
            'start_date': 'Fecha Inicio',
            'end_date': 'Fecha Fin',
            'indicator_id': 'Indicador',
            'location_id': 'Ubicación',
            'project_competence_id': 'Competencia'
        }

        for field, label in fields_to_track.items():
            if field in data:
                old_val = getattr(activity, field)
                new_val = data[field]

                if field in ['start_date', 'end_date'] and new_val:
                    new_dt = datetime.strptime(
                        new_val.split('T')[0], '%Y-%m-%d')
                    if not old_val or old_val.date() != new_dt.date():
                        create_log(activity.id_activity, label, str(
                            old_val), str(new_dt.date()), user_id)
                        setattr(activity, field, new_dt)

                elif field in ['planned_target', 'planned_men', 'planned_women', 'indicator_id', 'location_id', 'project_competence_id']:
                    clean_new_val = int(new_val) if new_val and 'id' in field else (
                        float(new_val) if new_val else 0.0)
                    if str(old_val) != str(clean_new_val):
                        create_log(activity.id_activity, label, str(
                            old_val), str(clean_new_val), user_id)
                        setattr(activity, field, clean_new_val)

                elif str(old_val) != str(new_val):
                    create_log(activity.id_activity, label,
                               str(old_val), str(new_val), user_id)
                    setattr(activity, field, new_val)

        activity.updated_by_id = user_id
        db.session.commit()

        return jsonify({
            "msg": "Planificación actualizada y auditada",
            "activity": activity.serialize()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error en update_activity: {str(e)}")
        return jsonify({"msg": "Error al actualizar", "error": str(e)}), 500


@api.route('/official/indicators/<int:indicator_id>/locations', methods=['GET'])
@jwt_required()
def get_indicator_locations(indicator_id):
    indicador = Indicator.query.get(indicator_id)
    if not indicador:
        return jsonify({"msg": "Indicador no encontrado"}), 404
    goals = IndicatorLocationGoal.query.filter_by(
        indicator_id=indicator_id).all()

    allowed_province_ids = [g.province_id for g in goals]

    locations = Location.query.filter(
        Location.project_id == indicador.project_id,
        Location.province_id.in_(allowed_province_ids)
    ).all()

    results = []
    for loc in locations:
        goal_info = next(
            (g for g in goals if g.province_id == loc.province_id), None)

        results.append({
            "id_location": loc.id_location,
            "province_name": loc.province_ref.name,
            "municipality_name": loc.municipality_ref.name,
            "parish_name": loc.parish_ref.name if loc.parish_ref else "N/A",
            "community": loc.community_institution,
            "province_target": goal_info.total_target if goal_info else 0
        })

    return jsonify(results), 200

# Ver las actividades de un oficial


@api.route('/official/activities', methods=['GET'])
@jwt_required()
def get_activities():
    user_id = get_jwt_identity()
    project_id = request.args.get('project_id')
    competence_id = request.args.get('competence_id')

    hoy_venezuela = (datetime.utcnow() - timedelta(hours=4)).date()

    query = Activity.query.filter(Activity.created_by_id == user_id)

    if project_id:
        query = query.filter(Activity.project_id == project_id)

    if competence_id:
        # Aquí está el truco: Unimos Activity -> Indicator -> ProjectCompetence
        query = query.join(Indicator).join(ProjectCompetence).filter(
            ProjectCompetence.competence_id == competence_id
        )

    activities = query.all()
    results = [act.serialize(today_date=hoy_venezuela) for act in activities]

    return jsonify(results), 200


# Para cancelar una actividad planificada y cambiar su estatus
@api.route('/official/activities/<int:activity_id>/cancel', methods=['PATCH'])
@jwt_required()
def cancel_activity(activity_id):
    user_id = get_jwt_identity()
    data = request.json

    activity = Activity.query.get(activity_id)
    if not activity:
        return jsonify({"msg": "Actividad no encontrada"}), 404

    reason = data.get('cancellation_reason')
    if not reason or len(reason.strip()) < 5:
        return jsonify({"msg": "Es obligatorio incluir una observación válida (mín. 5 caracteres)"}), 400

    try:
        # 1. Guardar el estado anterior antes de cambiarlo
        old_status = activity.status.value if activity.status else "DESCONOCIDO"

        # 2. Registrar el cambio de estado en la auditoría
        create_log(
            entity_id=activity.id_activity,
            field_name="Status",
            old=old_status,
            new="CANCELADA",
            user_id=user_id
        )

        # 3. Registrar el motivo de cancelación como un log adicional
        create_log(
            entity_id=activity.id_activity,
            field_name="Motivo de Cancelación",
            old="N/A",
            new=reason,
            user_id=user_id
        )

        # 4. Actualizar el modelo
        activity.status = ActivityStatus.CANCELADA
        activity.cancellation_reason = reason
        activity.updated_by_id = user_id

        db.session.commit()
        return jsonify({
            "msg": "Actividad cancelada correctamente",
            "activity": activity.serialize()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error en cancel_activity: {str(e)}")
        return jsonify({"msg": "Error al procesar la cancelación", "error": str(e)}), 500


# Buscar todos los indicadores que pertenecen a un proyecto
@api.route('/official/projects/<int:project_id>/indicators', methods=['GET'])
@jwt_required()
def get_project_indicators(project_id):

    indicators = Indicator.query.filter_by(project_id=project_id).all()
    return jsonify([i.serialize() for i in indicators]), 200


# --- ENDPOINTS PARA EL CATÁLOGO DE ACTIVIDADES 1 ---
@api.route('/activity-catalog', methods=['GET'])
@jwt_required()
def get_activity_catalog():
    # 1. Capturamos los parámetros de la URL
    competence_id = request.args.get('competence_id', None)
    search = request.args.get('search', None)
    
    # 2. Iniciamos la consulta base
    query = ActivityCatalog.query

    # 3. Aplicamos filtro de búsqueda si existe
    if search:
        query = query.filter(ActivityCatalog.description.ilike(f'%{search}%'))

    # 4. Aplicamos filtro de competencia
    if competence_id:
        # Filtramos por la competencia seleccionada O las que son generales (None)
        query = query.filter(
            or_(
                ActivityCatalog.competence_id == competence_id,
                ActivityCatalog.competence_id == None
            )
        )

    # 5. Ordenamos alfabéticamente por descripción
    query = query.order_by(ActivityCatalog.description.asc())

    # 6. Aplicamos paginación profesional
    data = paginate_query(query, lambda a: a.serialize())
    
    return jsonify(data), 200

# 2-C


@api.route('/activity-catalog', methods=['POST'])
@jwt_required()
@manager_required
def create_catalog_activity():
    data = request.json
    description = data.get("description")
    comp_id = data.get("competence_id")

    if not description:
        return jsonify({"msg": "La descripción es obligatoria"}), 400

    if ActivityCatalog.query.filter_by(description=description).first():
        return jsonify({"msg": "Esta actividad ya existe en el catálogo"}), 400

    new_item = ActivityCatalog(description=description, competence_id=comp_id)
    db.session.add(new_item)
    db.session.commit()
    return jsonify(new_item.serialize()), 201

# 3-E


@api.route('/activity-catalog/<int:id>', methods=['PUT'])
@jwt_required()
@manager_required
def update_catalog_activity(id):
    item = ActivityCatalog.query.get(id)
    if not item:
        return jsonify({"msg": "Actividad no encontrada"}), 404

    data = request.json
    item.description = data.get("description", item.description)
    item.competence_id = data.get("competence_id", item.competence_id)

    db.session.commit()
    return jsonify(item.serialize()), 200

# 4-B


@api.route('/activity-catalog/<int:id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_catalog_activity(id):
    item = ActivityCatalog.query.get(id)

    if not item:
        return jsonify({"msg": "La actividad no existe en el catálogo"}), 404
    try:
        db.session.delete(item)
        db.session.commit()
        return jsonify({"msg": "Actividad eliminada con éxito"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "msg": "No se puede eliminar: Esta actividad está siendo utilizada en proyectos actuales.",
            "error": str(e)
        }), 400


# consultar logros de una actividad en específico
@api.route('/activities/<int:activity_id>/achievements', methods=['GET'])
@jwt_required()
def get_activity_achievements(activity_id):
    activity = Activity.query.get_or_404(activity_id)
    return jsonify({
        "activity_id": activity_id,
        "achievements": [a.serialize() for a in activity.achievements]
    }), 200


# Filtrar actividades por proyecto y competencia
@api.route('/manager/activities', methods=['GET'])
@jwt_required()
@manager_required
def get_manager_supervision_activities():
    project_id = request.args.get('project_id')
    competence_id = request.args.get('competence_id')

    if not project_id or not competence_id:
        return jsonify({"msg": "Falta el contexto: project_id y competence_id son obligatorios"}), 400

    ahora_venezuela = datetime.utcnow() - timedelta(hours=4)
    today = ahora_venezuela.date()

    query = Activity.query.join(ProjectCompetence).filter(
        Activity.project_id == project_id,
        ProjectCompetence.competence_id == competence_id
    )

    activities = query.all()
    results = []

    for act in activities:
        # Usamos el serialize pasando la fecha de hoy para que el modelo ayude
        data = act.serialize(today_date=today)

        # Inyectamos el responsable (se mantiene tu lógica intacta)
        data["responsible"] = {
            "id": act.creator.id_user,
            "full_name": f"{act.creator.name} {act.creator.lastname}",
            "initials": f"{act.creator.name[0]}{act.creator.lastname[0]}".upper()
        }

        # --- 4. LÓGICA DE ESTADOS DINÁMICOS REFORZADA ---
        status_actual = data.get('status')
        # Agregamos 'Vencida' a protegidos si ya viene así del modelo para no re-calcular
        estados_protegidos = [
            ActivityStatus.APROBADA.value,
            ActivityStatus.EN_REVISION.value,
            ActivityStatus.RECHAZADA.value,
            ActivityStatus.CANCELADA.value
        ]

        if status_actual not in estados_protegidos:
            # Normalizamos fechas de la actividad a .date()
            start_dt = act.start_date.date() if isinstance(
                act.start_date, datetime) else act.start_date
            end_dt = act.end_date.date() if isinstance(
                act.end_date, datetime) else act.end_date

            # Aplicamos la jerarquía de fechas
            if today > end_dt:
                data['status'] = 'Vencida'
            elif start_dt <= today <= end_dt:
                data['status'] = 'En Progreso'
            elif start_dt > today:
                data['status'] = 'Planificada'

        results.append(data)

    return jsonify(results), 200

# Auditoría o historial de actividades


@api.route('/manager/activities/<int:activity_id>/history', methods=['GET'])
@jwt_required()
def get_activity_full_history(activity_id):
    activity = Activity.query.get(activity_id)
    if not activity:
        return jsonify({"msg": "Actividad no encontrada"}), 404

    logs = SystemChangeLog.query.filter_by(
        entity_type='activity',
        entity_id=activity_id
    ).order_by(SystemChangeLog.change_date.asc()).all()

    history = []

    history.append({
        "event": "Creación",
        "user": f"{activity.creator.name} {activity.creator.lastname}" if activity.creator else "Sistema",
        "date": activity.created_at.strftime("%Y-%m-%d %H:%M:%S") if activity.created_at else "N/A",
        "details": "Actividad creada inicialmente"
    })

    for log in logs:
        history.append({
            "event": "Edición",
            "user": log.user.name + " " + log.user.lastname if log.user else "Desconocido",
            "date": log.change_date.strftime("%Y-%m-%d %H:%M:%S"),
            "field": log.field_changed,
            "old": log.old_value,
            "new": log.new_value
        })

    return jsonify({
        "activity_description": activity.description,
        "current_status": activity.get_real_status(),
        "timeline": history
    }), 200

# Gerente elimina actividades/plinificaciones


@api.route('/manager/activities/<int:activity_id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_activity_manager(activity_id):
    activity = Activity.query.get(activity_id)

    if not activity:
        return jsonify({"msg": "Actividad no encontrada"}), 404

    if activity.achievements and len(activity.achievements) > 0:
        return jsonify({"msg": "No se puede eliminar una actividad que ya tiene logros registrados. Por favor, cámbiela a estado Cancelada."}), 400

    try:
        log = SystemChangeLog(
            entity_type='activity',
            entity_id=activity_id,
            user_id=get_jwt_identity(),
            field_changed='deletion',
            old_value=activity.description,
            new_value='DELETED'
        )
        db.session.add(log)

        db.session.delete(activity)
        db.session.commit()

        return jsonify({"msg": f"Actividad {activity_id} eliminada permanentemente por el Gerente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al eliminar la actividad", "error": str(e)}), 500


# Aprobar o rechazar logro
@api.route('/activities/<int:id>/review', methods=['PATCH'])
@jwt_required()
@roles_required("Administrador", "Gerente", "Monitoreo")
def review_activity(id):
    user_id = get_jwt_identity()
    activity = Activity.query.get_or_404(id)

    old_status = activity.status.value if activity.status else "N/A"
    data = request.json
    new_status_str = data.get('status')
    comment = data.get('monitoring_comment', '').strip()

    # --- NUEVA LÓGICA DE ESTADOS ---
    if new_status_str == "Aprobada":
        activity.status = ActivityStatus.APROBADA
    elif new_status_str == "Rechazada":
        if not comment:
            return jsonify({"message": "El motivo es obligatorio para rechazar"}), 400
        activity.status = ActivityStatus.RECHAZADA
    elif new_status_str == "En Revisión":
        if not comment:
            return jsonify({"message": "Debe indicar la razón por la cual revierte la aprobación"}), 400
        activity.status = ActivityStatus.EN_REVISION
    else:
        return jsonify({"message": "Estado no válido"}), 400

    # Buscamos el último registro de logro enviado
    last_ach = AchievementRecord.query.filter_by(
        activity_id=id).order_by(AchievementRecord.id.desc()).first()

    if last_ach:
        last_ach.monitoring_comment = comment
        last_ach.updated_by_id = user_id

    try:
        # Auditoría general del sistema
        audit = SystemChangeLog(
            entity_type="Activity",
            entity_id=activity.id_activity,
            user_id=user_id,
            field_changed="status",
            old_value=old_status,
            new_value=activity.status.value,
            comment=comment
        )
        db.session.add(audit)
        db.session.commit()

        return jsonify({
            "message": f"Estado actualizado a {activity.status.value} correctamente",
            "status": activity.status.value
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error interno al procesar la revisión"}), 500


# Monitoreo-Auditoría de logros
@api.route('/audit/inbox', methods=['GET'])
@jwt_required()
@roles_required("Administrador", "Gerente", "Monitoreo")
def get_audit_inbox():
    # 1. Parámetros de Paginación y Filtros
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    # Filtros de búsqueda
    status_str = request.args.get('status', ActivityStatus.EN_REVISION.value)
    project_id = request.args.get('project_id', type=int)

    if status_str == "Aprobada" and not project_id:
        return jsonify({"msg": "Debe seleccionar un proyecto para ver los logros aprobados"}), 400

    competence_id = request.args.get('competence_id', type=int)
    # Para buscar por código de indicador
    search_code = request.args.get('search_code')

    # Convertimos el string de status al miembro del Enum
    status_filter = next((s for s in ActivityStatus if s.value ==
                         status_str), ActivityStatus.EN_REVISION)

    # 2. Construcción de la Query base
    query = Activity.query.options(
        joinedload(Activity.indicator).joinedload(Indicator.template),
        joinedload(Activity.location),
        joinedload(Activity.achievements),
        joinedload(Activity.creator)  # Para mostrar el responsable
    ).filter(Activity.status == status_filter)

    # 3. Aplicación de filtros dinámicos
    if project_id:
        query = query.filter(Activity.project_id == project_id)

    if competence_id:
        query = query.join(ProjectCompetence).filter(
            ProjectCompetence.competence_id == competence_id
        )

    if search_code:
        # Buscamos en el template del indicador el código (case insensitive)
        query = query.join(Indicator).join(IndicatorTemplate).filter(
            IndicatorTemplate.code.ilike(f"%{search_code}%")
        )

    # 4. Filtro de seguridad por Rol
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.rol.name_rol == "Gerente":
        query = query.join(ProjectCompetence).filter(
            ProjectCompetence.manager_id == user_id)

    # 5. Ejecución con Paginación
    pagination = query.order_by(Activity.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    # 6. Serialización plana (Sin la jerarquía que confundía)
    results = []
    for act in pagination.items:
        data = act.serialize()
        # Inyectamos datos extra necesarios para la tabla plana
        data["project_name"] = act.indicator.project.project_name if act.indicator.project else "N/A"
        data["indicator_code"] = act.indicator.template.code if act.indicator.template else "N/A"
        data["responsible"] = f"{act.creator.name} {act.creator.lastname}" if act.creator else "Desconocido"
        results.append(data)

    return jsonify({
        "total_results": pagination.total,
        "total_pages": pagination.pages,
        "current_page": pagination.page,
        "data": results
    }), 200


# Para el globito de mensaje
@api.route('/notifications/counts', methods=['GET'])
@jwt_required()
def get_notifications_counts():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    role = user.rol.name_rol
    counts = {
        "pending_review": 0,  # Para Monitoreo/Gerente/Admin
        "rejected": 0         # Para Oficial/Gerente
    }

    # --- LÓGICA PARA MONITOREO / ADMINISTRADOR ---
    # Ven todas las que están "En Revisión" en el sistema
    if role in ["Monitoreo", "Administrador"]:
        counts["pending_review"] = Activity.query.filter_by(
            status=ActivityStatus.EN_REVISION
        ).count()

    # --- LÓGICA PARA EL GERENTE ---
    # Ve lo pendiente y lo rechazado SOLO de su competencia
    elif role == "Gerente":
        # Pendientes por revisar en su competencia
        counts["pending_review"] = Activity.query.join(ProjectCompetence)\
            .filter(
                ProjectCompetence.manager_id == user_id,
                Activity.status == ActivityStatus.EN_REVISION
        ).count()

        # Total de rechazadas en su competencia (para supervisar)
        counts["rejected"] = Activity.query.join(ProjectCompetence)\
            .filter(
                ProjectCompetence.manager_id == user_id,
                Activity.status == ActivityStatus.RECHAZADA
        ).count()

    # --- LÓGICA PARA EL OFICIAL ---
    # Solo ve sus propias actividades rechazadas
    elif role == "Oficial":
        counts["rejected"] = Activity.query.filter_by(
            user_id=user_id,
            status=ActivityStatus.RECHAZADA
        ).count()

    return jsonify(counts), 200


# historial de un logro para todos
@api.route('/audit/history/<entity_type>/<int:entity_id>', methods=['GET'])
@jwt_required()
def get_audit_history(entity_type, entity_id):
    # Trae todos los cambios ordenados por fecha para ver la "historia"
    logs = SystemChangeLog.query.filter_by(
        entity_type=entity_type,
        entity_id=entity_id
    ).order_by(SystemChangeLog.change_date.desc()).all()

    return jsonify([log.serialize() for log in logs]), 200


# Historial del logro desde su creación
@api.route('/audit/achievement-full-history/<int:activity_id>', methods=['GET'])
@jwt_required()
def get_achievement_timeline(activity_id):
    # 1. Buscamos el logro y la actividad
    achievement = AchievementRecord.query.filter_by(
        activity_id=activity_id).first()
    if not achievement:
        return jsonify({"timeline": [], "msg": "No hay logros registrados aún"}), 200

    # 2. Buscamos logs de DOS fuentes:
    # A) Logs del Logro (ediciones de números)
    # B) Logs de la Actividad (cambios de estado: Aprobada/Rechazada)
    logs = SystemChangeLog.query.filter(
        db.or_(
            db.and_(SystemChangeLog.entity_type == "AchievementRecord",
                    SystemChangeLog.entity_id == achievement.id),
            db.and_(SystemChangeLog.entity_type == "Activity",
                    SystemChangeLog.entity_id == activity_id)
        )
    ).order_by(SystemChangeLog.change_date.asc()).all()

    # 3. Construimos la línea de tiempo
    timeline = []

    # Evento inicial (Creación por el Oficial)
    timeline.append({
        "event": "Creación de Logro",
        "user": f"{achievement.creator.name} {achievement.creator.lastname}" if achievement.creator else "Oficial",
        "date": achievement.execution_date.strftime("%Y-%m-%d %H:%M:%S") if achievement.execution_date else "N/A",
        "details": f"Ingresó inicialmente: {achievement.men_reached} H / {achievement.women_reached} M",
        "type": "create"
    })

    # Agregamos todas las acciones posteriores
    for log in logs:
        # Identificamos si es un cambio de estado o una edición de datos
        is_status = log.field_changed == "status"

        event_label = "Actualización de Datos"
        event_type = "edition"

        if is_status:
            event_type = "status_change"
            if log.new_value == "Aprobada":
                event_label = "Logro Aprobado"
            elif log.new_value == "Rechazada":
                event_label = "Logro Rechazado"
            elif log.new_value == "En Revisión":
                event_label = "Revertido a Revisión"
            else:
                event_label = f"Estado: {log.new_value}"

        timeline.append({
            "event": event_label,
            "user": f"{log.user.name} {log.user.lastname}" if log.user else "Sistema",
            "date": log.change_date.strftime("%Y-%m-%d %H:%M:%S"),
            "field": log.field_changed,
            "old": log.old_value,
            "new": log.new_value,
            "comment": log.comment,  # AQUÍ APARECERÁ EL MOTIVO DEL RECHAZO
            "type": event_type
        })

    return jsonify({
        "achievement_id": achievement.id,
        "timeline": timeline
    }), 200
