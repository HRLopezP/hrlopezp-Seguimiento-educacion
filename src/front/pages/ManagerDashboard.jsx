import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from '../components/ContextSelector';
import ExecutionCalendar from "../components/ExecutionCalendar";
import ProgressSummary from "../components/ProgressSummary";
import DayManagerModal from "../components/DayManagerModal";
import ActivityWizard from "../components/ActivityWizard";
import AchievementTracker from "../components/AchievementTracker";
import Swal from 'sweetalert2';
import { toast } from "sonner";

export const ManagerDashboard = () => {
    const [activeTab, setActiveTab] = useState('planning');
    const [context, setContext] = useState(null);
    const [activities, setActivities] = useState([]);
    const [summaryData, setSummaryData] = useState([]);
    const [loading, setLoading] = useState({ activities: false, summary: false });
    const [modals, setModals] = useState({
        manager: false,
        wizard: false,
        tracker: false
    });

    const [selectedActivity, setSelectedActivity] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [activityHistory, setActivityHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);

    const filteredActivities = useMemo(() => {
        if (selectedUsers.length === 0) return activities; // Si no hay nadie marcado, mostramos todo o nada (tú decides)
        return activities.filter(act => selectedUsers.includes(act.responsible?.id));
    }, [activities, selectedUsers]);


    const activitiesForThatDay = useMemo(() => {
        if (!selectedDate) return [];
        return filteredActivities.filter(act => {
            // Aseguramos que comparamos peras con peras (asumiendo formato YYYY-MM-DD)
            const dateA = act.implementation_date;
            const dateB = act.period?.start;
            return dateA === selectedDate || dateB === selectedDate;
        });
    }, [filteredActivities, selectedDate]);

    const closeModals = () => {
        setModals({ manager: false, wizard: false, tracker: false });
        setSelectedActivity(null);
        setActivityHistory([]); // ¡Importante limpiar esto!
    };

    const loadActivities = useCallback(async (ctx) => {
        if (!ctx?.proyectoId || !ctx?.competenciaId) return;

        setLoading(prev => ({ ...prev, activities: true }));
        try {
            const res = await apiFetch(`/manager/activities?project_id=${ctx.proyectoId}&competence_id=${ctx.competenciaId}`);
            if (res?.ok) {
                const data = await res.json();
                setActivities(data);

                // Solo inicializamos los usuarios si la lista está vacía (para no resetear el filtro del gerente)
                setSelectedUsers(prev => {
                    if (prev.length > 0) return prev;
                    return [...new Set(data.map(a => a.responsible?.id))].filter(Boolean);
                });
            }
        } catch (error) {
            toast.error("Error al cargar actividades");
        } finally {
            setLoading(prev => ({ ...prev, activities: false }));
        }
    }, []);

    const loadProgressSummary = useCallback(async (ctx) => {
        if (!ctx?.proyectoId || !ctx?.competenciaId) return;
        setLoading(prev => ({ ...prev, summary: true }));
        try {
            const res = await apiFetch(`/project/${ctx.proyectoId}/progress-summary?competence_id=${ctx.competenciaId}`);
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

    const handleCancelActivity = async (actId, reason) => {
        try {
            const res = await apiFetch(`/official/activities/${actId}/cancel`, {
                method: 'PATCH',
                body: JSON.stringify({ cancellation_reason: reason })
            });

            if (res && res.ok) {
                toast.success("Actividad cancelada");

                setActivities(prev => prev.map(act =>
                    act.id === actId
                        ? { ...act, status: 'Cancelada', cancellation_reason: reason }
                        : act
                ));
                closeModals();
            }
        } catch (error) {
            toast.error("Error de conexión");
        }
    };

    const handleDeleteActivity = async (activityId) => {
        const result = await Swal.fire({
            title: '¿Eliminar permanentemente?',
            text: "Esta acción no se puede deshacer y quedará registrada en el log de auditoría del sistema.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#1B263B',
            confirmButtonText: '<i class="fas fa-trash-alt me-2"></i>Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            customClass: {
                popup: 'rounded-4 shadow-lg'
            }
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/manager/activities/${activityId}`, {
                    method: 'DELETE'
                });

                if (res?.ok) {
                    toast.success("Actividad eliminada correctamente");

                    loadActivities(context);
                    loadProgressSummary(context);
                } else {
                    const errorData = await res.json();
                    toast.error(errorData.msg || "No se pudo eliminar la actividad");
                }
            } catch (error) {
                toast.error("Error de conexión al intentar eliminar");
            }
        }
    };

    const handleViewHistory = async (activity) => {
        setLoadingHistory(true);
        try {
            const res = await apiFetch(`/manager/activities/${activity.id}/history`);
            if (res?.ok) {
                const data = await res.json();
                setActivityHistory(data);
                return data;
            }
        } catch (error) {
            toast.error("Error al cargar el historial");
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (context?.proyectoId && context?.competenciaId) {
            loadActivities(context);
            loadProgressSummary(context);
        }
    }, [context?.proyectoId, context?.competenciaId, loadActivities, loadProgressSummary]);

    const availableUsers = useMemo(() => {
        const usersMap = {};
        activities.forEach(act => {
            if (act.responsible) {
                usersMap[act.responsible.id] = act.responsible.full_name;
            }
        });
        return Object.entries(usersMap).map(([id, name]) => ({ id: parseInt(id), name }));
    }, [activities]);

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

                {/* SI HAY CONTEXTO: Mostramos el Dashboard */}
                {context ? (
                    <div className="row mt-4" style={{ opacity: loading.activities ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                        {activeTab === 'planning' ? (
                            <>
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

                                <div className="col-md-10">
                                    <ExecutionCalendar
                                        activities={filteredActivities}
                                        onDateSelect={(date) => {
                                            setSelectedDate(date);
                                            setModals(prev => ({ ...prev, manager: true }));
                                        }}
                                        onActivityClick={(act) => {
                                            setSelectedDate(act.implementation_date || act.period?.start);
                                            setSelectedActivity(act);
                                            setModals(prev => ({ ...prev, manager: true }));
                                        }}
                                        isManagerView={true}
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

                        {/* MODALES */}
                        {modals.manager && (
                            <ModalWrapper onClose={closeModals}>
                                <DayManagerModal
                                    selectedDate={selectedDate}
                                    activities={activitiesForThatDay}
                                    isManagerView={true}
                                    onClose={closeModals}
                                    onDeleteActivity={handleDeleteActivity}
                                    onViewHistory={handleViewHistory}
                                    onCancelActivity={handleCancelActivity}
                                    onEditActivity={(act) => {
                                        setSelectedActivity(act);
                                        setModals({ ...modals, manager: false, wizard: true });
                                    }}
                                    onAddActivity={() => {
                                        setSelectedActivity(null);
                                        setModals({ manager: false, wizard: true });
                                    }}
                                    onRegisterAchievement={(act) => {
                                        setSelectedActivity(act);
                                        setModals({ manager: false, tracker: true });
                                    }}
                                />
                            </ModalWrapper>
                        )}
                        {modals.wizard && (
                            <ModalWrapper size="lg" onClose={closeModals}>
                                <ActivityWizard
                                    selectedDate={selectedDate}
                                    proyectoId={context.proyectoId}
                                    competenciaId={context.competenciaId}
                                    initialData={selectedActivity}
                                    summaryData={summaryData}
                                    onClose={closeModals}
                                    onSaveSuccess={() => {
                                        closeModals();
                                        loadActivities(context);
                                        loadProgressSummary(context);
                                    }}
                                />
                            </ModalWrapper>
                        )}
                        {modals.tracker && (
                            <ModalWrapper onClose={closeModals}>
                                <AchievementTracker
                                    activity={selectedActivity}
                                    onClose={closeModals}
                                    onRefresh={() => {
                                        loadActivities(context);
                                        loadProgressSummary(context);
                                    }}
                                />
                            </ModalWrapper>
                        )}
                    </div>
                ) : (
                    /* SI NO HAY CONTEXTO: Mostramos los binoculares */
                    <div className="text-center py-5 opacity-50">
                        <i className="fas fa-binoculars fa-3x mb-3 text-oxford-dynamic"></i>
                        <p>Selecciona un proyecto para iniciar la supervisión en tiempo real.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const ModalWrapper = ({ children, size = "md", onClose }) => (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }} onClick={onClose}>
        <div className={`modal-dialog modal-${size} modal-dialog-centered`} onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);