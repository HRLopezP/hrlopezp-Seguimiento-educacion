import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from "../../utils/api";
import { toast, Toaster } from 'sonner';
import Swal from 'sweetalert2';
import "../../styles/technicalSetup.css"; // Tu estilo elegante

const ProjectTechnicalSetup = () => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [myCompetences, setMyCompetences] = useState([]); // Competencias asignadas a María
    const [selectedComp, setSelectedComp] = useState(null);
    const [theories, setTheories] = useState([]); // Teorías de la competencia seleccionada
    const [loading, setLoading] = useState(true);

    // 1. Cargar datos iniciales
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Obtenemos resumen del proyecto (incluye locations)
                const resProj = await apiFetch(`/projects/${projectId}/summary`);
                const dataProj = await resProj.json();
                setProject(dataProj);

                // Obtenemos las competencias que YO (Gerente) tengo en este proyecto
                // Nota: Este endpoint lo definimos en la respuesta anterior
                const resComp = await apiFetch(`/my-assigned-projects`);
                const allMyProjects = await resComp.json();
                
                // Filtramos las competencias específicas de este proyecto
                const comps = allMyProjects.filter(p => p.project_id === parseInt(projectId));
                setMyCompetences(comps);
                
                if (comps.length > 0) setSelectedComp(comps[0]);
            } catch (error) {
                toast.error("Error al cargar la configuración técnica");
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [projectId]);

    // 2. Cargar teorías cuando cambie la competencia seleccionada
    useEffect(() => {
        if (selectedComp) {
            const fetchTheories = async () => {
                const res = await apiFetch(`/competence/${selectedComp.competence_id}/theories`);
                const data = await res.json();
                setTheories(data);
            };
            fetchTheories();
        }
    }, [selectedComp]);

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-emerald"></div></div>;

    return (
        <div className="management-page-container">
            <Toaster richColors position="top-right" />
            <div className="container mt-4">
                {/* Header dinámico */}
                <div className="management-card-header mb-4 shadow-sm rounded-3 p-3 bg-white">
                    <h2 className="management-title">Configuración Técnica</h2>
                    <p className="text-muted">Proyecto: <span className="fw-bold text-oxford-grey">{project?.project_name}</span></p>
                </div>

                {/* SELECTOR DE COMPETENCIAS (Pestañas Oxford) */}
                <div className="d-flex gap-2 mb-4">
                    {myCompetences.map(comp => (
                        <button
                            key={comp.competence_id}
                            className={`btn ${selectedComp?.competence_id === comp.competence_id ? 'btn-emerald' : 'btn-outline-oxford'}`}
                            onClick={() => setSelectedComp(comp)}
                        >
                            <i className="fas fa-briefcase me-2"></i>
                            {comp.competence_name}
                        </button>
                    ))}
                </div>

                <div className="row">
                    {/* COLUMNA IZQUIERDA: Árbol de Selección */}
                    <div className="col-md-5">
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-oxford-grey text-white">
                                <i className="fas fa-sitemap me-2"></i> Estructura Técnica
                            </div>
                            <div className="card-body">
                                <label className="form-label fw-bold">1. Seleccione Teoría de Cambio</label>
                                <select className="form-select mb-3 border-emerald" onChange={(e) => {/* Lógica para filtrar resultados */}}>
                                    <option value="">Seleccione una teoría...</option>
                                    {theories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                
                                {/* Aquí iría el mapeo de Outcomes/Outputs con sus Indicadores */}
                                <div className="indicator-tree">
                                    <p className="small text-muted italic">Seleccione una teoría para ver sus indicadores disponibles...</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: Detalle y Metas (Lo que pidió María) */}
                    <div className="col-md-7">
                         <div className="card shadow-sm border-0 bg-light-grey">
                            <div className="card-body text-center py-5">
                                <i className="fas fa-mouse-pointer fa-3x text-muted mb-3"></i>
                                <h5>Configurador de Metas</h5>
                                <p className="text-muted">Seleccione un indicador de la izquierda para desglosar sus metas por estado.</p>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectTechnicalSetup;