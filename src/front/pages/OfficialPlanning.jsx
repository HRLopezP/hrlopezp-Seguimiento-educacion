import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from '../components/ContextSelector';
import ExecutionCalendar from "../components/ExecutionCalendar";
import ActivityWizard2 from "../components/ActivityWizard2";
import DayManagerModal from "../components/DayManagerModal";
import AchievementTracker from "../components/AchievementTracker";
import { toast } from "sonner";

export const OfficialPlanning = () => {
    const [context, setContext] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [modals, setModals] = useState({ manager: false, wizard: false, tracker: false });

    const loadActivities = useCallback(async (proyectoId, competenciaId) => {
        if (!proyectoId || !competenciaId) {
            setActivities([]);
            return;
        }
        setLoading(prev => ({ ...prev, activities: true }));
        try {
            const res = await apiFetch(`/official/activities?project_id=${proyectoId}&competence_id=${competenciaId}`);
            if (res?.ok) {
                const data = await res.json();
                setActivities(data);
            }
        } catch (error) {
            toast.error("Error al cargar actividades");
        } finally {
            setLoading(prev => ({ ...prev, activities: false }));
        }
    }, []);

    useEffect(() => {
        if (context?.proyectoId && context?.competenciaId) {
            loadActivities(context.proyectoId, context.competenciaId);
        } else {
            setActivities([]);
        }
    }, [context?.proyectoId, context?.competenciaId, loadActivities,]);


    const activitiesInSelectedDate = useMemo(() => {
        return activities.filter(act => act.period?.start === selectedDate);
    }, [activities, selectedDate]);



    const handleDateSelect = (dateStr) => {
        if (!context?.proyectoId) return toast.warning("Selecciona primero un proyecto.");

        setSelectedDate(dateStr);
        const existents = activities.filter(act => act.period?.start === dateStr);

        if (existents.length > 0) {
            setModals(prev => ({ ...prev, manager: true }));
        } else {
            setSelectedActivity(null);
            setModals(prev => ({ ...prev, wizard: true }));
        }
    };

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


    const closeModals = () => {
        setModals({ manager: false, wizard: false, tracker: false });
        setSelectedActivity(null);
    };

    return (
        <div className="project-detail-main-container fade-in">
            <div className="container py-4">
                <header className="mb-4">
                    <h2 className="text-oxford-dynamic fw-bold m-0">Panel de Planificación</h2>
                </header>

                <ContextSelector onContextChange={setContext} />

                {context ? (
                    <div className="mt-4" style={{
                        opacity: loading.activities ? 0.5 : 1,
                        transition: 'opacity 0.3s ease',
                        pointerEvents: loading.activities ? 'none' : 'auto'
                    }}>
                        <ExecutionCalendar
                            onDateSelect={handleDateSelect}
                            onActivityClick={(act) => handleDateSelect(act.period?.start)}
                            activities={activities}
                        />
                        {/* Modales: Manager, Wizard y Tracker se mantienen aquí para la gestión de días */}
                        {modals.manager && (
                            <ModalWrapper onClose={closeModals}>
                                <DayManagerModal
                                    selectedDate={selectedDate}
                                    activities={activitiesInSelectedDate}
                                    onClose={closeModals}
                                    onEditActivity={(act) => { setSelectedActivity(act); setModals({ manager: false, wizard: true }); }}
                                    onCancelActivity={handleCancelActivity}
                                    onRegisterAchievement={(act) => { setSelectedActivity(act); setModals({ manager: false, tracker: true }); }}
                                    onAddActivity={() => { setSelectedActivity(null); setModals({ manager: false, wizard: true }); }}
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
                                    onSaveSuccess={() => { closeModals(); loadActivities(context.proyectoId, context.competenciaId); }}
                                />
                            </ModalWrapper>
                        )}
                        {modals.tracker && (
                            <ModalWrapper onClose={closeModals}>
                                <AchievementTracker
                                    activity={selectedActivity}
                                    onClose={closeModals}
                                    onRefresh={() => loadActivities(context.proyectoId, context.competenciaId)}
                                />
                            </ModalWrapper>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-5 opacity-50">
                        <i className="fas fa-calendar-check fa-3x mb-3"></i>
                        <p>Selecciona contexto para planificar tus actividades.</p>
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