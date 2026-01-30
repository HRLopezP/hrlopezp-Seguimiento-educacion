from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Integer, String, Boolean, DateTime, Text, Enum, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.ext.hybrid import hybrid_property

db = SQLAlchemy()


class Rol(db.Model):
    __tablename__ = 'rol'
    id_rol: Mapped[int] = mapped_column(primary_key=True)
    name_rol: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(
        timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(
        timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    users: Mapped[List["User"]] = relationship(back_populates="rol")

    def __repr__(self):
        return f'<Rol {self.name_rol}>'

    def serialize(self):
        return {
            "id": self.id_rol,
            "name_rol": self.name_rol,
        }


user_competence = db.Table(
    'user_competence',
    db.Column('user_id', db.Integer, db.ForeignKey(
        'user.id_user'), primary_key=True),
    db.Column('competence_id', db.Integer, db.ForeignKey(
        'competence.id_competence'), primary_key=True)
)


class User(db.Model):
    __tablename__ = 'user'
    id_user: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    lastname: Mapped[str] = mapped_column(String(100), nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    profile: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=None)

    # Cambiado a False para cumplir con la regla del SIGSSEP
    is_active: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(
        timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(
        timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    rol_id: Mapped[int] = mapped_column(
        ForeignKey('rol.id_rol'), nullable=False)
    rol: Mapped["Rol"] = relationship(back_populates="users")

    competences: Mapped[List["Competence"]] = relationship(
        secondary=user_competence,
        back_populates="users"
    )

    # En Activity, el campo debería llamarse 'responsible' para que esto funcione
    activities: Mapped[List["Activity"]] = relationship(
        back_populates="responsible")

    def __repr__(self):
        return f'<User {self.email}>'

    def serialize(self):
        initials = f"{self.name} {self.lastname}"
        return {
            "id": self.id_user,
            "name": self.name,
            "lastname": self.lastname,
            "email": self.email,
            "rol_id": self.rol_id,
            "rol_name": self.rol.name_rol if self.rol else None,
            "is_active": self.is_active,
            # Añadimos esto para el Navbar y Claims
            "competences": [c.serialize() for c in self.competences],
            "image": self.profile if self.profile else f"https://ui-avatars.com/api/?name={initials.replace(' ', '+')}&size=128&background=random&rounded=true"
        }


# --- CATÁLOGOS / MOLDES (Lo que el Admin define) ---

class TheoryTemplate(db.Model):
    __tablename__ = 'theory_template'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Asegúrate de que el nombre aquí coincida con el primary_key de Competence
    competence_id: Mapped[int] = mapped_column(ForeignKey('competence.id_competence'), nullable=False)
    
    # Relación bidireccional (Añadido back_populates)
    competence: Mapped["Competence"] = relationship(back_populates="theories") 

    results: Mapped[List["ResultTemplate"]] = relationship(back_populates="theory", cascade="all, delete-orphan")
    
    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "competence_id": self.competence_id,
            "competence_name": self.competence.name if self.competence else None,
            # Importante: ¿Quieres ver los resultados al serializar la teoría?
            "results": [r.serialize() for r in self.results] 
        }


class ResultTemplate(db.Model):
    __tablename__ = 'result_template'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(
        Enum('output', 'outcome', name='result_types'), nullable=False)

    theory_id: Mapped[int] = mapped_column(ForeignKey('theory_template.id'))
    theory: Mapped["TheoryTemplate"] = relationship(back_populates="results")
    
    # Cascade delete es vital aquí: si borras un output, se van sus indicadores
    indicators: Mapped[List["IndicatorTemplate"]] = relationship(back_populates="result", cascade="all, delete-orphan")

    # ¡IMPORTANTE! Añadir serialize para el siguiente paso del proyecto
    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "theory_id": self.theory_id,
            "indicators": [i.serialize() for i in self.indicators]
        }


class IndicatorTemplate(db.Model):
    __tablename__ = 'indicator_template'
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    result_id: Mapped[int] = mapped_column(ForeignKey('result_template.id'))
    result: Mapped["ResultTemplate"] = relationship(
        back_populates="indicators")
    
    def serialize(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "description": self.description,
            "result_id": self.result_id
            # No pongas "result" aquí para evitar bucles infinitos
        }


# --- INSTANCIAS DEL PROYECTO (Lo que el Gerente llena) ---

class Project(db.Model):
    __tablename__ = 'project'
    id_project: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # Todos estos son opcionales para permitir el "Partial Save"
    donor_name: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True)
    project_name: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True)
    main_objective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    results_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="En Progreso", nullable=False)
    target_total: Mapped[float] = mapped_column(Float, default=0.0)
    target_men: Mapped[float] = mapped_column(Float, default=0.0)
    target_women: Mapped[float] = mapped_column(Float, default=0.0)
    target_disability: Mapped[float] = mapped_column(Float, default=0.0)

    @hybrid_property
    def remaining_days(self):
        if self.end_date:
            # Comparamos la fecha de fin con el momento actual
            # Usamos replace(tzinfo=None) para que ambas sean "naive" y no de error de zona horaria
            now = datetime.now()
            delta = self.end_date.replace(
                tzinfo=None) - now.replace(tzinfo=None)
            # max(0, ...) evita que salgan días negativos si ya venció
            return max(0, delta.days)
        return 0

    # Relaciones principales
    locations: Mapped[List["Location"]] = relationship(
        back_populates="project")
    indicators: Mapped[List["Indicator"]] = relationship(
        back_populates="project")
    competence_assignments: Mapped[List["ProjectCompetence"]] = relationship(back_populates="project")

    def serialize(self):
        return {
            "id": self.id_project,
            "code": self.code,
            "project_name": self.project_name,
            "donor_name": self.donor_name,
            "main_objective": self.main_objective, # ¡Importante añadirlo!
            "start_date": self.start_date.strftime("%Y-%m-%d") if self.start_date else None,
            "end_date": self.end_date.strftime("%Y-%m-%d") if self.end_date else None,
            "status": self.status,
            "remaining_days": self.remaining_days,
            # Nuevos campos de Beneficiarios Únicos
            "targets": {
                "total": self.target_total,
                "men": self.target_men,
                "women": self.target_women,
                "disability": self.target_disability
            },
            "locations": [loc.serialize() for loc in self.locations],
            "indicators": [ind.serialize() for ind in self.indicators],
            # Añadimos las competencias para que el gerente vea quiénes participan
            "competences": [cp.serialize() for cp in self.competence_assignments]
        }


class Indicator(db.Model):
    __tablename__ = 'indicator'
    id_indicator: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int] = mapped_column(
        ForeignKey('indicator_template.id'), nullable=False)
    project_id: Mapped[int] = mapped_column(
        ForeignKey('project.id_project'), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="indicators")

    template: Mapped["IndicatorTemplate"] = relationship()
    location_goals: Mapped[List["IndicatorLocationGoal"]
                           ] = relationship(back_populates="indicator")

    # Metas globales
    target_total: Mapped[float] = mapped_column(Float, default=0.0)
    target_men: Mapped[float] = mapped_column(Float, default=0.0)
    target_women: Mapped[float] = mapped_column(Float, default=0.0)
    target_disability: Mapped[float] = mapped_column(Float, default=0.0)

    def serialize(self):
        return {
            "id": self.id_indicator,
            "template_info": {
                "code": self.template.code,
                "description": self.template.description,
                "type": self.template.result.type if self.template.result else None
            },
            "goals": {
                "total": self.target_total,
                "men": self.target_men,
                "women": self.target_women,
                "disability": self.target_disability
            },
            "location_breakdown": [goal.serialize() for goal in self.location_goals]
        }


class Location(db.Model):
    __tablename__ = 'location'
    id_location: Mapped[int] = mapped_column(primary_key=True)

    province_id: Mapped[int] = mapped_column(ForeignKey('province.id'), nullable=False)
    municipality_id: Mapped[int] = mapped_column(ForeignKey('municipality.id'), nullable=False)
    parish_id: Mapped[Optional[int]] = mapped_column(ForeignKey('parish.id'), nullable=True)

    community_institution: Mapped[Optional[str]
                                  ] = mapped_column(String(100), nullable=True)

    # El "dueño" de esta ubicación es el proyecto
    project_id: Mapped[int] = mapped_column(
        ForeignKey('project.id_project'), nullable=False)
    
    # Relaciones para poder acceder al nombre fácilmente
    province_ref: Mapped["Province"] = relationship()
    municipality_ref: Mapped["Municipality"] = relationship()
    parish_ref: Mapped["Parish"] = relationship()
    project: Mapped["Project"] = relationship(back_populates="locations")

    def serialize(self):
        return {
            "id": self.id_location,
            "province": self.province_ref.name,
            "municipality": self.municipality_ref.name,
            "parish": self.parish_ref.name if self.parish_ref else None,
            "community_institution": self.community_institution
        }

class IndicatorLocationGoal(db.Model):
    __tablename__ = 'indicator_location_goal'
    id_ilg: Mapped[int] = mapped_column(primary_key=True)

    # Se conecta al indicador del proyecto
    indicator_id: Mapped[int] = mapped_column(
        ForeignKey('indicator.id_indicator'), nullable=False)
    indicator: Mapped["Indicator"] = relationship(
        back_populates="location_goals")

    # Se conecta a la ubicación específica del proyecto
    location_id: Mapped[int] = mapped_column(
        ForeignKey('location.id_location'), nullable=False)
    location: Mapped["Location"] = relationship()

    # Metas numéricas para esta ubicación específica
    total_target: Mapped[float] = mapped_column(Float, default=0.0)
    men: Mapped[float] = mapped_column(Float, default=0.0)
    women: Mapped[float] = mapped_column(Float, default=0.0)
    disability: Mapped[float] = mapped_column(Float, default=0.0)

    def serialize(self):
        return {
            "id": self.id_ilg,
            "location_id": self.location_id,
            "province": self.location.province if self.location else None,
            "municipality": self.location.municipality if self.location else None,
            "targets": {
                "total": self.total_target,
                "men": self.men,
                "women": self.women,
                "disability": self.disability
            }
        }


# --- CATÁLOGOS ADICIONALES ---

class Competence(db.Model):
    __tablename__ = 'competence'
    id_competence: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    # Relación inversa hacia User
    users: Mapped[List["User"]] = relationship(
        secondary=user_competence, 
        back_populates="competences"
    )
    
    theories: Mapped[List["TheoryTemplate"]] = relationship(back_populates="competence")
    project_assignments: Mapped[List["ProjectCompetence"]] = relationship(
        back_populates="competence")
    
    def serialize(self):
        return {
            "id": self.id_competence,
            "name": self.name,
            # Útil para el Stepper paso 3
            "theories": [t.serialize() for t in self.theories] if self.theories else []
        }

# --- RELACIONES DE GESTIÓN ---


class ProjectCompetence(db.Model):
    __tablename__ = 'project_competence'
    id_pc: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey('project.id_project'), nullable=False)
    competence_id: Mapped[int] = mapped_column(
        ForeignKey('competence.id_competence'), nullable=False)
    manager_id: Mapped[int] = mapped_column(
        ForeignKey('user.id_user'), nullable=False)

    competence: Mapped["Competence"] = relationship(
        back_populates="project_assignments")
    manager: Mapped["User"] = relationship()
    project: Mapped["Project"] = relationship(back_populates="competence_assignments")

    def serialize(self):
        return {
            "id": self.id_pc,
            "project_id": self.project_id,
            "competence": self.competence.serialize() if self.competence else None,
            "manager": self.manager.serialize() if self.manager else None
        }
# --- REGISTRO DE AVANCES (OPERATIVO) ---


class Activity(db.Model):
    __tablename__ = 'activity'
    id_activity: Mapped[int] = mapped_column(primary_key=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    implementation_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False)

    # Logros numéricos
    achievement_men: Mapped[float] = mapped_column(Float, default=0.0)
    achievement_women: Mapped[float] = mapped_column(Float, default=0.0)
    achievement_disability: Mapped[float] = mapped_column(Float, default=0.0)

    status: Mapped[str] = mapped_column(String(20), default="Pendiente")

    # Relaciones
    indicator_id: Mapped[int] = mapped_column(
        ForeignKey('indicator.id_indicator'), nullable=False)
    user_id: Mapped[int] = mapped_column(
        ForeignKey('user.id_user'), nullable=False)
    location_id: Mapped[int] = mapped_column(
        ForeignKey('location.id_location'), nullable=False)

    responsible: Mapped["User"] = relationship(back_populates="activities")

    def serialize(self):
        return {
            "id": self.id_activity,
            "description": self.description,
            "date": self.implementation_date.strftime("%Y-%m-%d"),
            "achievements": {
                "men": self.achievement_men,
                "women": self.achievement_women,
                "disability": self.achievement_disability
            },
            "status": self.status,
            "responsible_name": f"{self.responsible.name} {self.responsible.lastname}" if self.responsible else "N/A"
        }


# --- CATÁLOGOS DE TERRITORIO (Los que el Admin llena primero) ---

class Province(db.Model):
    __tablename__ = 'province'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    
    municipalities: Mapped[List["Municipality"]] = relationship(
        back_populates="province", 
        cascade="all, delete-orphan",
        passive_deletes=True 
    )

    def serialize(self):
        return {"id": self.id, "name": self.name}

class Municipality(db.Model):
    __tablename__ = 'municipality'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    province_id: Mapped[int] = mapped_column(ForeignKey('province.id', ondelete="CASCADE"), nullable=False)
    province: Mapped["Province"] = relationship(back_populates="municipalities")
    
    parishes: Mapped[List["Parish"]] = relationship(
        back_populates="municipality", 
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    def serialize(self):
        return {"id": self.id, "name": self.name, "province_id": self.province_id}

class Parish(db.Model):
    __tablename__ = 'parish'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    municipality_id: Mapped[int] = mapped_column(ForeignKey('municipality.id', ondelete="CASCADE"), nullable=False)
    municipality: Mapped["Municipality"] = relationship(back_populates="parishes")

    def serialize(self):
        return {"id": self.id, "name": self.name, "municipality_id": self.municipality_id}