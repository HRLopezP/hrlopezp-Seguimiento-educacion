import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Badge } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/roleManagement.css";


const ReviewModal = ({ show, onHide, activity, onReviewSuccess, currentTab }) => {
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const currentAchievement = activity?.achievements_history?.[activity.achievements_history.length - 1];

    useEffect(() => {
        if (currentAchievement?.monitoring_comment) {
            setComment(currentAchievement.monitoring_comment);
        } else {
            setComment("");
        }
    }, [activity, show]);

    const handleReview = async (newStatus) => {
        if ((newStatus === 'Rechazada' || newStatus === 'En Revisión') && !comment.trim()) {
            return Swal.fire({
                icon: 'warning',
                title: 'Observación necesaria',
                text: `Para ${newStatus === 'Rechazada' ? 'rechazar' : 'revertir'} un logro, debes explicar el motivo.`,
                confirmButtonColor: '#1B263B',
            });
        }

        const actionText = newStatus === 'En Revisión' ? 'revertir a revisión' : newStatus.toLowerCase();
        
        const confirm = await Swal.fire({
            title: `¿Confirmar acción?`,
            text: `La actividad pasará a estado: ${newStatus}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: newStatus === 'Aprobada' ? '#10b981' : (newStatus === 'Rechazada' ? '#ef4444' : '#1B263B'),
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, procesar',
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            setSubmitting(true);
            try {
                // El endpoint sigue siendo el mismo, enviamos el nuevo status
                const response = await apiFetch(`/activities/${activity.id}/review`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: newStatus,
                        monitoring_comment: comment
                    })
                });

                if (response.ok) {
                    Swal.fire('¡Listo!', `El logro ahora está ${newStatus.toLowerCase()}.`, 'success');
                    if (onReviewSuccess) onReviewSuccess();
                    onHide();
                } else {
                    const errorData = await response.json();
                    Swal.fire('Error', errorData.message || 'No se pudo actualizar el estado', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Error de conexión con el servidor', 'error');
            } finally {
                setSubmitting(false);
            }
        }
    };


    const renderFooterButtons = () => {
        if (currentTab === "En Revisión") {
            return (
                <>
                    <Button variant="danger" disabled={submitting} onClick={() => handleReview('Rechazada')}>
                        <i className="fas fa-times me-2"></i>Rechazar Logro
                    </Button>
                    <Button variant="success" className="bg-emerald" disabled={submitting} onClick={() => handleReview('Aprobada')}>
                        <i className="fas fa-check me-2"></i>Aprobar Actividad
                    </Button>
                </>
            );
        }

        return (
            <Button 
                variant="outline-dark" 
                style={{ borderColor: '#1B263B', color: '#1B263B' }} 
                disabled={submitting} 
                onClick={() => handleReview('En Revisión')}
            >
                <i className="fas fa-undo me-2"></i>Revertir a Revisión
            </Button>
        );
    };

    return (
        <Modal show={show} onHide={onHide} enforceFocus={false} size="lg" centered backdrop="static">
            {/* El Header cambia de color según el estado para control visual */}
            <Modal.Header closeButton className={`${currentTab === 'En Revisión' ? 'bg-primary' : (currentTab === 'Aprobada' ? 'bg-success' : 'bg-danger')} text-white d-flex justify-content-between align-items-center`}>
                <Modal.Title className="h6">Auditoría: {activity?.indicator?.code || activity?.indicator_code}</Modal.Title>
                <Badge className="ms-auto me-4 bg-white text-dark border">
                    {currentTab}
                </Badge>
                <Badge className={`${activity?.indicator?.type === 'Outcome' ? 'bg-emerald' : 'bg-info'} ms-auto me-4`}>
                    {activity?.indicator?.type}
                </Badge>
            </Modal.Header>

            <Modal.Body className="p-4">
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
                        <Badge bg="light" className="text-dark border">{activity?.province_name}</Badge>
                    </div>
                </div>

                <div className="bg-light p-3 rounded mb-4 border-start border-4 border-azul-marino">
                    <label className="text-muted small fw-bold">DESCRIPCIÓN DE LA ACTIVIDAD</label>
                    <p className="mb-0 small">{activity?.description}</p>
                </div>

                <div className="row g-3 mb-4">
                    <div className="col-md-4">
                        <div className="card text-center p-2 border-dashed shadow-sm">
                            <span className="small text-muted">Hombres Alcanzados</span>
                            <h4 className="mb-0 text-azul-marino">{currentAchievement?.real_progress?.men || 0}</h4>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card text-center p-2 border-dashed shadow-sm">
                            <span className="small text-muted">Mujeres Alcanzadas</span>
                            <h4 className="mb-0 text-azul-marino">{currentAchievement?.real_progress?.women || 0}</h4>
                        </div>
                    </div>
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

                <div className="mb-4">
                    <label className="text-muted small fw-bold">OBSERVACIONES DEL OFICIAL (CAMPO)</label>
                    <div className="p-2 border rounded bg-white italic small text-muted">
                        {currentAchievement?.observations || "Sin comentarios del oficial."}
                    </div>
                </div>

                <Form.Group>
                    <Form.Label className="fw-bold text-oxford">
                        {currentTab === 'En Revisión' ? 'Retroalimentación del Auditor' : 'Motivo del cambio de estado'}
                    </Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Escriba aquí sus observaciones..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="border-azul-marino"
                    />
                </Form.Group>
            </Modal.Body>

            <Modal.Footer className="bg-light border-0">
                <Button variant="link" className="text-muted text-decoration-none" onClick={onHide}>Cerrar</Button>
                {renderFooterButtons()}
            </Modal.Footer>
        </Modal>
    );
};

export default ReviewModal;