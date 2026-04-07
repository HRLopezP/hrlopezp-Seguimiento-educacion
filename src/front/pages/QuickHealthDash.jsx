import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from "../components/ContextSelector"
import { toast } from 'sonner';

const QuickHealthDash = () => {
    const [indicators, setIndicators] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('criticos');

    const calcPct = (ind) => {
        const isOutcome = ind.type?.toLowerCase() === 'outcome';
        return isOutcome ? (ind.global_achieved || 0) :
            (ind.global_target > 0 ? (ind.global_achieved / ind.global_target) * 100 : 0);
    };

    const loadData = async (selection) => {
        // Verificamos que tengamos ambos IDs para que la ruta no se rompa
        if (!selection.proyectoId || !selection.competenciaId) return;

        setLoading(true);
        try {
            // USANDO EL ENDPOINT CORRECTO SEGÚN OFFICIALDASHBOARD
            const response = await apiFetch(
                `/project/${selection.proyectoId}/progress-summary?competence_id=${selection.competenciaId}`
            );

            if (response && response.ok) {
                const data = await response.json();

                // Según tu OfficialDashboard, la data llega como un array directo
                // que luego se pasa al componente ProgressSummary
                setIndicators(Array.isArray(data) ? data : []);
            } else {
                console.error("Error en la respuesta del servidor:", response.status);
            }
        } catch (error) {
            console.error("Error al conectar con el servidor:", error);
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
        const isOutcome = ind.type?.toLowerCase() === 'outcome';
        const isDep = ind.is_dependent;

        return (
            <div key={ind.id} className="col-12 col-md-6 col-lg-4 mb-3">
                <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: `5px solid ${getStatusColor(pct)}`, borderRadius: '12px' }}>
                    <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <code className="text-dark bg-light px-2 py-1 rounded small fw-bold">{ind.code}</code>
                            <span className="badge bg-dark-subtle text-dark" style={{ fontSize: '10px' }}>{ind.type}</span>
                        </div>
                        <h6 className="fw-bold text-truncate mb-3" title={ind.name}>{ind.name}</h6>

                        <div className="bg-light rounded-3 p-2 d-flex justify-content-around align-items-center">
                            <div className="text-center">
                                <div className="fw-black fs-5" style={{ color: getStatusColor(pct) }}>{pct.toFixed(1)}%</div>
                                <small className="text-muted uppercase-label" style={{ fontSize: '8px' }}>Avance</small>
                            </div>
                            <div className="vr"></div>
                            <div className="px-2">
                                <div className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '11px' }}>
                                    <i className="fas fa-mars text-primary"></i>
                                    <span className="fw-bold">{ind.total_men}{isDep ? '%' : `/${ind.global_target_men || 0}`}</span>
                                </div>
                                <div className="d-flex align-items-center gap-2" style={{ fontSize: '11px' }}>
                                    <i className="fas fa-venus text-danger"></i>
                                    <span className="fw-bold">{ind.total_women}{isDep ? '%' : `/${ind.global_target_women || 0}`}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const getStatusColor = (p) => {
        if (p <= 25) return "#e74c3c"; // Crítico
        if (p <= 50) return "#f39c12"; // Bajo
        if (p <= 80) return "#3498db"; // Progreso
        return "#27ae60"; // Avanzado 
    };

    return (
        <div className="container-fluid py-4 fade-in">
            <h3 className="fw-black mb-4"><i className="fas fa-heartbeat text-emerald me-2"></i>Estado de Salud de Indicadores</h3>

            <ContextSelector onContextChange={loadData} />

            {indicators.length > 0 && (
                <div className="mt-4">
                    {/* Navegación de Pestañas */}
                    <ul className="nav nav-pills nav-fill mb-4 bg-white p-2 rounded-4 shadow-sm border">
                        {Object.keys(groups).map(key => (
                            <li className="nav-item" key={key}>
                                <button
                                    className={`nav-link rounded-3 text-uppercase fw-bold ${activeTab === key ? 'active bg-emerald shadow' : 'text-muted'}`}
                                    onClick={() => setActiveTab(key)}
                                    style={{ fontSize: '12px' }}
                                >
                                    {key} <span className="badge bg-light text-dark ms-1">{groups[key].length}</span>
                                </button>
                            </li>
                        ))}
                    </ul>

                    {/* Contenedor de Tarjetas */}
                    <div className="row">
                        {loading ? (
                            <div className="text-center p-5"><div className="spinner-border text-emerald"></div></div>
                        ) : groups[activeTab].length > 0 ? (
                            groups[activeTab].map(renderMiniCard)
                        ) : (
                            <div className="text-center p-5 text-muted">
                                <i className="fas fa-check-circle fa-3x mb-3 opacity-25"></i>
                                <p>No hay indicadores en esta categoría para este proyecto.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickHealthDash;