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

    # En Activity, el campo debería llamarse 'responsible' para que esto funcione
    activities: Mapped[List["Activity"]] = relationship(
        back_populates="responsible")

    def __repr__(self):
        return f'<User {self.email}>'

    def serialize(self):
        # El + en la URL de la imagen debe estar escapado o ser un espacio
        initials = f"{self.name} {self.lastname}"
        return {
            "id": self.id_user,
            "name": self.name,
            "lastname": self.lastname,
            "email": self.email,
            "rol_id": self.rol_id,
            "rol_name": self.rol.name_rol if self.rol else None,
            "is_active": self.is_active,
            "image": self.profile if self.profile else f"https://ui-avatars.com/api/?name={initials.replace(' ', '+')}&size=128&background=random&rounded=true"
        }


# --- CATÁLOGOS / MOLDES (Lo que el Admin define) ---

class TheoryTemplate(db.Model):
    __tablename__ = 'theory_template'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    results: Mapped[List["ResultTemplate"]
                    ] = relationship(back_populates="theory")


class ResultTemplate(db.Model):
    __tablename__ = 'result_template'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # Define si es Output u Outcome
    type: Mapped[str] = mapped_column(
        Enum('output', 'outcome', name='result_types'), nullable=False)

    theory_id: Mapped[int] = mapped_column(ForeignKey('theory_template.id'))
    theory: Mapped["TheoryTemplate"] = relationship(back_populates="results")
    indicators: Mapped[List["IndicatorTemplate"]
                       ] = relationship(back_populates="result")


class IndicatorTemplate(db.Model):
    __tablename__ = 'indicator_template'
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    result_id: Mapped[int] = mapped_column(ForeignKey('result_template.id'))
    result: Mapped["ResultTemplate"] = relationship(
        back_populates="indicators")


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
    status: Mapped[str] = mapped_column(String(20), default="En Progreso")

    # Relaciones principales
    locations: Mapped[List["Location"]] = relationship(
        back_populates="project")
    indicators: Mapped[List["Indicator"]] = relationship(
        back_populates="project")
    
    def serialize(self):
        return {
            "id": self.id_project,
            "code": self.code,
            "project_name": self.project_name,
            "donor_name": self.donor_name,
            "status": self.status,
            "remaining_days": self.remaining_days, # Tu hybrid_property
            "locations": [loc.serialize() for loc in self.locations],
            "indicators": [ind.serialize() for ind in self.indicators]
        }


class Indicator(db.Model):
    __tablename__ = 'indicator'
    id_indicator: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int] = mapped_column(ForeignKey('indicator_template.id'), nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey('project.id_project'), nullable=False)
    
    template: Mapped["IndicatorTemplate"] = relationship()
    location_goals: Mapped[List["IndicatorLocationGoal"]] = relationship(back_populates="indicator")

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
    province: Mapped[str] = mapped_column(
        String(100), nullable=False)  # Estado
    municipality: Mapped[str] = mapped_column(String(100), nullable=False)
    parish: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    community_institution: Mapped[Optional[str]
                                  ] = mapped_column(String(100), nullable=True)

    # El "dueño" de esta ubicación es el proyecto
    project_id: Mapped[int] = mapped_column(
        ForeignKey('project.id_project'), nullable=False)
    project: Mapped["Project"] = relationship(back_populates="locations")

    def __repr__(self):
        return f'<Location {self.province} - {self.municipality}>'
    
    def serialize(self):
        return {
            "id": self.id_location,
            "province": self.province,
            "municipality": self.municipality,
            "parish": self.parish,
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
    
    project_assignments: Mapped[List["ProjectCompetence"]] = relationship(back_populates="competence")

    def serialize(self):
        return {
            "id": self.id_competence,
            "name": self.name
        }

# --- RELACIONES DE GESTIÓN ---

class ProjectCompetence(db.Model):
    __tablename__ = 'project_competence'
    id_pc: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey('project.id_project'), nullable=False)
    competence_id: Mapped[int] = mapped_column(ForeignKey('competence.id_competence'), nullable=False)
    manager_id: Mapped[int] = mapped_column(ForeignKey('user.id_user'), nullable=False)
    
    competence: Mapped["Competence"] = relationship(back_populates="project_assignments")
    manager: Mapped["User"] = relationship()

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
    implementation_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    # Logros numéricos
    achievement_men: Mapped[float] = mapped_column(Float, default=0.0)
    achievement_women: Mapped[float] = mapped_column(Float, default=0.0)
    achievement_disability: Mapped[float] = mapped_column(Float, default=0.0)
    
    status: Mapped[str] = mapped_column(String(20), default="Pendiente")
    
    # Relaciones
    indicator_id: Mapped[int] = mapped_column(ForeignKey('indicator.id_indicator'), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id_user'), nullable=False)
    location_id: Mapped[int] = mapped_column(ForeignKey('location.id_location'), nullable=False)

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