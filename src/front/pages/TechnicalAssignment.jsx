import React, { useEffect, useState, useCallback } from "react";
import { toast, Toaster } from "sonner";
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import { useParams, useNavigate } from "react-router-dom"; // Añadimos useNavigate
import "../styles/management.css";

const TechnicalAssignment = () => {
    const { id } = useParams(); // ID del proyecto desde la URL
    const navigate = useNavigate();

    const [theories, setTheories] = useState([]);
    const [selectedTheory, setSelectedTheory] = useState(null);
    const [selectedIndicators, setSelectedIndicators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userCompetenceId, setUserCompetenceId] = useState(null);

    // 1. Obtener la competencia del usuario actual (Gerente)
    // Amiguito, aquí podrías sacar esto de tu Global State o JWT
    useEffect(() => {
        const getMyCompetence = async () => {
            try {
                const res = await apiFetch("/user/profile");
                if (res?.ok) {
                    const data = await res.json();
                    console.log("Datos del perfil:", data);

                    // Ajuste basado en tu consola: data.competences es un Array
                    if (data.competences && data.competences.length > 0) {
                        // Tomamos el ID de la primera competencia disponible
                        const firstCompId = data.competences[0].id;
                        setUserCompetenceId(firstCompId);
                        // No pongas setLoading(false) aquí, deja que fetchCatalog lo haga
                    } else {
                        toast.error("El usuario no tiene competencias asignadas en su perfil");
                        setLoading(false);
                    }
                } else {
                    setLoading(false);
                }
            } catch (error) {
                toast.error("Error al conectar con el perfil");
                setLoading(false);
            }
        };
        getMyCompetence();
    }, []);

    // 2. Cargar teorías filtradas (Solo cuando tengamos el userCompetenceId)
    const fetchCatalog = useCallback(async () => {
        if (!userCompetenceId) return;

        try {
            setLoading(true);
            const res = await apiFetch(`/competence/${userCompetenceId}/theories`);
            if (res?.ok) {
                const data = await res.json();
                setTheories(data);
            }
        } catch (error) {
            toast.error("Error al cargar el catálogo técnico");
        } finally {
            setLoading(false);
        }
    }, [userCompetenceId]);

    useEffect(() => {
        fetchCatalog();
    }, [fetchCatalog]);

    // 3. Lógica de Checkboxes (Impecable como la tenías)
    const handleCheckIndicator = (indId) => {
        setSelectedIndicators(prev =>
            prev.includes(indId) ? prev.filter(item => item !== indId) : [...prev, indId]
        );
    };

    // 4. Guardar (Usando tus colores Oxford y Esmeralda)
    const handleSavePlan = async () => {
        if (!selectedTheory || selectedIndicators.length === 0) {
            return toast.warning("Selecciona una teoría y al menos un indicador");
        }

        const result = await Swal.fire({
            title: '<span style="color: #1B263B">¿Confirmar Plan Técnico?</span>',
            html: `Se vincularán <b>${selectedIndicators.length}</b> indicadores a este proyecto.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#1B263B',
            confirmButtonText: '<i class="fas fa-check-circle me-2"></i>Sí, asignar',
            cancelButtonText: 'Revisar',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            customClass: {
                popup: 'role-modal-custom-swal'
            }
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/project/${id}/assign-technical-data`, {
                    method: "POST",
                    body: JSON.stringify({
                        competence_id: userCompetenceId,
                        theory_id: selectedTheory.id,
                        indicator_ids: selectedIndicators
                    })
                });

                if (res?.ok) {
                    toast.success("Estructura técnica vinculada con éxito");
                    // Pequeño delay para que el usuario vea el éxito antes de irse
                    setTimeout(() => navigate(`/manager/projects/${id}`), 2000);
                }
            } catch (error) {
                toast.error("Error de conexión al guardar");
            }
        }
    };

    if (loading && !theories.length) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
            <div className="spinner-border text-success" role="status"></div>
        </div>
    );

    return (
        <div className="management-page-container">
            <Toaster richColors position="top-right" />
            <div className="container mt-4">
                <div className="card management-card-unified shadow-lg">
                    <div className="management-card-header bg-oxford">
                        <div className="text-start">
                            <h2 className="management-title text-white">Planificación Técnica</h2>
                            <p className="management-subtitle text-white-50">Configura los indicadores de impacto para este proyecto</p>
                        </div>
                    </div>

                    <div className="card-body p-4">
                        <div className="mb-4">
                            <label className="swal2-input-label mb-2">Teoría de Cambio Base</label>
                            <select
                                className="form-select role-modal-input"
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

                        {selectedTheory ? (
                            <div className="results-list animate__animated animate__fadeIn">
                                {selectedTheory.results?.map(res => (
                                    <div key={res.id} className="result-group mb-4 p-3 rounded bg-light-grey">
                                        <h5 className="text-oxford fw-bold border-bottom pb-2">
                                            <i className={`fas ${res.type === 'outcome' ? 'fa-crosshairs' : 'fa-clipboard-check'} me-2`}></i>
                                            {res.name}
                                            <span className={`ms-2 badge ${res.type === 'outcome' ? 'bg-primary' : 'bg-info'}`}>
                                                {res.type.toUpperCase()}
                                            </span>
                                        </h5>
                                        <div className="ms-3 mt-3">
                                            {res.indicators?.map(ind => (
                                                <div key={ind.id} className="form-check custom-checkbox-sigssep mb-2">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id={`ind-${ind.id}`}
                                                        checked={selectedIndicators.includes(ind.id)}
                                                        onChange={() => handleCheckIndicator(ind.id)}
                                                    />
                                                    <label className="form-check-label ms-2" htmlFor={`ind-${ind.id}`}>
                                                        <span className="fw-bold text-emerald">{ind.code}</span> — {ind.description}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-5 text-muted border rounded dashed">
                                <i className="fas fa-sitemap fa-3x mb-3 opacity-25"></i>
                                <p>Por favor, selecciona una teoría para desplegar sus indicadores.</p>
                            </div>
                        )}

                        <div className="card-footer bg-transparent border-0 text-end">
                            <button className="btn-action btn-activate px-5" onClick={handleSavePlan}>
                                <i className="fas fa-save me-2"></i>Vincular al Proyecto
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TechnicalAssignment;