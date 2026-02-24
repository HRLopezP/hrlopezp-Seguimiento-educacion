import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from '../components/ContextSelector';
import ExecutionCalendar from "../components/ExecutionCalendar";
import ActivityWizard from "../components/ActivityWizard";

export const OfficialDashboard = () => {
    const [activities, setActivities] = useState([]);
    const [context, setContext] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const handleContextChange = (newSelection) => {
        setContext(newSelection);
    };


    const loadActivities = async () => {
        const res = await apiFetch("/official/activities");
        if (res && res.ok) {
            const data = await res.json();
            setActivities(data);
        }
    };

    // Cargar al inicio
    useEffect(() => {
        loadActivities();
    }, []);

    // Esta es la función que pasamos al Calendario
    const handleDateSelect = (dateStr) => {
        if (!context?.proyectoId) {
            toast.warning("Por favor, selecciona primero un proyecto en el selector superior.");
            return;
        }
        setSelectedActivity(null);
        setSelectedDate(dateStr);
        setShowModal(true);
    };


    const handleActivitySelect = (activity) => {
        setSelectedActivity(activity);
        setSelectedDate(activity.period.start); // Usamos la fecha de inicio de la actividad
        setShowModal(true);
    };

    return (
        <div className="project-detail-main-container fade-in">
            <div className="container py-4">
                <header className="mb-4">
                    <h2 className="text-oxford-dynamic fw-bold">Panel de Planificación</h2>
                    <p className="text-muted-dynamic">Selecciona tu contexto de trabajo para comenzar</p>
                </header>

                {/* Invocamos nuestro selector */}
                <ContextSelector onContextChange={handleContextChange} />

                {/* Área de trabajo que reacciona al contexto */}
                {context ? (
                    <div className="fade-in mt-4">
                        <div className="summary-box-emerald p-3 rounded shadow-sm">
                            <i className="fas fa-info-circle me-2"></i>
                            Has seleccionado el proyecto <strong>ID: {context.proyectoId}</strong>.
                            Ahora puedes proceder a planificar tus actividades.
                        </div>
                        {/* 2. El Calendario */}
                        <div className="mt-4">
                            <ExecutionCalendar
                                onDateSelect={handleDateSelect}
                                onActivitySelect={handleActivitySelect}
                                activities={activities}
                            />
                        </div>
                        {/* 3. El Modal del Wizard (Condicional) */}
                        {showModal && (
                            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
                        <i className="fas fa-mouse-pointer fa-3x mb-3 text-emerald"></i>
                        <p>Por favor, selecciona una competencia y un proyecto para habilitar las herramientas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};