import React, { useState } from 'react';
import { Modal, Button, Form, Table, Badge } from 'react-bootstrap';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const ReviewModal = ({ show, onHide, activity, onReviewSuccess }) => {
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // El logro más reciente es el que está "En Revisión"
    const currentAchievement = activity?.achievements_history?.slice(-1)[0];

    const handleReview = async (newStatus) => {
        if (newStatus === 'Rechazada' && !comment.trim()) {
            return MySwal.fire({
                icon: 'error',
                title: 'Dato obligatorio',
                text: 'Debes indicar un motivo para rechazar la actividad.',
                confirmButtonColor: '#3085d6',
            });
        }

        const confirmResult = await MySwal.fire({
            title: `¿Confirmar ${newStatus}?`,
            text: `La actividad será marcada como ${newStatus.toLowerCase()}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: newStatus === 'Aprobada' ? '#10b981' : '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar'
        });

        if (confirmResult.isConfirmed) {
            setSubmitting(true);
            try {
                const response = await fetch(`${process.env.BACKEND_URL}/api/activities/${activity.id}/review`, {
                    method: 'PATCH',
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify({
                        status: newStatus,
                        monitoring_comment: comment
                    })
                });

                if (response.ok) {
                    MySwal.fire('¡Logrado!', `La actividad ha sido ${newStatus.toLowerCase()}.`, 'success');
                    onReviewSuccess(); // Recarga el inbox
                    onHide();
                }
            } catch (error) {
                MySwal.fire('Error', 'No se pudo procesar la revisión.', 'error');
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