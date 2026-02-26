import React from 'react';

const ProgressSummary = ({ data }) => {
    // PROFE: Separamos la data por tipo si fuera necesario, 
    // por ahora asumiremos una lista que renderiza barras de progreso.

    return (
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '15px' }}>
            <div className="card-header bg-white border-0 py-3">
                <h5 className="text-oxford fw-bold mb-0">
                    <i className="fas fa-tasks me-2 text-emerald"></i>
                    Resumen de Ejecución de Indicadores
                </h5>
            </div>

            <div className="card-body p-0">
                <div className="accordion accordion-flush" id="indicatorAccordion">
                    {data.map((ind, index) => (
                        <div className="accordion-item border-bottom" key={ind.indicator_id}>
                            <h2 className="accordion-header">
                                <button
                                    className="accordion-button collapsed py-3"
                                    type="button"
                                    data-bs-toggle="collapse"
                                    data-bs-target={`#collapse-${index}`}
                                >
                                    <div className="w-100 me-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="fw-bold text-oxford small">
                                                <span className="badge bg-light text-oxford border me-2">{ind.code}</span>
                                                {ind.name}
                                            </span>
                                            <span className="fw-bold text-emerald small">{ind.progress_percentage}%</span>
                                        </div>
                                        <div className="progress" style={{ height: '8px' }}>
                                            <div
                                                className="progress-bar bg-emerald"
                                                role="progressbar"
                                                style={{ width: `${ind.progress_percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </button>
                            </h2>

                            <div id={`collapse-${index}`} className="accordion-collapse collapse" data-bs-parent="#indicatorAccordion">
                                <div className="accordion-body bg-light-subtle">
                                    <div className="row g-3">
                                        {/* Columna de Metas */}
                                        <div className="col-md-6 border-end">
                                            <p className="text-muted small text-uppercase fw-bold mb-2">Metas Globales</p>
                                            <div className="d-flex justify-content-between mb-1">
                                                <span>Total Objetivo:</span>
                                                <span className="fw-bold">{ind.target.total}</span>
                                            </div>
                                            <div className="d-flex justify-content-between small text-muted">
                                                <span>Hombres: {ind.target.men}</span>
                                                <span>Mujeres: {ind.target.women}</span>
                                            </div>
                                        </div>

                                        {/* Columna de Logros Real-Time */}
                                        <div className="col-md-6">
                                            <p className="text-emerald small text-uppercase fw-bold mb-2">Logros Alcanzados</p>
                                            <div className="d-flex justify-content-between mb-1">
                                                <span>Total Logrado:</span>
                                                <span className="fw-bold text-emerald">{ind.achieved.total}</span>
                                            </div>
                                            <div className="d-flex justify-content-between small text-muted">
                                                <span>Hombres: {ind.achieved.men}</span>
                                                <span>Mujeres: {ind.achieved.women}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Indicador de brecha (Lo que falta) */}
                                    <div className="mt-3 p-2 bg-white rounded border text-center">
                                        <span className="small text-muted">Pendiente por alcanzar: </span>
                                        <span className="fw-bold text-danger">
                                            {Math.max(0, ind.target.total - ind.achieved.total)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProgressSummary;