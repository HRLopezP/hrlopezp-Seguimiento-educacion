from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Integer, String, Boolean, DateTime, Text, Enum, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from typing import Optional
from typing import List

db = SQLAlchemy()


class Rol (db.Model):
    __tablename__ = 'rol'
    id_rol: Mapped[int] = mapped_column(primary_key=True)
    name_rol: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
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
    profile: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    rol_id: Mapped[int] = mapped_column(ForeignKey('rol.id_rol'), nullable=False)
    rol: Mapped["Rol"] = relationship(back_populates="users")
    
    def __repr__(self):
        return f'<User {self.mail}>'

    def serialize(self):
        initials = f"{self.name}+{self.lastname}"
        return {
            "id": self.id_user,
            "name": self.name,
            "lastname": self.lastname,
            "email": self.email,
            "rol": self.rol.name_rol if self.rol else None, 
            "is_active": self.is_active,
            "image": self.profile if self.profile else f"https://ui-avatars.com/api/?name={initials}&size=128&background=random&rounded=true"
        }


class Project(db.Model):
    __tablename__ = 'project'
    id_project: Mapped[int] = mapped_column(primary_key=True)
    project_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Metas principales (Alcance global)
    main_goal_target: Mapped[int] = mapped_column(Integer, nullable=False) # Ej: 1000
    main_goal_description: Mapped[str] = mapped_column(String(255), nullable=False) # Ej: "Niños beneficiados"
    
    # Tiempos
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relaciones
    indicators: Mapped[List["Indicator"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    locations: Mapped[List["Location"]] = relationship(back_populates="project", cascade="all, delete-orphan")

    def serialize(self):
        return {
            "id": self.id_project,
            "code": self.project_code,
            "name": self.name,
            "goal": f"{self.main_goal_target} {self.main_goal_description}",
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "indicators": [i.serialize() for i in self.indicators],
            "locations": [l.serialize() for l in self.locations]
        }


class Indicator(db.Model):
    __tablename__ = 'indicator'
    id_indicator: Mapped[int] = mapped_column(primary_key=True)
    ind_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False) # Código único
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    project_id: Mapped[int] = mapped_column(ForeignKey('project.id_project'), nullable=False)
    project: Mapped["Project"] = relationship(back_populates="indicators")

    def serialize(self):
        return {
            "id": self.id_indicator,
            "code": self.ind_code,
            "description": self.description
        }


class Location(db.Model):
    __tablename__ = 'location'
    id_location: Mapped[int] = mapped_column(primary_key=True)
    province: Mapped[str] = mapped_column(String(100), nullable=False)
    municipality: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Aquí está la clave:
    place_type: Mapped[str] = mapped_column(String(50), default="Comunidad") # Ej: 'Escuela', 'Centro de Salud', 'Comunidad'
    place_name: Mapped[str] = mapped_column(String(150), nullable=False) # El nombre específico
    
    project_id: Mapped[int] = mapped_column(ForeignKey('project.id_project'), nullable=False)
    project: Mapped["Project"] = relationship(back_populates="locations")

    def serialize(self):
        return {
            "id": self.id_location,
            "province": self.province,
            "municipality": self.municipality,
            "type": self.place_type,
            "name": self.place_name,
            "full_address": f"{self.place_name} ({self.place_type}) - {self.municipality}, {self.province}"
        }

class Activity(db.Model):
    __tablename__ = 'activity'
    id_activity: Mapped[int] = mapped_column(primary_key=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    implementation_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    # El "Logro": Cuánto se avanzó en esta actividad
    achievement_count: Mapped[int] = mapped_column(Integer, default=0) # Ej: "Logré capacitar a 20"
    
    # Estado para el semáforo que hablamos
    status: Mapped[str] = mapped_column(String(20), default="Planificada") # Planificada, Ejecutada, Atrasada
    
    # Relaciones (Foreign Keys)
    project_id: Mapped[int] = mapped_column(ForeignKey('project.id_project'), nullable=False)
    indicator_id: Mapped[int] = mapped_column(ForeignKey('indicator.id_indicator'), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id_user'), nullable=False) # Responsable
    location_id: Mapped[int] = mapped_column(ForeignKey('location.id_location'), nullable=False)

    # Relaciones inversas para navegar por los datos
    project: Mapped["Project"] = relationship()
    indicator: Mapped["Indicator"] = relationship()
    responsible: Mapped["User"] = relationship()
    location: Mapped["Location"] = relationship()

    def serialize(self):
        return {
            "id": self.id_activity,
            "description": self.description,
            "date": self.implementation_date.isoformat(),
            "achievement": self.achievement_count,
            "status": self.status,
            "project_name": self.project.name,
            "indicator_code": self.indicator.ind_code,
            "responsible_name": f"{self.responsible.name} {self.responsible.lastname}",
            "location_detail": f"{self.location.place_name} ({self.location.province})"
        }