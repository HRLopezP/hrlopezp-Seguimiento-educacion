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
        // 1. Inicializamos el objeto con TODAS las competencias que recibe el componente
        const acc = {};

        allCompetences.forEach(comp => {
            // Usamos el nombre de la competencia como clave principal
            acc[comp.name] = {};
        });

        // 2. Clasificamos los indicadores
        allIndicators.forEach(ind => {
            const cName = ind.comp_name;
            const tName = ind.theory_name || "Sin Teoría";
            const rType = (ind.result_type || "Output").toUpperCase();
            const rName = ind.result_name || "Sin Resultado";

            // Si el indicador trae una competencia que no estaba en la lista inicial, la creamos
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
                Progreso Técnico Global por Competencias
            </h5>

            <div className="table-responsive">
                <table className="table table-custom-sigssep align-middle">
                    <thead className="bg-oxford-grey text-white">
                        <tr>
                            <th className="text-center" style={{ width: '25%' }}>Código</th>
                            <th style={{ width: '20%' }}>Indicador / Descripción</th>
                            <th style={{ width: '20%' }}>Medios de Verificación</th>
                            <th className="text-center">Metas por Provincia</th>
                            <th className="text-center">Observación.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(globalGroupedData).map(cName => (
                            <React.Fragment key={cName}>
                                {/* NIVEL 0: COMPETENCIA */}
                                <tr className="bg-emerald text-white fw-bold" onClick={() => toggleComp(cName)} style={{ cursor: 'pointer' }}>
                                    <td colSpan="5" className="py-3 px-3">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span>
                                                <i className={`fas fa-chevron-${expandedComps[cName] ? 'down' : 'right'} me-3`}></i>
                                                <i className="fas fa-star me-2"></i>
                                                COMPETENCIA: {cName}
                                            </span>
                                            <span className="badge bg-white text-emerald">
                                                {Object.keys(globalGroupedData[cName]).length} Teorías
                                            </span>
                                        </div>
                                    </td>
                                </tr>

                                {expandedComps[cName] && Object.keys(globalGroupedData[cName]).map(tName => (
                                    <React.Fragment key={tName}>
                                        {/* NIVEL 1: TEORÍA */}
                                        <tr className="bg-oxford-grey text-emerald fw-bold" onClick={() => toggleTheory(tName)} style={{ cursor: 'pointer' }}>
                                            <td colSpan="5" className="ps-5 py-2">
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
                                                            <td colSpan="5" className="ps-5 border-start border-emerald border-3">
                                                                <span className={`badge ${rType.toLowerCase() === 'outcome' ? 'bg-primary' : 'bg-emerald'} me-2`}>
                                                                    {rType.toUpperCase()}
                                                                </span>
                                                                <span className="fw-bold text-oxford-dynamic">{rName}</span>
                                                            </td>
                                                        </tr>
                                                        {/* NIVEL 3: INDICADORES (CORRECCIÓN AQUÍ) */}
                                                        {globalGroupedData[cName][tName][rType][rName].map(ind => (
                                                            <tr key={ind.id} className="row-fade-in border-bottom">
                                                                {/* 1. CÓDIGO: Ahora con más espacio y centrado */}
                                                                <td className="fw-bold text-center">
                                                                    <span className="text-emerald">{ind.indicator_code}</span>
                                                                </td>
                                                                <td>
                                                                    <div className="fw-bold text-oxford-dynamic">{ind.indicator_name}</div>
                                                                    <div className="text-muted-dynamic" style={{ fontSize: '0.8rem' }}>{ind.description}</div>
                                                                </td>

                                                                {/* 3. MEDIOS: Usamos verification_means directamente */}
                                                                <td style={{ verticalAlign: 'top' }}>
                                                                    {/* Reutilizamos los Chips del diseño 1 */}
                                                                    {ind.means_tags && ind.means_tags.map((tag, i) => (
                                                                        <span key={i} className="auth-input d-inline-block mb-1 me-1" style={{ fontSize: '0.7rem' }}>
                                                                            <i className="fas fa-check-circle text-emerald me-1"></i>
                                                                            {tag.name}
                                                                        </span>
                                                                    ))}
                                                                    <div className="small text-secondary italic">{ind.verification_means}</div>
                                                                </td>

                                                                {/* 4. METAS: Corregido acceso a goals_by_province */}
                                                                <td className="p-0 bg-white-soft">
                                                                    <div className="list-group list-group-flush">
                                                                        {ind.goals_by_province && ind.goals_by_province.length > 0 ? (
                                                                            ind.goals_by_province.map((gp, idx) => (
                                                                                <div key={idx} className="list-group-item py-1 px-3 border-0 bg-transparent" style={{ fontSize: '0.8rem' }}>
                                                                                    <div className="d-flex justify-content-between">
                                                                                        <span className="text-oxford-dynamic fw-semibold">
                                                                                            <i className="fas fa-map-marker-alt text-emerald me-1"></i>
                                                                                            {gp.province_name || gp.province}
                                                                                        </span>
                                                                                        <span className="badge bg-emerald text-white">
                                                                                            Total: {gp.target_total || gp.target}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="text-end text-muted" style={{ fontSize: '0.7rem' }}>
                                                                                        <i className="fas fa-mars text-primary me-1"></i>{gp.target_men || gp.men} |
                                                                                        <i className="fas fa-venus text-danger mx-1"></i>{gp.target_women || gp.women}
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div className="text-center text-muted small py-2">Sin metas asignadas</div>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                {/* 5. OBSERVACIONES Y ESTADO */}
                                                                <td className="text-center">
                                                                    <div className="small text-muted italic" style={{ fontSize: '0.75rem' }}>
                                                                        {ind.observations || "Sin observaciones"}
                                                                    </div>
                                                                </td>
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