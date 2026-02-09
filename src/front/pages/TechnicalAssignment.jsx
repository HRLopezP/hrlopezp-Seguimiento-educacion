import React, { useEffect, useState, useCallback } from "react";
import { toast, Toaster } from "sonner";
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/management.css";

const TechnicalAssignment = () => {
    const { id } = useParams(); 
    const navigate = useNavigate();

    // ESTADOS
    const [theories, setTheories] = useState([]);
    const [selectedTheory, setSelectedTheory] = useState(null);
    const [selectedIndicators, setSelectedIndicators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userCompetenceId, setUserCompetenceId] = useState(null);
    const [project, setProject] = useState(null);

    // 1. Cargar datos del Proyecto y Perfil en paralelo
    useEffect(() => {
        const initData = async () => {
            try {
                setLoading(true);
                // Traemos perfil y proyecto al mismo tiempo
                const [profileRes, projectRes] = await Promise.all([
                    apiFetch("/user/profile"),
                    apiFetch(`/project/${id}`)
                ]);

                if (profileRes?.ok && projectRes?.ok) {
                    const profileData = await profileRes.json();
                    const projectData = await projectRes.json();

                    setProject(projectData);

                    if (profileData.competences?.length > 0) {
                        setUserCompetenceId(profileData.competences[0].id);
                    } else {
                        toast.error("No tienes competencias asignadas.");
                    }
                }
            } catch (error) {
                toast.error("Error al inicializar datos");
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, [id]);

    // 2. Cargar teorías cuando tengamos la competencia
    useEffect(() => {
        if (!userCompetenceId) return;
        
        const fetchTheories = async () => {
            const res = await apiFetch(`/competence/${userCompetenceId}/theories`);
            if (res?.ok) {
                const data = await res.json();
                setTheories(data);
            }
        };
        fetchTheories();
    }, [userCompetenceId]);

    // 3. Lógica de Selección (Aquí corregimos el error de la imagen)
    const handleCheckIndicator = (indTemplate) => {
        // Validación de seguridad: Si el proyecto no ha cargado, no hacemos nada
        if (!project || !project.locations) {
            return toast.error("Cargando locaciones del proyecto...");
        }

        const isSelected = selectedIndicators.some(i => i.template_id === indTemplate.id);

        if (isSelected) {
            setSelectedIndicators(prev => prev.filter(i => i.template_id !== indTemplate.id));
        } else {
            // Creamos el objeto con las provincias reales del proyecto
            const newEntry = {
                template_id: indTemplate.id,
                code: indTemplate.code,
                description: indTemplate.description,
                province_goals: project.locations.map(loc => ({
                    province_id: loc.id_location,
                    province_name: loc.province,
                    total: 0,
                    men: 0,
                    women: 0
                }))
            };
            setSelectedIndicators(prev => [...prev, newEntry]);
        }
    };

    const handleSavePlan = async () => {
        if (!selectedTheory || selectedIndicators.length === 0) {
            return toast.warning("Selecciona una teoría y al menos un indicador");
        }

        const result = await Swal.fire({
            title: '¿Confirmar Plan Técnico?',
            text: `Se vincularán ${selectedIndicators.length} indicadores.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981', // Emerald
            cancelButtonColor: '#1B263B',  // Oxford
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/indicators/bulk`, {
                    method: "POST",
                    body: JSON.stringify({
                        project_id: parseInt(id),
                        indicators: selectedIndicators
                    })
                });

                if (res?.ok) {
                    toast.success("¡Planificación técnica guardada!");
                    setTimeout(() => navigate(`/manager/projects/${id}`), 1500);
                }
            } catch (error) {
                toast.error("Error al guardar");
            }
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
            <div className="spinner-border text-success" role="status"></div>
        </div>
    );

    return (
        <div className="management-page-container">
            <Toaster richColors position="top-right" />
            <div className="container mt-4">
                <div className="card management-card-unified shadow-lg">
                    <div className="management-card-header bg-oxford">
                        <h2 className="management-title text-white">Planificación Técnica</h2>
                        <p className="text-white-50">Proyecto: {project?.name || "Cargando..."}</p>
                    </div>

                    <div className="card-body p-4">
                        <div className="mb-4">
                            <label className="fw-bold mb-2">Teoría de Cambio Base</label>
                            <select
                                className="form-select"
                                onChange={(e) => {
                                    const theory = theories.find(t => t.id === parseInt(e.target.value));
                                    setSelectedTheory(theory);
                                    setSelectedIndicators([]);
                                }}
                            >
                                <option value="">Selecciona la ruta lógica...</option>
                                {theories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        {selectedTheory && (
                            <div className="results-list animate__animated animate__fadeIn">
                                {selectedTheory.results?.map(res => (
                                    <div key={res.id} className="result-group mb-4 p-3 rounded bg-light border-start border-4 border-success">
                                        <h5 className="text-oxford fw-bold">{res.name}</h5>
                                        <div className="ms-3">
                                            {res.indicators?.map(ind => (
                                                <div key={ind.id} className="form-check mb-2">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id={`ind-${ind.id}`}
                                                        checked={selectedIndicators.some(i => i.template_id === ind.id)}
                                                        onChange={() => handleCheckIndicator(ind)}
                                                    />
                                                    <label className="form-check-label ms-2" htmlFor={`ind-${ind.id}`}>
                                                        <span className="text-emerald fw-bold">{ind.code}</span> - {ind.description}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="text-end mt-4">
                            <button className="btn btn-emerald px-5 py-2 fw-bold shadow" onClick={handleSavePlan}>
                                <i className="fas fa-save me-2"></i>GUARDAR PLANIFICACIÓN
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TechnicalAssignment;