import React from 'react';

const DayManagerModal = ({ selectedDate, activities, onEditActivity, onAddActivity, onRegisterAchievement, onClose }) => {
    
    // Formatear fecha para el encabezado (Ej: Lunes, 02 de Marzo)
    const formattedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
            {/* Cabecera Profesional en Oxford Grey */}
            <div className="modal-header text-white" style={{ backgroundColor: '#1B263B', padding: '1.2rem' }}>
                <div>
                    <h5 className="modal-title fw-bold mb-0">Gestión de Actividades</h5>
                    <small className="text-emerald text-capitalize">{formattedDate}</small>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4 bg-light">
                {activities.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-muted">No hay actividades planificadas para este día.</p>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {activities.map((act) => (
                            <div key={act.id} className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                                <div className="card-body p-3">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <span className="badge mb-1" style={{ backgroundColor: '#1B263B' }}>
                                                {act.indicator_code || 'IND'}
                                            </span>
                                            <h6 className="fw-bold text-oxford mb-1">{act.description}</h6>
                                            <small className="text-muted">
                                                <i className="fas fa-map-marker-alt me-1 text-emerald"></i>
                                                {act.province_name || 'Ubicación no definida'}
                                            </small>
                                        </div>
                                        <div className={`badge ${act.status === 'Completado' ? 'bg-emerald' : 'bg-warning text-dark'}`}>
                                            {act.status || 'En Progreso'}
                                        </div>
                                    </div>

                                    <hr className="my-2 opacity-25" />

                                    <div className="d-flex justify-content-between align-items-center">
                                        <div className="small">
                                            <span className="me-3">🎯 Meta: <strong>{act.planned?.total || 0}</strong></span>
                                        </div>
                                        <div className="btn-group">
                                            {/* Botón Editar - Sutil */}
                                            <button 
                                                className="btn btn-sm btn-outline-secondary border-0"
                                                onClick={() => onEditActivity(act)}
                                                title="Editar planificación"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            
                                            {/* Botón Registrar Logro - Emerald Green */}
                                            <button 
                                                className="btn btn-sm text-white ms-2 shadow-sm" 
                                                style={{ backgroundColor: '#10b981', borderRadius: '8px' }}
                                                onClick={() => onRegisterAchievement(act)}
                                            >
                                                <i className="fas fa-check-circle me-1"></i>
                                                Logros
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer con opción de añadir más */}
            <div className="modal-footer border-0 bg-white d-flex justify-content-between p-3">
                <button className="btn btn-link text-oxford fw-bold text-decoration-none" onClick={onClose}>
                    Cerrar
                </button>
                <button 
                    className="btn text-white px-4 shadow" 
                    style={{ backgroundColor: '#1B263B', borderRadius: '10px' }}
                    onClick={onAddActivity}
                >
                    <i className="fas fa-plus me-2"></i>
                    Añadir Indicador
                </button>
            </div>
        </div>
    );
};

export default DayManagerModal;