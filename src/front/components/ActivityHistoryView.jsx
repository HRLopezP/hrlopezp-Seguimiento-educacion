import React from 'react';

export const ActivityHistoryView = ({ history = [], loading = false, onBack }) => {
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
                <div className="timeline-wrapper px-2" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {history.map((log, index) => (
                        <div key={index} className="mb-4 position-relative ps-4 border-start border-2 border-light">
                            {/* Punto del timeline */}
                            <div className="position-absolute start-0 translate-middle-x bg-white border border-2 border-primary rounded-circle" 
                                 style={{ width: '12px', height: '12px', marginLeft: '-1px', marginTop: '5px' }}>
                            </div>
                            
                            <div className="d-flex justify-content-between align-items-start">
                                <span className="badge bg-light text-dark border small">
                                    {log.field_changed?.toUpperCase()}
                                </span>
                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                    {new Date(log.created_at).toLocaleString()}
                                </small>
                            </div>
                            
                            <div className="mt-2 p-2 bg-white rounded shadow-sm border">
                                <p className="mb-1 small">
                                    <span className="text-danger fst-italic">{log.old_value || 'Nulo'}</span>
                                    <i className="fas fa-long-arrow-alt-right mx-2 text-muted"></i>
                                    <span className="text-success fw-bold">{log.new_value}</span>
                                </p>
                                <small className="text-muted">
                                    <i className="fas fa-user-edit me-1"></i> {log.user_name || 'Sistema'}
                                </small>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};