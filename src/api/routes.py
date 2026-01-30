"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, Rol, Competence, TheoryTemplate, ResultTemplate, IndicatorTemplate, Project, ProjectCompetence, Activity, IndicatorLocationGoal, Location, Indicator, Province, Municipality, Parish, ProjectProvinceGoal
from api.utils import generate_sitemap, APIException,  val_email, val_password, generate_reset_token, confirm_reset_token
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from .manager_decorator import manager_required
from flask_mail import Message
from datetime import datetime
from api.extensions import mail
import os
from .CloudinaryService import CloudinaryService

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

    # 2. Lógica de "Excepción de Administrador"
    # Usamos constantes para evitar errores de dedo
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
        rol_id=target_rol.id_rol,  # Asignamos el ID encontrado
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

    # 7. Preparamos las "Additional Claims" mejoradas
    user_role_name = user.rol.name_rol if user.rol else "Oficial"
    is_admin = user_role_name == "Administrador"

    # Extraemos solo los nombres (o IDs) de las competencias asignadas
    # Esto crea una lista simple: ["Educación", "Salud"]
    user_competences = [c.name for c in user.competences]

    additional_claims = {
        "is_administrator": is_admin,
        "rol": user_role_name,
        "competences": user_competences  # <--- ¡Aquí está la magia!
    }

    # 8. Creamos el token de acceso con la identidad y los nuevos claims
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

            # Definimos el nombre del usuario para personalizar
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
@manager_required
def get_all_users():
    # Buscamos a todos los usuarios en la base de datos
    users = User.query.all()
    # Los devolvemos serializados para que React los pueda listar
    return jsonify([user.serialize() for user in users]), 200

# 2. Activar o desactivar un usuario (El "Visto Bueno" del Administrador)


@api.route("/manager/users/<int:user_id>/status", methods=["PATCH"])
@jwt_required()
@manager_required
def toggle_user_status(user_id):
    # 1. Obtenemos el ID del manager actual (por si lo necesitas para logs)
    current_manager_id = get_jwt_identity()

    # 2. Buscamos al usuario una sola vez
    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    # 3. PROTECCIÓN SIGSSEP: No tocar al Administrador
    # Protegemos tanto por rol como por ID para que sea blindado
    if user.rol.name_rol == "Administrador" or int(current_manager_id) == user_id:
        return jsonify({
            "message": "Acción denegada. No se puede desactivar una cuenta de Administrador por seguridad."
        }), 403

    # 4. Cambiamos el estado (solo una vez)
    user.is_active = not user.is_active

    try:
        db.session.commit()
        # Usamos Emerald Green mentalmente para este éxito:
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

    # 2. VALIDACIÓN DE INTEGRIDAD: ¿Tiene actividades?
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
    # Serializamos los roles (asegúrate de tener el método serialize en tu modelo Rol)
    return jsonify([role.serialize() for role in roles]), 200


@api.route('/roles', methods=['POST'])
@jwt_required()  # Primero verifica que esté logueado
@manager_required  # Luego verifica que sea Administrador
def create_role():
    data = request.get_json()
    new_role_name = data.get("name_rol")

    if not new_role_name:
        return jsonify({"message": "El nombre del rol es obligatorio"}), 400

    exists = Rol.query.filter_by(name_rol=new_role_name).first()
    if exists:
        return jsonify({"message": "Este rol ya existe"}), 400

    # Lógica para guardar en la DB...
    new_role = Rol(name_rol=new_role_name)
    db.session.add(new_role)
    db.session.commit()

    return jsonify({"message": f"Rol '{new_role_name}' creado exitosamente"}), 201


# 3. Editar un rol (UPDATE)
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

# 4. Eliminar un rol (DELETE)


@api.route('/roles/<int:role_id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_role(role_id):
    role = Rol.query.get(role_id)
    if not role:
        return jsonify({"message": "Rol no encontrado"}), 404

    # IMPORTANTE: Validar si hay usuarios usando este rol antes de borrar
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

    # Buscamos al usuario
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    # PROTECCIÓN: Si el usuario ya es Administrador, no se le toca el rol
    if user.rol.name_rol == "Administrador":
        return jsonify({
            "message": "Seguridad de SIGSSEP: El rol de Administrador no puede ser modificado."
        }), 403

    # Buscamos el nuevo rol
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

        # IMPORTANTE: Usamos 'profile' que es como se llama en tu modelo
        # Y usamos el método serialize() que ya tienes bien hecho
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
    new_url = data.get("profile_picture")  # Lo que viene de React

    if not new_url:
        return jsonify({"message": "URL no válida"}), 400

    # Guardamos en la columna 'profile' del modelo User
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
        # Solo actualizamos si nos envían el dato, si no, dejamos el que estaba
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

    # 1. Verificar contraseña actual (asumiendo que usas check_password_hash)
    if not check_password_hash(user.password, current_password):
        return jsonify({"message": "La contraseña actual es incorrecta"}), 400

    # 2. Guardar la nueva (hasheada)
    user.password = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({"message": "Contraseña actualizada correctamente"}), 200


@api.route('/user/update-avatar', methods=['PATCH'])
@jwt_required()
def update_avatar():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    data = request.json
    new_image_url = data.get("image_url")  # Coincide con Profile.jsx

    if not new_image_url:
        return jsonify({"msg": "URL de imagen requerida"}), 400

    # 1. Validar URL (Opcional pero recomendado)
    if not CloudinaryService.validate_cloudinary_url(new_image_url):
        return jsonify({"msg": "URL de imagen no válida"}), 400

    # 2. Borrar la vieja si existe (Usamos user.profile que es el nombre real)
    if user.profile:
        CloudinaryService.delete_old_image(user.profile)

    # 3. Guardar en la columna correcta: 'profile'
    user.profile = new_image_url
    db.session.commit()

    return jsonify({
        "msg": "Avatar actualizado con éxito",
        "user": user.serialize()  # Devolvemos el usuario completo actualizado
    }), 200


@api.route('/competences', methods=['GET'])
@jwt_required()
def get_competences():
    """Cualquier usuario logueado puede ver el catálogo"""
    competences = Competence.query.all()
    return jsonify([c.serialize() for c in competences]), 200


@api.route('/competences', methods=['POST'])
@manager_required # <--- ¡Aquí está la magia! Ya no necesitas if user.rol == ...
def create_competence():
    data = request.json
    name = data.get("name")

    if not name:
        return jsonify({"message": "El nombre de la competencia es obligatorio"}), 400

    # Verificamos si ya existe para evitar errores de base de datos
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

    # Ojo amiguito: Si la competencia ya está en un proyecto, 
    # SQLAlchemy lanzará un error de integridad. 
    try:
        db.session.delete(competence)
        db.session.commit()
        return jsonify({"message": "Competencia eliminada exitosamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "No se puede eliminar: está asignada a un proyecto"}), 400


@api.route("/user/<int:user_id>/competences", methods=["PUT"])
@jwt_required() # Solo usuarios autenticados (y podrías validar que sea Admin)
def assign_user_competences(user_id):
    data = request.get_json(silent=True)
    
    if data is None:
        return jsonify({"message": "No data provided"}), 400

    # 1. Buscamos al usuario
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    # 2. Obtenemos la lista de IDs de competencias desde el frontend
    # Esperamos algo como: {"competence_ids": [1, 3]}
    competence_ids = data.get("competence_ids", [])

    if not isinstance(competence_ids, list):
        return jsonify({"message": "competence_ids must be a list"}), 400

    try:
        # 3. Buscamos los objetos de competencia reales en la DB
        # Esto asegura que no intentemos asignar un ID que no existe
        selected_competences = Competence.query.filter(Competence.id_competence.in_(competence_ids)).all()

        # 4. SINCRONIZACIÓN: 
        # Al asignar la lista de objetos directamente, SQLAlchemy maneja 
        # la tabla 'user_competence' por nosotros (borra lo viejo, añade lo nuevo)
        user.competences = selected_competences
        
        db.session.commit()

        return jsonify({
            "message": f"Competences updated for user {user.name}",
            "user": user.serialize() # Esto ya incluye las nuevas competencias gracias a tu serialize
        }), 200

    except Exception as error:
        db.session.rollback()
        return jsonify({"message": "Error assigning competences", "error": str(error)}), 500


@api.route('/theories', methods=['GET'])
@jwt_required()
def get_theories():
    theories = TheoryTemplate.query.all()
    # Al serializar, ya incluimos el nombre de la competencia gracias al modelo
    return jsonify([t.serialize() for t in theories]), 200


@api.route('/theories', methods=['POST'])
@manager_required
def create_theory():
    data = request.json
    name = data.get("name")
    competence_id = data.get("competence_id")

    if not name or not competence_id:
        return jsonify({"message": "Nombre y ID de competencia son obligatorios"}), 400

    # Verificamos que la competencia exista
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
    result_type = data.get("type") # 'outcome' o 'output'
    theory_id = data.get("theory_id")

    if not all([name, result_type, theory_id]):
        return jsonify({"message": "Faltan datos obligatorios (nombre, tipo o teoría)"}), 400

    new_result = ResultTemplate(name=name, type=result_type, theory_id=theory_id)
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
    # Permitimos editar el nombre. El tipo (outcome/output) usualmente no se cambia 
    # para evitar errores de lógica, pero si quieres puedes añadirlo.
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

    # Verificamos si el código ya existe (es unique en el modelo)
    if IndicatorTemplate.query.filter_by(code=code).first():
        return jsonify({"message": f"El código de indicador {code} ya está en uso"}), 400

    new_indicator = IndicatorTemplate(code=code, name=name, description=description, result_id=result_id)
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
    
    # Si cambia el código, verificamos que no choque con otro existente
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
    
    # Gracias a que mejoramos el serialize() en el modelo, 
    # este objeto ya incluirá sus outcomes, outputs e indicadores anidados.
    return jsonify(theory.serialize()), 200


@api.route('/projects', methods=['POST'])
@jwt_required()
@manager_required # Este decorador debe verificar el rol 'Gerente'
def create_project():
    data = request.json
    
    if not data.get("unique_code"):
        return jsonify({"msg": "El código único es obligatorio"}), 400

    try:
        # 1. Crear el Proyecto con sus campos base
        new_project = Project(
            code=data.get("unique_code"),
            donor_name=data.get("donor"),
            project_name=data.get("name"),
            main_objective=data.get("description"),
            results_summary=data.get("main_scope"),
            # Asignamos las metas globales que definiste en el modelo
            target_total=float(data.get("total_target", 0)),
            target_men=float(data.get("men_target", 0)),
            target_women=float(data.get("women_target", 0)),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d') if data.get('start_date') else None,
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d') if data.get('end_date') else None,
            status="En Progreso"
        )

        db.session.add(new_project)
        db.session.flush() # Para obtener el id_project

        # 2. Guardar Ubicaciones (Locations)
        if data.get("locations"):
            for loc in data["locations"]:
                # Aquí usamos el modelo Location que pasaste
                new_loc = Location(
                    province_id=loc['province_id'],
                    municipality_id=loc['municipality_id'],
                    parish_id=loc.get('parish_id'), # Es opcional según tu modelo
                    project_id=new_project.id_project
                )
                db.session.add(new_loc)

        # 3. Guardar Metas por Provincia (ProjectProvinceGoal)
        if data.get("province_unique_targets"):
            for target in data["province_unique_targets"]:
                new_goal = ProjectProvinceGoal(
                    project_id=new_project.id_project,
                    province_id=target['province_id'],
                    target_total=float(target.get('total', 0)),
                    target_men=float(target.get('men', 0)),
                    target_women=float(target.get('women', 0))
                )
                db.session.add(new_goal)

        db.session.commit()
        return jsonify({"msg": "Proyecto SIGSSEP guardado con éxito"}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error interno", "error": str(e)}), 500
    

@api.route('/competence-templates', methods=['GET'])
@jwt_required()
def get_templates():
    # Para que el gerente vea qué Teorías e Indicadores puede elegir
    competences = Competence.query.all()
    return jsonify([c.serialize() for c in competences]), 200
    

@api.route('/manager/projects', methods=['GET'])
@jwt_required()
@manager_required
def get_manager_projects():
    projects = Project.query.all()
    results = []

    for project in projects:
        # 1. Calculamos el progreso porcentual (Lógica de negocio SIGSSEP)
        # Sumamos todas las metas de los indicadores de este proyecto
        total_goal = sum(ind.target_total for ind in project.indicators) or 1 # Evitar división por cero
        
        # Sumamos todos los logros registrados en las actividades de esos indicadores
        total_achieved = 0
        for indicator in project.indicators:
            # Buscamos todas las actividades ligadas a este indicador
            activities = Activity.query.filter_by(indicator_id=indicator.id_indicator, status="Completada").all()
            for act in activities:
                # El logro total es la suma de hombres + mujeres
                total_achieved += (act.achievement_men + act.achievement_women)

        progress_percentage = round((total_achieved / total_goal) * 100, 2)

        # --- 🚀 LOGICA DE AUTO-COMPLETADO (Cambio de Status) ---
        # Si el progreso es 100% o más y el estatus no es "Completado" todavía...
        if progress_percentage >= 100 and project.status != "Completado":
            project.status = "Completado"
            db.session.commit() # Guardamos el cambio de estatus automáticamente
        # -------------------------------------------------------

        # 2. Preparamos la data para el Dashboard
        project_data = project.serialize() # Usamos el serialize que ya mejoramos
        project_data["progress"] = min(progress_percentage, 100) # No exceder el 100% visualmente
        project_data["total_achieved"] = total_achieved
        
        results.append(project_data)

    return jsonify(results), 200


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
    municipalities = Municipality.query.filter_by(province_id=province_id).all()
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
    municipality.province_id = data.get("province_id", municipality.province_id)
    
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
    parish.municipality_id = data.get("municipality_id", parish.municipality_id)
    
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


@api.route('/activities', methods=['POST'])
@jwt_required()
def record_activity():
    data = request.get_json()
    user_id = get_jwt_identity() # El ID del Oficial logueado
    
    try:
        new_activity = Activity(
            description=data.get("description"),
            implementation_date=datetime.strptime(data.get("date"), "%Y-%m-%d"),
            achievement_men=data.get("men", 0.0),
            achievement_women=data.get("women", 0.0),
            achievement_disability=data.get("disability", 0.0),
            indicator_id=data.get("indicator_id"),
            location_id=data.get("location_id"),
            user_id=user_id,
            status="Completada"
        )
        db.session.add(new_activity)
        db.session.commit()
        
        # Aquí es donde tu lógica de get_manager_projects detectará el nuevo progreso
        return jsonify({"message": "Logro registrado y descontado en tiempo real"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@api.route('/users/managers', methods=['GET'])
@jwt_required()
def get_managers():
    """Devuelve solo los usuarios con rol de Gerente para asignaciones"""
    # Suponiendo que el ID del rol Gerente es el que definiste en tu lógica de registro
    # O podemos buscarlo por nombre
    managers = User.query.join(Rol).filter(Rol.name_rol == 'Gerente', User.is_active == True).all()
    return jsonify([m.serialize() for m in managers]), 200