from app import app, db
from models import Rol

def create_initial_roles():
    with app.app_context():
        # Definimos los roles que necesita SIGSSEP
        roles_to_create = ["Gerente", "Oficial"]
        
        for role_name in roles_to_create:
            # Verificamos si ya existe para no duplicarlo
            existing_role = Rol.query.filter_by(name_rol=role_name).first()
            
            if not existing_role:
                new_role = Rol(name_rol=role_name)
                db.session.add(new_role)
                print(f"✅ Rol '{role_name}' creado exitosamente.")
            else:
                print(f"ℹ️ El rol '{role_name}' ya existe.")
        
        try:
            db.session.commit()
            print("🚀 Proceso de inicialización completado.")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al crear roles: {str(e)}")

if __name__ == "__main__":
    create_initial_roles()


# python3 seed.py