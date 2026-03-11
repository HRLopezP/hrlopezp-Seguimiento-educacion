import React from 'react';
import "../styles/ProgressSummary.css"

const CircularImpact = ({ percentage }) => {
    const radius = 36;
    const dash = 2 * Math.PI * radius;
    const offset = dash - (dash * Math.min(percentage, 100)) / 100;

    return (
        <div style={{
            position: 'relative', width: '120px', height: '120px',
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
        <div className="container-fluid py-4">
            {data.map((indicator) => {
                const isOutcome = indicator.type?.toLowerCase() === 'outcome';
                const isDep = indicator.is_dependent;

                // 1. Lógica de Porcentaje Global
                const globalPercentage = isOutcome ? (indicator.global_achieved || 0) :
                    (indicator.global_target > 0 ? (indicator.global_achieved / indicator.global_target) * 100 : 0);

                // 2. Cálculos para Tooltips Globales (Solo para Outputs/No dependientes)
                const missingTotal = (indicator.global_target || 0) - (indicator.global_achieved || 0);
                const missingMenGlobal = (indicator.global_target_men || 0) - (indicator.total_men || 0);
                const missingWomenGlobal = (indicator.global_target_women || 0) - (indicator.total_women || 0);

                return (
                    <div key={indicator.id} className="card border-0 shadow-lg mb-5" style={{ borderRadius: '25px', overflow: 'hidden' }}>
                        {/* HEADER */}
                        <div className="p-4 p-md-5 d-flex flex-column flex-md-row justify-content-between align-items-center gap-4"
                            style={{ backgroundColor: '#34495e', color: 'white' }}>

                            <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <span className={`badge rounded-pill ${isOutcome ? 'bg-info' : 'bg-success'}`}>
                                        {indicator.type}
                                    </span>
                                    <code className="text-light opacity-75 bg-dark px-2 py-1 rounded">{indicator.code}</code>
                                </div>
                                <h3 className="fw-black mb-2 text-uppercase">{indicator.name}</h3>
                                <p className="opacity-75 mb-0 fst-italic">"{indicator.description}"</p>
                            </div>

                            {/* CONTADORES GLOBALES */}
                            <div className="d-flex align-items-center gap-4 bg-dark bg-opacity-10 p-3 rounded-4 border border-white border-opacity-10">
                                <div className="d-flex flex-column gap-2 text-end">
                                    <div className="bg-dark bg-opacity-25 p-2 rounded-3 border border-secondary" style={{ minWidth: '150px' }}>
                                        <small className="d-block opacity-75 text-uppercase" style={{ fontSize: '9px' }}>Meta Global</small>
                                        <span className="fw-bold">{indicator.global_target}{isOutcome && isDep ? '%' : ''}</span>
                                        {!isDep && !isOutcome && (
                                            <div className="opacity-50" style={{ fontSize: '10px' }}>
                                                {indicator.global_target_men}H / {indicator.global_target_women}M
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className={`bg-dark bg-opacity-25 p-2 rounded-3 border border-success ${(!isDep && !isOutcome) ? 'custom-tooltip' : ''}`}
                                        style={{ minWidth: '150px' }}
                                        data-tooltip={(!isDep && !isOutcome) ? `Faltan ${Math.max(0, missingTotal)} (${Math.max(0, missingMenGlobal)}H y ${Math.max(0, missingWomenGlobal)}M)` : undefined}
                                    >
                                        <small className="d-block opacity-75 text-uppercase" style={{ fontSize: '9px' }}>Logro Total</small>
                                        <span className="fw-bold text-success">
                                            {indicator.global_achieved}{isOutcome && isDep ? '%' : ''}
                                        </span>
                                        <div className="opacity-50" style={{ fontSize: '10px' }}>
                                            {isOutcome && !isDep ? (
                                                // Punto 4: Mostrar totales sumados de población
                                                `${indicator.total_approved} Aprob. / ${indicator.total_attended} Tot.`
                                            ) : (
                                                // Mantener género para los demás
                                                `${indicator.total_men}${isDep ? '%' : ''} H / ${indicator.total_women}${isDep ? '%' : ''} M`
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <CircularImpact percentage={globalPercentage} />
                            </div>
                        </div>

                        {/* CUERPO - PROVINCIAS */}
                        <div className="card-body bg-light p-4 p-md-5">
                            <div className="row g-4">
                                {indicator.provinces?.filter(p => p.target > 0).map((prov) => {
                                    // 3. Progreso por provincia
                                    const provProgress = isOutcome ? (prov.achieved || 0) : (prov.target > 0 ? (prov.achieved / prov.target) * 100 : 0);

                                    // 4. Lógica de Alerta Amarilla (Crítico < 10%)
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
                                                                <i className="fas fa-exclamation-triangle text-warning custom-tooltip"
                                                                    data-tooltip={`¡Atención! Pendiente: ${Math.max(0, prov.target - prov.achieved)} (${Math.max(0, mProv)}H / ${Math.max(0, wProv)}M)`}></i>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        <small className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '8px' }}>Meta</small>
                                                        <div className="fw-bold text-dark fs-5">{prov.target}{isOutcome && isDep ? '%' : ''}</div>
                                                        {/* 5. Meta Desagregada por Provincia (Punto 3 de tu lista) */}
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
                                                            style={{ width: `${Math.min(provProgress, 100)}%` }}></div>
                                                    </div>
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                                                    <div className="bg-light px-3 py-1 rounded-pill">
                                                        <small className="text-muted me-1" style={{ fontSize: '10px' }}>LOGRO:</small>
                                                        <span className="fw-bold text-dark">{prov.achieved}{isOutcome && isDep ? '%' : ''}</span>
                                                    </div>
                                                    <div className="d-flex gap-3">
                                                        {isOutcome && !isDep ? (
                                                            // Punto 3: Eliminar géneros y poner población
                                                            <>
                                                                <span title="Aprobados"><i className="fas fa-user-check text-success"></i> <small className="fw-bold">{prov.approved}</small></span>
                                                                <span title="Población Total"><i className="fas fa-users text-primary"></i> <small className="fw-bold">{prov.attended}</small></span>
                                                            </>
                                                        ) : (
                                                            // Mantener lo anterior para lo que ya funciona
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
                );
            })}
        </div>
    );
};

export default ProgressSummary;