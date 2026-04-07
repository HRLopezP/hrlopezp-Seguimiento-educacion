import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { apiFetch } from "../../utils/api"

const NotificationBadge = () => {
    const { store } = useGlobalReducer();
    const [counts, setCounts] = useState({ pending_review: 0, rejected: 0, details: [] });
    const role = store.user?.rol_name;

    const fetchCounts = async () => {
        try {
            const resp = await apiFetch(`/notifications/counts`, {
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


    const groupedCompetences = counts.details.reduce((acc, item) => {
        const key = item.competence; // Usamos el nombre de la competencia como clave

        if (!acc[key]) {
            // Si es la primera vez que vemos esta competencia, inicializamos
            acc[key] = {
                name: key,
                pending: 0,
                rejected: 0
            };
        }

        // Sumamos los valores de este item al total de la competencia
        acc[key].pending += (item.pending || 0);
        acc[key].rejected += (item.rejected || 0);

        return acc;
    }, {});

    // Convertimos el objeto de vuelta a un array para poder usar .map()
    const finalDetails = Object.values(groupedCompetences);


    useEffect(() => {
        if (store.token) {
            fetchCounts();
            const interval = setInterval(fetchCounts, 300000);
            return () => clearInterval(interval);
        }
    }, [store.token]);


    const canAudit = ["Monitoreo", "Administrador", "Gerente"].includes(role);
    const hasPending = canAudit && counts.pending_review > 0;
    const hasRejected = counts.rejected > 0;
    const totalNotifications = (hasPending ? counts.pending_review : 0) + (hasRejected ? counts.rejected : 0);

    return (
        <div className="nav-item dropdown d-flex align-items-center mx-2">
            <button
                className="btn btn-link position-relative p-0 border-0 shadow-none"
                data-bs-toggle="dropdown"
                style={{ color: store.theme === 'light' ? 'var(--oxford-grey)' : 'white' }}
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
                            <Link
                                className="dropdown-item py-3 border-bottom d-flex align-items-center gap-3"
                                to="/manager/audit-inbox?tab=En Revisión"
                            >
                                <div className="bg-emerald-green-subtle p-2 rounded-circle">
                                    <i className="fa-solid fa-clipboard-check text-emerald-green"></i>
                                </div>
                                <div>
                                    <p className="mb-0 small fw-bold">Logros por revisar</p>
                                    <small className="text-muted">Hay {counts.pending_review} reportes esperando aprobación.</small>
                                </div>
                            </Link>
                        </li>
                    )}

                    {hasRejected && (
                        <li>
                            <Link
                                className="dropdown-item py-3 border-bottom d-flex align-items-center gap-3"
                                to={canAudit
                                    ? "/manager/audit-inbox?tab=Rechazada"
                                    : "/official/my-activities"}
                                state={{ defaultTab: "Rechazada" }}
                            >
                                <div className="bg-danger-subtle p-2 rounded-circle">
                                    <i className="fa-solid fa-circle-exclamation text-danger"></i>
                                </div>
                                <div>
                                    <p className="mb-0 small fw-bold">Acción Requerida</p>
                                    <small className="text-muted">Tienes {counts.rejected} reportes rechazados.</small>
                                </div>
                            </Link>
                        </li>
                    )}

                    {/* Desglose detallado para el Gerente */}
                    {role === "Gerente" && counts.details?.length > 0 && (() => {
                        // 1. Agrupamos los datos por nombre de competencia
                        const grouped = counts.details.reduce((acc, item) => {
                            const key = item.competence;
                            if (!acc[key]) {
                                acc[key] = { name: key, pending: 0, rejected: 0 };
                            }
                            acc[key].pending += (item.pending || 0);
                            acc[key].rejected += (item.rejected || 0);
                            return acc;
                        }, {});

                        // 2. Convertimos el objeto a un array para poder iterar
                        const finalDetails = Object.values(grouped);

                        return (
                            <div className="bg-light p-2 shadow-sm rounded-bottom">
                                <small className="text-muted px-2 py-1 d-block fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                                    RESUMEN POR ÁREA DE CARGO
                                </small>

                                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                    {finalDetails.map((item, idx) => (
                                        <div key={idx} className="px-3 py-2 border-bottom bg-white mx-1 mb-1 rounded">
                                            <p className="mb-1 fw-bold text-dark" style={{ fontSize: '0.8rem' }}>
                                                <i className="fa-solid fa-layer-group me-2 text-secondary"></i>
                                                {item.name}
                                            </p>
                                            <div className="d-flex gap-2">
                                                {/* Color Azul/Cian para Revisión - Menos alarmante */}
                                                <span className="badge rounded-pill text-dark"
                                                    style={{ fontSize: '0.65rem', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd' }}>
                                                    <i className="fa-solid fa-clock me-1 text-primary"></i>
                                                    {item.pending} En Revisión
                                                </span>

                                                {/* Color Rojo para Rechazadas - Foco de atención */}
                                                <span className="badge rounded-pill text-danger"
                                                    style={{ fontSize: '0.65rem', backgroundColor: '#fee2e2', border: '1px solid #fecaca' }}>
                                                    <i className="fa-solid fa-circle-xmark me-1"></i>
                                                    {item.rejected} Rechazadas
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                    {!hasPending && !hasRejected && (
                        <li className="p-4 text-center">
                            <i className="fa-solid fa-check-double text-muted mb-2 d-block fs-4"></i>
                            <p className="mb-0 small text-muted">¡Todo al día! No hay pendientes.</p>
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