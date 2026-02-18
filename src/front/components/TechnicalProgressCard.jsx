import React, { useState, useMemo } from 'react';

const TechnicalProgressCard = ({
    allCompetences = [],
    allIndicators = [],
    externalExpandedComps,
    externalExpandedTheories
}) => {
    // 1. ESTADO LOCAL
    const [localExpandedComps, setLocalExpandedComps] = useState({});
    const [localExpandedTheories, setLocalExpandedTheories] = useState({});

    // 2. LÓGICA DE PRIORIDAD (Derivación de estado)
    // Si externalExpandedComps existe (no es undefined), lo usamos. 
    // Esto es lo que permite que el PDF "fuerce" la apertura.
    const isExpandedComp = (id) => externalExpandedComps ? externalExpandedComps[id] : localExpandedComps[id];
    const isExpandedTheory = (id) => externalExpandedTheories ? externalExpandedTheories[id] : localExpandedTheories[id];

    // 3. FUNCIONES TOGGLE (Corregidas)
    const toggleComp = (compId) => {
        setLocalExpandedComps(prev => ({ ...prev, [compId]: !prev[compId] }));
    };

    const toggleTheory = (tName) => {
        // CORRECCIÓN: Se usa el nombre correcto del setter local
        setLocalExpandedTheories(prev => ({ ...prev, [tName]: !prev[tName] }));
    };

    // 4. AGRUPAMIENTO DE DATOS
    const globalGroupedData = useMemo(() => {
        const acc = {};
        allCompetences.forEach(comp => {
            acc[comp.name] = {};
        });

        allIndicators.forEach(ind => {
            const cName = ind.comp_name || "Sin Competencia";
            const tName = ind.theory_name || "Sin Teoría";
            const rType = (ind.result_type || "Output").toUpperCase();
            const rName = ind.result_name || "Sin Resultado";

            if (!acc[cName]) acc[cName] = {};
            if (!acc[cName][tName]) acc[cName][tName] = {};
            if (!acc[cName][tName][rType]) acc[cName][tName][rType] = {};
            if (!acc[cName][tName][rType][rName]) acc[cName][tName][rType][rName] = [];

            acc[cName][tName][rType][rName].push(ind);
        });
        return acc;
    }, [allIndicators, allCompetences]);

    return (
        <div className="mt-5 p-4 rounded shadow-sm border-dynamic bg-card-dynamic">
            <h5 className="text-oxford-grey border-bottom border-success fw-bold mb-4 pb-4 text-uppercase">
                <i className="fas fa-tasks me-2 text-emerald"></i>
                Progreso Técnico Global
            </h5>

            <div className="table-responsive">
                <table className="table table-custom-sigssep align-middle">
                    <thead className="bg-oxford-grey text-white">
                        <tr>
                            <th className="text-center" style={{ width: '15%' }}>Código</th>
                            <th style={{ width: '25%' }}>Indicador</th>
                            <th style={{ width: '20%' }}>Verificación</th>
                            <th className="text-center" style={{ width: '25%' }}>Metas</th>
                            <th className="text-center">Obs.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(globalGroupedData).map(cName => (
                            <React.Fragment key={cName}>
                                {/* NIVEL 0: COMPETENCIA */}
                                <tr className="bg-success text-white fw-bold" onClick={() => toggleComp(cName)} style={{ cursor: 'pointer' }}>
                                    <td colSpan="5" className="py-3 px-3">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span>
                                                <i className={`fas fa-chevron-${isExpandedComp(cName) ? 'down' : 'right'} me-3`}></i>
                                                COMPETENCIA: {cName}
                                            </span>
                                        </div>
                                    </td>
                                </tr>

                                {/* Renderizado condicional basado en la lógica de prioridad */}
                                {isExpandedComp(cName) && Object.keys(globalGroupedData[cName]).map(tName => (
                                    <React.Fragment key={tName}>
                                        {/* NIVEL 1: TEORÍA */}
                                        <tr className="bg-oxford-grey text-emerald fw-bold" onClick={() => toggleTheory(tName)} style={{ cursor: 'pointer' }}>
                                            <td colSpan="5" className="ps-5 py-2">
                                                <i className={`fas fa-caret-${isExpandedTheory(tName) ? 'down' : 'right'} me-2`}></i>
                                                TEORÍA: {tName}
                                            </td>
                                        </tr>

                                        {isExpandedTheory(tName) && Object.keys(globalGroupedData[cName][tName]).map(rType => (
                                            <React.Fragment key={rType}>
                                                {Object.keys(globalGroupedData[cName][tName][rType]).map(rName => (
                                                    <React.Fragment key={rName}>
                                                        {/* NIVEL 2: RESULTADO (Output/Outcome) */}
                                                        <tr className="bg-light-dynamic">
                                                            <td colSpan="5" className="ps-5">
                                                                <span className={`badge ${rType === 'OUTCOME' ? 'bg-primary' : 'bg-emerald'} me-2`}>
                                                                    {rType}
                                                                </span>
                                                                <span className="fw-bold text-oxford-dynamic">{rName}</span>
                                                            </td>
                                                        </tr>
                                                        {/* NIVEL 3: INDICADORES */}
                                                        {globalGroupedData[cName][tName][rType][rName].map(ind => (
                                                            <tr key={ind.id} className="row-fade-in border-outcome">
                                                                <td className="fw-bold text-center text-emerald">{ind.indicator_code}</td>
                                                                <td>
                                                                    <div className="fw-bold small">{ind.indicator_name}</div>
                                                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{ind.description}</div>
                                                                </td>
                                                                <td>
                                                                    {ind.means_tags?.map((tag, i) => (
                                                                        <span key={i} className="badge auth-input text-dark border me-1" style={{ fontSize: '0.65rem' }}>
                                                                            <i className="fas fa-check-circle text-emerald me-1"></i>
                                                                            {tag.name}
                                                                        </span>
                                                                    ))}
                                                                    <div className="small italic text-secondary">{ind.verification_means}</div>
                                                                </td>
                                                                <td className="p-0" style={{ minWidth: '180px' }}>
                                                                    <div className="list-group list-group-flush" style={{ fontSize: '0.85rem' }}>
                                                                        {ind.goals_by_province && ind.goals_by_province.length > 0 ? (
                                                                            ind.goals_by_province
                                                                                // Filtramos: Mostramos si hay un valor mayor a cero
                                                                                .filter(gp => (gp.target_total || gp.target) > 0)
                                                                                .map((gp, idx) => (
                                                                                    <div key={idx} className="list-group-item py-2 px-3 border-0 bg-transparent">
                                                                                        {/* Fila Superior: Provincia y Total */}
                                                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                                                            <span className="fw-bold text-oxford-dynamic">
                                                                                                <i className="fas fa-map-marker-alt me-1 text-emerald" style={{ fontSize: '1rem' }}></i>
                                                                                                {gp.province_name || gp.province}
                                                                                            </span>
                                                                                            <span className="badge rounded-pill text-oxford-dynamic" style={{ fontSize: '1rem' }}>
                                                                                                {gp.target_total || gp.target}
                                                                                                {/* REGLA: Si es Outcome, agregamos el símbolo % */}
                                                                                                {ind.result_type?.toLowerCase() === 'outcome' ? '%' : ''}
                                                                                            </span>
                                                                                        </div>
                                                                                        {/* Fila Inferior: Desagregación (Solo si NO es Outcome) */}
                                                                                        {ind.result_type?.toLowerCase() !== 'outcome' && (
                                                                                            <div className="d-flex gap-3 justify-content-end text-oxford-dynamic" style={{ fontSize: '0.85rem' }}>
                                                                                                <span>
                                                                                                    <i className="fas fa-mars text-primary me-1"></i>
                                                                                                    {gp.target_men || gp.men || 0}
                                                                                                </span>
                                                                                                <span>
                                                                                                    <i className="fas fa-venus text-danger me-1"></i>
                                                                                                    {gp.target_women || gp.women || 0}
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ))
                                                                        ) : (
                                                                            /* Mensaje amigable si no hay datos */
                                                                            <div className="p-2 text-center text-muted small italic">
                                                                                Sin metas asignadas
                                                                            </div>
                                                                        )}

                                                                        {/* Caso extra: Si hay provincias pero todas están en 0 */}
                                                                        {ind.goals_by_province?.length > 0 &&
                                                                            ind.goals_by_province.every(gp => (gp.target_total || gp.target) === 0) && (
                                                                                <div className="p-2 text-center text-muted small italic">
                                                                                    Sin metas asignadas
                                                                                </div>
                                                                            )}
                                                                    </div>
                                                                </td>
                                                                <td className="small text-center italic">{ind.observations || "-"}</td>
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