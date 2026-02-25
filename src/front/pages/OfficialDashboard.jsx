import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from '../components/ContextSelector';
import ExecutionCalendar from "../components/ExecutionCalendar";
import ActivityWizard from "../components/ActivityWizard";
import { toast } from "sonner"; // <--- Corregido a Sonner

export const OfficialDashboard = () => {
    const [activities, setActivities] = useState([]);
    const [context, setContext] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [showModal, setShowModal] = useState(false);

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
            toast.warning("Por favor, selecciona primero un proyecto."); // Sonner funciona así
            return;
        }
        setSelectedActivity(null);
        setSelectedDate(dateStr);
        setShowModal(true);
    };

    const abrirEdicion = (actividad) => {
        setSelectedActivity(actividad);
        setSelectedDate(actividad.period?.start);
        setShowModal(true);
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
                            onActivityClick={abrirEdicion}
                            activities={activities}
                        />

                        {showModal && (
                            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                                <div className="modal-dialog modal-lg modal-dialog-centered">
                                    <ActivityWizard
                                        selectedDate={selectedDate}
                                        proyectoId={context.proyectoId}
                                        initialData={selectedActivity}
                                        onClose={() => {
                                            setShowModal(false);
                                            setSelectedActivity(null);
                                            loadActivities();
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