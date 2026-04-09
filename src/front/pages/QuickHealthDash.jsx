import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from "../components/ContextSelector"
import { toast } from 'sonner';
import RadialProgress from "../components/RadialProgress"
import GaugeProgress from "../components/GaugeProgress"
import GraduatedGauge from "../components/GraduatedGauge"

const QuickHealthDash = () => {
    const [indicators, setIndicators] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('criticos');

    const calcPct = (ind) => {
        const isOutcome = ind.type?.toLowerCase() === 'outcome';
        return isOutcome ? (ind.global_achieved || 0) :
            (ind.global_target > 0 ? (ind.global_achieved / ind.global_target) * 100 : 0);
    };

    const getStatusColor = (value) => {
        const key = typeof value === 'string' ? value :
            (value <= 25 ? 'criticos' :
                value <= 50 ? 'bajos' :
                    value <= 80 ? 'progreso' : 'avanzados');

        const statusMap = {
            criticos: { hex: "#ef4444", bootstrap: "bg-danger" },
            bajos: { hex: "#f39c12", bootstrap: "bg-warning" },
            progreso: { hex: "#3a86ff", bootstrap: "bg-primary" },
            avanzados: { hex: "#10b981", bootstrap: "bg-emerald" }
        };
        return statusMap[key] || { hex: "#6c757d", bootstrap: "bg-secondary" };
    };

    const loadData = async (selection) => {
        if (!selection.proyectoId || !selection.competenciaId) return;
        setLoading(true);
        try {
            const response = await apiFetch(
                `/project/${selection.proyectoId}/progress-summary?competence_id=${selection.competenciaId}`
            );
            if (response && response.ok) {
                const data = await response.json();
                setIndicators(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error al conectar:", error);
            toast.error("No se pudo conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    const groups = {
        criticos: indicators.filter(i => calcPct(i) <= 25),
        bajos: indicators.filter(i => calcPct(i) > 25 && calcPct(i) <= 50),
        progreso: indicators.filter(i => calcPct(i) > 50 && calcPct(i) <= 80),
        avanzados: indicators.filter(i => calcPct(i) > 80)
    };

    const renderMiniCard = (ind) => {
        const pct = calcPct(ind);
        const colorData = getStatusColor(pct);
        const isOutcome = ind.type?.toLowerCase() === 'outcome';
        const isDep = ind.is_dependent;

        return (
            <div key={ind.id} className="col-12 col-md-6 col-lg-2 mb-3">
                <div className="card h-100 border-0 shadow-sm"
                    style={{
                        borderLeft: `5px solid ${colorData.hex}`,
                        borderRadius: '12px'
                    }}>

                    <div className="card-header bg-oxford py-2 px-3 d-flex justify-content-between align-items-center"
                        style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                        <code className="text-white opacity-75 small fw-bold">{ind.code}</code>
                        <span className="badge bg-light text-dark uppercase-label" style={{ fontSize: '10px' }}>
                            {ind.type}
                        </span>
                    </div>

                    <div className="card-body p-3">
                        <h6 className="fw-bold text-oxford text-truncate mb-3" title={ind.name}>
                            {ind.name}
                        </h6>

                        {/* LOGRO VS META GLOBAL 1 (circular) */}
                        {/* <div className="d-flex justify-content-center align-items-center mb-3 py-2 bg-light rounded-3 border">
                            <RadialProgress
                                percentage={pct}
                                color={colorData.hex}
                                size={110}
                            />

                            <div className="ms-3 text-start">
                                <div className="mb-1">
                                    <small className="d-block text-muted text-uppercase fw-black" style={{ fontSize: '8px' }}>Logrado</small>
                                    <span className="fw-bold" style={{ color: colorData.hex }}>{ind.global_achieved}</span>
                                </div>
                                <div>
                                    <small className="d-block text-muted text-uppercase fw-black" style={{ fontSize: '8px' }}>Meta Total</small>
                                    <span className="fw-bold text-oxford">{ind.global_target}</span>
                                </div>
                            </div>
                        </div> */}

                        {/* LOGRO VS META GLOBAL 2 (circular) */}

                        <div className="d-flex align-items-center mb-3 py-1 px-2 bg-light rounded-3 border">

                            {/* El velocímetro a la izquierda, más compacto */}
                            <GaugeProgress
                                percentage={pct}
                                color={colorData.hex}
                                size={100} // Un tamaño más pequeño y manejable
                            />

                            {/* Datos a la derecha, bien alineados */}
                            <div className="ms-3 flex-grow-1">
                                <div className="mb-1 d-flex justify-content-between">
                                    <small className="text-muted text-uppercase fw-black" style={{ fontSize: '8px' }}>Logrado:</small>
                                    <span className="fw-bold fs-6" style={{ color: colorData.hex }}>{ind.global_achieved}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <small className="text-muted text-uppercase fw-black" style={{ fontSize: '8px' }}>Meta:</small>
                                    <span className="fw-bold text-oxford fs-6">{ind.global_target}</span>
                                </div>
                            </div>
                        </div>

                        {/* Modelo anterior */}
                        {/* <div className="bg-light rounded-3 p-3 mb-3 d-flex justify-content-around align-items-center border">
                            <div className="text-center">
                                <small className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '8px' }}>Logro</small>
                                <div className="fw-black fs-5" style={{ color: colorData.hex }}>
                                    {ind.global_achieved}{isOutcome ? '%' : ''}
                                </div>
                                {!isOutcome && (
                                    <small className="fw-bold d-block" style={{ color: colorData.hex, fontSize: '10px', opacity: '0.8' }}>
                                        {pct.toFixed(1)}%
                                    </small>
                                )}
                            </div>

                            <div className="vr opacity-25" style={{ height: '30px' }}></div>

                            <div className="text-center">
                                <small className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '8px' }}>Meta</small>
                                <div className="fw-bold text-oxford fs-5">
                                    {ind.global_target}{isOutcome ? '%' : ''}
                                </div>
                                {!isOutcome && <div style={{ height: '15px' }}></div>}
                            </div>
                        </div> */}

                        {/* DESAGREGACIÓN POR GÉNERo*/}
                        <div className='text-center '>
                            <small className="text-mutedfw-bold uppercase-label" style={{ fontSize: '9px' }}>
                                Desglose:
                            </small>
                        </div>
                        <div className="d-flex justify-content-between align-items-center pt-2 border-top">

                            <div className="d-flex gap-3">
                                {isOutcome && !isDep ? (
                                    /* CASO 1: Outcome Independiente (Aprobados / Atendidos) */
                                    <>
                                        <span title="Aprobados">
                                            <i className="fas fa-user-check text-success me-1"></i>
                                            <small className="fw-bold text-oxford">{ind.total_approved || 0}</small>
                                        </span>
                                        <span title="Población Total">
                                            <i className="fas fa-users text-primary me-1"></i>
                                            <small className="fw-bold text-oxford">{ind.total_attended || 0}</small>
                                        </span>
                                    </>
                                ) : (
                                    /* CASO 2 y 3: Outcome Dep (%) o Output (Logro / Meta) */
                                    <>
                                        <span>
                                            <i className="fas fa-mars text-primary me-1"></i>
                                            <small className="fw-bold text-oxford">
                                                {isDep ? `${ind.total_men}%` : `${ind.total_men} / ${ind.global_target_men || 0}`}
                                            </small>
                                        </span>
                                        <span>
                                            <i className="fas fa-venus text-danger me-1"></i>
                                            <small className="fw-bold text-oxford">
                                                {isDep ? `${ind.total_women}%` : `${ind.total_women} / ${ind.global_target_women || 0}`}
                                            </small>
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="container-fluid py-4 fade-in">
            <h3 className="fw-black mb-4 text-oxford">
                <i className="fas fa-heartbeat text-emerald me-2"></i>Estado de Salud
            </h3>

            <ContextSelector onContextChange={loadData} />

            {indicators.length > 0 && (
                <div className="mt-4">
                    <ul className="nav nav-pills nav-fill mb-4 bg-white p-2 rounded-4 shadow-sm border">
                        {Object.keys(groups).map(key => {
                            const colorData = getStatusColor(key);
                            return (
                                <li className="nav-item" key={key}>
                                    <button
                                        className={`nav-link rounded-3 text-uppercase fw-bold m-1 ${activeTab === key ? `active ${colorData.bootstrap} shadow` : 'text-muted'}`}
                                        onClick={() => setActiveTab(key)}
                                        style={{ fontSize: '11px', transition: 'all 0.3s' }}
                                    >
                                        {key} <span className="badge bg-white text-dark ms-1">{groups[key].length}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="row">
                        {loading ? (
                            <div className="text-center p-5">
                                <div className="spinner-border text-emerald"></div>
                            </div>
                        ) : groups[activeTab].length > 0 ? (
                            groups[activeTab].map(renderMiniCard)
                        ) : (
                            <div className="text-center p-5 text-muted">
                                <i className="fas fa-check-circle fa-3x mb-3 opacity-25"></i>
                                <p>No hay indicadores en esta categoría.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickHealthDash;