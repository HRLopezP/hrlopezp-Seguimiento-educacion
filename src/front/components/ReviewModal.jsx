import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";

const ReviewModal = ({ show, onHide, activity, onReviewSuccess }) => {
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // El logro más reciente es el que está "En Revisión"
    const currentAchievement = activity?.achievements_history?.slice(-1)[0];

    const handleReview = async (newStatus) => {
        // Validar comentario si es rechazo
        if (newStatus === 'Rechazada' && !comment.trim()) {
            return Swal.fire({
                icon: 'error',
                title: 'Dato obligatorio',
                text: 'Debes indicar un motivo para rechazar la actividad.',
                confirmButtonColor: '#1B263B',
            });
        }

        const result = await Swal.fire({
            title: `¿Confirmar ${newStatus}?`,
            text: `La actividad será marcada como ${newStatus.toLowerCase()}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: newStatus === 'Aprobada' ? '#10b981' : '#ef4444',
            cancelButtonColor: '#1B263B',
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            setSubmitting(true);
            try {
                // ✅ CAMBIO CLAVE: apiFetch ya sabe la URL y el Token
                const response = await apiFetch(`/activities/${activity.id}/review`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: newStatus,
                        monitoring_comment: comment
                    })
                });

                if (response && response.ok) {
                    await Swal.fire({ // Añadimos await para que el usuario vea el éxito
                        title: '¡Logrado!',
                        text: `La actividad ha sido ${newStatus.toLowerCase()}.`,
                        icon: 'success',
                        confirmButtonColor: '#10b981'
                    });
                    onReviewSuccess();
                    onHide();
                    setComment("");
                } else {
                    Swal.fire('Error', 'No se pudo actualizar el estado.', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
            } finally {
                setSubmitting(false);
            }
        }
    };
    
    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton style={{ backgroundColor: '#2C3E50', color: 'white' }}>
                <Modal.Title>Revisión de Logro: {activity?.indicator?.code}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <h5>Descripción: <small className="text-muted">{activity?.description}</small></h5>
                <hr />

                <div className="row mb-4">
                    <div className="col-md-6 border-end">
                        <h6 className="text-primary">Logro Actual</h6>
                        <p className="mb-1"><strong>Hombres:</strong> {currentAchievement?.real_progress?.men}</p>
                        <p className="mb-1"><strong>Mujeres:</strong> {currentAchievement?.real_progress?.women}</p>
                        {currentAchievement?.evidence && (
                            <a href={currentAchievement.evidence} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info mt-2">
                                🖼 Ver Evidencia
                            </a>
                        )}
                    </div>
                    <div className="col-md-6">
                        <h6 className="text-primary">Historial de Intentos</h6>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.85rem' }}>
                            {activity?.achievements_history?.map((h, i) => (
                                <div key={i} className="mb-2 p-2 bg-light rounded">
                                    <small className="d-block text-muted">{h.date}</small>
                                    <span>Obs: {h.observations || "Sin comentarios"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <Form.Group className="mb-3">
                    <Form.Label><strong>Comentario de Retroalimentación (Obligatorio si rechaza)</strong></Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Escribe aquí las observaciones para el oficial..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </Form.Group>
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={onHide}>Cerrar</Button>
                <Button
                    variant="danger"
                    disabled={submitting}
                    onClick={() => handleReview('Rechazada')}
                >
                    Rechazar y Devolver
                </Button>
                <Button
                    variant="success"
                    disabled={submitting}
                    onClick={() => handleReview('Aprobada')}
                >
                    Aprobar Logro
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ReviewModal;