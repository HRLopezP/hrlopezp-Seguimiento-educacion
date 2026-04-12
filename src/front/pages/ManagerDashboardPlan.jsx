import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from '../components/ContextSelector';
import ExecutionCalendar from "../components/ExecutionCalendar";
import DayManagerModal from "../components/DayManagerModal";
import ActivityWizard2 from "../components/ActivityWizard2";
import AchievementTracker from "../components/AchievementTracker";
import Swal from 'sweetalert2';
import "../styles/managerDashboard.css"
import { STATUS_CONFIG } from "../../utils/statusHelper"
import { toast } from "sonner";

export const ManagerDashboardPlan = () => {
    const [context, setContext] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState({ activities: false, history: false });
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
    const [selectedProvinces, setSelectedProvinces] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const allStatuses = Object.keys(STATUS_CONFIG);

    const filteredActivities = useMemo(() => {
        return activities.filter(act => {
            const matchesUser = selectedUsers.length === 0 ||
                selectedUsers.includes(act.responsible.id);

            const matchesProvince = selectedProvinces.length === 0 ||
                selectedProvinces.includes(act.province_name);

            const matchesStatus = selectedStatuses.length === 0 ||
                selectedStatuses.includes(act.status);

            return matchesUser && matchesProvince && matchesStatus;
        });
    }, [activities, selectedUsers, selectedProvinces, selectedStatuses]);

    const availableProvinces = useMemo(() => {
        const provinces = activities.map(act => act.province_name);
        return [...new Set(provinces)].filter(Boolean).sort();
    }, [activities]);

    const activitiesForThatDay = useMemo(() => {
        if (!selectedDate) return [];
        return filteredActivities.filter(act => {
            const dateA = act.implementation_date;
            const dateB = act.period?.start;
            return dateA === selectedDate || dateB === selectedDate;
        });
    }, [filteredActivities, selectedDate]);

    const closeModals = () => {
        setModals({ manager: false, wizard: false, tracker: false });
        setSelectedActivity(null);
        setActivityHistory([]);
    };

    const loadActivities = useCallback(async (ctx) => {
        if (!ctx?.proyectoId || !ctx?.competenciaId) return;

        setLoading(prev => ({ ...prev, activities: true }));
        try {
            const res = await apiFetch(`/manager/activities?project_id=${ctx.proyectoId}&competence_id=${ctx.competenciaId}`);
            if (res?.ok) {
                const data = await res.json();
                setActivities(data);

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
        }
    }, [context?.proyectoId, context?.competenciaId, loadActivities]);

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
                        <h2 className="text-oxford-dynamic fw-bold m-0">Panel de Supervisión de Planificación</h2>
                        <small className="text-muted">Vista Gerencial - SIGSSEP</small>
                    </div>
                </header>

                <ContextSelector onContextChange={setContext} />
                {context ? (
                    <div className="row mt-4" style={{ opacity: loading.activities ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                        <div className="col-md-2">
                            {/* Filtro por usuario */}
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
                            {/* Filtro por status */}
                            <div className="accordion-item border-0 mb-4">
                                <h2 className="accordion-header" id="headingStatus">
                                    <button className="accordion-button ps-3 py-2 shadow-none bg-white text-dark fw-bold small text-uppercase collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseStatus" aria-expanded="false" aria-controls="collapseStatus">
                                        <i className="fas fa-tasks me-2 text-muted"></i>Estatus
                                    </button>
                                </h2>
                                <div id="collapseStatus" className="accordion-collapse collapse" aria-labelledby="headingStatus" data-bs-parent="#filtersAccordion">
                                    <div className="accordion-body ps-3 pt-1 pb-3">
                                        {allStatuses.map(status => {
                                            const config = STATUS_CONFIG[status];
                                            return (
                                                <div key={status} className="form-check mb-1 d-flex align-items-center">
                                                    <input
                                                        className="form-check-input me-2"
                                                        type="checkbox"
                                                        checked={selectedStatuses.includes(status)}
                                                        onChange={() => {
                                                            setSelectedStatuses(prev =>
                                                                prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
                                                            );
                                                        }}
                                                        id={`status-${status}`}
                                                    />
                                                    {/* PUNTITO: Usamos el color de tu helper */}
                                                    <span
                                                        className="rounded-circle me-2"
                                                        style={{
                                                            width: '10px',
                                                            height: '10px',
                                                            backgroundColor: config.calendarColor,
                                                            border: `1px solid ${config.textColor}44` // Un borde muy suave del mismo tono
                                                        }}
                                                    ></span>
                                                    <label className="form-check-label small cursor-pointer flex-grow-1" htmlFor={`status-${status}`}>
                                                        {status}
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            {/* Filtro por provincias */}
                            <div className="col-md-12">
                                <label className="small fw-bold text-muted mb-2 d-block">Provincias con Actividad</label>
                                <div className="d-flex flex-wrap border rounded p-2 bg-white mb-2" style={{ minHeight: '42px' }}>
                                    {selectedProvinces.length === 0 && (
                                        <span className="text-muted small p-1">Todas las provincias</span>
                                    )}
                                    {selectedProvinces.map(prov => (
                                        <span
                                            key={prov}
                                            className="filter-chip"
                                            onClick={() => setSelectedProvinces(prev => prev.filter(p => p !== prov))}
                                        >
                                            {prov} <i className="fas fa-times"></i>
                                        </span>
                                    ))}
                                </div>
                                {/* Lista desplegable simple para seleccionar */}
                                <select
                                    className="form-select form-select-sm shadow-none"
                                    value=""
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val && !selectedProvinces.includes(val)) {
                                            setSelectedProvinces([...selectedProvinces, val]);
                                        }
                                    }}
                                >
                                    <option value="" disabled>Agregar provincia...</option>
                                    {availableProvinces.map(prov => (
                                        <option
                                            key={prov}
                                            value={prov}
                                            disabled={selectedProvinces.includes(prov)}
                                        >
                                            {prov} {selectedProvinces.includes(prov) ? '✓' : ''}
                                        </option>
                                    ))}
                                </select>
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
                                <ActivityWizard2
                                    selectedDate={selectedDate}
                                    proyectoId={context.proyectoId}
                                    competenciaId={context.competenciaId}
                                    initialData={selectedActivity}
                                    onClose={closeModals}
                                    onSaveSuccess={() => {
                                        closeModals();
                                        loadActivities(context);
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