import React from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import "../styles/roleManagement.css";

const OfficialReviewModal = ({ show, onHide, activity, currentTab, onEditClick }) => {
    const currentAchievement = activity?.achievements_history?.[activity.achievements_history.length - 1];
    const progress = currentAchievement?.real_progress || {};

    const calculatePercentage = () => {
        if (!progress.attended || progress.attended === 0) return 0;
        return Math.round((progress.approved * 100) / progress.attended);
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-light border-0">
                <Modal.Title className="h5 text-oxford fw-bold">
                    <i className="fa-solid fa-file-contract me-2 text-emerald"></i>
                    Detalle del Logro Reportado
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-4">
                {/* Información General */}
                <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                        <Badge bg="secondary" className="px-3 py-2">{activity?.indicator?.code}</Badge>
                        <Badge bg={currentTab === 'Aprobada' ? 'success' : currentTab === 'Rechazada' ? 'danger' : 'warning'} className="text-uppercase">
                            {currentTab}
                        </Badge>
                    </div>
                    <h6 className="fw-bold text-dark mb-1">{activity?.description}</h6>
                    <small className="text-muted"><i className="fa-regular fa-calendar me-1"></i> Implementado el: {activity?.implementation_date}</small>
                </div>

                {/* CUADRO DE RECHAZO (Rojo Pastel) - Solo si está rechazada */}
                {currentTab === 'Rechazada' && currentAchievement?.monitoring_comment && (
                    <div className="p-3 mb-4 rounded border-start border-4 border-danger" style={{ backgroundColor: '#fff5f5' }}>
                        <h6 className="text-danger fw-bold mb-1 small text-uppercase">
                            <i className="fa-solid fa-comment-dots me-2"></i>
                            Observación del Auditor
                        </h6>
                        <p className="mb-0 text-dark italic small">"{currentAchievement.monitoring_comment}"</p>
                    </div>
                )}

                {/* Tarjetas de Datos (Mismo estilo que ReviewModal) */}
                <div className="row g-3 mb-4">
                    <StatCard label="Hombres" value={progress.men} color="text-primary" />
                    <StatCard label="Mujeres" value={progress.women} color="text-danger" />
                    <StatCard label="Con Discapacidad" value={progress.disability} color="text-warning" />
                    <StatCard label="Atendidos" value={progress.attended} color="text-dark" />
                    <StatCard label="Logrados" value={progress.approved} color="text-success" />
                    <StatCard label="Efectividad" value={`${calculatePercentage()}%`} color="text-info" />
                </div>

                {/* Observaciones del Oficial */}
                <div className="bg-light p-3 rounded">
                    <h6 className="fw-bold small text-muted text-uppercase mb-2">Mis Observaciones</h6>
                    <p className="mb-0 small">{currentAchievement?.observations || "Sin observaciones adicionales."}</p>
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light border-0">
                <Button variant="outline-secondary" className="rounded-pill px-4" onClick={onHide}>Cerrar</Button>

                {(currentTab === 'Rechazada' || currentTab === 'En Revisión') && (
                    <Button
                        className="rounded-pill px-4 shadow-sm border-0"
                        style={{ backgroundColor: '#10b981' }}
                        onClick={() => onEditClick(activity)}
                    >
                        <i className={`fa-solid ${currentTab === 'Rechazada' ? 'fa-wrench' : 'fa-pen-to-square'} me-2`}></i>
                        {currentTab === 'Rechazada' ? 'Corregir ahora' : 'Editar reporte'}
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

// Componente auxiliar para las tarjetas (reutilizado)
const StatCard = ({ label, value, color }) => (
    <div className="col-4 col-md-4">
        <div className="p-2 border rounded bg-white shadow-sm text-center">
            <div className="text-muted x-small fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>{label}</div>
            <div className={`h5 mb-0 fw-bold ${color}`}>{value || 0}</div>
        </div>
    </div>
);

export default OfficialReviewModal;