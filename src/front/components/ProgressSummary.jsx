import React, { useState } from 'react';
import "../styles/ProgressSummary.css";

const CircularImpact = ({ percentage }) => {
    const radius = 36;
    const dash = 2 * Math.PI * radius;
    const offset = dash - (dash * Math.min(percentage, 100)) / 100;

    return (
        <div style={{
            position: 'relative', width: '100px', height: '100px',
            backgroundColor: '#2c3e50', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '4px solid #34495e', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            flexShrink: 0
        }}>
            <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="transparent" />
                <circle
                    cx="50" cy="50" r={radius} stroke="#2ecc71" strokeWidth="8" fill="transparent"
                    strokeDasharray={dash}
                    style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1.5s ease' }}
                    strokeLinecap="round"
                />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '1rem', fontWeight: '900', lineHeight: '1' }}>
                    {percentage.toFixed(1)}%
                </div>
                <div style={{ fontSize: '7px', textTransform: 'uppercase', opacity: '0.7', fontWeight: 'bold' }}>Impacto</div>
            </div>
        </div>
    );
};

const ProgressSummary = ({ data }) => {
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (!data || data.length === 0) return (
        <div className="text-center p-5 mt-5 border rounded-4 bg-light shadow-sm">
            <i className="fas fa-chart-pie fa-3x mb-3 text-muted opacity-50"></i>
            <p className="text-muted italic">Esperando datos de indicadores para este proyecto...</p>
        </div>
    );

    return (
        <div className="container-fluid py-4">
            {data.map((indicator) => {
                const isOutcome = indicator.type?.toLowerCase() === 'outcome';
                const isDep = indicator.is_dependent;
                const isExpanded = expandedId === indicator.id;

                const globalPercentage = isOutcome ? (indicator.global_achieved || 0) :
                    (indicator.global_target > 0 ? (indicator.global_achieved / indicator.global_target) * 100 : 0);

                const missingTotal = (indicator.global_target || 0) - (indicator.global_achieved || 0);
                const missingMenGlobal = (indicator.global_target_men || 0) - (indicator.total_men || 0);
                const missingWomenGlobal = (indicator.global_target_women || 0) - (indicator.total_women || 0);

                return (
                    <div key={indicator.id} className={`card indicator-card border-0 shadow-lg mb-4 ${isExpanded ? 'is-active' : ''}`} style={{ borderRadius: '25px', overflow: 'hidden' }}>
                        {/* HEADER */}
                        <div 
                            className="px-4 py-1 d-flex flex-column flex-md-row justify-content-between align-items-center gap-4 accordion-header-clickable"
                            style={{ backgroundColor: '#34495e', color: 'white', cursor: 'pointer', transition: '0.3s' }}
                            onClick={() => toggleExpand(indicator.id)}
                        >
                            <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <span className={`badge rounded-pill ${isOutcome ? 'bg-info' : 'bg-success'}`}>
                                        {indicator.type}
                                    </span>
                                    <code className="text-light opacity-75 bg-dark px-2 py-1 rounded">{indicator.code}</code>
                                    {/* Icono con rotación suave */}
                                    <i className={`fas fa-chevron-down ms-2 opacity-50 rotate-icon ${isExpanded ? 'is-expanded' : ''}`}></i>
                                </div>
                                <h4 className="fw-black mb-0 text-uppercase">{indicator.name}</h4>
                            </div>

                            <div className="d-flex align-items-center gap-3 bg-dark bg-opacity-10 p-3 rounded-4 border border-white border-opacity-10">
                                <div className="d-flex flex-row gap-2 align-items-center">
                                    <div className="bg-dark bg-opacity-25 p-2 rounded-3 border border-secondary" style={{ minWidth: '120px' }}>
                                        <small className="d-block opacity-75 text-uppercase" style={{ fontSize: '9px' }}>Meta Global</small>
                                        <span className="fw-bold">{indicator.global_target}{isOutcome && isDep ? '%' : ''}</span>
                                        {!isDep && !isOutcome && (
                                            <div className="opacity-50" style={{ fontSize: '10px' }}>
                                                {indicator.global_target_men}H/{indicator.global_target_women}M
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className={`bg-dark bg-opacity-25 p-2 rounded-3 border border-success ${(!isDep && !isOutcome) ? 'custom-tooltip' : ''}`}
                                        style={{ minWidth: '120px' }}
                                        data-tooltip={(!isDep && !isOutcome) ? `Faltan ${Math.max(0, missingTotal)} (${Math.max(0, missingMenGlobal)}H y ${Math.max(0, missingWomenGlobal)}M)` : undefined}
                                    >
                                        <small className="d-block opacity-75 text-uppercase" style={{ fontSize: '9px' }}>Logro Total</small>
                                        <span className="fw-bold text-success">
                                            {indicator.global_achieved}{isOutcome && isDep ? '%' : ''}
                                        </span>
                                        <div className="opacity-50" style={{ fontSize: '10px' }}>
                                            {isOutcome && !isDep ? 
                                                `${indicator.total_approved} Ap. / ${indicator.total_attended} Tot.` : 
                                                `${indicator.total_men}${isDep ? '%' : ''}H/${indicator.total_women}${isDep ? '%' : ''}M`
                                            }
                                        </div>
                                    </div>
                                </div>
                                <CircularImpact percentage={globalPercentage} />
                            </div>
                        </div>

                        {/* CUERPO - Implementación de la transición profesional */}
                        <div className={`accordion-collapse-custom ${isExpanded ? 'is-expanded' : ''}`}>
                            <div className="accordion-content-wrapper">
                                <div className="card-body bg-light p-4 p-md-5">
                                    <div className="row g-4">
                                        {indicator.provinces?.filter(p => p.target > 0).map((prov) => {
                                            const provProgress = isOutcome ? (prov.achieved || 0) : (prov.target > 0 ? (prov.achieved / prov.target) * 100 : 0);
                                            const isCritical = !isDep && !isOutcome && provProgress < 10 && prov.target > 0;
                                            const mProv = (prov.target_men || 0) - (prov.men || 0);
                                            const wProv = (prov.target_women || 0) - (prov.women || 0);

                                            return (
                                                <div key={prov.province_id} className="col-12 col-md-6 col-lg-4">
                                                    <div className="card h-100 border-0 shadow-sm p-4 bg-white" style={{ borderRadius: '20px' }}>
                                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                                            <div>
                                                                <small className="text-success fw-bold text-uppercase" style={{ fontSize: '9px' }}>Provincia</small>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <h5 className="fw-black m-0 text-dark">{prov.province_name}</h5>
                                                                    {isCritical && (
                                                                        <i className="fas fa-exclamation-triangle warning-icon custom-tooltip"
                                                                            data-tooltip={`¡Atención! Pendiente: ${Math.max(0, prov.target - prov.achieved)} (${Math.max(0, mProv)}H / ${Math.max(0, wProv)}M)`}></i>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-end">
                                                                <small className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '8px' }}>Meta</small>
                                                                <div className="fw-bold text-dark fs-5">{prov.target}{isOutcome && isDep ? '%' : ''}</div>
                                                                {!isDep && !isOutcome && (
                                                                    <div className="text-muted" style={{ fontSize: '10px' }}>
                                                                        {prov.target_men || 0}H | {prov.target_women || 0}M
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="mb-4">
                                                            <div className="d-flex justify-content-between mb-1">
                                                                <small className="text-muted fw-bold" style={{ fontSize: '10px' }}>PROGRESO</small>
                                                                <small className={`fw-bold ${isCritical ? 'text-warning' : 'text-success'}`}>
                                                                    {provProgress.toFixed(2)}%
                                                                </small>
                                                            </div>
                                                            <div
                                                                className={`progress ${(!isDep && !isOutcome) ? 'custom-tooltip' : ''}`}
                                                                style={{ height: '8px', borderRadius: '10px' }}
                                                                data-tooltip={(!isDep && !isOutcome) ? `Pendiente: ${Math.max(0, prov.target - prov.achieved)}` : undefined}
                                                            >
                                                                <div className={`progress-bar ${isCritical ? 'bg-warning' : 'bg-success'}`}
                                                                    style={{ width: `${Math.min(provProgress, 100)}%`, transition: 'width 1s ease-in-out' }}></div>
                                                            </div>
                                                        </div>

                                                        <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                                                            <div className="bg-light px-3 py-1 rounded-pill">
                                                                <small className="text-muted me-1" style={{ fontSize: '10px' }}>LOGRO:</small>
                                                                <span className="fw-bold text-dark">{prov.achieved}{isOutcome && isDep ? '%' : ''}</span>
                                                            </div>
                                                            <div className="d-flex gap-3">
                                                                {isOutcome && !isDep ? (
                                                                    <>
                                                                        <span title="Aprobados"><i className="fas fa-user-check text-success"></i> <small className="fw-bold">{prov.approved}</small></span>
                                                                        <span title="Población Total"><i className="fas fa-users text-primary"></i> <small className="fw-bold">{prov.attended}</small></span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span><i className="fas fa-mars text-primary"></i> <small className="fw-bold">{prov.men}{isDep ? '%' : ''}</small></span>
                                                                        <span><i className="fas fa-venus text-danger"></i> <small className="fw-bold">{prov.women}{isDep ? '%' : ''}</small></span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ProgressSummary;