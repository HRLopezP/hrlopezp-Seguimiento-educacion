import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from '../components/ContextSelector';
import ExecutionCalendar from "../components/ExecutionCalendar";
import ActivityWizard from "../components/ActivityWizard";
import DayManagerModal from "../components/DayManagerModal";
import AchievementTracker from "../components/AchievementTracker";
import ProgressSummary from "../components/ProgressSummary";
import { toast } from "sonner";

export const OfficialDashboard = () => {
    const [activeTab, setActiveTab] = useState('planning'); // 'planning' o 'summary'
    const [summaryData, setSummaryData] = useState([]);
    const [loadingSummary, setLoadingSummary] = useState(false);

    const [activities, setActivities] = useState([]);
    const [context, setContext] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedActivity, setSelectedActivity] = useState(null);

    const [showDayManager, setShowDayManager] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [activitiesInSelectedDate, setActivitiesInSelectedDate] = useState([]);
    const [showTracker, setShowTracker] = useState(false);

    const loadActivities = async () => {
        const res = await apiFetch("/official/activities");
        if (res && res.ok) {
            const data = await res.json();
            setActivities(data);
        }
    };

    useEffect(() => {
        loadActivities();
    }, []);

    const handleContextChange = (newSelection) => {
        setContext(newSelection);
    };

    const handleDateSelect = (dateStr) => {
        if (!context?.proyectoId) {
            toast.warning("Por favor, selecciona primero un proyecto.");
            return;
        }

        // Filtramos las actividades que ya existen en esa fecha
        const existents = activities.filter(act => act.period?.start === dateStr);

        setSelectedDate(dateStr);

        if (existents.length > 0) {
            // Si hay actividades, abrimos el Gestor del Día
            setActivitiesInSelectedDate(existents);
            setShowDayManager(true);
        } else {
            // Si está vacío, abrimos el Wizard directo para crear la primera
            setSelectedActivity(null);
            setShowWizard(true);
        }
    };


    const abrirEdicionDesdeGestor = (actividad) => {
        setSelectedActivity(actividad);
        setShowDayManager(false); // Cerramos gestor
        setShowWizard(true);      // Abrimos wizard
    };

    const abrirTrackerDesdeGestor = (actividad) => {
        setSelectedActivity(actividad);
        setShowDayManager(false); // Cerramos el gestor para que no se amontone
        setShowTracker(true);      // Abrimos el tracker de logros
    };

    const loadProgressSummary = async () => {
        if (!context?.proyectoId) return;
        setLoadingSummary(true);
        const res = await apiFetch(`/project/${context.proyectoId}/progress-summary`);
        if (res && res.ok) {
            const data = await res.json();
            setSummaryData(data);
        }
        setLoadingSummary(false);
    };

    const handleCancelActivity = async (actId, reason) => {
        try {
            const res = await apiFetch(`/official/activities/${actId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    status: 'Cancelada',
                    cancellation_reason: reason
                })
            });

            if (res && res.ok) {
                toast.success("Actividad cancelada correctamente");

                // 1. Recargamos la lista global de actividades
                await loadActivities();

                // 2. Actualizamos la lista local del modal para que el cambio se vea de inmediato
                setActivitiesInSelectedDate(prev =>
                    prev.map(act => act.id === actId
                        ? { ...act, status: 'Cancelada', cancellation_reason: reason }
                        : act
                    )
                );
            } else {
                toast.error("No se pudo cancelar la actividad");
            }
        } catch (error) {
            console.error("Error cancelando:", error);
            toast.error("Error de conexión al cancelar");
        }
    };

    // Efecto para recargar el resumen si cambiamos a esa pestaña
    useEffect(() => {
        if (activeTab === 'summary') {
            loadProgressSummary();
        }
    }, [activeTab, context]);

    return (
        <div className="project-detail-main-container fade-in">
            <div className="container py-4">
                <header className="mb-4">
                    <h2 className="text-oxford-dynamic fw-bold">Panel de Planificación</h2>
                    {/* Switch de Navegación Elegante */}
                    <div className="btn-group shadow-sm" style={{ borderRadius: '10px', overflow: 'hidden' }}>
                        <button
                            className={`btn ${activeTab === 'planning' ? 'btn-oxford' : 'btn-light'}`}
                            onClick={() => setActiveTab('planning')}
                            style={activeTab === 'planning' ? { backgroundColor: '#1B263B', color: 'white' } : {}}
                        >
                            <i className="fas fa-calendar-alt me-2"></i>Planificación
                        </button>
                        <button
                            className={`btn ${activeTab === 'summary' ? 'btn-oxford' : 'btn-light'}`}
                            onClick={() => setActiveTab('summary')}
                            style={activeTab === 'summary' ? { backgroundColor: '#1B263B', color: 'white' } : {}}
                        >
                            <i className="fas fa-chart-pie me-2"></i>Seguimiento
                        </button>
                    </div>
                </header>

                <ContextSelector onContextChange={handleContextChange} />

                {context ? (
                    <div className="mt-4">
                        {activeTab === 'planning' ? (
                            <ExecutionCalendar
                                onDateSelect={handleDateSelect}
                                onActivityClick={(act) => handleDateSelect(act.period?.start)}
                                activities={activities}
                            />
                        ) : (
                            /* AQUÍ ENTRA TU NUEVO COMPONENTE */
                            <div className="fade-in">
                                {loadingSummary ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-emerald" role="status"></div>
                                        <p className="mt-2 text-muted">Calculando avances en tiempo real...</p>
                                    </div>
                                ) : (
                                    <ProgressSummary data={summaryData} />
                                )}
                            </div>
                        )}

                        {/* MODAL 1: GESTOR DEL DÍA (DayManagerModal) */}
                        {showDayManager && (
                            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
                                <div className="modal-dialog modal-md modal-dialog-centered">
                                    <DayManagerModal
                                        selectedDate={selectedDate}
                                        activities={activitiesInSelectedDate}
                                        onClose={() => setShowDayManager(false)}
                                        onEditActivity={abrirEdicionDesdeGestor}
                                        onCancelActivity={handleCancelActivity}
                                        onAddActivity={() => {
                                            setSelectedActivity(null);
                                            setShowDayManager(false);
                                            setShowWizard(true);
                                        }}
                                        onRegisterAchievement={abrirTrackerDesdeGestor}
                                    />
                                </div>
                            </div>
                        )}
                        {/* MODAL 2: CREACIÓN/EDICIÓN (ActivityWizard) */}
                        {showWizard && (
                            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
                                <div className="modal-dialog modal-lg modal-dialog-centered">
                                    <ActivityWizard
                                        selectedDate={selectedDate}
                                        proyectoId={context.proyectoId}
                                        initialData={selectedActivity}
                                        onClose={() => {
                                            setShowWizard(false);
                                            setSelectedActivity(null);
                                        }}
                                        onSaveSuccess={() => {
                                            setShowWizard(false);
                                            setSelectedActivity(null);
                                            loadActivities();
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                        {/* MODAL 3: TRACKER DE LOGROS (Paso 3) */}
                        {showTracker && (
                            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1070 }}>
                                <div className="modal-dialog modal-md modal-dialog-centered">
                                    <AchievementTracker
                                        activity={selectedActivity}
                                        onClose={() => {
                                            setShowTracker(false);
                                            setSelectedActivity(null);
                                        }}
                                        onRefresh={() => {
                                            loadActivities(); // Recarga para ver el cambio de status o barras
                                            handleDateSelect(selectedDate); // Refresca la lista del gestor
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-5 opacity-50">
                        <p>Selecciona una competencia y proyecto para comenzar.</p>
                    </div>
                )}
            </div>
        </div>
    );
};