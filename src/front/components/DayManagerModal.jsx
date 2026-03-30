import React, { useState } from 'react';
import { getStatusData } from "../../utils/statusHelper";
import { ActivityHistoryView } from "./ActivityHistoryView";

const DayManagerModal = ({
    selectedDate,
    activities = [],
    onEditActivity,
    onAddActivity,
    onRegisterAchievement,
    onCancelActivity,
    onDeleteActivity,
    onViewHistory,
    onClose,
    isManagerView = false
}) => {
    const [viewMode, setViewMode] = useState('list');
    const [selectedHistory, setSelectedHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [cancellingId, setCancellingId] = useState(null);
    const [reason, setReason] = useState("");

    const now = new Date();
    const todayStr = new Date().toLocaleDateString('en-CA');

    const formattedDate = selectedDate ? new Date(selectedDate + "T00:00:00").toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) : "";

    const getStatusBadge = (act) => {
        const config = getStatusData(act.status);
        return (
            <span
                className={`badge ${config.badgeClass || ''}`}
                style={config.style || {}}
            >
                {config.label}
            </span>
        );
    };

    const handleEnterHistory = async (act) => {
        setViewMode('history');
        setLoadingHistory(true);
        try {
            const data = await onViewHistory(act);
            setSelectedHistory(data.timeline || []);
        } catch (error) {
            console.error("Error al obtener historial", error);
            setSelectedHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleCancelSubmit = (actId) => {
        if (!reason.trim()) return alert("Por favor, ingresa una razón");
        onCancelActivity(actId, reason);
        setCancellingId(null);
        setReason("");
    };

    return (
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
            {/* Header */}
            <div className="modal-header text-white" style={{ backgroundColor: '#1B263B', padding: '1.2rem' }}>
                <div>
                    <h5 className="modal-title fw-bold mb-0">
                        {isManagerView ? 'Supervisión de Actividades' : 'Gestión de Actividades'}
                    </h5>
                    <small className="text-capitalize" style={{ color: '#10b981' }}>{formattedDate}</small>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>

            {/* Body */}
            <div className="modal-body p-4 bg-light">
                {viewMode === 'history' ? (
                    <ActivityHistoryView
                        history={selectedHistory}
                        loading={loadingHistory}
                        onBack={() => setViewMode('list')}
                    />
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {activities.length === 0 ? (
                            <div className="text-center py-4">
                                <i className="fas fa-calendar-times fa-3x text-muted mb-3 opacity-25"></i>
                                <p className="text-muted">No hay actividades para este día.</p>
                            </div>
                        ) : (
                            activities.map((act) => {
                                const startDate = act.period?.start;
                                const endDate = act.period?.end;
                                const isSingleDay = startDate === endDate;
                                const currentStatus = act.status;
                                const isCancelada = act.status === 'Cancelada';
                                const isAprobada = act.status === 'Aprobada';
                                const isFinalizada = isAprobada || isCancelada;
                                const permiteAcciones = act.status === 'Planificada' || act.status === 'En Progreso' || act.status === 'Vencida' || act.status === 'Rechazada' || act.status === 'En Revisión';

                                return (
                                    <div key={act.id} className="card border-0 shadow-sm transition-hover" style={{ borderRadius: '12px' }}>
                                        <div className="card-body p-3">
                                            {isManagerView && (
                                                <div className="d-flex justify-content-end gap-2 mb-2 border-bottom pb-2">
                                                    <button className="btn btn-sm btn-outline-info border-0" onClick={() => handleEnterHistory(act)}>
                                                        <i className="fas fa-history me-1"></i> <small>Auditoría</small>
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-danger border-0" onClick={() => onDeleteActivity(act.id)}>
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            )}

                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <span className="badge mb-1 bg-dark text-white border">
                                                        {act.indicator?.code || 'IND'}
                                                    </span>
                                                    <h6 className="fw-bold text-dark mb-1">{act.description}</h6>

                                                    <div className={`badge ${isSingleDay ? 'bg-primary' : 'bg-info text-white'} border mb-1`} style={{ fontSize: '0.7rem' }}>
                                                        <i className={`far ${isSingleDay ? 'fa-clock' : 'fa-calendar-alt'} me-1`}></i>
                                                        {isSingleDay ? 'Solo por hoy' : `Rango: ${startDate} al ${endDate}`}
                                                    </div>

                                                    <small className="text-muted d-block mb-1">
                                                        <i className="fas fa-map-marker-alt me-1" style={{ color: '#10b981' }}></i>
                                                        <span className={act.province_name ? "fw-medium text-dark" : "fst-italic opacity-75"}>
                                                            {act.province_name ? `${act.province_name}${act.municipality_name ? ` • ${act.municipality_name}• ${act.parish_name}` : ''}` : 'Ubicación no definida'}
                                                        </span>
                                                    </small>
                                                </div>

                                                <div className="ms-2">
                                                    {getStatusBadge(act)}
                                                </div>
                                            </div>

                                            {/* Lógica de Cancelación */}
                                            {cancellingId === act.id ? (
                                                <div className="bg-light p-2 rounded border border-danger mt-2">
                                                    <label className="small fw-bold text-danger mb-1">Motivo de cancelación:</label>
                                                    <textarea
                                                        className="form-control form-control-sm mb-2"
                                                        rows="2"
                                                        value={reason}
                                                        onChange={(e) => setReason(e.target.value)}
                                                        placeholder="Escribe por qué se cancela..."
                                                    />
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <button className="btn btn-sm btn-light" onClick={() => setCancellingId(null)}>Volver</button>
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleCancelSubmit(act.id)}>Confirmar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <hr className="my-2 opacity-25" />
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div className="d-flex gap-3 align-items-center">
                                                            <div title="Hombres"><i className="fas fa-mars text-primary me-1"></i><span className="small fw-bold">{act.planned?.men || 0}</span></div>
                                                            <div title="Mujeres"><i className="fas fa-venus text-danger me-1"></i><span className="small fw-bold">{act.planned?.women || 0}</span></div>
                                                            <div className="border-start ps-2" title="Total"><span className="small fw-bold" style={{ color: '#10b981' }}>{act.planned?.total || 0}</span></div>
                                                        </div>

                                                        <div className="btn-group gap-1">
                                                            {!isFinalizada && (
                                                                <>
                                                                    {/* Botón Cancelar y Editar: Visibles si permiteAcciones es true */}
                                                                    {permiteAcciones && (
                                                                        <>
                                                                            <button className="btn btn-sm btn-outline-danger border-0" onClick={() => setCancellingId(act.id)} title="Cancelar">
                                                                                <i className="fas fa-ban"></i>
                                                                            </button>
                                                                            <button className="btn btn-sm btn-outline-secondary border-0" onClick={() => onEditActivity(act)} title="Editar">
                                                                                <i className="fas fa-edit"></i>
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {/* Botón Logros (Emerald Green) */}
                                                                    <button
                                                                        className="btn btn-sm text-white ms-2 shadow-sm"
                                                                        style={{ backgroundColor: '#10b981', borderRadius: '8px' }}
                                                                        onClick={() => onRegisterAchievement(act)}
                                                                    >
                                                                        <i className={`fas ${act.status === 'Rechazada'
                                                                                ? 'fa-exclamation-triangle' 
                                                                                : act.status === 'En Revisión'
                                                                                    ? 'fa-edit'             
                                                                                    : 'fa-check-circle'     
                                                                            } me-1`}></i>

                                                                        {/* Texto Dinámico */}
                                                                        {act.status === 'Rechazada'
                                                                            ? 'Corregir'
                                                                            : act.status === 'En Revisión'
                                                                                ? 'Editar Logros'
                                                                                : 'Logros'
                                                                        }
                                                                    </button>
                                                                </>
                                                            )}

                                                            {isAprobada && <span className="text-success small fw-bold"><i className="fas fa-lock me-1"></i> Verificado</span>}
                                                            {act.status === 'Cancelada' && <span className="text-muted small fst-italic">Sin acciones</span>}
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {isCancelada && act.cancellation_reason && (
                                                <div className="mt-2 p-2 bg-secondary bg-opacity-10 rounded border-start border-3 border-secondary">
                                                    <small className="text-muted">
                                                        <strong>Nota:</strong> {act.cancellation_reason}
                                                    </small>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="modal-footer border-0 bg-white d-flex justify-content-between p-3">
                <button className="btn btn-link text-dark fw-bold text-decoration-none" onClick={onClose}>Cerrar</button>
                <button className="btn text-white px-4 shadow" style={{ backgroundColor: '#1B263B', borderRadius: '10px' }} onClick={onAddActivity}>
                    <i className="fas fa-plus me-2"></i> Añadir Indicador
                </button>
            </div>
        </div >
    );
};

export default DayManagerModal;