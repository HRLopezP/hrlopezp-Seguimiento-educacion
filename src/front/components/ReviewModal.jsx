import React, { useState } from 'react';
import { Modal, Button, Form, Badge } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/roleManagement.css";

const ReviewModal = ({ show, onHide, activity, onReviewSuccess }) => {
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Obtenemos el último registro de logro enviado
    const currentAchievement = activity?.achievements_history?.[activity.achievements_history.length - 1];

    const handleReview = async (newStatus) => {
        if (newStatus === 'Rechazada' && !comment.trim()) {
            return Swal.fire({
                icon: 'warning',
                title: 'Observación necesaria',
                text: 'Para rechazar un logro, debes explicar el motivo al oficial.',
                confirmButtonColor: '#1B263B',
            });
        }

        const confirm = await Swal.fire({
            title: `¿Confirmar ${newStatus}?`,
            text: `La actividad pasará a estado ${newStatus}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: newStatus === 'Aprobada' ? '#10b981' : '#ef4444',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, procesar',
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            setSubmitting(true);
            try {
                const response = await apiFetch(`/activities/${activity.id}/review`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: newStatus,
                        monitoring_comment: comment
                    })
                });

                if (response.ok) {
                    Swal.fire('¡Procesado!', `La actividad ha sido ${newStatus.toLowerCase()}.`, 'success');
                    if (onReviewSuccess) onReviewSuccess();

                    onHide();
                    setComment("");
                } else {
                    const errorData = await response.json();
                    Swal.fire('Error', errorData.message || 'Error al procesar', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
            } finally {
                setSubmitting(false);
            }
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
            <Modal.Header closeButton className="bg-success text-white d-flex justify-content-between align-items-center">
                <Modal.Title className="h6">Auditoría de Cumplimiento: {activity?.indicator?.code}</Modal.Title>
                <Badge className={`${activity?.indicator?.type === 'Outcome' ? 'bg-emerald' : 'bg-info'} ms-auto me-4`}>
                    {activity?.indicator?.type}
                </Badge>
            </Modal.Header>
            <Modal.Body className="p-4">
                {/* CABECERA INFORMATIVA */}
                <div className="row mb-3">
                    <div className="col-md-6">
                        <label className="text-muted small fw-bold d-block">PROYECTO</label>
                        <p className="fw-bold text-oxford">{activity?.project_name || "N/A"}</p>
                    </div>
                    <div className="col-md-4">
                        <label className="text-muted small fw-bold d-block">COMPETENCIA</label>
                        <p className="text-oxford mb-0">{activity?.competence_name || "No especificada"}</p>
                    </div>
                    <div className="col-md-3">
                        <label className="text-muted small fw-bold d-block">PROVINCIA</label>
                        <Badge bg="light" className="text-dark border">{activity?.province_name}</Badge>
                    </div>
                </div>

                <div className="bg-light p-3 rounded mb-4">
                    <label className="text-muted small fw-bold">ACTIVIDAD EJECUTADA</label>
                    <p className="mb-0">{activity?.description}</p>
                </div>

                <div className="row g-3 mb-4">
                    <div className="col-md-4">
                        <div className="card text-center p-2 border-dashed">
                            <span className="small text-muted">Logro Hombres</span>
                            <h4 className="mb-0 text-primary">{currentAchievement?.real_progress?.men || 0}</h4>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card text-center p-2 border-dashed">
                            <span className="small text-muted">Logro Mujeres</span>
                            <h4 className="mb-0 text-primary">{currentAchievement?.real_progress?.women || 0}</h4>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <label className="text-muted small fw-bold d-block">EVIDENCIA</label>
                        {currentAchievement?.evidence ? (
                            <a href={currentAchievement.evidence} target="_blank" rel="noreferrer"
                                className="btn btn-sm btn-outline-success w-100 mt-1">
                                <i className="fas fa-download me-2"></i>Descargar Respaldo
                            </a>
                        ) : <span className="text-danger small">Sin archivo adjunto</span>}
                    </div>
                </div>

                {/* OBSERVACIONES DE CAMPO (DEL OFICIAL) */}
                <div className="mb-4">
                    <label className="text-muted small fw-bold">OBSERVACIONES DE CAMPO (OFICIAL)</label>
                    <div className="p-2 border rounded bg-white italic small text-muted">
                        {currentAchievement?.observations || "El oficial no dejó comentarios."}
                    </div>
                </div>

                {/* ÁREA DE FEEDBACK (MONITOREO) */}
                <Form.Group>
                    <Form.Label className="fw-bold text-oxford">Retroalimentación del Auditor</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Escriba aquí los motivos del rechazo o sugerencias de mejora..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="border-azul-marino"
                    />
                </Form.Group>
            </Modal.Body>
            <Modal.Footer className="bg-light border-0">
                <Button variant="link" className="text-muted" onClick={onHide}>Cancelar</Button>
                <Button variant="danger" disabled={submitting} onClick={() => handleReview('Rechazada')}>
                    Rechazar Logro
                </Button>
                <Button variant="success" className="bg-emerald" disabled={submitting} onClick={() => handleReview('Aprobada')}>
                    Aprobar Actividad
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ReviewModal;