import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from "../components/ContextSelector"
import { toast } from 'sonner';
import RadialProgress from "../components/RadialProgress"
import GaugeProgress from "../components/GaugeProgress"
import GraduatedGauge from "../components/GraduatedGauge"
import { generateHealthReport } from "../../utils/pdfGenerator"

const QuickHealthDash = () => {
    const [indicators, setIndicators] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('criticos');
    const [projectInfo, setProjectInfo] = useState(null);

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


    const getIndicatorTypeColor = (type) => {
        const lowerType = type?.toLowerCase();
        if (lowerType === 'outcome') {
            return 'bg-primary text-white'; // Azul para Outcomes
        } else if (lowerType === 'output') {
            return 'bg-success text-white'; // Verde para Outputs
        }
        return 'bg-secondary text-white'; // Gris por defecto si no se reconoce
    };

    const loadData = async (selection) => {
        // 1. Validación original: Si no hay proyecto o competencia, no hacemos nada
        if (!selection?.proyectoId || !selection?.competenciaId) return;

        setLoading(true);
        try {
            // 2. Construimos la URL con ambos parámetros
            // competence_id -> para filtrar los indicadores
            // extended=true -> para que el backend nos envíe el objeto con project_info
            const url = `/project/${selection.proyectoId}/progress-summary?competence_id=${selection.competenciaId}&extended=true`;

            const response = await apiFetch(url);

            // 3. Verificamos la respuesta y procesamos el JSON
            if (response && response.ok) {
                const data = await response.json();

                // 4. Como usamos 'extended=true', data ahora es un objeto { project_info, indicators }
                // Usamos validaciones por si acaso la data no viene como esperamos
                if (data && data.indicators) {
                    setIndicators(data.indicators);
                    setProjectInfo(data.project_info);
                } else {
                    // En caso de que por algún motivo no venga el formato extendido, 
                    // nos protegemos asumiendo que es la lista simple
                    setIndicators(Array.isArray(data) ? data : []);
                    setProjectInfo(null);
                }
            } else {
                toast.error("Error en la respuesta del servidor");
            }
        } catch (error) {
            console.error("Error al conectar:", error);
            toast.error("No se pudo conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    const getRemainingDays = (endDate) => {
        if (!endDate) return 0;
        const today = new Date();
        const target = new Date(endDate);

        // Resetear horas para cálculo exacto por días
        today.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);

        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };


    const handleDownloadPDF = () => {
        if (!indicators.length) {
            toast.error("No hay datos para exportar");
            return;
        }

        const toastId = toast.loading("Preparando PDF elegante...");
        try {
            // Llamamos a la función externa pasando la data procesada
            generateHealthReport(projectInfo, groups);
            toast.success("Reporte descargado", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Error al generar PDF", { id: toastId });
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
        const unit = isOutcome ? '%' : '';
        const typeColorClass = getIndicatorTypeColor(ind.type);

        return (
            <div key={ind.id} className="col-12 col-sm-6 col-md-3 col-lg-2 my-3 mx-2">
                <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden"
                    style={{
                        borderLeft: `5px solid ${colorData.hex}`,
                        borderRadius: '12px'
                    }}>

                    <div className="card-header bg-oxford py-2 px-3 d-flex justify-content-between align-items-center"
                        style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                        <code className="text-white opacity-75 small fw-bold">{ind.code}</code>
                        <span className={`badge ${typeColorClass} rounded-pill px-2 py-1 text-uppercase fw-bold`} style={{ fontSize: '9px', letterSpacing: '0.3px' }}>
                            {ind.type}
                        </span>
                    </div>

                    <div className="card-body p-3">
                        <h6 className="fw-bold text-oxford text-truncate mb-3" title={ind.name}
                            style={{ fontSize: '15px', lineHeight: '1.2', cursor: 'help' }}>
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
                                    <span className="fw-bold fs-6" style={{ color: colorData.hex }}>{ind.global_achieved}{unit}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <small className="text-muted text-uppercase fw-black" style={{ fontSize: '8px' }}>Meta:</small>
                                    <span className="fw-bold text-oxford fs-6">{ind.global_target}{unit}</span>
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
                        <div className="d-flex justify-content-center align-items-center pt-2 border-top">

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
            {projectInfo && (
                <div className="card border-0 shadow-sm mb-4 overflow-hidden" style={{ borderRadius: '15px' }}>
                    <div className="card-body p-0">
                        <div className="d-flex align-items-stretch">
                            {/* Indicador de Status Izquierdo */}
                            <div className="bg-emerald px-2"></div>

                            <div className="p-3 d-flex justify-content-between align-items-center w-100">
                                <div>
                                    <small className="text-muted text-uppercase fw-black" style={{ fontSize: '10px', letterSpacing: '1px' }}>
                                        Cronograma del Proyecto
                                    </small>
                                    <h5 className="text-oxford fw-black mb-0">{projectInfo.name}</h5>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <button
                                        className="btn btn-oxford text-white shadow-sm"
                                        onClick={handleDownloadPDF}
                                        disabled={loading || !indicators.length}
                                    >
                                        <i className="fas fa-file-pdf me-2"></i>Descargar Reporte
                                    </button>
                                </div>

                                <div className="d-flex align-items-center gap-4">
                                    {/* Fechas */}
                                    <div className="text-end d-none d-md-block">
                                        <div className="d-flex gap-2">
                                            <div>
                                                <small className="d-block text-muted fw-bold" style={{ fontSize: '9px' }}>INICIO</small>
                                                <span className="badge bg-light text-dark border fw-normal">
                                                    {new Date(projectInfo.start_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="align-self-end pb-1 text-muted">
                                                <i className="fas fa-chevron-right small"></i>
                                            </div>
                                            <div>
                                                <small className="d-block text-muted fw-bold" style={{ fontSize: '9px' }}>CIERRE</small>
                                                <span className="badge bg-light text-dark border fw-normal">
                                                    {new Date(projectInfo.end_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contador de Días */}
                                    <div className={`rounded-3 px-3 py-2 text-center shadow-sm ${getRemainingDays(projectInfo.end_date) <= 15 ? 'bg-danger text-white' : 'bg-oxford text-white'}`} style={{ minWidth: '110px' }}>
                                        <small className="d-block text-uppercase fw-black" style={{ fontSize: '8px', opacity: '0.8' }}>Faltan</small>
                                        <div className="d-flex align-items-baseline justify-content-center">
                                            <span className="fs-3 fw-black">{getRemainingDays(projectInfo.end_date)}</span>
                                            <small className="ms-1 fw-bold" style={{ fontSize: '10px' }}>días</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                        style={{ fontSize: '15px', transition: 'all 0.3s', letterSpacing: '0.5px' }}
                                    >
                                        {key} <span className="badge bg-white text-dark ms-1">{groups[key].length}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="row justify-content-center">
                        {loading ? (
                            <div className="text-center p-5">
                                <div className="spinner-border text-emerald"></div>
                            </div>
                        ) : groups[activeTab].length > 0 ? (
                            groups[activeTab].map(renderMiniCard)
                        ) : (
                            <div className="text-center p-5 text-muted w-100 mt-4">
                                <div className="bg-white d-inline-block p-4 rounded-circle shadow-sm mb-3">
                                    <i className="fas fa-folder-open fa-3x opacity-25"></i>
                                </div>
                                <h6 className="fw-bold">Sin resultados</h6>
                                <p className="small">No se encontraron indicadores en la categoría <strong>{activeTab}</strong> para esta competencia.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickHealthDash;