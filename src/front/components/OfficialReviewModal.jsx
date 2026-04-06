import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge, Spinner } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/roleManagement.css";
import AchievementTracker from "./AchievementTracker"; 

const OfficialReviewModal = ({ show, onHide, activity, onReviewSuccess, currentTab }) => {
    const [isEditing, setIsEditing] = useState(false);
    
    // Mantenemos TODA la lógica de datos original
    const currentAchievement = activity?.achievements_history?.[activity.achievements_history.length - 1];
    const isOutcome = activity?.indicator?.type === 'Outcome';
    const progress = currentAchievement?.real_progress || {};

    const calculatePercentage = () => {
        if (!progress.attended || progress.attended === 0) return 0;
        return Math.round((progress.approved * 100) / progress.attended);
    };

    // Resetear el modo edición al abrir
    useEffect(() => {
        if (show) setIsEditing(false);
    }, [show]);

    // Función callback para cuando el AchievementTracker guarde con éxito
    const handleUpdateSuccess = () => {
        setIsEditing(false);
        onReviewSuccess(); // Refresca la tabla principal
        onHide(); // Cierra el modal
    };

    return (
        <Modal show={show} onHide={onHide} enforceFocus={false} size="lg" centered backdrop="static">
            {/* CABECERA: Exactamente igual a la original */}
            <Modal.Header closeButton className={`${currentTab === 'En Revisión' ? 'bg-primary' : (currentTab === 'Aprobada' ? 'bg-success' : 'bg-danger')} text-white d-flex justify-content-between align-items-center`}>
                <Modal.Title className="h6">Auditoría: {activity?.indicator?.code || activity?.indicator_code}</Modal.Title>
                <Badge className="ms-auto me-4 bg-white text-dark border">
                    {currentTab}
                </Badge>
                <Badge className={`${activity?.indicator?.type === 'Outcome' ? 'bg-emerald' : 'bg-info'} ms-auto me-4`}>
                    {activity?.indicator?.type}
                </Badge>
            </Modal.Header>

            <Modal.Body className="p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                
                {/* TÍTULO SECCIÓN: Mantenemos el diseño, pero quitamos el botón de Auditoría/Timeline */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="text-oxford mb-0">
                        {isEditing ? 'Actualizar Detalles del Logro' : 'Detalles del Logro'}
                    </h5>
                    {/* Botón 'Ver Auditoría' ELIMINADO */}
                </div>

                {!isEditing ? (
                    <>
                        {/* --- AJUSTE 1: MOTIVO DE RECHAZO (Rojo Pastel) --- */}
                        {activity?.status === "Rechazada" && (
                            <div className="p-3 mb-4 rounded border-danger shadow-sm" 
                                 style={{ backgroundColor: '#fff5f5', borderLeft: '5px solid #dc3545' }}>
                                <h6 className="text-danger fw-bold mb-1">
                                    <i className="fas fa-exclamation-circle me-2"></i> Motivo del Rechazo (Monitoreo)
                                </h6>
                                <p className="mb-0 text-dark" style={{ fontStyle: 'italic' }}>
                                    "{currentAchievement?.monitoring_comment || "No se especificó un motivo."}"
                                </p>
                            </div>
                        )}

                        {/* --- DATOS SUPERIORES: REINCORPORADOS (Igual al original) --- */}
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label className="text-muted small fw-bold d-block">PROYECTO</label>
                                <p className="fw-bold text-oxford">{activity?.project_name || "N/A"}</p>
                            </div>
                            <div className="col-md-3">
                                <label className="text-muted small fw-bold d-block">COMPETENCIA</label>
                                <p className="text-oxford mb-0 small">{activity?.competence_name || "N/A"}</p>
                            </div>
                            <div className="col-md-3">
                                <label className="text-muted small fw-bold d-block">PROVINCIA</label>
                                <Badge bg="light" className="text-dark border">{activity?.province_name || "No definida"}</Badge>
                            </div>
                        </div>

                        {/* --- DESCRIPCIÓN: REINCORPORADA (Igual al original) --- */}
                        <div className="bg-light p-3 rounded mb-4 border-start border-4 border-azul-marino">
                            <label className="text-muted small fw-bold">DESCRIPCIÓN DE LA ACTIVIDAD</label>
                            <p className="mb-0 small">{activity?.description}</p>
                        </div>

                        {/* --- ESTADÍSTICAS: Exactamente igual al diseño original --- */}
                        <div className="row g-3 mb-4 text-center">
                            {isOutcome ? (
                                <>
                                    <StatCard label="Atendidos" value={progress.attended} color="text-oxford" />
                                    <StatCard label="Aprobados" value={progress.approved} color="text-emerald" />
                                    <StatCard label="Efectividad" value={`${calculatePercentage()}%`} color="text-primary" />
                                </>
                            ) : (
                                <>
                                    <StatCard label="Hombres" value={progress.men} color="text-primary" />
                                    <StatCard label="Mujeres" value={progress.women} color="text-danger" />
                                    <StatCard label="Total" value={progress.total} color="text-oxford" />
                                </>
                            )}
                        </div>

                        {/* --- EVIDENCIA: Exactamente igual al diseño original --- */}
                        <div className="row mb-4">
                            <div className="col-md-4">
                                <label className="text-muted small fw-bold d-block">EVIDENCIA</label>
                                {currentAchievement?.evidence ? (
                                    <a href={currentAchievement.evidence} target="_blank" rel="noreferrer"
                                        className="btn btn-sm btn-outline-success w-100 mt-1">
                                        <i className="fas fa-external-link-alt me-2"></i>Ver Respaldo
                                    </a>
                                ) : <span className="text-danger small">Sin archivo adjunto</span>}
                            </div>
                        </div>

                        {/* --- OBSERVACIONES: Exactamente igual al diseño original --- */}
                        <div className="mb-4">
                            <label className="text-muted small fw-bold">OBSERVACIONES DEL OFICIAL (CAMPO)</label>
                            <div className="p-2 border rounded bg-white italic small text-muted">
                                {currentAchievement?.observations || "Sin observaciones del oficial."}
                            </div>
                        </div>

                        {/* Cuadro de texto para retroalimentación del auditor ELIMINADO */}
                    </>
                ) : (
                    /* --- MODO EDICIÓN: Insertamos el AchievementTracker --- */
                    <AchievementTracker 
                        activity={activity} 
                        onClose={() => setIsEditing(false)} 
                        onRefresh={handleUpdateSuccess}
                    />
                )}
            </Modal.Body>

            {/* --- FOOTER: Mantenemos el diseño y colores de botones originales --- */}
            <Modal.Footer className="bg-light border-0">
                <Button variant="link" className="text-muted text-decoration-none" onClick={onHide}>
                    Cerrar
                </Button>
                
                {!isEditing && (
                    <>
                        {/* AJUSTE 2: Estatus "En Revisión" - Solo botón Actualizar (Color verde original) */}
                        {activity?.status === "En Revisión" && (
                            <Button className="btn-emerald shadow px-4" onClick={() => setIsEditing(true)}>
                                <i className="fas fa-edit me-2"></i> Actualizar logro
                            </Button>
                        )}

                        {/* AJUSTE 3: Estatus "Rechazada" - Solo botón Corregir (Color warning original) */}
                        {activity?.status === "Rechazada" && (
                            <Button variant="warning" className="shadow px-4" onClick={() => setIsEditing(true)}>
                                <i className="fas fa-tools me-2"></i> Corregir
                            </Button>
                        )}

                        {/* Estatus "Aprobada" - No hay botones de acción */}
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

// Componente pequeño StatCard (Mantenemos diseño original)
const StatCard = ({ label, value, color }) => (
    <div className="col-4">
        <div className="p-3 border rounded bg-white shadow-sm text-center">
            <div className="text-muted x-small fw-bold text-uppercase">{label}</div>
            <div className={`h4 mb-0 ${color}`}>{value || 0}</div>
        </div>
    </div>
);

export default OfficialReviewModal;