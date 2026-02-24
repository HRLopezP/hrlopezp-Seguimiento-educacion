import React, { useState } from 'react';
import ContextSelector from '../components/ContextSelector';

export const OfficialDashboard = () => {
    const [contexto, setContexto] = useState(null);

    const handleContextChange = (nuevoContexto) => {
        console.log("Contexto Global Actualizado:", nuevoContexto);
        setContexto(nuevoContexto);
        // Aquí es donde más adelante dispararemos la carga del calendario
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
                {contexto ? (
                    <div className="fade-in mt-4">
                        <div className="summary-box-emerald p-3 rounded shadow-sm">
                            <i className="fas fa-info-circle me-2"></i>
                            Has seleccionado el proyecto <strong>ID: {contexto.proyectoId}</strong>. 
                            Ahora puedes proceder a planificar tus actividades.
                        </div>
                        {/* AQUÍ IRÁ EL FULLCALENDAR PRÓXIMAMENTE */}
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