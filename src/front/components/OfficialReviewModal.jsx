import React from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';

const OfficialReviewModal = ({ show, onHide, activity, currentTab, onEditClick }) => {
    const currentAchievement = activity?.achievements_history?.[activity.achievements_history.length - 1];

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="h5 text-oxford">Detalle del Logro</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Información General del Logro (Reutilizamos tu lógica visual) */}
                <div className="row g-3 mb-4">
                    <div className="col-12">
                        <h6 className="fw-bold border-bottom pb-2">{activity?.description}</h6>
                    </div>
                </div>

                {/* CUADRO DE RECHAZO (Rojo Pastel) */}
                {currentTab === 'Rechazada' && currentAchievement?.monitoring_comment && (
                    <div className="p-3 mb-4 rounded border" style={{ backgroundColor: '#fff5f5', borderColor: '#feb2b2' }}>
                        <h6 className="text-danger fw-bold mb-1">
                            <i className="fa-solid fa-circle-exclamation me-2"></i>
                            Observación de Monitoreo:
                        </h6>
                        <p className="mb-0 text-dark small italic">"{currentAchievement.monitoring_comment}"</p>
                    </div>
                )}

                {/* Aquí irían tus StatCards de hombres, mujeres, etc. */}
                {/* ... (Mantenemos la misma visualización de datos que ya tienes) ... */}

            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={onHide}>Cerrar</Button>
                
                {/* Botón Corregir/Editar (Solo en Revisión o Rechazada) */}
                {(currentTab === 'Rechazada' || currentTab === 'En Revisión') && (
                    <Button 
                        style={{ backgroundColor: '#10b981', border: 'none' }}
                        onClick={() => onEditClick(activity)}
                    >
                        {currentTab === 'Rechazada' ? 'Corregir Logros' : 'Editar Logros'}
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default OfficialReviewModal;