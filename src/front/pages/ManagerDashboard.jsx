import React, { useState, useEffect } from 'react';
import ContextSelector from '../components/ContextSelector';
import ExecutionCalendar from '../components/ExecutionCalendar';
import { apiFetch } from "../../utils/api";

const ManagerDashboard = () => {
    const [context, setContext] = useState(null);
    const [activities, setActivities] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]); // Filtro de personas
    const [allUsers, setAllUsers] = useState([]); // Para el panel lateral

    // 1. Cargar todas las actividades (Manager View)
    const loadManagerData = async (ctx) => {
        const query = `/manager/activities?project_id=${ctx.proyectoId}&competence_id=${ctx.competenciaId}`;
        const res = await apiFetch(query);
        if (res && res.ok) {
            const data = await res.json();
            setActivities(data);
            
            // Extraer lista única de responsables para los filtros
            const users = [...new Set(data.map(a => JSON.stringify(a.responsible)))].map(s => JSON.parse(s));
            setAllUsers(users);
            setSelectedUsers(users.map(u => u.id)); // Por defecto, todos seleccionados
        }
    };

    // Filtrar actividades según los usuarios seleccionados en el panel lateral
    const filteredActivities = activities.filter(act => 
        selectedUsers.includes(act.responsible.id)
    );

    return (
        <div className="container-fluid py-4">
            <h2 className="text-oxford-dynamic fw-bold mb-4">Supervisión de Competencia</h2>
            
            <ContextSelector onContextChange={(ctx) => { setContext(ctx); loadManagerData(ctx); }} />

            {context && (
                <div className="row">
                    {/* PANEL LATERAL DE FILTROS */}
                    <div className="col-md-2">
                        <div className="card shadow-sm p-3 border-0 rounded-4">
                            <h6 className="uppercase-label text-muted mb-3">Responsables</h6>
                            {allUsers.map(user => (
                                <div key={user.id} className="form-check mb-2">
                                    <input 
                                        className="form-check-input" 
                                        type="checkbox" 
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={() => {
                                            setSelectedUsers(prev => 
                                                prev.includes(user.id) 
                                                ? prev.filter(id => id !== user.id) 
                                                : [...prev, user.id]
                                            );
                                        }}
                                    />
                                    <label className="form-check-label small">
                                        {user.full_name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CALENDARIO MAESTRO */}
                    <div className="col-md-10">
                        <ExecutionCalendar 
                            activities={filteredActivities} 
                            onActivityClick={(act) => console.log("Abrir historial de:", act.id)}
                            // PROFE: Aquí viene el truco del nombre
                            isManagerView={true} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};