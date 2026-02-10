import sys
import os

# 1. Obtenemos la ruta de la carpeta 'scripts'
current_dir = os.path.dirname(os.path.abspath(__file__))
# 2. Subimos un nivel para llegar a 'src'
parent_dir = os.path.dirname(current_dir)
# 3. Le decimos a Python que incluya 'src' en su búsqueda de archivos
sys.path.append(parent_dir)

# scripts/seed_data.py
from app import db, create_app # Asegúrate de importar tu app y db correctamente
from models import MasterVerificationMean # Importa tu modelo nuevo

def seed_verification_means():
    app = create_app()
    with app.app_context():
        # Lista de medios estándar que acordamos
        means = [
            "Listas de asistencia",
            "Registro fotográfico",
            "Actas de entrega",
            "Facturas/Recibos",
            "Informes técnicos",
            "Encuestas de satisfacción",
            "Certificados de participación"
        ]

        print("Iniciando la siembra de datos...")
        
        for name in means:
            # Verificamos si ya existe para no duplicar
            exists = MasterVerificationMean.query.filter_by(name=name).first()
            if not exists:
                new_mean = MasterVerificationMean(name=name)
                db.session.add(new_mean)
                print(f"✅ Agregado: {name}")
            else:
                print(f"🟡 Ya existe: {name}")
        
        db.session.commit()
        print("¡Proceso completado con éxito!")

if __name__ == "__main__":
    seed_verification_means()



# Una vez creado el archivo, abre tu terminal en la raíz del proyecto y ejecuta:
# python scripts/seed_data.py