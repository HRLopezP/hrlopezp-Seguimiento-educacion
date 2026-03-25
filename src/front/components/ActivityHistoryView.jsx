import React from 'react';

export const ActivityHistoryView = ({ history = [], loading = false, onBack }) => {

    const formatLocalTime = (dateString) => {
        if (!dateString) return "N/A";
        // Agregamos "Z" al final para decirle a JavaScript que la fecha recibida es UTC
        const date = new Date(dateString.replace(" ", "T") + "Z");
        if (isNaN(date.getTime())) return dateString;

        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getBadgeStyle = (log) => {
        if (log.event === "Creación") return "bg-success text-white";
        if (log.event === "Cancelación" || log.field === "Status") return "bg-danger text-white";
        return "bg-info text-dark";
    };

    return (
        <div className="fade-in">
            <button
                className="btn btn-sm btn-outline-secondary border-0 mb-3"
                onClick={onBack}
            >
                <i className="fas fa-arrow-left me-2"></i> Volver a la lista
            </button>

            <h6 className="fw-bold mb-3 d-flex align-items-center">
                <i className="fas fa-history me-2 text-primary"></i>
                Línea de Tiempo de Cambios
            </h6>

            {loading ? (
                <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                    <p className="small text-muted mt-2">Cargando registros...</p>
                </div>
            ) : history.length === 0 ? (
                <div className="alert alert-light border-0 text-center py-4">
                    <p className="small text-muted mb-0">No hay cambios registrados para esta actividad.</p>
                </div>
            ) : (
                <div className="timeline-wrapper px-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {history.map((log, index) => (
                        <div key={index} className="mb-4 position-relative ps-4 border-start border-2 border-light">

                            {/* Punto del timeline con color dinámico */}
                            <div className={`position-absolute start-0 translate-middle-x rounded-circle border border-2 border-white shadow-sm ${log.event === 'Creación' ? 'bg-success' : 'bg-primary'}`}
                                style={{ width: '14px', height: '14px', marginLeft: '-1px', marginTop: '4px', zIndex: 2 }}>
                            </div>

                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className={`badge border-0 small ${getBadgeStyle(log)}`}>
                                    {log.field || log.event}
                                </span>
                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                    <i className="far fa-clock me-1"></i>
                                    {formatLocalTime(log.date)}
                                </small>
                            </div>

                            <div className="p-3 bg-white rounded shadow-sm border">
                                <div className="small">
                                    {log.event === "Creación" ? (
                                        <div className="d-flex align-items-center text-success">
                                            <i className="fas fa-star me-2"></i>
                                            <span>{log.details || "Se registró la planificación inicial."}</span>
                                        </div>
                                    ) : (
                                        <div className="change-details">
                                            {/* Valor Anterior */}
                                            {log.old && (
                                                <div className="text-muted mb-1 text-decoration-line-through" style={{ fontSize: '0.8rem' }}>
                                                    <small className="fw-bold me-1 text-uppercase" style={{ fontSize: '0.65rem' }}>Anterior:</small>
                                                    {log.old}
                                                </div>
                                            )}

                                            {/* Valor Nuevo */}
                                            <div className="text-dark">
                                                <i className="fas fa-chevron-right me-2 text-primary small"></i>
                                                <span className="fw-bold">{log.new || log.details}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <hr className="my-2 opacity-25" />

                                <div className="d-flex justify-content-between align-items-center mt-1">
                                    <small className="text-muted">
                                        <i className="fas fa-user-circle me-1"></i> {log.user || 'Sistema'}
                                    </small>
                                    {log.event === "Edición" && (
                                        <span className="badge bg-light text-primary border-0" style={{ fontSize: '0.6rem' }}>EDITADO</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};