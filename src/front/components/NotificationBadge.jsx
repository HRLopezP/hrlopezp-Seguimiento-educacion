import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer"; // Usamos tu hook

const NotificationBadge = () => {
    const { store } = useGlobalReducer(); // Accedemos al store global
    const [counts, setCounts] = useState({ pending_review: 0, rejected: 0, details: [] });
    
    // Obtenemos el rol desde el store (según tu lógica de login)
    const role = store.user?.rol_name; 

    const fetchCounts = async () => {
        const API_URL = import.meta.env.VITE_BACKEND_URL;
        try {
            const resp = await fetch(`${API_URL}/api/notifications/counts`, {
                headers: { 
                    "Authorization": `Bearer ${store.token}`,
                    "Content-Type": "application/json"
                }
            });
            if (resp.ok) {
                const data = await resp.json();
                setCounts(data);
            }
        } catch (error) {
            console.error("Error cargando notificaciones:", error);
        }
    };

    useEffect(() => {
        if (store.token) {
            fetchCounts();
            // Actualización automática cada 5 minutos para mantener al usuario al día
            const interval = setInterval(fetchCounts, 300000);
            return () => clearInterval(interval);
        }
    }, [store.token]);

    // Lógica de visibilidad basada en los roles definidos en tu backend
    const hasPending = ["Monitoreo", "Administrador", "Gerente"].includes(role) && counts.pending_review > 0;
    const hasRejected = ["Oficial", "Gerente"].includes(role) && counts.rejected > 0;
    const totalNotifications = (hasPending ? counts.pending_review : 0) + (hasRejected ? counts.rejected : 0);

    return (
        <div className="nav-item dropdown d-flex align-items-center mx-2">
            <button 
                className="btn btn-link position-relative p-0 border-0 shadow-none text-white" 
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                <i className="fa-solid fa-bell fs-5"></i>
                
                {totalNotifications > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" 
                          style={{ fontSize: '0.65rem', border: '2px solid var(--oxford-grey, #343a40)' }}>
                        {totalNotifications}
                    </span>
                )}
            </button>

            <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-3 p-0" 
                style={{ minWidth: '280px', borderRadius: '12px', overflow: 'hidden' }}>
                
                <li className="p-3 border-bottom bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold text-dark small">Notificaciones Operativas</span>
                        <span className="badge bg-secondary-subtle text-secondary small">SIGSSEP</span>
                    </div>
                </li>
                
                <div className="notification-scroll" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {hasPending && (
                        <li>
                            <Link className="dropdown-item py-3 border-bottom d-flex align-items-center gap-3" to="/manager/audit-inbox">
                                <div className="bg-success-subtle p-2 rounded-circle">
                                    <i className="fa-solid fa-clipboard-check text-success"></i>
                                </div>
                                <div className="flex-grow-1">
                                    <p className="mb-0 small fw-bold">Logros por Revisar</p>
                                    <small className="text-muted">Tienes {counts.pending_review} actividades esperando validación.</small>
                                </div>
                            </Link>
                        </li>
                    )}

                    {hasRejected && (
                        <li>
                            <Link className="dropdown-item py-3 border-bottom d-flex align-items-center gap-3" to="/my-activities?status=Rechazada">
                                <div className="bg-danger-subtle p-2 rounded-circle">
                                    <i className="fa-solid fa-circle-exclamation text-danger"></i>
                                </div>
                                <div className="flex-grow-1">
                                    <p className="mb-0 small fw-bold">Acción Requerida</p>
                                    <small className="text-muted">Se han rechazado {counts.rejected} de tus reportes.</small>
                                </div>
                            </Link>
                        </li>
                    )}

                    {/* Desglose detallado para el Gerente [basado en tu lógica de endpoint.py] */}
                    {role === "Gerente" && counts.details?.length > 0 && (
                        <div className="bg-light p-2">
                            <small className="text-muted px-2 py-1 d-block fw-bold" style={{ fontSize: '0.7rem' }}>DETALLE POR COMPETENCIA</small>
                            {counts.details.map((item, idx) => (
                                <div key={idx} className="px-3 py-2 border-bottom">
                                    <p className="mb-1 fw-bold text-dark" style={{ fontSize: '0.8rem' }}>{item.competence}</p>
                                    <div className="d-flex gap-2">
                                        <span className="badge bg-emerald-green" style={{ fontSize: '0.65rem' }}>{item.pending} Rev.</span>
                                        <span className="badge bg-danger" style={{ fontSize: '0.65rem' }}>{item.rejected} Rechz.</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!hasPending && !hasRejected && (
                        <li className="p-4 text-center">
                            <i className="fa-solid fa-check-double text-muted mb-2 d-block fs-4"></i>
                            <p className="mb-0 small text-muted">¡Todo al día, amiguito! No hay pendientes.</p>
                        </li>
                    )}
                </div>
                
                <li className="bg-light p-2 text-center">
                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>SIGSSEP v1.0 - Gestión en Tiempo Real</small>
                </li>
            </ul>
        </div>
    );
};

export default NotificationBadge;