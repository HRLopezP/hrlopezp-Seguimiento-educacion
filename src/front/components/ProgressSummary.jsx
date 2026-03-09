import React from 'react';

const CircularImpact = ({ value, target }) => {
    const percentage = target > 0 ? Math.min(Math.max((value / target) * 100, 0), 100) : 0;
    const radius = 36;
    const dash = 2 * Math.PI * radius;
    const offset = dash - (dash * percentage) / 100;

    return (
        <div style={{
            position: 'relative', width: '110px', height: '110px', 
            backgroundColor: '#2c3e50', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '4px solid #34495e', boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}>
            <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle cx="55" cy="55" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="transparent" />
                <circle
                    cx="55" cy="55" r={radius} stroke="#2ecc71" strokeWidth="8" fill="transparent"
                    strokeDasharray={dash}
                    style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1.5s ease' }}
                    strokeLinecap="round"
                />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', lineHeight: '1' }}>{Math.round(percentage)}%</div>
                <div style={{ fontSize: '8px', textTransform: 'uppercase', opacity: '0.7', fontWeight: 'bold' }}>Impacto</div>
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
                             style={{ backgroundColor: '#34495e', color: 'white', position: 'relative' }}>
                            
                            <div style={{ zIndex: 1 }}>
                                <div className="d-flex align-items-center gap-2 mb-3 justify-content-center justify-content-md-start">
                                    <span className={`badge rounded-pill ${isOutcome ? 'bg-info' : 'bg-success'}`} 
                                          style={{ padding: '8px 15px', fontSize: '10px', textTransform: 'uppercase' }}>
                                        {indicator.type || 'Indicador'}
                                    </span>
                                    <code className="text-light opacity-75 bg-dark px-2 py-1 rounded" style={{ fontSize: '12px' }}>
                                        {indicator.code}
                                    </code>
                                </div>
                                <h3 className="fw-black mb-2 text-uppercase tracking-tight" style={{ fontSize: '1.8rem' }}>{indicator.name}</h3>
                                <p className="opacity-75 mb-0 fst-italic" style={{ maxWidth: '600px', fontSize: '0.9rem' }}>
                                    "{indicator.description}"
                                </p>
                            </div>

                            <CircularImpact value={totalAchieved} target={totalTarget} />
                        </div>

                        {/* CUERPO DE PROVINCIAS */}
                        <div className="card-body bg-light p-4 p-md-5">
                            <div className="d-flex align-items-center gap-2 mb-4">
                                <div style={{ width: '6px', height: '24px', backgroundColor: '#2ecc71', borderRadius: '10px' }}></div>
                                <h5 className="m-0 fw-bold text-secondary text-uppercase" style={{ letterSpacing: '2px', fontSize: '0.9rem' }}>
                                    Distribución Territorial
                                </h5>
                            </div>
                            
                            <div className="row g-4">
                                {indicator.provinces?.map((prov) => {
                                    const provProgress = prov.target > 0 ? (prov.achieved / prov.target) * 100 : 0;
                                    
                                    return (
                                        <div key={prov.province_id} className="col-12 col-md-6 col-lg-4">
                                            <div className="card h-100 border-0 shadow-sm p-4 hover-shadow-transition" 
                                                 style={{ borderRadius: '20px', transition: 'all 0.3s' }}>
                                                
                                                <div className="d-flex justify-content-between align-items-start mb-4">
                                                    <div>
                                                        <small className="text-success fw-bold text-uppercase" style={{ fontSize: '9px', letterSpacing: '1px' }}>Provincia</small>
                                                        <h5 className="fw-black m-0 text-dark">{prov.province_name}</h5>
                                                    </div>
                                                    <div className="text-end bg-light p-2 rounded-3">
                                                        <small className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '8px' }}>Meta</small>
                                                        <span className="fw-bold">{prov.target.toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                {/* BARRA DE PROGRESO */}
                                                <div className="mb-4">
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <small className="text-muted fw-bold" style={{ fontSize: '10px' }}>AVANCE</small>
                                                        <small className="fw-bold text-success">{Math.round(provProgress)}%</small>
                                                    </div>
                                                    <div className="progress" style={{ height: '12px', borderRadius: '10px', backgroundColor: '#e9ecef' }}>
                                                        <div 
                                                            className="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                                                            role="progressbar" 
                                                            style={{ width: `${Math.min(provProgress, 100)}%`, borderRadius: '10px' }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                {/* DEMOGRAFÍA */}
                                                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                                                    <div className="bg-light px-3 py-1 rounded-pill">
                                                        <small className="text-muted me-2" style={{ fontSize: '10px' }}>LOGRO:</small>
                                                        <span className="fw-bold text-dark">{prov.achieved.toLocaleString()}</span>
                                                    </div>
                                                    <div className="d-flex gap-3">
                                                        <div className="text-center">
                                                            <i className="fas fa-mars text-primary d-block mb-1" style={{ fontSize: '10px' }}></i>
                                                            <small className="fw-bold">{prov.men || 0}</small>
                                                        </div>
                                                        <div className="text-center">
                                                            <i className="fas fa-venus text-danger d-block mb-1" style={{ fontSize: '10px' }}></i>
                                                            <small className="fw-bold">{prov.women || 0}</small>
                                                        </div>
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