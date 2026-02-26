import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from '../components/ContextSelector';
import ExecutionCalendar from "../components/ExecutionCalendar";
import ActivityWizard from "../components/ActivityWizard";
import DayManagerModal from "../components/DayManagerModal";
import AchievementTracker from "../components/AchievementTracker";
import { toast } from "sonner"; // <--- Corregido a Sonner

export const OfficialDashboard = () => {
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

    return (
        <div className="project-detail-main-container fade-in">
            <div className="container py-4">
                <header className="mb-4">
                    <h2 className="text-oxford-dynamic fw-bold">Panel de Planificación</h2>
                </header>

                <ContextSelector onContextChange={handleContextChange} />

                {context ? (
                    <div className="mt-4">
                        <ExecutionCalendar
                            onDateSelect={handleDateSelect}
                            onActivityClick={(act) => handleDateSelect(act.period?.start)} // <--- PROFE: Unificamos a handleDateSelect
                            activities={activities}
                        />

                        {/* MODAL 1: GESTOR DEL DÍA (DayManagerModal) */}
                        {showDayManager && (
                            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
                                <div className="modal-dialog modal-md modal-dialog-centered">
                                    <DayManagerModal
                                        selectedDate={selectedDate}
                                        activities={activitiesInSelectedDate}
                                        onClose={() => setShowDayManager(false)}
                                        onEditActivity={abrirEdicionDesdeGestor}
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
                                            loadActivities();
                                            // Opcional: Volver al gestor del día para ver los cambios
                                            handleDateSelect(selectedDate);
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