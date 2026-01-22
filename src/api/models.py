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
    profile: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default=None)
    
    # Cambiado a False para cumplir con la regla del SIGSSEP
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False) 
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    rol_id: Mapped[int] = mapped_column(ForeignKey('rol.id_rol'), nullable=False)
    rol: Mapped["Rol"] = relationship(back_populates="users")
    
    # En Activity, el campo debería llamarse 'responsible' para que esto funcione
    activities: Mapped[List["Activity"]] = relationship(back_populates="responsible")

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


class Project(db.Model):
    __tablename__ = 'project'
    id_project: Mapped[int] = mapped_column(primary_key=True)
    project_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    main_goal_target: Mapped[int] = mapped_column(Integer, nullable=False)
    main_goal_description: Mapped[str] = mapped_column(
        String(255), nullable=False)

    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    indicators: Mapped[List["Indicator"]] = relationship(
        back_populates="project", cascade="all, delete-orphan")
    locations: Mapped[List["Location"]] = relationship(
        back_populates="project", cascade="all, delete-orphan")
    activities: Mapped[List["Activity"]] = relationship(
        back_populates="project")

    @hybrid_property
    def total_achievement(self):
        return sum(a.achievement_count for a in self.activities if a.achievement_count)

    def serialize(self):
        total = self.total_achievement
        return {
            "id": self.id_project,
            "code": self.project_code,
            "name": self.name,
            "goal_target": self.main_goal_target,
            "goal_description": self.main_goal_description,
            "current_progress": total,
            "progress_percentage": round((total / self.main_goal_target) * 100, 2) if self.main_goal_target > 0 else 0,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "indicators": [i.serialize() for i in self.indicators],
            "locations": [l.serialize() for l in self.locations]
        }


class Indicator(db.Model):
    __tablename__ = 'indicator'
    id_indicator: Mapped[int] = mapped_column(primary_key=True)
    ind_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    project_id: Mapped[int] = mapped_column(
        ForeignKey('project.id_project'), nullable=False)
    project: Mapped["Project"] = relationship(back_populates="indicators")
    activities: Mapped[List["Activity"]] = relationship(
        back_populates="indicator")

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
    place_type: Mapped[str] = mapped_column(String(50), default="Comunidad")
    place_name: Mapped[str] = mapped_column(String(150), nullable=False)

    project_id: Mapped[int] = mapped_column(
        ForeignKey('project.id_project'), nullable=False)
    project: Mapped["Project"] = relationship(back_populates="locations")
    activities: Mapped[List["Activity"]] = relationship(
        back_populates="location")

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
    implementation_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False)
    achievement_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="Planificada")

    project_id: Mapped[int] = mapped_column(
        ForeignKey('project.id_project'), nullable=False)
    indicator_id: Mapped[int] = mapped_column(
        ForeignKey('indicator.id_indicator'), nullable=False)
    user_id: Mapped[int] = mapped_column(
        ForeignKey('user.id_user'), nullable=False)
    location_id: Mapped[int] = mapped_column(
        ForeignKey('location.id_location'), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="activities")
    indicator: Mapped["Indicator"] = relationship(back_populates="activities")
    responsible: Mapped["User"] = relationship(back_populates="activities")
    location: Mapped["Location"] = relationship(back_populates="activities")

    def serialize(self):
        return {
            "id": self.id_activity,
            "description": self.description,
            "date": self.implementation_date.isoformat(),
            "achievement": self.achievement_count,
            "status": self.status,
            "project_name": self.project.name if self.project else None,
            "indicator_code": self.indicator.ind_code if self.indicator else None,
            "responsible_name": f"{self.responsible.name} {self.responsible.lastname}" if self.responsible else None,
            "location_detail": f"{self.location.place_name} ({self.location.province})" if self.location else None
        }
