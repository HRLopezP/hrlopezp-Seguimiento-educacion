"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint, json
from api.models import db, User, Rol, Competence, ProjectStatus, ActivityCatalog, SystemChangeLog, AchievementRecord, ActivityStatus, TheoryTemplate, ResultTemplate, IndicatorTemplate, Project, ProjectCompetence, Activity, IndicatorLocationGoal, Location, Indicator, Province, Municipality, Parish, ProjectProvinceGoal, ProjectTheory, ProjectResult, MasterVerificationMean
from api.utils import generate_sitemap, APIException,  val_email, val_password, generate_reset_token, confirm_reset_token
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from .manager_decorator import manager_required
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
    users = User.query.all()
    return jsonify([user.serialize() for user in users]), 200


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


@api.route('/projects', methods=['POST'])
@jwt_required()
@manager_required
def create_project():
    data = request.json

    if not data or not data.get("code"):
        return jsonify({"msg": "El código único del proyecto es obligatorio"}), 400
    try:
        targets = data.get("unique_targets", {})

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
            status=ProjectStatus.EN_PROGRESO
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
@manager_required
def get_manager_projects():
    projects = Project.query.all()
    results = []

    for project in projects:
        total_goal = sum(ind.target_total for ind in project.indicators) or 1
        total_achieved = 0

        for indicator in project.indicators:
            activities = Activity.query.filter_by(
                indicator_id=indicator.id_indicator,
                status=ActivityStatus.COMPLETADA
            ).all()
            total_achieved += sum(
                (rec.men_reached or 0) + (rec.women_reached or 0)
                for act in activities
                for rec in act.achievements
            )

        progress_percentage = round((total_achieved / total_goal) * 100, 2)

        if progress_percentage >= 100 and project.status != ProjectStatus.COMPLETADO:
            project.status = ProjectStatus.COMPLETADO

        project_data = project.serialize()
        project_data["progress"] = min(progress_percentage, 100)
        project_data["total_achieved"] = total_achieved

        results.append(project_data)

    db.session.commit()
    return jsonify(results), 200


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
            try:
                project.status = ProjectStatus(data['status'])
            except ValueError:
                return jsonify({"msg": f"Estado {data['status']} no es válido"}), 400

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
        # --- PASO 1: ELIMINACIÓN DE INDICADORES OMITIDOS ---
        # Si el gerente quita un indicador de la lista en el frontend, lo borramos de la DB.
        received_template_ids = [item['template_id'] for item in indicators_list]
        to_delete = Indicator.query.filter(
            Indicator.project_id == project_id,
            ~Indicator.template_id.in_(received_template_ids)
        ).all()

        for ind in to_delete:
            # Borramos metas geográficas primero por la integridad referencial
            IndicatorLocationGoal.query.filter_by(indicator_id=ind.id_indicator).delete()
            ind.selected_means_list = []
            db.session.delete(ind)

        # --- PASO 2: PRIMERA PASADA (UPSERT DE DATOS BÁSICOS) ---
        # Creamos o actualizamos el indicador, pero sin tocar 'depends_on' todavía.
        for item in indicators_list:
            from api.models import IndicatorTemplate, ProjectResult, ProjectTheory, MasterVerificationMean

            template_info = IndicatorTemplate.query.get(item['template_id'])
            if not template_info:
                continue

            # Determinamos si es outcome para manejar nulos en hombres/mujeres (según tu lógica de %)
            is_outcome = template_info.result.type == 'outcome' if template_info.result else False

            # Buscamos el resultado relacionado en este proyecto específico
            real_project_result = ProjectResult.query.join(ProjectTheory).filter(
                ProjectTheory.project_id == project_id,
                ProjectResult.result_template_id == template_info.result_id
            ).first()

            project_res_id = real_project_result.id if real_project_result else None

            # Buscamos si ya existe para actualizarlo, sino lo creamos
            indicator = Indicator.query.filter_by(
                project_id=project_id,
                template_id=item['template_id']
            ).first()

            t_total = item.get('target_total', 0)
            t_men = item.get('target_men', 0) if not is_outcome else None
            t_women = item.get('target_women', 0) if not is_outcome else None

            if indicator:
                # Actualización de campos existentes
                indicator.target_total = t_total
                indicator.target_men = t_men
                indicator.target_women = t_women
                indicator.calculation_type = item.get('calculation_type', 'direct')
                indicator.measurement_unit = item.get('measurement_unit', 'absolute')
                indicator.verification_means = item.get('verification_means', indicator.verification_means)
                indicator.observations = item.get('observations', indicator.observations)
                indicator.project_result_id = project_res_id
            else:
                # Creación de nuevo registro
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

            # Sincronizar Medios de Verificación (Relación Many-to-Many)
            if 'means_ids' in item:
                selected_means = MasterVerificationMean.query.filter(
                    MasterVerificationMean.id.in_(item['means_ids'])
                ).all()
                indicator.selected_means_list = selected_means

            # Flush para asegurar que el indicador tenga ID (especialmente si es nuevo)
            db.session.flush()

            # --- Sincronizar Metas Geográficas ---
            if 'goals_by_province' in item:
                # Borramos las viejas y recreamos (más simple para asegurar consistencia)
                IndicatorLocationGoal.query.filter_by(indicator_id=indicator.id_indicator).delete()
                for goal in item['goals_by_province']:
                    new_goal = IndicatorLocationGoal(
                        indicator_id=indicator.id_indicator,
                        province_id=goal['province_id'],
                        total_target=goal.get('target', 0),
                        men=goal.get('target_men', 0) if not is_outcome else None,
                        women=goal.get('target_women', 0) if not is_outcome else None
                    )
                    db.session.add(new_goal)

        # --- PASO 3: SEGUNDA PASADA (VINCULACIÓN DE DEPENDENCIAS) ---
        # Ahora que TODOS los indicadores están en la DB, conectamos los hilos.
        for item in indicators_list:
            # CLAVE: Solo entramos si la llave existe para evitar borrados accidentales
            if 'depends_on_ids' in item:
                current_indicator = Indicator.query.filter_by(
                    project_id=project_id,
                    template_id=item['template_id']
                ).first()

                if current_indicator:
                    ids_a_conectar = item.get('depends_on_ids')
                    
                    # Si es None (null), el frontend no envió info, NO TOCAMOS NADA.
                    # Si es [] (lista vacía), el gerente quiere quitar las dependencias.
                    if ids_a_conectar is not None:
                        parent_indicators = Indicator.query.filter(
                            Indicator.project_id == project_id,
                            Indicator.template_id.in_(ids_a_conectar)
                        ).all()
                        
                        # Actualizamos la relación Many-to-Many recursiva
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
        # --- AQUÍ ESTÁ EL CAMBIO CLAVE ---
        # Enviamos todos los indicadores usando el método serialize que mejoraste
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
        # 1. Limpiamos las dependencias manualmente (si no definiste cascade en SQLAlchemy)
        # Esto asegura que no queden registros huérfanos
        Location.query.filter_by(project_id=id).delete()
        ProjectProvinceGoal.query.filter_by(project_id=id).delete()
        ProjectCompetence.query.filter_by(project_id=id).delete()

        # Para los indicadores, hay que borrar primero sus metas
        indicators = Indicator.query.filter_by(project_id=id).all()
        for ind in indicators:
            IndicatorLocationGoal.query.filter_by(
                indicator_id=ind.id_indicator).delete()
            db.session.delete(ind)

        # 2. Finalmente borramos el proyecto
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
    # Para que el gerente vea qué Teorías e Indicadores puede elegir
    competences = Competence.query.all()
    return jsonify([c.serialize() for c in competences]), 200


@api.route('/provinces', methods=['GET'])
@jwt_required()
def get_provinces():
    provinces = Province.query.all()
    return jsonify([p.serialize() for p in provinces]), 200


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
    """Obtiene municipios filtrados por una provincia específica"""
    municipalities = Municipality.query.filter_by(
        province_id=province_id).all()
    return jsonify([m.serialize() for m in municipalities]), 200


@api.route('/municipalities', methods=['POST'])
@jwt_required()
@manager_required
def add_municipality():
    """Crea un nuevo municipio vinculado a una provincia"""
    data = request.json
    # Validación básica
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
    """Obtiene parroquias filtradas por municipio"""
    parishes = Parish.query.filter_by(municipality_id=municipality_id).all()
    return jsonify([p.serialize() for p in parishes]), 200


@api.route('/parishes', methods=['POST'])
@jwt_required()
@manager_required
def add_parish():
    """Crea una nueva parroquia vinculada a un municipio"""
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


# --- ENDPOINTS PARA MUNICIPIOS (CRUD RESTANTE) ---
@api.route('/municipalities/<int:id>', methods=['PUT'])
@jwt_required()
@manager_required
def update_municipality(id):
    municipality = Municipality.query.get(id)
    if not municipality:
        return jsonify({"msg": "Municipio no encontrado"}), 404

    data = request.json
    # Podemos actualizar el nombre o incluso moverlo de provincia si hubo un error
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


# --- ENDPOINTS PARA PARROQUIAS (CRUD RESTANTE) ---
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

    # 1. Validación de permiso
    pc = ProjectCompetence.query.filter_by(
        project_id=proj_id,
        competence_id=comp_id,
        manager_id=current_user_id
    ).first()

    if not pc:
        return jsonify({"message": "No tienes permiso para esta competencia"}), 403

    try:
        # 2. Manejo de ProjectTheory
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
            db.session.flush()  # Para obtener el ID de proj_theory

        # 3. Traer moldes de indicadores
        ind_templates = IndicatorTemplate.query.filter(
            IndicatorTemplate.id.in_(selected_ind_ids)).all()

        # Obtenemos los IDs únicos de los resultados (moldes)
        result_template_ids = set([it.result_id for it in ind_templates])

        for r_temp_id in result_template_ids:
            # !! CAMBIO AQUÍ: Buscar por result_template_id (según tu modelo)
            p_res = ProjectResult.query.filter_by(
                project_theory_id=proj_theory.id,
                result_template_id=r_temp_id  # Nombre correcto según tu clase ProjectResult
            ).first()

            if not p_res:
                p_res = ProjectResult(
                    project_theory_id=proj_theory.id,
                    result_template_id=r_temp_id
                )
                db.session.add(p_res)
                db.session.flush()

            # 4. Vincular indicadores reales
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
                            # !! REVISIÓN: Tu modelo Indicator tiene project_result_id como ForeignKey
                            project_result_id=p_res.id,
                            target_total=0.0
                        )
                        db.session.add(new_ind)

        db.session.commit()
        return jsonify({"message": "¡SIGSSEP actualizado! Plan técnico vinculado."}), 201

    except Exception as e:
        db.session.rollback()
        # Imprime el error en la consola de Flask para que lo veamos claro
        print(f"ERROR EN BACKEND: {str(e)}")
        return jsonify({"error": str(e)}), 500


@api.route('/competence/<int:comp_id>/theories', methods=['GET'])
@jwt_required()
def get_competence_theories(comp_id):
    # Buscamos la competencia en la base de datos
    competence = Competence.query.get(comp_id)

    if not competence:
        return jsonify({"message": "Competencia no encontrada"}), 404

    # Esto devuelve la lista de teorías asociadas a esa competencia
    # Cada teoría ya trae sus resultados e indicadores gracias al .serialize() que definiste
    return jsonify([theory.serialize() for theory in competence.theories]), 200


# proyectos por gerente
@api.route('/my-assigned-projects', methods=['GET'])
@jwt_required()
@manager_required
def get_my_assignments():
    current_user_id = get_jwt_identity()

    # Buscamos en ProjectCompetence todas las asignaciones de este usuario
    assignments = ProjectCompetence.query.filter_by(
        manager_id=current_user_id).all()

    # Devolvemos los proyectos únicos asociados a esas asignaciones
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

    # Actualizamos los campos de texto (Asegúrate de haberlos añadido al modelo)
    # Si no los has añadido, puedes usar target_total por ahora
    indicator.target_total = data.get("target_total", indicator.target_total)
    indicator.target_men = data.get("target_men", indicator.target_men)
    indicator.target_women = data.get("target_women", indicator.target_women)

    # Si añadiste verification_means y observations al modelo:
    if hasattr(indicator, 'verification_means'):
        indicator.verification_means = data.get(
            "verification_means", indicator.verification_means)
    if hasattr(indicator, 'observations'):
        indicator.observations = data.get(
            "observations", indicator.observations)

    # --- MANEJO DE METAS POR ESTADO/PROVINCIA ---
    # Si vienen metas por provincia, las actualizamos
    if 'province_goals' in data:
        # Borramos las anteriores para este indicador y creamos las nuevas (Upsert)
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
    # Buscamos la teoría asignada para este proyecto y esta competencia
    # Primero buscamos la asignación de competencia para obtener el ID de ProjectCompetence
    pc = ProjectCompetence.query.filter_by(
        project_id=proj_id, competence_id=comp_id).first()

    if not pc:
        return jsonify({"message": "No hay datos para esta competencia en este proyecto"}), 404

    # Buscamos las teorías asignadas a través de esa competencia
    theories = ProjectTheory.query.filter_by(
        project_competence_id=pc.id_pc).all()

    return jsonify([t.serialize() for t in theories]), 200


# para mostrar los indicadores de un proyecto en específico
@api.route('/projects/<int:project_id>/indicators', methods=['GET'])
@jwt_required()
def get_project_indicatores(project_id):
    # Buscamos todos los indicadores que ya pertenecen a este proyecto
    indicators = Indicator.query.filter_by(project_id=project_id).all()

    # Usamos el serialize() que revisamos antes para enviar toda la info técnica
    return jsonify([ind.serialize() for ind in indicators]), 200


# 1. OBTENER TODOS LOS MEDIOS (Para el catálogo y para el selector de indicadores)
@api.route('/verification-means', methods=['GET'])
@jwt_required()
def get_verification_means():
    """Cualquier usuario logueado puede ver el catálogo para llenar indicadores"""
    means = MasterVerificationMean.query.all()
    return jsonify([m.serialize() for m in means]), 200

# 2. CREAR NUEVO MEDIO (Solo Gerente)


@api.route('/verification-means', methods=['POST'])
@manager_required
def create_verification_mean():
    data = request.json
    name = data.get("name")

    if not name:
        return jsonify({"message": "El nombre del medio es obligatorio"}), 400

    # Evitamos duplicados para mantener la base de datos limpia
    if MasterVerificationMean.query.filter_by(name=name).first():
        return jsonify({"message": "Este medio de verificación ya existe"}), 400

    new_mean = MasterVerificationMean(name=name)
    db.session.add(new_mean)
    db.session.commit()

    return jsonify(new_mean.serialize()), 201

# 3. ACTUALIZAR UN MEDIO (Solo Gerente)


@api.route('/verification-means/<int:id>', methods=['PUT'])
@manager_required
def update_verification_mean(id):
    mean = MasterVerificationMean.query.get(id)
    if not mean:
        return jsonify({"message": "Medio de verificación no encontrado"}), 404

    data = request.json
    # Si el gerente cambia "Fotos" por "Registro Fotográfico", se actualiza en todo el sistema
    mean.name = data.get("name", mean.name)

    db.session.commit()
    return jsonify(mean.serialize()), 200

# 4. ELIMINAR UN MEDIO (Solo Gerente)


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
        # Esto pasará si el medio ya está siendo usado por algún indicador
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

    # 1. Actualización de campos de texto simple (Mantenemos tus originales)
    if "verification_means" in data:
        indicator.verification_means = data.get("verification_means")

    if "observations" in data:
        indicator.observations = data.get("observations")

    # 2. GESTIÓN PROFESIONAL: Sincronización de Medios (IDs)
    # Esperamos un array de IDs, ej: [1, 3, 5]
    if "means_ids" in data:
        new_means_ids = data.get("means_ids")
        # Buscamos los objetos reales en la base de datos
        selected_means = MasterVerificationMean.query.filter(
            MasterVerificationMean.id.in_(new_means_ids)
        ).all()

        # SQLAlchemy hace la magia: vacía la relación vieja y pone la nueva
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


@api.route('/activities', methods=['POST'])
@jwt_required()
def create_activity():
    user_id = get_jwt_identity()
    data = request.json

    # Validaciones rápidas de campos obligatorios
    required = ["description", "start_date", "end_date", "planned_target",
                "indicator_id", "project_id", "location_id", "project_competence_id"]
    if not all(field in data for field in required):
        return jsonify({"message": "Faltan datos obligatorios para la planificación"}), 400

    try:
        new_activity = Activity(
            description=data['description'],
            # Convertimos strings a objetos datetime
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


@api.route('/activities/<int:id>', methods=['PATCH'])
@jwt_required()
def patch_activity(id):
    user_id = get_jwt_identity()
    activity = Activity.query.get(id)
    if not activity:
        return jsonify({"message": "No encontrada"}), 404

    data = request.json
    # Campos que queremos vigilar
    for field in ["description", "planned_target", "status", "start_date", "end_date"]:
        if field in data:
            old_val = str(getattr(activity, field))
            new_val = str(data[field])

            if old_val != new_val:
                # GUARDAMOS EL "CHISME" EN EL LOG
                log = SystemChangeLog(
                    entity_type="Activity",
                    entity_id=activity.id_activity,
                    user_id=user_id,
                    field_changed=field,
                    old_value=old_val,
                    new_value=new_val
                )
                db.session.add(log)

                # Actualizamos el valor real
                if "date" in field:
                    setattr(activity, field, datetime.strptime(
                        data[field], '%Y-%m-%d'))
                else:
                    setattr(activity, field, data[field])

    activity.updated_by_id = user_id
    db.session.commit()
    return jsonify({"message": "Planificación editada con historial"}), 200


@api.route('/activities/<int:id>', methods=['DELETE'])
@jwt_required()
@manager_required  # <--- Tu guardia de seguridad VIP
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


# Endpoints de logros
@api.route('/achievements', methods=['POST'])
@jwt_required()
def create_achievement():
    user_id = get_jwt_identity()
    data = request.json

    # 1. Verificación de existencia de la actividad
    activity = Activity.query.get_or_404(data.get('activity_id'))

    try:
        # 2. Creación del registro con todos los campos del modelo
        new_record = AchievementRecord(
            activity_id=activity.id_activity,
            men_reached=float(data.get('men_reached', 0)),
            women_reached=float(data.get('women_reached', 0)),
            disability_reached=float(data.get('disability_reached', 0)),
            attended_count=float(data.get('attended_count', 0)), # Agregado según tu modelo
            approved_count=float(data.get('approved_count', 0)), # Agregado según tu modelo
            evidence_url=data.get('evidence_url'),
            evidence_public_id=data.get('evidence_public_id'), 
            observations=data.get('observations'),
            user_id=user_id
        )

        # 3. Actualizar estado de la actividad (Usa el string exacto o tu Enum)
        activity.status = 'COMPLETADA' 

        db.session.add(new_record)
        db.session.commit()

        # 4. Refrescar el objeto para asegurar que las relaciones (activity e indicator) 
        # estén disponibles para el serialize()
        db.session.refresh(new_record)

        return jsonify({
            "message": "Logro registrado exitosamente",
            "record": new_record.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        # IMPORTANTE: Imprime el error en consola para ver el nombre exacto de la falla
        print(f"DEBUG SIGSSEP ERROR: {str(e)}") 
        return jsonify({"message": f"Error en el servidor: {str(e)}"}), 500


@api.route('/achievements/<int:id>', methods=['PATCH'])
@jwt_required()
def patch_achievement(id):
    user_id = get_jwt_identity() 
    record = AchievementRecord.query.get_or_404(id)
    data = request.json
    
    # 1. ACTUALIZACIÓN DE DATOS (Mantenemos tu lógica sólida)
    if 'men_reached' in data: record.men_reached = float(data['men_reached'])
    if 'women_reached' in data: record.women_reached = float(data['women_reached'])
    if 'disability_reached' in data: record.disability_reached = float(data['disability_reached'])
    if 'attended_count' in data: record.attended_count = float(data['attended_count'])
    if 'approved_count' in data: record.approved_count = float(data['approved_count'])
    if 'observations' in data: record.observations = data['observations']

    # 2. LÓGICA DE REEMPLAZO DE EVIDENCIA (Refactorizada)
    if 'evidence_url' in data:
        new_url = data.get('evidence_url')
        new_public_id = data.get('evidence_public_id')

        # Si el usuario mandó una URL nueva y es distinta a la vieja...
        if new_url and new_url != record.evidence_url:
            
            # Si teníamos un archivo anterior, usamos el SERVICIO para borrar
            if record.evidence_public_id:
                # LLAMADA PROFESIONAL AL SERVICIO
                CloudinaryService.delete_file(record.evidence_public_id)
                print(f"DEBUG: Solicitado borrado de ID: {record.evidence_public_id}")

            # ACTUALIZACIÓN DE AMBOS CAMPOS (Lo que me consultaste)
            record.evidence_url = new_url
            record.evidence_public_id = new_public_id # <--- Clave para futuras limpiezas

    # 3. AUDITORÍA Y GUARDADO
    record.updated_by_id = user_id

    try:
        db.session.commit()
        return jsonify({
            "message": "Logro actualizado y archivos gestionados",
            "record": record.serialize()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error en base de datos: {str(e)}"}), 500
    

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
        secure_url, public_id = CloudinaryService.upload_file(file, folder=folder)
        
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
    try:
        # 1. Carga inicial de datos maestros
        indicators = Indicator.query.filter_by(project_id=project_id).all()
        if not indicators:
            return jsonify([]), 200

        # 2. Consultamos logros agrupados por indicador y provincia
        results = db.session.query(
            Indicator.id_indicator,
            Province.id.label("province_id"),
            Province.name.label("province_name"),
            func.sum(func.coalesce(AchievementRecord.men_reached, 0)).label("men"),
            func.sum(func.coalesce(AchievementRecord.women_reached, 0)).label("women"),
            func.sum(func.coalesce(AchievementRecord.attended_count, 0)).label("attended"),
            func.sum(func.coalesce(AchievementRecord.approved_count, 0)).label("approved")
        ).select_from(Indicator)\
         .join(Activity, Activity.indicator_id == Indicator.id_indicator)\
         .join(Location, Activity.location_id == Location.id_location)\
         .join(Province, Location.province_id == Province.id)\
         .join(AchievementRecord, AchievementRecord.activity_id == Activity.id_activity)\
         .filter(Indicator.project_id == project_id)\
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
                            parent_goals_by_prov[p_id] = {'men': 0, 'women': 0, 'total': 0}
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
                        c_res = achievements_map.get(child.id_indicator, {}).get(p_id)
                        if c_res:
                            p_men += float(c_res.men); p_women += float(c_res.women)
                            p_att += float(c_res.attended); p_app += float(c_res.approved)
                else:
                    res = achievements_map.get(ind.id_indicator, {}).get(p_id)
                    if res:
                        p_men, p_women = float(res.men), float(res.women)
                        p_att, p_app = float(res.attended), float(res.approved)

                if is_outcome and is_dependent:
                    p_target = parent_goals_by_prov.get(p_id, {}).get('total', 0)
                    p_advance = ((p_men + p_women) / p_target * 100) if p_target > 0 else 0
                    p_men_val = (p_men / parent_goals_by_prov[p_id]['men'] * 100) if parent_goals_by_prov.get(p_id, {}).get('men', 0) > 0 else 0
                    p_women_val = (p_women / parent_goals_by_prov[p_id]['women'] * 100) if parent_goals_by_prov.get(p_id, {}).get('women', 0) > 0 else 0
                else:
                    p_advance = (p_app / p_att * 100) if is_outcome and p_att > 0 else (p_men + p_women)
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

                total_ind_men += p_men; total_ind_women += p_women
                total_ind_att += p_att; total_ind_app += p_app

            # --- CÁLCULO GLOBAL ---
            if is_outcome:
                provincias_con_meta = [g.total_target for g in ind.location_goals if g.total_target > 0]
                display_target = sum(provincias_con_meta) / len(provincias_con_meta) if provincias_con_meta else 0
                
                if is_dependent:
                    g_target_total = global_parent_men_goal + global_parent_women_goal
                    global_achieved = ((total_ind_men + total_ind_women) / g_target_total * 100) if g_target_total > 0 else 0
                    final_men = (total_ind_men / global_parent_men_goal * 100) if global_parent_men_goal > 0 else 0
                    final_women = (total_ind_women / global_parent_women_goal * 100) if global_parent_women_goal > 0 else 0
                else:
                    global_achieved = (total_ind_app / total_ind_att * 100) if total_ind_att > 0 else 0
                    final_men, final_women = total_ind_men, total_ind_women

            else:
                global_achieved = (total_ind_men + total_ind_women)
                final_men, final_women = total_ind_men, total_ind_women
                display_target = sum(g.total_target for g in ind.location_goals)

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
    # Podemos filtrar por tipo de entidad si el Gerente quiere algo específico
    # Ejemplo: /audit-logs?type=Activity o /audit-logs?user_id=5
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

    # Ordenamos por fecha para ver lo más reciente primero
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

    # Ajustado a id_competence y name según tu modelo Competence
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

    # Usamos ProjectCompetence para filtrar
    proyectos_ids = ProjectCompetence.query.filter_by(
        competence_id=competencia_id).all()

    proyectos_data = []
    for rel in proyectos_ids:
        # p es el objeto Project relacionado
        p = rel.project  # Asumiendo que ProjectCompetence tiene la relación 'project'
        if p:
            proyectos_data.append({
                "id": p.id_project,  # Ojo aquí, verifica si es id o id_project en tu modelo Project
                "project_name": p.project_name,
                "code": p.code
            })

    return jsonify(proyectos_data), 200

# Oficial crea, edita y ve actividades/planificar

@api.route('/official/activities', methods=['POST'])
@jwt_required()
def create_activitys():
    user_id = get_jwt_identity()
    data = request.json

    # Campos que el Wizard de React está enviando ahora
    # Nota: Aceptamos 'planned_target' o 'planned_total' para mayor flexibilidad
    required_fields = ['description', 'indicator_id',
                       'location_id', 'project_id', 'start_date', 'end_date']
    if not all(field in data for field in required_fields):
        return jsonify({"msg": "Faltan campos obligatorios para la planificación"}), 400

    try:
        # Extraemos la meta total (intentando ambos nombres)
        total_meta = data.get('planned_target') or data.get(
            'planned_total') or 0

        new_activity = Activity(
            description=data.get('description', ''),
            # El .split('T')[0] es excelente para limpiar fechas de calendarios JS
            start_date=datetime.strptime(
                data['start_date'].split('T')[0], '%Y-%m-%d'),
            end_date=datetime.strptime(
                data['end_date'].split('T')[0], '%Y-%m-%d'),

            # Nuevos campos de metas desagregadas
            planned_target=float(total_meta),
            planned_men=float(data.get('planned_men', 0)),
            planned_women=float(data.get('planned_women', 0)),

            status=ActivityStatus.PLANIFICADA,
            indicator_id=int(data['indicator_id']),
            project_id=int(data['project_id']),
            location_id=int(data['location_id']),
            # Manejamos el ID de competencia (puede ser nulo si no se seleccionó)
            project_competence_id=int(data['project_competence_id']) if data.get(
                'project_competence_id') else None,
            created_by_id=user_id
        )

        db.session.add(new_activity)
        db.session.commit()

        return jsonify({
            "msg": "Actividad planificada exitosamente",
            "activity": new_activity.serialize()
        }), 201

    except ValueError as ve:
        return jsonify({"msg": "Error en formato de datos (fecha o números)", "error": str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error en create_activity: {str(e)}")
        return jsonify({"msg": "Error interno al guardar planificación", "error": str(e)}), 500


@api.route('/official/activities/<int:activity_id>', methods=['PATCH'])
@jwt_required()
def update_activity(activity_id):
    user_id = get_jwt_identity()
    data = request.json

    activity = Activity.query.get(activity_id)
    if not activity:
        return jsonify({"msg": "Actividad no encontrada"}), 404

    # Mantenemos tu lógica de aviso para oficiales
    if activity.created_by_id != user_id:
        print(f"Aviso: Usuario {user_id} editando actividad ajena")

    try:
        # Actualización de campos básicos
        if 'description' in data:
            activity.description = data['description']

        # Soportamos ambos nombres para la meta total
        if 'planned_target' in data:
            activity.planned_target = float(data['planned_target'])
        elif 'planned_total' in data:
            activity.planned_target = float(data['planned_total'])

        # Actualización de metas por género
        if 'planned_men' in data:
            activity.planned_men = float(data['planned_men'])
        if 'planned_women' in data:
            activity.planned_women = float(data['planned_women'])

        # Fechas
        if 'start_date' in data:
            activity.start_date = datetime.strptime(
                data['start_date'].split('T')[0], '%Y-%m-%d')
        if 'end_date' in data:
            activity.end_date = datetime.strptime(
                data['end_date'].split('T')[0], '%Y-%m-%d')

        # Relaciones
        if 'indicator_id' in data:
            activity.indicator_id = int(data['indicator_id'])
        if 'location_id' in data:
            activity.location_id = int(data['location_id'])
        if 'project_competence_id' in data:
            activity.project_competence_id = int(
                data['project_competence_id']) if data['project_competence_id'] else None

        db.session.commit()
        return jsonify({"msg": "Planificación actualizada", "activity": activity.serialize()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al actualizar", "error": str(e)}), 500


@api.route('/official/indicators/<int:indicator_id>/locations', methods=['GET'])
@jwt_required()
def get_indicator_locations(indicator_id):
    # 1. Buscamos el indicador para saber a qué proyecto pertenece
    indicador = Indicator.query.get(indicator_id)
    if not indicador:
        return jsonify({"msg": "Indicador no encontrado"}), 404

    # 2. Obtenemos las metas por provincia de este indicador
    goals = IndicatorLocationGoal.query.filter_by(
        indicator_id=indicator_id).all()

    # Creamos una lista de IDs de provincias donde este indicador tiene metas
    allowed_province_ids = [g.province_id for g in goals]

    # 3. Buscamos las UBICACIONES (Location) del proyecto que están en esas provincias
    # Esto es lo que el oficial realmente necesita para el formulario de la actividad
    locations = Location.query.filter(
        Location.project_id == indicador.project_id,
        Location.province_id.in_(allowed_province_ids)
    ).all()

    # 4. Cruzamos la info: enviamos la ubicación detallada + la meta de esa provincia
    results = []
    for loc in locations:
        # Buscamos la meta específica de la provincia de esta ubicación
        goal_info = next(
            (g for g in goals if g.province_id == loc.province_id), None)

        results.append({
            "id_location": loc.id_location,  # ID real para el combo/select del form
            "province_name": loc.province_ref.name,
            "municipality_name": loc.municipality_ref.name,
            "parish_name": loc.parish_ref.name if loc.parish_ref else "N/A",
            "community": loc.community_institution,
            "province_target": goal_info.total_target if goal_info else 0
        })

    return jsonify(results), 200


@api.route('/official/activities', methods=['GET'])
@jwt_required()
def get_activities():
    user_id = get_jwt_identity()
    
    # En lugar de pytz, restamos 4 horas al tiempo UTC del servidor (Codespaces)
    # para obtener la hora real de Venezuela.
    hoy_venezuela = datetime.utcnow() - timedelta(hours=4)
    today = hoy_venezuela.date()

    activities = Activity.query.filter_by(created_by_id=user_id).all()

    results = []
    for act in activities:
        data = act.serialize()

        if data.get('status') not in ['Completada', 'Cancelada']:
            # Extraemos fechas de forma segura
            start_dt = act.start_date.date() if hasattr(act.start_date, 'date') else act.start_date
            end_dt = act.end_date.date() if hasattr(act.end_date, 'date') else act.end_date

            # Ahora la comparación será justa
            if end_dt < today:
                data['status'] = 'Vencida'
            elif start_dt <= today <= end_dt:
                data['status'] = 'En Progreso' # ¡Verás el Emerald Green ahora!
            else:
                data['status'] = 'Planificada'
        
        results.append(data)

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

    # VALIDACIÓN CLAVE
    reason = data.get('cancellation_reason')
    if not reason or len(reason.strip()) < 5:
        return jsonify({"msg": "Es obligatorio incluir una observación válida (mín. 5 caracteres)"}), 400

    activity.status = ActivityStatus.CANCELADA
    activity.cancellation_reason = reason
    activity.updated_by_id = user_id # Guardamos quién lo hizo

    db.session.commit()
    return jsonify({
        "msg": "Actividad cancelada correctamente", 
        "activity": activity.serialize()
    }), 200


# Buscar todos los indicadores que pertenecen a este proyecto
@api.route('/official/projects/<int:project_id>/indicators', methods=['GET'])
@jwt_required()
def get_project_indicators(project_id):
    
    indicators = Indicator.query.filter_by(project_id=project_id).all()
    return jsonify([i.serialize() for i in indicators]), 200


# --- ENDPOINTS PARA EL CATÁLOGO DE ACTIVIDADES ---
@api.route('/activity-catalog', methods=['GET'])
@jwt_required()
def get_activity_catalog():
    # Leemos el ID de la competencia desde la URL, ej: /activity-catalog?competence_id=1
    competence_id = request.args.get('competence_id')
    
    query = ActivityCatalog.query
    
    if competence_id:
        # Filtramos: (Es de mi competencia) O (Es General/None)
        query = query.filter(
            or_(
                ActivityCatalog.competence_id == competence_id,
                ActivityCatalog.competence_id == None
            )
        )
    
    activities = query.all()
    return jsonify([a.serialize() for a in activities]), 200


@api.route('/activity-catalog', methods=['POST'])
@jwt_required()
@manager_required
def create_catalog_activity():
    """Solo el Gerente crea nuevas opciones de actividades"""
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
        # Si el error es de base de datos (como una llave foránea activa)
        # devolvemos un mensaje amigable al usuario
        return jsonify({
            "msg": "No se puede eliminar: Esta actividad está siendo utilizada en proyectos actuales.",
            "error": str(e)  # Opcional: solo para depuración
        }), 400


#consultar logros de una actividad en específico
@api.route('/activities/<int:activity_id>/achievements', methods=['GET'])
@jwt_required()
def get_activity_achievements(activity_id):
    activity = Activity.query.get_or_404(activity_id)
    
    # Retornamos la lista de logros serializados
    # Esto incluye la URL de evidencia y observaciones que te faltaban
    return jsonify({
        "activity_id": activity_id,
        "achievements": [a.serialize() for a in activity.achievements]
    }), 200
