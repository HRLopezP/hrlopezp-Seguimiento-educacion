import React, { useEffect, useState, useCallback } from "react";
import { toast, Toaster } from "sonner";
import useGlobalReducer from '../hooks/useGlobalReducer';
import { apiFetch } from "../../utils/api";
import OfficialReviewModal from "../components/OfficialReviewModal";
import { useLocation } from "react-router-dom";

const OfficialInbox = () => {
    const { store } = useGlobalReducer();
    const [showModal, setShowModal] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [proyectos, setProyectos] = useState([]);
    const location = useLocation();
    const [currentTab, setCurrentTab] = useState(location.state?.defaultTab || "En Revisión");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [competencias, setCompetencias] = useState([]);

    const [filters, setFilters] = useState({
        proyectoId: '',
        competenciaId: '',
        search_code: ""
    });


    useEffect(() => {
        const loadCompetences = async () => {
            const res = await apiFetch("/competences/list");
            if (res.ok) setCompetencias(await res.json());
        };
        loadCompetences();
    }, []);

    useEffect(() => {
        if (location.state?.defaultTab) {
            setCurrentTab(location.state.defaultTab);
        }
    }, [location.state]);


    // 1. CARGA DE PROYECTOS
    useEffect(() => {
        const loadProjects = async () => {
            const res = await apiFetch("/projects/list");
            if (res.ok) setProyectos(await res.json());
        };
        loadProjects();
    }, []);

    const handleReset = () => {
        setFilters({ proyectoId: '', competenciaId: '', search_code: "" });
        setPage(1);
    };


    // 2. OBTENCIÓN DE DATOS (Espejo de AuditInbox)
    const fetchMyData = useCallback(async () => {
        if (currentTab === "Aprobada" && !filters.proyectoId) {
            setActivities([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({
                status: currentTab,
                page: page,
                per_page: 10,
                search_code: filters.search_code,
                project_id: filters.proyectoId
            });

            const res = await apiFetch(`/my-activities?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                setActivities(result.items || []);
                setTotalPages(result.total_pages || 1);
            }
        } catch (error) {
            toast.error("Error al conectar con el servidor");
        } finally {
            setLoading(false);
        }
    }, [currentTab, page, filters]);

    useEffect(() => { fetchMyData(); }, [fetchMyData]);

    // Manejo de pestañas desde URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get("tab") === "Rechazada") setCurrentTab("Rechazada");
    }, [location]);

    return (
        <div className="management-page-container">
            <Toaster richColors position="top-right" />

            <div className="row mb-4 ms-5">
                <div className="col-12">
                    <h2 className="fw-bold" style={{ color: "var(--oxford-grey)" }}>
                        <i className="fas fa-tasks me-2 text-emerald"></i>
                        Mi Buzón de Actividades
                    </h2>
                    <p className="text-muted">Gestión y seguimiento de mis logros reportados</p>
                </div>
            </div>

            <div className="container mt-4">
                {/* NAVEGACIÓN (IDÉNTICA) */}
                <div className="audit-tabs-container">
                    {[
                        { id: "En Revisión", label: "En Revisión", class: "tab-revision" },
                        { id: "Aprobada", label: "Aprobadas", class: "tab-aprobada" },
                        { id: "Rechazada", label: "Rechazadas", class: "tab-rechazada" }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`audit-tab-btn ${currentTab === tab.id ? `active ${tab.class}` : ""}`}
                            onClick={() => { setCurrentTab(tab.id); setPage(1); }}
                        >
                            <i className={`fas ${tab.id === 'En Revisión' ? 'fa-clock' : tab.id === 'Aprobada' ? 'fa-check-circle' : 'fa-times-circle'} me-2`}></i>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="card shadow-lg border-0">
                    <div className="card-header bg-white p-3 border-bottom">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label small fw-bold text-muted">BÚSQUEDA POR CÓDIGO</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Ej: IND-101"
                                    value={filters.search_code}
                                    onChange={(e) => { setFilters({ ...filters, search_code: e.target.value }); setPage(1); }}
                                />
                            </div>

                            {/* FILTRO COMPETENCIA: Solo visible en Aprobadas */}
                            {currentTab === "Aprobada" && (
                                <div className="col-md-3">
                                    <label className="form-label small fw-bold">Competencia</label>
                                    <select
                                        className="form-select border-azul-marino"
                                        value={filters.competenciaId}
                                        onChange={(e) => setFilters({ ...filters, competenciaId: e.target.value, proyectoId: '' })}
                                    >
                                        <option value="">Todas las competencias</option>
                                        {competencias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                            {/* FILTRO PROYECTO */}
                            <div className="col-md-3">
                                <label className="form-label small fw-bold text-oxford">FILTRAR POR PROYECTO</label>
                                <select
                                    className="form-select border-emerald"
                                    value={filters.proyectoId}
                                    onChange={(e) => { setFilters({ ...filters, proyectoId: e.target.value }); setPage(1); }}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                                </select>
                            </div>

                            {/* BOTÓN LIMPIAR */}
                            <div className="col-md-2">
                                <button className="btn btn-outline-danger w-100" onClick={handleReset}>
                                    <i className="fas fa-eraser me-2"></i> Limpiar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-sigssep align-middle mb-0">
                                <thead>
                                    <tr className="bg-light">
                                        <th className="ps-3">Indicador</th>
                                        <th>Responsable</th>
                                        <th>Proyecto</th>
                                        <th>Competencia</th>
                                        <th>Provincia</th>
                                        <th>Fecha</th>
                                        <th className="text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentTab === "Aprobada" && !filters.proyectoId ? (
                                        <tr><td colSpan="7" className="text-center p-5 text-muted">Selecciona un proyecto para ver tus logros aprobados.</td></tr>
                                    ) : loading ? (
                                        <tr><td colSpan="7" className="text-center p-5"><span className="spinner-border text-emerald"></span></td></tr>
                                    ) : activities.length > 0 ? (
                                        activities.map(act => (
                                            <tr key={act.id}>
                                                <td className="ps-4"><span className="badge bg-success">{act.indicator_code}</span></td>
                                                <td className="fw-medium text-dark">{act.responsible}</td>
                                                <td className="small text-muted">{act.project_name}</td>
                                                <td className="small">{act.competence_name}</td>
                                                <td className="small"><i className="fas fa-map-marker-alt text-danger me-1"></i>{act.province_name}</td>
                                                <td className="small">{act.audit?.created_at ? act.audit.created_at.split(' ')[0] : act.created_at?.split('T')[0]}</td>
                                                <td className="text-center">
                                                    <button
                                                        className="btn-action btn-view"
                                                        onClick={() => { setSelectedActivity(act); setShowModal(true); }}
                                                        style={{ backgroundColor: '#10b981', color: 'white' }}
                                                    >
                                                        <i className="fas fa-eye me-1"></i> Ver
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="7" className="text-center p-5 text-muted">No se encontraron registros.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card-footer bg-white d-flex justify-content-between align-items-center">
                        <span className="small text-muted">Página {page} de {totalPages}</span>
                        <div className="btn-group">
                            <button className="btn btn-outline-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                            <button className="btn btn-outline-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
                        </div>
                    </div>
                </div>
            </div>

            {selectedActivity && (
                <OfficialReviewModal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    activity={selectedActivity}
                    onReviewSuccess={fetchMyData}
                    currentTab={currentTab}
                />
            )}
        </div>
    );
};

export default OfficialInbox;