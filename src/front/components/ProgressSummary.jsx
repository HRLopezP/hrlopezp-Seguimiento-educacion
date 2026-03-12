import React, { useState } from 'react';
import "../styles/ProgressSummary.css";

// 1. LÓGICA CENTRALIZADA
const getStatusColor = (percentage) => {
    if (percentage <= 25) return "#e74c3c"; // Rojo crítico
    if (percentage <= 50) return "#f39c12"; // Naranja bajo
    if (percentage <= 75) return "#f1c40f"; // Amarillo en proceso
    if (percentage < 100) return "#2ecc71"; // Verde éxito
    return "#3498db"; // Azul meta superada
};

// Componente circular actualizado
const CircularImpact = ({ percentage, isGoalReached }) => {
    const radius = 36;
    const dash = 2 * Math.PI * radius;
    const offset = dash - (dash * Math.min(percentage, 100)) / 100;
    const dynamicColor = getStatusColor(percentage);

    return (
        <div 
            className={isGoalReached ? "goal-reached-pulse" : ""}
            style={{
                position: 'relative', width: '100px', height: '100px',
                backgroundColor: '#2c3e50', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `4px solid ${isGoalReached ? dynamicColor : '#34495e'}`, 
                boxShadow: isGoalReached ? `0 0 20px ${dynamicColor}66` : '0 10px 25px rgba(0,0,0,0.3)',
                flexShrink: 0,
                transition: 'all 0.5s ease'
            }}
        >
            {/* El trofeo ahora depende de la prop isGoalReached */}
            {isGoalReached && (
                <div style={{
                    position: 'absolute', top: '-10px', right: '-5px',
                    backgroundColor: '#f1c40f', borderRadius: '50%',
                    width: '24px', height: '24px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', color: '#2c3e50', border: '2px solid white',
                    zIndex: 2, animation: 'bounce 2s infinite'
                }}>
                    <i className="fas fa-trophy"></i>
                </div>
            )}

            <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="transparent" />
                <circle
                    cx="50" cy="50" r={radius} 
                    stroke={dynamicColor} 
                    strokeWidth="8" fill="transparent"
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
    const [searchTerm, setSearchTerm] = useState("");
    const [rangeFilter, setRangeFilter] = useState("all");

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const calcPct = (indicator) => {
        const isOutcome = indicator.type?.toLowerCase() === 'outcome';
        // Si es outcome y dependiente, el valor ya es un porcentaje (ej: 92.3)
        return isOutcome ? (indicator.global_achieved || 0) :
            (indicator.global_target > 0 ? (indicator.global_achieved / indicator.global_target) * 100 : 0);
    };

    const filteredData = data?.filter(indicator => {
        const percentage = calcPct(indicator);
        const matchesText = indicator.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            indicator.code.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesRange = true;
        if (rangeFilter === "0-25") matchesRange = percentage <= 25;
        else if (rangeFilter === "25-50") matchesRange = percentage > 25 && percentage <= 50;
        else if (rangeFilter === "50-75") matchesRange = percentage > 50 && percentage <= 75;
        else if (rangeFilter === "75-100") matchesRange = percentage > 75 && percentage <= 100;
        else if (rangeFilter === "100+") matchesRange = percentage >= 100;

        return matchesText && matchesRange;
    });

    if (!data || data.length === 0) return (
        <div className="text-center p-5 mt-5 border rounded-4 bg-light shadow-sm">
            <i className="fas fa-chart-pie fa-3x mb-3 text-muted opacity-50"></i>
            <p className="text-muted italic">Esperando datos de indicadores para este proyecto...</p>
        </div>
    );

    return (
        <div className="container-fluid py-4">
            {/* Filtros omitidos por brevedad, se mantienen igual que tu código original */}
            <div className="row mb-4 g-3">
                <div className="col-12 col-md-6">
                    <div className="input-group shadow-sm" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                        <span className="input-group-text bg-white border-end-0">
                            <i className="fas fa-search text-muted"></i>
                        </span>
                        <input 
                            type="text" 
                            className="form-control border-start-0 ps-0" 
                            placeholder="Buscar por nombre o código..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ boxShadow: 'none', height: '50px' }}
                        />
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <select 
                        className="form-select shadow-sm" 
                        style={{ 
                            borderRadius: '15px', height: '50px', cursor: 'pointer',
                            borderLeft: `8px solid ${rangeFilter === 'all' ? '#ddd' : getStatusColor(parseInt(rangeFilter.split('-')[1] || 101))}`
                        }}
                        value={rangeFilter}
                        onChange={(e) => setRangeFilter(e.target.value)}
                    >
                        <option value="all">Todos los porcentajes</option>
                        <option value="0-25">Críticos (0% - 25%)</option>
                        <option value="25-50">Bajos (25% - 50%)</option>
                        <option value="50-75">En proceso (50% - 75%)</option>
                        <option value="75-100">Cercanos al éxito (75% - 100%)</option>
                        <option value="100+">Meta alcanzada (100%+)</option>
                    </select>
                </div>
            </div>

            {filteredData.length === 0 ? (
                <div className="text-center p-5 text-muted">No se encontraron indicadores con esos filtros.</div>
            ) : (
                filteredData.map((indicator) => {
                    const isOutcome = indicator.type?.toLowerCase() === 'outcome';
                    const isDep = indicator.is_dependent;
                    const isExpanded = expandedId === indicator.id;
                    const globalPercentage = calcPct(indicator);
                    
                    // LÓGICA DE TROFEO GLOBAL: Si es outcome, comparamos logro vs meta global. Si es output, comparamos porcentaje vs 100.
                    const globalGoalReached = isOutcome 
                        ? (indicator.global_achieved >= indicator.global_target)
                        : (globalPercentage >= 100);

                    return (
                        <div key={indicator.id} className={`card indicator-card border-0 shadow-lg mb-4 ${isExpanded ? 'is-active' : ''}`} style={{ borderRadius: '25px', overflow: 'hidden' }}>
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
                                            className="bg-dark bg-opacity-25 p-2 rounded-3 border"
                                            style={{ minWidth: '120px', borderColor: getStatusColor(globalPercentage) }}
                                        >
                                            <small className="d-block opacity-75 text-uppercase" style={{ fontSize: '9px' }}>Logro Total</small>
                                            <span className="fw-bold" style={{ color: getStatusColor(globalPercentage) }}>
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
                                    {/* Pasamos la condición de éxito al componente circular */}
                                    <CircularImpact percentage={globalPercentage} isGoalReached={globalGoalReached} />
                                </div>
                            </div>

                            <div className={`accordion-collapse-custom ${isExpanded ? 'is-expanded' : ''}`}>
                                <div className="accordion-content-wrapper">
                                    <div className="card-body bg-light p-4 p-md-5">
                                        <div className="row g-4">
                                            {indicator.provinces?.filter(p => p.target > 0).map((prov) => {
                                                const provProgress = isOutcome ? (prov.achieved || 0) : (prov.target > 0 ? (prov.achieved / prov.target) * 100 : 0);
                                                const provColor = getStatusColor(provProgress);
                                                
                                                // LÓGICA DE TROFEO PARA PROVINCIA
                                                const provGoalReached = isOutcome 
                                                    ? (prov.achieved >= prov.target)
                                                    : (provProgress >= 100);

                                                const mProvMissing = Math.max(0, (prov.target_men || 0) - (prov.men || 0));
                                                const wProvMissing = Math.max(0, (prov.target_women || 0) - (prov.women || 0));
                                                const totalProvMissing = Math.max(0, (prov.target || 0) - (prov.achieved || 0));
                                                const provTooltipText = !isOutcome ? `Pendiente: ${totalProvMissing} (${mProvMissing}H / ${wProvMissing}M)` : null;

                                                return (
                                                    <div key={prov.province_id} className="col-12 col-md-6 col-lg-4">
                                                        <div className="card h-100 border-0 shadow-sm p-4 bg-white" style={{ borderRadius: '20px' }}>
                                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                                <div>
                                                                    <small className="fw-bold text-uppercase" style={{ fontSize: '9px', color: provColor }}>Provincia</small>
                                                                    <h5 className="fw-black m-0 text-dark">
                                                                        {prov.province_name}
                                                                        {/* Pequeño trofeo discreto en la provincia */}
                                                                        {provGoalReached && <i className="fas fa-trophy ms-2" style={{ color: '#f1c40f', fontSize: '14px' }}></i>}
                                                                    </h5>
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
                                                                    <small className="fw-bold" style={{ color: provColor }}>
                                                                        {provProgress.toFixed(2)}%
                                                                    </small>
                                                                </div>
                                                                <div
                                                                    className={`progress ${provTooltipText ? 'custom-tooltip' : ''}`}
                                                                    style={{ height: '8px', borderRadius: '10px' }}
                                                                    data-tooltip={provTooltipText}
                                                                >
                                                                    <div className="progress-bar"
                                                                        style={{ 
                                                                            width: `${Math.min(provProgress, 100)}%`, 
                                                                            transition: 'width 1s ease-in-out',
                                                                            backgroundColor: provColor 
                                                                        }}></div>
                                                                </div>
                                                            </div>

                                                            <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                                                                <div className={`bg-light px-3 py-1 rounded-pill ${provTooltipText ? 'custom-tooltip' : ''}`} 
                                                                     data-tooltip={provTooltipText}>
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
                })
            )}
        </div>
    );
};

export default ProgressSummary;