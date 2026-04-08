import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from "../components/ContextSelector"
import { toast } from 'sonner';

const QuickHealthDash = () => {
    const [indicators, setIndicators] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('criticos');

    // --- FUNCIONES DE APOYO ---

    const calcPct = (ind) => {
        const isOutcome = ind.type?.toLowerCase() === 'outcome';
        // Si es outcome, el valor ya suele venir como porcentaje
        return isOutcome ? (ind.global_achieved || 0) :
            (ind.global_target > 0 ? (ind.global_achieved / ind.global_target) * 100 : 0);
    };

    const getStatusColor = (value) => {
        // Detecta si es el nombre de la pestaña (string) o un porcentaje (number)
        const key = typeof value === 'string' ? value :
            (value <= 25 ? 'criticos' :
                value <= 50 ? 'bajos' :
                    value <= 80 ? 'progreso' : 'avanzados');

        const statusMap = {
            criticos: { hex: "#ef4444", bootstrap: "bg-danger" },   // Rojo
            bajos: { hex: "#f39c12", bootstrap: "bg-warning" },    // Naranja/Amarillo
            progreso: { hex: "#3a86ff", bootstrap: "bg-primary" },  // Azul
            avanzados: { hex: "#10b981", bootstrap: "bg-emerald" }  // Esmeralda (SIGSSEP)
        };

        return statusMap[key] || { hex: "#6c757d", bootstrap: "bg-secondary" };
    };

    // --- LÓGICA DE DATOS ---

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

    // --- RENDERIZADO DE COMPONENTES ---

    const renderMiniCard = (ind) => {
        const pct = calcPct(ind);
        const colorData = getStatusColor(pct);
        const isOutcome = ind.type?.toLowerCase() === 'outcome';

        return (
            <div key={ind.id} className="col-12 col-md-6 col-lg-4 mb-3">
                <div className="card h-100 border-0 shadow-sm"
                    style={{
                        borderLeft: `5px solid ${colorData.hex}`,
                        borderRadius: '12px'
                    }}>

                    {/* MEJORA 1: Encabezado Oxford Grey */}
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

                        <div className="bg-light rounded-3 p-2 d-flex justify-content-around align-items-center">
                            <div className="text-center">
                                {/* Usamos el color hexadecimal dinámico para el número */}
                                <div className="fw-black fs-5" style={{ color: colorData.hex }}>
                                    {pct.toFixed(1)}%
                                </div>
                                <small className="text-muted uppercase-label" style={{ fontSize: '8px' }}>Avance</small>
                            </div>

                            <div className="vr"></div>

                            {/* MEJORA 2: Formato Total / Meta */}
                            <div className="px-2">
                                <div className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '11px' }}>
                                    <i className="fas fa-mars text-primary"></i>
                                    <span className="fw-bold text-oxford">
                                        {ind.total_men}{isOutcome ? '%' : ''} / {ind.global_target_men || 0}{isOutcome ? '%' : ''}
                                    </span>
                                </div>
                                <div className="d-flex align-items-center gap-2" style={{ fontSize: '11px' }}>
                                    <i className="fas fa-venus text-danger"></i>
                                    <span className="fw-bold text-oxford">
                                        {ind.total_women}{isOutcome ? '%' : ''} / {ind.global_target_women || 0}{isOutcome ? '%' : ''}
                                    </span>
                                </div>
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
                    {/* MEJORA 3: Pestañas con colores dinámicos */}
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