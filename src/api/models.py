from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Integer, func, String, Column, Table, Boolean, DateTime, Text, Enum, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.ext.hybrid import hybrid_property
import enum

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

    activities_created: Mapped[List["Activity"]] = relationship(
        "Activity", 
        foreign_keys="[Activity.created_by_id]",
        back_populates="creator"
    )

    activities_updated: Mapped[List["Activity"]] = relationship(
        "Activity", 
        foreign_keys="[Activity.updated_by_id]",
        back_populates="editor"
    )

    project_assignments: Mapped[List["ProjectCompetence"]] = relationship(back_populates="manager")

    def __repr__(self):
        return f'<User {self.email}>'

    def serialize(self):
        initials = f"{self.name} {self.lastname}"
        competences_list = []
        seen_ids = set()
        
        for c in self.competences:
            if c.id_competence not in seen_ids:
                competences_list.append(c.serialize())
                seen_ids.add(c.id_competence)

        if self.project_assignments:
            for pa in self.project_assignments:
                if pa.competence and pa.competence.id_competence not in seen_ids:
                    competences_list.append(pa.competence.serialize())
                    seen_ids.add(pa.competence.id_competence)

        return {
        "id": self.id_user,
        "name": self.name,
        "lastname": self.lastname,
        "email": self.email,
        "rol_id": self.rol_id,
        "rol_name": self.rol.name_rol if self.rol else None,
        "is_active": self.is_active,
        # Ahora sí, pasamos los valores del diccionario a una lista
        "competences": competences_list,
        "image": self.profile if self.profile else f"https://ui-avatars.com/api/?name={initials.replace(' ', '+')}&size=128&background=random&rounded=true"
    }


class TheoryTemplate(db.Model):
    __tablename__ = 'theory_template'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Asegúrate de que el nombre aquí coincida con el primary_key de Competence
    competence_id: Mapped[int] = mapped_column(
        ForeignKey('competence.id_competence'), nullable=False)

    # Relación bidireccional (Añadido back_populates)
    competence: Mapped["Competence"] = relationship(back_populates="theories")

    results: Mapped[List["ResultTemplate"]] = relationship(
        back_populates="theory", cascade="all, delete-orphan")

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

    indicators: Mapped[List["IndicatorTemplate"]] = relationship(
        back_populates="result", cascade="all, delete-orphan")

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
        }


class ProjectStatus(enum.Enum):
    PLANIFICADO = "Planificado"
    EN_PROGRESO = "En Progreso"
    COMPLETADO = "Completado"
    SUSPENDIDO = "Suspendido"


class Project(db.Model):
    __tablename__ = 'project'
    id_project: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
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
    status: Mapped[ProjectStatus] = mapped_column(
        db.Enum(ProjectStatus), default=ProjectStatus.EN_PROGRESO, nullable=False)

    target_total: Mapped[float] = mapped_column(Float, default=0.0)
    target_men: Mapped[float] = mapped_column(Float, default=0.0)
    target_women: Mapped[float] = mapped_column(Float, default=0.0)
    target_disability: Mapped[float] = mapped_column(Float, default=0.0)

    @hybrid_property
    def remaining_days(self):
        if self.end_date:
            now = datetime.now()
            delta = self.end_date.replace(
                tzinfo=None) - now.replace(tzinfo=None)
            return max(0, delta.days)
        return 0

    locations: Mapped[List["Location"]] = relationship(
        back_populates="project")
    indicators: Mapped[List["Indicator"]] = relationship(
        back_populates="project")
    competence_assignments: Mapped[List["ProjectCompetence"]] = relationship(
        back_populates="project")
    # Nueva relación para el desglose de beneficiarios únicos por provincia
    province_goals: Mapped[List["ProjectProvinceGoal"]] = relationship(
        back_populates="project", cascade="all, delete-orphan")

    theories_assigned: Mapped[List["ProjectTheory"]] = relationship(back_populates="project")

    def serialize(self):
        return {
            "id": self.id_project,
            "code": self.code,
            "project_name": self.project_name,
            "donor_name": self.donor_name,
            "main_objective": self.main_objective,
            "results_summary": self.results_summary,
            "start_date": self.start_date.strftime("%Y-%m-%d") if self.start_date else None,
            "end_date": self.end_date.strftime("%Y-%m-%d") if self.end_date else None,
            "status": self.status.value if hasattr(self.status, 'value') else self.status,
            "remaining_days": self.remaining_days,
            "theories_and_indicators": [t.serialize() for t in self.theories_assigned],
            "unique_targets": {
                "total": self.target_total,
                "men": self.target_men,
                "women": self.target_women,
                "disability": self.target_disability
            },
            "competences": [
                {
                    "id": cp.id_pc,  # Usamos 'id' a secas para que React lo maneje mejor como key
                    "competence_id": cp.competence_id,
                    "manager_id": cp.manager_id,
                    "name": cp.competence.name,  
                    "manager_name": f"{cp.manager.name} {cp.manager.lastname}"
                } for cp in self.competence_assignments
            ],
            "province_unique_breakdown": [pg.serialize() for pg in self.province_goals],
            "locations": [loc.serialize() for loc in self.locations],
            "indicators": [ind.serialize() for ind in self.indicators],
            # "competences": [cp.serialize() for cp in self.competence_assignments]
        }

indicator_verification_means = db.Table(
    'indicator_verification_means',
    db.Column('indicator_id', db.Integer, db.ForeignKey('indicator.id_indicator'), primary_key=True),
    db.Column('mean_id', db.Integer, db.ForeignKey('master_verification_mean.id'), primary_key=True)
)

class MasterVerificationMean(db.Model):
    __tablename__ = 'master_verification_mean'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    
    def serialize(self):
        return {"id": self.id, "name": self.name}

indicator_dependencies = db.Table(
    'indicator_dependencies',
    db.Column('indicator_id', db.Integer, db.ForeignKey('indicator.id_indicator'), primary_key=True),
    db.Column('depends_on_id', db.Integer, db.ForeignKey('indicator.id_indicator'), primary_key=True)
)

class Indicator(db.Model):
    __tablename__ = 'indicator'
    id_indicator: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int] = mapped_column(ForeignKey('indicator_template.id'), nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey('project.id_project'), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="indicators")
    location_goals: Mapped[List["IndicatorLocationGoal"]] = relationship(
        back_populates="indicator", cascade="all, delete-orphan")
    
    project_result_id: Mapped[Optional[int]] = mapped_column(ForeignKey('project_result.id'), nullable=True)
    project_result: Mapped["ProjectResult"] = relationship(back_populates="indicators")
    template: Mapped["IndicatorTemplate"] = relationship()
    
    verification_means: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # <-- NO CAMBIA
    observations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    selected_means_list: Mapped[List["MasterVerificationMean"]] = relationship(
        secondary=indicator_verification_means
    )

    target_total: Mapped[float] = mapped_column(Float, default=0.0)
    target_men: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    target_women: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)

    depends_on: Mapped[List["Indicator"]] = relationship(
        "Indicator",
        secondary=indicator_dependencies,
        primaryjoin=(id_indicator == indicator_dependencies.c.indicator_id),
        secondaryjoin=(id_indicator == indicator_dependencies.c.depends_on_id),
        backref="is_parent_of"
    )

    def serialize(self):
        res_temp = self.project_result.result_template if self.project_result else None
        theo_temp = res_temp.theory if res_temp else None

        if not theo_temp and self.template and self.template.result:
            theo_temp = self.template.result.theory
        
        comp_id = theo_temp.competence_id if theo_temp else None
        pc_id = None

        if comp_id:
            pc = ProjectCompetence.query.filter_by(
                project_id=self.project_id, 
                competence_id=comp_id
            ).first()
            if pc:
                pc_id = pc.id_pc
        
        if pc_id is None:
            first_pc = ProjectCompetence.query.filter_by(project_id=self.project_id).first()
            pc_id = first_pc.id_pc if first_pc else None

        comp_temp = theo_temp.competence if theo_temp else None

        final_type = "output"
        if res_temp:
            final_type = res_temp.type
        elif self.template and self.template.result:
            final_type = self.template.result.type

        if not comp_temp and self.template and self.template.result:
            res_temp = self.template.result
            theo_temp = res_temp.theory
            comp_temp = theo_temp.competence
        
        return {
            "id": self.id_indicator,
            "template_id": self.template_id,
            "indicator_code": self.template.code,
            "indicator_name": self.template.name,
            "description": self.template.description,
            "verification_means": self.verification_means or "", 
            "observations": self.observations or "",
            "project_competence_id": pc_id,
            "means_tags": [m.serialize() for m in self.selected_means_list],
            "indicator_targets": {
                "total": self.target_total,
                "men": self.target_men,
                "women": self.target_women
            },
            "goals_by_province": [goal.serialize() for goal in self.location_goals],
            "comp_name": comp_temp.name if comp_temp else "Otras Competencias",
            "theory_name": theo_temp.name if theo_temp else "Sin Teoría",
            "result_name": res_temp.name if res_temp else "General",
            "result_type": final_type.lower() if final_type else "output",
            # NUEVO: Para que el oficial sepa si el indicador es dependiente o independiente
            "depends_on_ids": [i.id_indicator for i in self.depends_on]
        }


class Location(db.Model):
    __tablename__ = 'location'
    id_location: Mapped[int] = mapped_column(primary_key=True)

    province_id: Mapped[int] = mapped_column(
        ForeignKey('province.id'), nullable=False)
    municipality_id: Mapped[int] = mapped_column(
        ForeignKey('municipality.id'), nullable=False)
    parish_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey('parish.id'), nullable=True)

    community_institution: Mapped[Optional[str]
                                  ] = mapped_column(String(100), nullable=True)

    project_id: Mapped[int] = mapped_column(
        ForeignKey('project.id_project'), nullable=False)

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
            "province_id": self.province_id,
            "municipality_id": self.municipality_id,
            "parish_id": self.parish_id,
            "community_institution": self.community_institution
        }


class IndicatorLocationGoal(db.Model):
    __tablename__ = 'indicator_location_goal'
    id_ilg: Mapped[int] = mapped_column(primary_key=True)
    indicator_id: Mapped[int] = mapped_column(
        ForeignKey('indicator.id_indicator'), nullable=False)

    province_id: Mapped[int] = mapped_column(
        ForeignKey('province.id'), nullable=False)

    total_target: Mapped[float] = mapped_column(Float, default=0.0) 
    men: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    women: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)

    indicator: Mapped["Indicator"] = relationship(
        back_populates="location_goals")
    province: Mapped["Province"] = relationship()

    def serialize(self):
        is_outcome = False
        if self.indicator and self.indicator.template and self.indicator.template.result:
            is_outcome = self.indicator.template.result.type == 'outcome'
        return {
            "id_ilg": self.id_ilg,
            "indicator_id": self.indicator_id,
            "province_id": self.province_id,
            "province_name": self.province.name if self.province else None,
            "target": self.total_target,
            "is_percentage": is_outcome, # <-- Esto le avisará al Frontend que ponga el "%"
            "men": self.men if not is_outcome else None, # Ocultamos si es outcome
            "women": self.women if not is_outcome else None
        }



class Competence(db.Model):
    __tablename__ = 'competence'
    id_competence: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    users: Mapped[List["User"]] = relationship(
        secondary=user_competence,
        back_populates="competences"
    )

    theories: Mapped[List["TheoryTemplate"]] = relationship(
        back_populates="competence")
    project_assignments: Mapped[List["ProjectCompetence"]] = relationship(
        back_populates="competence")

    def serialize(self):
        return {
            "id": self.id_competence,
            "name": self.name,
            # Útil para el Stepper paso 3
            "theories": [t.serialize() for t in self.theories] if self.theories else []
        }



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
    manager: Mapped["User"] = relationship(back_populates="project_assignments")
    project: Mapped["Project"] = relationship(
        back_populates="competence_assignments")

    def serialize(self):
        return {
            "id": self.id_pc,
            "project_id": self.project_id,
            "competence": self.competence.serialize() if self.competence else None,
            "manager": self.manager.serialize() if self.manager else None
        }


class ActivityStatus(enum.Enum):
    PLANIFICADA = "Planificada"
    EN_PROGRESO = "En Progreso"
    COMPLETADA = "Completada"
    VENCIDA = "Vencida"
    CANCELADA = "Cancelada"

class Activity(db.Model):
    __tablename__ = 'activity'
    id_activity: Mapped[int] = mapped_column(primary_key=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    planned_target: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[ActivityStatus] = mapped_column(db.Enum(ActivityStatus), default=ActivityStatus.PLANIFICADA)

    indicator_id: Mapped[int] = mapped_column(ForeignKey('indicator.id_indicator'), nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey('project.id_project'), nullable=False)
    location_id: Mapped[int] = mapped_column(ForeignKey('location.id_location'), nullable=False)
    project_competence_id: Mapped[int] = mapped_column(ForeignKey('project_competence.id_pc'), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, onupdate=func.now())
    created_by_id: Mapped[int] = mapped_column(ForeignKey('user.id_user'), nullable=False)
    updated_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey('user.id_user'), nullable=True)

    achievements: Mapped[List["AchievementRecord"]] = relationship(back_populates="activity", cascade="all, delete-orphan")
    creator: Mapped["User"] = relationship(
        "User", 
        foreign_keys=[created_by_id], 
        back_populates="activities_created" 
    )
    editor: Mapped["User"] = relationship(
        "User", 
        foreign_keys=[updated_by_id], 
        back_populates="activities_updated" 
    )
    
    def serialize(self):
        total_men = sum((rec.men_reached or 0) for rec in self.achievements)
        total_women = sum((rec.women_reached or 0) for rec in self.achievements)
        
        return {
            "id": self.id_activity,
            "description": self.description,
            "indicator_id": self.indicator_id,
            "location_id": self.location_id,
            "project_id": self.project_id,
            "project_competence_id": self.project_competence_id, # Quitamos el + que estaba aquí
            "period": {
                "start": self.start_date.strftime("%Y-%m-%d") if self.start_date else None,
                "end": self.end_date.strftime("%Y-%m-%d") if self.end_date else None
            },
            "status": self.status.value if self.status else "Planificada",
            "planned_target": self.planned_target,
            "real_progress": { "men": total_men, "women": total_women, "total": total_men + total_women },
            "audit": {
                "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else None,
            # Usamos getattr para evitar errores si la relación no cargó a tiempo
                "created_by_name": f"{getattr(self.creator, 'name', 'Usuario')} {getattr(self.creator, 'lastname', '')}".strip() if self.creator else "Sistema",
                "last_update": self.updated_at.isoformat() if self.updated_at else None,
                "updated_by_name": f"{getattr(self.editor, 'name', '')} {getattr(self.editor, 'lastname', '')}".strip() if self.editor else "Sin cambios"
            },
            "achievements_history": [a.serialize() for a in self.achievements]
        }

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

    province_id: Mapped[int] = mapped_column(ForeignKey(
        'province.id', ondelete="CASCADE"), nullable=False)
    province: Mapped["Province"] = relationship(
        back_populates="municipalities")

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

    municipality_id: Mapped[int] = mapped_column(ForeignKey(
        'municipality.id', ondelete="CASCADE"), nullable=False)
    municipality: Mapped["Municipality"] = relationship(
        back_populates="parishes")

    def serialize(self):
        return {"id": self.id, "name": self.name, "municipality_id": self.municipality_id}


class ProjectProvinceGoal(db.Model):
    __tablename__ = 'project_province_goal'
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey('project.id_project'), nullable=False)
    province_id: Mapped[int] = mapped_column(
        ForeignKey('province.id'), nullable=False)

    target_total: Mapped[float] = mapped_column(Float, default=0.0)
    target_men: Mapped[float] = mapped_column(Float, default=0.0)
    target_women: Mapped[float] = mapped_column(Float, default=0.0)

    # Relaciones
    province: Mapped["Province"] = relationship()
    project: Mapped["Project"] = relationship(back_populates="province_goals")

    def serialize(self):
        return {
            "province_id": self.province_id,
            "province_name": self.province.name,
            "total": self.target_total,
            "men": self.target_men,
            "women": self.target_women
        }


class ProjectTheory(db.Model):
    __tablename__ = 'project_theory'
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey('project.id_project'), nullable=False)
    project_competence_id: Mapped[int] = mapped_column(ForeignKey('project_competence.id_pc'), nullable=False)
    theory_template_id: Mapped[int] = mapped_column(ForeignKey('theory_template.id'), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="theories_assigned")
    theory_template: Mapped["TheoryTemplate"] = relationship()
    selected_results: Mapped[List["ProjectResult"]] = relationship(back_populates="project_theory", cascade="all, delete-orphan")

    def serialize(self):
        return {
            "id": self.id,
            "theory_name": self.theory_template.name,
            "results": [r.serialize() for r in self.selected_results]
        }

class ProjectResult(db.Model):
    __tablename__ = 'project_result'
    id: Mapped[int] = mapped_column(primary_key=True)
    project_theory_id: Mapped[int] = mapped_column(ForeignKey('project_theory.id'), nullable=False)
    # Qué Output/Outcome del catálogo seleccionó
    result_template_id: Mapped[int] = mapped_column(ForeignKey('result_template.id'), nullable=False)

    project_theory: Mapped["ProjectTheory"] = relationship(back_populates="selected_results")
    result_template: Mapped["ResultTemplate"] = relationship()
    indicators: Mapped[List["Indicator"]] = relationship(back_populates="project_result", cascade="all, delete-orphan")

    def serialize(self):
        return {
            "id": self.id,
            "result_name": self.result_template.name,
            "type": self.result_template.type,
            "indicators": [i.serialize() for i in self.indicators]
        }
    

class AchievementRecord(db.Model):
    __tablename__ = 'achievement_record'
    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey('activity.id_activity'), nullable=False)
    
    men_reached: Mapped[float] = mapped_column(Float, default=0.0)
    women_reached: Mapped[float] = mapped_column(Float, default=0.0)
    disability_reached: Mapped[float] = mapped_column(Float, default=0.0)
    
    evidence_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    observations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    execution_date: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id_user'), nullable=False)
    
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, onupdate=func.now())
    updated_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey('user.id_user'), nullable=True)
    
    activity: Mapped["Activity"] = relationship(back_populates="achievements")
    creator: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    editor: Mapped["User"] = relationship("User", foreign_keys=[updated_by_id])

    def serialize(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "date": self.execution_date.strftime("%Y-%m-%d %H:%M"),
            "reach": {
                "men": self.men_reached, 
                "women": self.women_reached, 
                "disability": self.disability_reached,
                "total": self.men_reached + self.women_reached
            },
            "evidence": self.evidence_url,
            "observations": self.observations,
            "audit": {
                "created_by": f"{self.creator.name} {self.creator.lastname}" if self.creator else "N/A",
                "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M") if self.updated_at else None,
                "updated_by": f"{self.editor.name} {self.editor.lastname}" if self.editor else None
            }
        }


class SystemChangeLog(db.Model):
    __tablename__ = 'system_change_log'
    id: Mapped[int] = mapped_column(primary_key=True)
    
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False) # Corregido a Integer
    
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id_user'), nullable=False)
    
    field_changed: Mapped[str] = mapped_column(String(50)) 
    old_value: Mapped[str] = mapped_column(Text, nullable=True) 
    new_value: Mapped[str] = mapped_column(Text, nullable=True) 
    
    change_date: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship() 

    def serialize(self):
        return {
            "id": self.id,
            "entity": self.entity_type,
            "entity_id": self.entity_id,
            "field": self.field_changed,
            "old": self.old_value,
            "new": self.new_value,
            "date": self.change_date.strftime("%Y-%m-%d %H:%M:%S"),
            "user": f"{self.user.name} {self.user.lastname}" if self.user else "Desconocido"
        }


class ActivityCatalog(db.Model):
    __tablename__ = 'activity_catalog'
    id_ac: Mapped[int] = mapped_column(primary_key=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    # Podemos asociarlo a una competencia si queremos que sea específico
    competence_id: Mapped[Optional[int]] = mapped_column(ForeignKey('competence.id_competence'))
    
    competence = relationship("Competence")

    def serialize(self):
        comp_name = "General"
        if self.competence:
            comp_name = getattr(self.competence, 'name', "General")
            
        return {
            "id": self.id_ac,
            "description": self.description,
            "competence_id": self.competence_id,
            "competence_name": comp_name
            }