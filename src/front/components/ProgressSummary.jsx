import React from 'react';

const CircularImpact = ({ value, target }) => {
    // Usamos toFixed(2) para la precisión que buscas
    const percentage = target > 0 ? (value / target) * 100 : 0;
    const radius = 36;
    const dash = 2 * Math.PI * radius;
    const offset = dash - (dash * percentage) / 100;

    return (
        <div style={{
            position: 'relative', width: '120px', height: '120px', // Un poquito más ancho por los decimales
            backgroundColor: '#2c3e50', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '4px solid #34495e', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            flexShrink: 0
        }}>
            <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="transparent" />
                <circle
                    cx="60" cy="60" r={radius} stroke="#2ecc71" strokeWidth="8" fill="transparent"
                    strokeDasharray={dash}
                    style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1.5s ease' }}
                    strokeLinecap="round"
                />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center', color: 'white' }}>
                {/* PRECISIÓN PROFESIONAL: 2 decimales */}
                <div style={{ fontSize: '1.2rem', fontWeight: '900', lineHeight: '1' }}>
                    {percentage.toFixed(2)}%
                </div>
                <div style={{ fontSize: '8px', textTransform: 'uppercase', opacity: '0.7', fontWeight: 'bold', marginTop: '4px' }}>Impacto</div>
            </div>
        </div>
    );
};

const ProgressSummary = ({ data }) => {
    if (!data || data.length === 0) return (
        <div className="text-center p-5 mt-5 border rounded-4 bg-light shadow-sm">
            <i className="fas fa-chart-pie fa-3x mb-3 text-muted opacity-50"></i>
            <p className="text-muted italic">Esperando datos de indicadores para este proyecto...</p>
        </div>
    );

    return (
        <div className="container-fluid py-4" style={{ animation: 'fadeIn 0.5s ease' }}>
            {data.map((indicator) => {
                const isOutcome = indicator.type?.toLowerCase() === 'outcome';
                const totalTarget = indicator.provinces?.reduce((acc, p) => acc + (p.target || 0), 0) || 0;
                const totalAchieved = indicator.global_achieved || 0;

                return (
                    <div key={indicator.id} className="card border-0 shadow-lg mb-5" style={{ borderRadius: '25px', overflow: 'hidden' }}>
                        
                        {/* CABECERA OXFORD GREY */}
                        <div className="p-4 p-md-5 d-flex flex-column flex-md-row justify-content-between align-items-center gap-4"
                            style={{ backgroundColor: '#34495e', color: 'white' }}>

                            <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <span className={`badge rounded-pill ${isOutcome ? 'bg-info' : 'bg-success'}`}
                                        style={{ padding: '8px 15px', fontSize: '10px', textTransform: 'uppercase' }}>
                                        {indicator.type || 'Indicador'}
                                    </span>
                                    <code className="text-light opacity-75 bg-dark px-2 py-1 rounded" style={{ fontSize: '12px' }}>
                                        {indicator.code}
                                    </code>
                                </div>
                                <h3 className="fw-black mb-2 text-uppercase" style={{ fontSize: '1.8rem' }}>{indicator.name}</h3>
                                <p className="opacity-75 mb-0 fst-italic" style={{ maxWidth: '600px', fontSize: '0.9rem' }}>
                                    "{indicator.description}"
                                </p>
                            </div>

                            {/* METAS GLOBALES AL LADO DEL CÍRCULO */}
                            <div className="d-flex align-items-center gap-4 bg-dark bg-opacity-10 p-3 rounded-4 border border-white border-opacity-10">
                                <div className="d-flex flex-column gap-2 text-end">
                                    <div className="bg-dark bg-opacity-25 p-2 rounded-3 border border-secondary" style={{ minWidth: '150px' }}>
                                        <small className="d-block opacity-75 text-uppercase" style={{ fontSize: '9px' }}>Meta Global</small>
                                        <span className="fw-bold">{totalTarget}</span>
                                        <div className="opacity-50" style={{ fontSize: '10px' }}>{indicator.global_target_men}H / {indicator.global_target_women}M</div>
                                    </div>
                                    <div className="bg-dark bg-opacity-25 p-2 rounded-3 border border-success" style={{ minWidth: '150px' }}>
                                        <small className="d-block opacity-75 text-uppercase" style={{ fontSize: '9px' }}>Logro Total</small>
                                        <span className="fw-bold text-success">{totalAchieved}</span>
                                        <div className="opacity-50" style={{ fontSize: '10px' }}>{indicator.total_men}H / {indicator.total_women}M</div>
                                    </div>
                                </div>
                                <CircularImpact value={totalAchieved} target={totalTarget} />
                            </div>
                        </div>

                        {/* CUERPO DE PROVINCIAS */}
                        <div className="card-body bg-light p-4 p-md-5">
                            <div className="row g-4">
                                {indicator.provinces?.map((prov) => {
                                    const provProgress = prov.target > 0 ? (prov.achieved / prov.target) * 100 : 0;

                                    return (
                                        <div key={prov.province_id} className="col-12 col-md-6 col-lg-4">
                                            <div className="card h-100 border-0 shadow-sm p-4 bg-white"
                                                style={{ borderRadius: '20px' }}>

                                                <div className="d-flex justify-content-between align-items-start mb-3">
                                                    <div>
                                                        <small className="text-success fw-bold text-uppercase" style={{ fontSize: '9px' }}>Provincia</small>
                                                        <h5 className="fw-black m-0 text-dark">{prov.province_name}</h5>
                                                    </div>
                                                    <div className="text-end">
                                                        <small className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '8px' }}>Meta</small>
                                                        <div className="fw-bold text-dark fs-5">{prov.target}</div>
                                                        <div className="text-muted" style={{ fontSize: '10px' }}>
                                                            {prov.target_men || 0}H | {prov.target_women || 0}M
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mb-4">
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <small className="text-muted fw-bold" style={{ fontSize: '10px' }}>PROGRESO</small>
                                                        {/* PRECISIÓN: 2 decimales en el avance de provincia */}
                                                        <small className="fw-bold text-success">{provProgress.toFixed(2)}%</small>
                                                    </div>
                                                    <div className="progress" style={{ height: '8px', borderRadius: '10px' }}>
                                                        <div className="progress-bar bg-success"
                                                            style={{ width: `${Math.min(provProgress, 100)}%` }}></div>
                                                    </div>
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                                                    <div className="bg-light px-3 py-1 rounded-pill">
                                                        <small className="text-muted me-1" style={{ fontSize: '10px' }}>LOGRO:</small>
                                                        <span className="fw-bold text-dark">{prov.achieved}</span>
                                                    </div>
                                                    <div className="d-flex gap-3">
                                                        <span><i className="fas fa-mars text-primary"></i> <small className="fw-bold">{prov.men || 0}</small></span>
                                                        <span><i className="fas fa-venus text-danger"></i> <small className="fw-bold">{prov.women || 0}</small></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ProgressSummary;