import React, { useState, useMemo } from 'react';

const TechnicalProgressCard = ({ allCompetences, allIndicators, masterTheories }) => {
    // Estado para controlar qué competencia está expandida
    const [expandedComps, setExpandedComps] = useState({});
    const [expandedTheories, setExpandedTheories] = useState({});

    const toggleComp = (compId) => {
        setExpandedComps(prev => ({ ...prev, [compId]: !prev[compId] }));
    };

    const toggleTheory = (tName) => {
        setExpandedTheories(prev => ({ ...prev, [tName]: !prev[tName] }));
    };

    // Agrupamos TODOS los datos en una estructura de 4 niveles
    const globalGroupedData = useMemo(() => {
        return allIndicators.reduce((acc, ind) => {
            const cName = ind.competence_name || "Competencia no asignada";
            const tName = ind.theory_name || "Sin Teoría";
            const rType = ind.result_type || "Output";
            const rName = ind.result_name || "Sin Resultado";

            if (!acc[cName]) acc[cName] = {};
            if (!acc[cName][tName]) acc[cName][tName] = {};
            if (!acc[cName][tName][rType]) acc[cName][tName][rType] = {};
            if (!acc[cName][tName][rType][rName]) acc[cName][tName][rType][rName] = [];

            acc[cName][tName][rType][rName].push(ind);
            return acc;
        }, {});
    }, [allIndicators]);

    return (
        <div className="mt-5 p-4 rounded shadow-sm border-dynamic bg-card-dynamic">
            <h5 className="text-oxford-grey border-bottom border-success fw-bold mb-4 pb-4 text-uppercase">
                <i className="fas fa-tasks me-2 text-emerald"></i>
                Progreso Técnico Global por Competencias
            </h5>

            <div className="table-responsive">
                <table className="table table-custom-sigssep align-middle">
                    <thead className="bg-oxford-grey text-white">
                        <tr>
                            <th style={{ width: '25%' }}>Jerarquía (Comp/Teoría/Res)</th>
                            <th style={{ width: '25%' }}>Indicador / Descripción</th>
                            <th style={{ width: '20%' }}>Medios de Verificación</th>
                            <th className="text-center">Metas por Provincia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(globalGroupedData).map(cName => (
                            <React.Fragment key={cName}>
                                {/* NIVEL 0: COMPETENCIA (El nuevo nivel superior) */}
                                <tr 
                                    className="bg-emerald text-white fw-bold" 
                                    onClick={() => toggleComp(cName)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td colSpan="4" className="py-3 px-3">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span>
                                                <i className={`fas fa-chevron-${expandedComps[cName] ? 'down' : 'right'} me-3`}></i>
                                                COMPETENCIA: {cName}
                                            </span>
                                            <span className="badge bg-white text-emerald">Nivel Superior</span>
                                        </div>
                                    </td>
                                </tr>

                                {expandedComps[cName] && Object.keys(globalGroupedData[cName]).map(tName => (
                                    <React.Fragment key={tName}>
                                        {/* NIVEL 1: TEORÍA (Igual al anterior pero dentro de competencia) */}
                                        <tr 
                                            className="bg-oxford-grey text-emerald fw-bold"
                                            onClick={() => toggleTheory(tName)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td colSpan="4" className="ps-5 py-2">
                                                <i className={`fas fa-caret-${expandedTheories[tName] ? 'down' : 'right'} me-2`}></i>
                                                TEORÍA: {tName}
                                            </td>
                                        </tr>

                                        {expandedTheories[tName] && Object.keys(globalGroupedData[cName][tName]).map(rType => (
                                            <React.Fragment key={rType}>
                                                {Object.keys(globalGroupedData[cName][tName][rType]).map(rName => (
                                                    <React.Fragment key={rName}>
                                                        {/* NIVEL 2: RESULTADO */}
                                                        <tr className="bg-light-dynamic">
                                                            <td colSpan="4" className="ps-5 ms-4 border-start border-emerald border-3">
                                                                <span className={`badge ${rType.toLowerCase() === 'outcome' ? 'bg-primary' : 'bg-emerald'} me-2`}>
                                                                    {rType.toUpperCase()}
                                                                </span>
                                                                <span className="fw-bold text-oxford-dynamic">{rName}</span>
                                                            </td>
                                                        </tr>

                                                        {/* NIVEL 3: INDICADORES */}
                                                        {globalGroupedData[cName][tName][rType][rName].map(ind => (
                                                            <tr key={ind.template_id} className="row-fade-in border-bottom">
                                                                <td className="text-center fw-bold text-emerald">{ind.code}</td>
                                                                <td>
                                                                    <div className="fw-bold text-oxford-dynamic">{ind.indicator_name}</div>
                                                                    <div className="small text-muted">{ind.description}</div>
                                                                </td>
                                                                {/* ... Aquí repetirías los TDs de Medios de Verificación y Metas que ya tienes ... */}
                                                                <td className="small text-muted text-center">Ver detalles en matriz</td>
                                                                <td className="text-center">---</td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TechnicalProgressCard;