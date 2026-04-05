import React, { useEffect, useState } from "react";
import useGlobalReducer from '../hooks/useGlobalReducer';
import OfficialReviewModal from "../components/OfficialReviewModal";
import AchievementTracker from "../components/AchievementTracker";
import { useLocation } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { toast, Toaster } from "sonner";

const OfficialInbox = () => {
    const { store } = useGlobalReducer();
    const [activities, setActivities] = useState([]);
    const [currentTab, setCurrentTab] = useState("En Revisión");
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [loading, setLoading] = useState(false);
    const location = useLocation();

    const fetchMyActivities = async () => {
        setLoading(true);
        try {
            const resp = await apiFetch(`/my-activities?status=${currentTab}`);
            if (resp.ok) {
                const data = await resp.json();
                setActivities(data);
            } else {
                toast.error("No se pudieron cargar tus logros.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");

        if (tab === "Rechazada") {
            setCurrentTab("Rechazada");
        } else {
            // Opcional: si quieres que por defecto siempre sea En Revisión 
            // cuando no hay parámetros en la URL
            setCurrentTab("En Revisión");
        }
    }, [location]);


    const handleOpenDetail = (act) => {
        setSelectedActivity(act);
        setShowDetail(true);
    };

    const handleOpenEdit = (act) => {
        setSelectedActivity(act);
        setShowDetail(false); // Cerramos el detalle
        setShowEdit(true);    // Abrimos el editor (AchievementTracker)
    };

    useEffect(() => {
        // Si venimos del Navbar con ?status=Rechazada, cambiamos la pestaña automáticamente
        const params = new URLSearchParams(location.search);
        const statusParam = params.get("status");
        if (statusParam) {
            setCurrentTab(statusParam);
        }
    }, [location]);

    return (
        <div className="container mt-4">
            <h4 className="text-oxford mb-4">Mi Bandeja de Logros</h4>

            {/* Nav Tabs similares a AuditInbox */}
            <ul className="nav nav-tabs mb-3">
                {["En Revisión", "Rechazada", "Aprobada"].map(tab => (
                    <li className="nav-item" key={tab}>
                        <button
                            className={`nav-link ${currentTab === tab ? 'active fw-bold' : ''}`}
                            onClick={() => setCurrentTab(tab)}
                        >
                            {tab}
                        </button>
                    </li>
                ))}
            </ul>

            {/* Tabla de Resultados */}
            <div className="card shadow-sm border-0">
                <table className="table align-middle">
                    <thead className="bg-light">
                        <tr>
                            <th>Código</th>
                            <th>Descripción</th>
                            <th>Fecha</th>
                            <th className="text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activities.map(act => (
                            <tr key={act.id_activity}>
                                <td><span className="badge bg-secondary">{act.indicator?.code}</span></td>
                                <td className="small">{act.description}</td>
                                <td>{act.implementation_date}</td>
                                <td className="text-center">
                                    <button className="btn btn-sm btn-outline-primary" onClick={() => handleOpenDetail(act)}>
                                        <i className="fa-solid fa-eye me-1"></i> Ver
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODALES */}
            {selectedActivity && (
                <>
                    <OfficialReviewModal
                        show={showDetail}
                        onHide={() => setShowDetail(false)}
                        activity={selectedActivity}
                        currentTab={currentTab}
                        onEditClick={handleOpenEdit}
                    />

                    {showEdit && (
                        <div className="modal show d-block" tabIndex="-1">
                            <div className="modal-dialog modal-lg shadow-lg">
                                <div className="modal-content">
                                    <AchievementTracker
                                        activity={selectedActivity}
                                        onClose={() => setShowEdit(false)}
                                        onRefresh={() => {
                                            setShowEdit(false);
                                            fetchMyActivities();
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default OfficialInbox;