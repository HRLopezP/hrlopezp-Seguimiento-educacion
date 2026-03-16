import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from '../components/ContextSelector';
import ExecutionCalendar from "../components/ExecutionCalendar";
import ProgressSummary from "../components/ProgressSummary";
import { toast } from "sonner";

export const ManagerDashboard = () => {
    const [activeTab, setActiveTab] = useState('planning');
    const [context, setContext] = useState(null);
    const [activities, setActivities] = useState([]);
    const [summaryData, setSummaryData] = useState([]);
    const [loading, setLoading] = useState({ activities: false, summary: false });

    // Estados específicos para la supervisión de múltiples usuarios
    const [selectedUsers, setSelectedUsers] = useState([]);

    // 1. Cargar Actividades (Versión Manager: trae todo lo de la competencia)
    const loadActivities = useCallback(async (ctx) => {
        // Extraemos los IDs directamente del objeto de contexto que recibe la función
        const { proyectoId, competenciaId } = ctx;
        if (!proyectoId || !competenciaId) return;
        setLoading(prev => ({ ...prev, activities: true }));
        try {
            const res = await apiFetch(`/manager/activities?project_id=${proyectoId}&competence_id=${competenciaId}`);
            if (res?.ok) {
                const data = await res.json();
                setActivities(data);
                const users = [...new Set(data.map(a => a.responsible?.id))].filter(Boolean);
                setSelectedUsers(users);
            }
        } catch (error) {
            toast.error("Error al cargar actividades");
        } finally {
            setLoading(prev => ({ ...prev, activities: false }));
        }
    }, []);

    // 2. Cargar Resumen de Progreso (Mismo que el oficial, pero muestra impacto global)
    const loadProgressSummary = useCallback(async (ctx) => {
        // 👨‍🏫 PROFE: Extraemos con los nombres exactos del objeto context
        const { proyectoId, competenciaId } = ctx;

        if (!proyectoId || !competenciaId) return;

        setLoading(prev => ({ ...prev, summary: true }));
        try {
            // 👨‍🏫 PROFE: Usamos exactamente "competenciaId" (con "ia")
            const res = await apiFetch(`/project/${proyectoId}/progress-summary?competence_id=${competenciaId}`);
            if (res?.ok) {
                const data = await res.json();
                setSummaryData(data);
            }
        } catch (error) {
            console.error("Error en summary:", error);
        } finally {
            setLoading(prev => ({ ...prev, summary: false }));
        }
    }, []);

    useEffect(() => {
        if (context?.proyectoId && context?.competenciaId) {
            // Pasamos el objeto context completo a las funciones
            loadActivities(context);
            loadProgressSummary(context);
        }
    }, [context, loadActivities, loadProgressSummary]);

    // 3. Lógica de Filtros (Extraemos responsables únicos de las actividades)
    const availableUsers = useMemo(() => {
        const usersMap = {};
        activities.forEach(act => {
            if (act.responsible) {
                usersMap[act.responsible.id] = act.responsible.full_name;
            }
        });
        return Object.entries(usersMap).map(([id, name]) => ({ id: parseInt(id), name }));
    }, [activities]);

    const filteredActivities = useMemo(() => {
        return activities.filter(act => selectedUsers.includes(act.responsible?.id));
    }, [activities, selectedUsers]);

    const toggleUserFilter = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    return (
        <div className="project-detail-main-container fade-in">
            <div className="container py-4">
                <header className="mb-4 d-flex justify-content-between align-items-center">
                    <div>
                        <h2 className="text-oxford-dynamic fw-bold m-0">Panel de Supervisión</h2>
                        <small className="text-muted">Vista Gerencial - SIGSSEP</small>
                    </div>

                    <div className="btn-group shadow-sm" style={{ borderRadius: '10px', overflow: 'hidden' }}>
                        <button className={`btn ${activeTab === 'planning' ? 'btn-dark' : 'btn-light'}`} onClick={() => setActiveTab('planning')}>
                            <i className="fas fa-calendar-check me-2"></i>Cronograma Global
                        </button>
                        <button className={`btn ${activeTab === 'summary' ? 'btn-dark' : 'btn-light'}`} onClick={() => setActiveTab('summary')}>
                            <i className="fas fa-chart-line me-2"></i>Impacto y Metas
                        </button>
                    </div>
                </header>

                <ContextSelector onContextChange={setContext} />

                {context ? (
                    <div className="row mt-4" style={{ opacity: loading.activities ? 0.6 : 1, transition: 'opacity 0.3s' }}>

                        {activeTab === 'planning' ? (
                            <>
                                {/* Columna de Filtros de Personas */}
                                <div className="col-md-2">
                                    <div className="card shadow-sm border-0 p-3 mb-3" style={{ borderRadius: '15px' }}>
                                        <h6 className="fw-bold mb-3 small text-uppercase">Filtrar Equipo</h6>
                                        {availableUsers.length === 0 && <small className="text-muted">Sin actividades registradas</small>}
                                        {availableUsers.map(user => (
                                            <div key={user.id} className="form-check mb-2">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(user.id)}
                                                    onChange={() => toggleUserFilter(user.id)}
                                                    id={`user-${user.id}`}
                                                />
                                                <label className="form-check-label small cursor-pointer" htmlFor={`user-${user.id}`}>
                                                    {user.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Columna del Calendario */}
                                <div className="col-md-10">
                                    <ExecutionCalendar
                                        activities={filteredActivities}
                                        onActivityClick={(act) => console.log("Inspeccionando actividad:", act)}
                                        isManagerView={true} // <--- ¡MUY IMPORTANTE!
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="col-12 fade-in">
                                {loading.summary ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status"></div>
                                        <p className="mt-2 text-muted">Consolidando datos de la competencia...</p>
                                    </div>
                                ) : (
                                    <ProgressSummary data={summaryData} />
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-5 opacity-50">
                        <i className="fas fa-binoculars fa-3x mb-3 text-oxford-dynamic"></i>
                        <p>Selecciona un proyecto para iniciar la supervisión en tiempo real.</p>
                    </div>
                )}
            </div>
        </div>
    );
};