import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Badge, Spinner } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/roleManagement.css";

const ReviewModal = ({ show, onHide, activity, onReviewSuccess, currentTab }) => {
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState('detail');
    const [timeline, setTimeline] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const currentAchievement = activity?.achievements_history?.[activity.achievements_history.length - 1];
    const isOutcome = activity?.indicator?.type === 'Outcome';
    const progress = currentAchievement?.real_progress || {};

    const calculatePercentage = () => {
        if (!progress.attended || progress.attended === 0) return 0;
        return Math.round((progress.approved * 100) / progress.attended);
    };

    useEffect(() => {
        if (show) {
            setViewMode('detail'); // Resetear a detalle al abrir
            if (currentAchievement?.monitoring_comment) {
                setComment(currentAchievement.monitoring_comment);
            } else {
                setComment("");
            }
        }
    }, [activity, show, currentAchievement]);

    // Función para obtener historial
    const fetchAchievementHistory = async () => {
        setLoadingHistory(true);
        setViewMode('history');
        try {
            const res = await apiFetch(`/audit/achievement-full-history/${activity.id}`);
            if (res.ok) {
                const data = await res.json();
                setTimeline(data.timeline);
            }
        } catch (error) {
            console.error("Error cargando auditoría:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

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

    const renderTimeline = () => {
        if (loadingHistory) {
            return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>;
        }

        if (timeline.length === 0) {
            return <div className="text-center py-4 text-muted">No hay registros de auditoría para este logro.</div>;
        }

        return (
            <div className="timeline-v2">
                {/* --- VISTA DE LÍNEA DE TIEMPO --- */}
                {timeline.map((item, index) => {
                    // 1. Definimos qué campos pertenecen a cada tipo
                    const outcomeFields = ['attended_count', 'approved_count'];
                    const outputFields = ['men_reached', 'women_reached', 'total_reached'];

                    // 2. Verificamos si el campo debe ser ignorado según el tipo de indicador
                    const isIrrelevantField =
                        (isOutcome && outputFields.includes(item.field)) ||
                        (!isOutcome && outcomeFields.includes(item.field));

                    // 3. Verificamos si hubo un cambio real (valor antiguo distinto al nuevo)
                    const hasChanged = item.old !== item.new;

                    // Solo mostramos el detalle si el campo es relevante Y cambió
                    const shouldShowDetail = item.field && item.field !== 'status' && !isIrrelevantField && hasChanged;

                    return (
                        <div key={index} className="timeline-item mb-4 position-relative ps-4 border-start border-2">
                            <div className={`dot-indicator ${item.type === 'status_change' ? 'bg-success' : 'bg-primary'}`}></div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="fw-bold text-oxford">{item.event}</span>
                                <small className="text-muted"><i className="far fa-clock me-1"></i>{item.date}</small>
                            </div>
                            <div className="text-muted small mb-2">Realizado por: <strong>{item.user}</strong></div>

                            {/* DETALLE FILTRADO: Solo si es relevante y hubo cambio */}
                            {shouldShowDetail && (
                                <div className="p-2 bg-light rounded x-small border">
                                    Modificó <strong>{item.field.replace('_', ' ')}</strong>:
                                    <span className="text-danger ms-1 text-decoration-line-through">{item.old}</span>
                                    <i className="fas fa-arrow-right mx-2 text-muted"></i>
                                    <span className="text-success fw-bold">{item.new}</span>
                                </div>
                            )}

                            {/* Comentario si existe */}
                            {item.comment && (
                                <div className="mt-2 p-2 bg-warning bg-opacity-10 border-start border-3 border-warning rounded small italic">
                                    <i className="fas fa-comment-dots me-2"></i>"{item.comment}"
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <Modal show={show} onHide={onHide} enforceFocus={false} size="lg" centered backdrop="static">
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
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="text-oxford mb-0">
                        {viewMode === 'detail' ? 'Detalles del Logro' : 'Historial de Cambios'}
                    </h5>
                    <Button
                        variant={viewMode === 'detail' ? "outline-primary" : "azul-marino"}
                        size="sm"
                        onClick={() => viewMode === 'detail' ? fetchAchievementHistory() : setViewMode('detail')}
                        className="rounded-pill"
                    >
                        <i className={`fas ${viewMode === 'detail' ? 'fa-history' : 'fa-info-circle'} me-2`}></i>
                        {viewMode === 'detail' ? 'Ver Auditoría' : 'Volver al Detalle'}
                    </Button>
                </div>

                {/* LÓGICA CORREGIDA: O detalle, o línea de tiempo */}
                {viewMode === 'detail' ? (
                    <>
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
                    </>
                ) : (
                    renderTimeline()
                )}
            </Modal.Body>

            <Modal.Footer className="bg-light border-0">
                <Button variant="link" className="text-muted text-decoration-none" onClick={onHide}>Cerrar</Button>
                {viewMode === 'detail' && renderFooterButtons()}
            </Modal.Footer>
        </Modal>
    );
};

const StatCard = ({ label, value, color }) => (
    <div className="col-4">
        <div className="p-3 border rounded bg-white shadow-sm">
            <div className="text-muted x-small fw-bold text-uppercase">{label}</div>
            <div className={`h4 mb-0 ${color}`}>{value || 0}</div>
        </div>
    </div>
);

export default ReviewModal;