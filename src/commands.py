import click
import random
from api.models import (
    db, Rol, User, Competence, Province, Municipality, Parish, 
    MasterVerificationMean, TheoryTemplate, ResultTemplate, IndicatorTemplate
)
from faker import Faker

fake = Faker()

def setup_commands(app):
    @app.cli.command("seed-data")
    def seed_data():
        print("🚀 Iniciando población de datos para SIGSSEP...")
        
        # 1. ROLES
        roles = {}
        for r_name in ["Administrador", "Gerente", "Oficial"]:
            rol = Rol.query.filter_by(name_rol=r_name).first()
            if not rol:
                rol = Rol(name_rol=r_name)
                db.session.add(rol)
            roles[r_name] = rol
        db.session.commit()

        # 2. COMPETENCIAS
        competencias = {}
        for c_name in ["Educación", "Salud", "Protección", "Wash"]:
            comp = Competence.query.filter_by(name=c_name).first()
            if not comp:
                comp = Competence(name=c_name)
                db.session.add(comp)
            competencias[c_name] = comp
        db.session.commit()

        # 3. GEOGRAFÍA (Táchira, Zulia, Apure, Bolívar)
        geo_data = {
            "Táchira": {
                "Córdoba": ["Santa Ana", "Vega Grande", "Estación", "Blanquita"],
                "Junín": ["Rubio", "Castaño", "Puente de Oro Centro"],
                "Andrés Bello": ["Bello Monte", "Francisco", "Cordero", "Andrade"],
                "Torbes": ["San Josecito", "Zona Roja", "Palmar", "Peaje"]
            },
            "Zulia": {
                "Maracaibo": ["Capital", "La Locura", "El Puente", "Lago"],
                "Cabimas": ["La Esquina", "El Monte", "Cerro Verde", "La ley"],
                "Santa Bárbara": ["El Peligro", "La Blanca", "Feliciano", "Los Pelícanos"],
                "Mara": ["Los Bloques", "Petarito", "El Faro", "Cantasano"]
            },
            "Apure": {
                "San Fernando": ["Guasdualito", "El Paso", "La Laguna", "Monte Viejo"],
                "Achaguas": ["El Viajero", "El Silbón", "La Sayona", "Florentino"],
                "Cantón": ["Araure", "Nula", "El Tigre", "La Pedraza"],
                "Bruzual": ["Elorza", "Pedracal", "La Frontera", "Américas"]
            },
            "Bolívar": {
                "Simón": ["Rodríguez", "Libertador", "Caraquitas", "La Base"],
                "Ciudadela": ["Las Minas", "El Carbón", "Eloro", "Permiso"],
                "Presos": ["Capachito", "Abejales", "Palmarito", "Coloncito"]
            }
        }

        for p_name, munis in geo_data.items():
            prov = Province.query.filter_by(name=p_name).first() or Province(name=p_name)
            db.session.add(prov)
            db.session.flush()
            for m_name, parishes in munis.items():
                muni = Municipality(name=m_name, province_id=prov.id)
                db.session.add(muni)
                db.session.flush()
                for par_name in parishes:
                    db.session.add(Parish(name=par_name, municipality_id=muni.id))
        
        # 4. USUARIOS (Lógica de claves y competencias)
        pass_linda = "Linda.0704" # Nota: En producción usar werkzeug.security.generate_password_hash
        users_to_create = [
            {"email": "sigssep@gmail.com", "n": "Sistema", "ln": "Gestión", "r": "Administrador", "comps": []},
            {"email": "hrlp843@gmail.com", "n": "Hector", "ln": "Lopez", "r": "Gerente", "comps": ["Salud", "Protección"]},
            {"email": "maliliana173@gmail.com", "n": "María", "ln": "Largo", "r": "Gerente", "comps": ["Educación", "Wash"]},
            {"email": "hrlp959@gmail.com", "n": "Rafael", "ln": "Parra", "r": "Oficial", "comps": ["Educación"]},
            {"email": "gglp668@gmail.com", "n": "Graciano", "ln": "Lopez", "r": "Oficial", "comps": ["Salud"]},
        ]

        for u in users_to_create:
            user = User.query.filter_by(email=u["email"]).first()
            if not user:
                user = User(
                    email=u["email"], name=u["n"], lastname=u["ln"],
                    password=pass_linda, is_active=True,
                    rol_id=roles[u["r"]].id_rol
                )
                for c_name in u["comps"]:
                    user.competences.append(competencias[c_name])
                db.session.add(user)

        # 5. MEDIOS DE VERIFICACIÓN
        medios = ["Listado de Asistencia", "Fotos", "Facturas", "Encuestas", "Informes Diarios", 
                  "Cuestionarios", "Actas de Entrega", "Videos", "Certificados", "Registro de Visitas"]
        for m in medios:
            if not MasterVerificationMean.query.filter_by(name=m).first():
                db.session.add(MasterVerificationMean(name=m))

        # 6. CATÁLOGO DE TEORÍA DE CAMBIO (3 Teorías x 6 Resultados x 4 Indicadores)
        for c_name, comp_obj in competencias.items():
            for t_idx in range(1, 4):
                theory = TheoryTemplate(name=f"Estrategia {c_name} Fase {t_idx}", competence_id=comp_obj.id_competence)
                db.session.add(theory)
                db.session.flush()

                for res_type in ["output", "outcome"]:
                    for r_idx in range(1, 4):
                        res = ResultTemplate(
                            name=f"{res_type.capitalize()} {r_idx} para {theory.name}",
                            type=res_type, theory_id=theory.id
                        )
                        db.session.add(res)
                        db.session.flush()

                        for i_idx in range(1, 5):
                            code = f"{c_name[:2].upper()}-{theory.id}-{res_type[0].upper()}{r_idx}-0{i_idx}"
                            ind = IndicatorTemplate(
                                code=code,
                                name=f"Indicador {code}",
                                description=f"Descripción detallada del indicador {code} para el seguimiento de {c_name}",
                                result_id=res.id
                            )
                            db.session.add(ind)

        db.session.commit()
        print("✅ Base de datos populada exitosamente. ¡Listo para probar!")