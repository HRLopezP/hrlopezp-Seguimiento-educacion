import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from "../../utils/api";
import { toast, Toaster } from 'sonner';
import Swal from 'sweetalert2';
import "../styles/projectDetail.css";

const ProjectTechnicalSetup = () => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [myCompetences, setMyCompetences] = useState([]); // Competencias asignadas a María
    const [selectedComp, setSelectedComp] = useState(null);
    const [theories, setTheories] = useState([]); // Teorías de la competencia seleccionada
    const [loading, setLoading] = useState(true);
    const [selectedTheoryId, setSelectedTheoryId] = useState("");
    const [selectedIndicators, setSelectedIndicators] = useState([]); // Array de objetos con datos técnicos
    const [expandedResults, setExpandedResults] = useState({}); // Para abrir/cerrar Outcomes-Outputs
    const [activeIndicatorId, setActiveIndicatorId] = useState(null);

    const handleMetaChange = (indicatorId, provinceId, field, value) => {
        setSelectedIndicators(prev => prev.map(ind => {
            if (ind.template_id === indicatorId) {
                const updatedProvinces = ind.province_goals.map(p => {
                    if (p.province_id === provinceId) {
                        return { ...p, [field]: parseInt(value) || 0 };
                    }
                    return p;
                });
                return { ...ind, province_goals: updatedProvinces };
            }
            return ind;
        }));
    };


    const handleIndicatorToggle = (indTemplate, isChecked) => {
        if (!project?.locations) {
            return toast.error("Los datos de ubicación del proyecto aún no se han cargado.");
        }

        if (isChecked) {
            setSelectedIndicators(prev => {
                // Evitamos duplicados por si acaso
                if (prev.find(i => i.template_id === indTemplate.id)) return prev;

                const newEntry = {
                    template_id: indTemplate.id,
                    code: indTemplate.code,
                    description: indTemplate.description,
                    verification_means: "",
                    observations: "",
                    // Usamos encadenamiento opcional ?. por seguridad
                    province_goals: project.locations.map(loc => ({
                        province_id: loc.province_id,
                        province_name: loc.province,
                        total: 0,
                        men: 0,
                        women: 0
                    }))
                };
                return [...prev, newEntry];
            });
            setActiveIndicatorId(indTemplate.id);
        } else {
            setSelectedIndicators(prev => prev.filter(i => i.template_id !== indTemplate.id));
            if (activeIndicatorId === indTemplate.id) setActiveIndicatorId(null);
        }
    };

    const handleInfoChange = (indicatorId, field, value) => {
        setSelectedIndicators(prev => prev.map(ind => {
            if (ind.template_id === indicatorId) {
                return { ...ind, [field]: value };
            }
            return ind;
        }));
    };

    const validateData = () => {
        for (const ind of selectedIndicators) {
            for (const pg of ind.province_goals) {
                // Regla de oro: Hombres + Mujeres debe ser igual al Total
                if (pg.men + pg.women !== pg.total) {
                    Swal.fire({
                        title: 'Error de cálculo',
                        html: `En el indicador <b>${ind.code}</b>,<br>la suma de hombres (${pg.men}) y mujeres (${pg.women}) <br>no coincide con el total (${pg.total}) en la provincia <b>${pg.province_name}</b>.`,
                        icon: 'error',
                        confirmButtonColor: '#1b263b' // Tu Oxford Grey
                    });
                    return false; // Detiene la validación y devuelve error
                }
            }
        }
        return true; // Si llega aquí, todo está perfecto
    };

    const handleSaveAll = async () => {
        // 1. Validación rápida: ¿Hay algo que guardar?
        if (selectedIndicators.length === 0) {
            return toast.error("No has seleccionado ningún indicador para configurar.");
        }

        if (!validateData()) return;

        // 2. Transformamos el estado al formato del Backend
        const formattedData = {
            project_id: parseInt(projectId),
            indicators: selectedIndicators.map(ind => ({
                template_id: ind.template_id,
                // Sumamos los totales de todas las provincias para el indicador
                target_total: ind.province_goals.reduce((acc, curr) => acc + curr.total, 0),
                target_men: ind.province_goals.reduce((acc, curr) => acc + curr.men, 0),
                target_women: ind.province_goals.reduce((acc, curr) => acc + curr.women, 0),
                // Mapeamos las metas por provincia
                goals_by_province: ind.province_goals.map(pg => ({
                    province_id: pg.province_id,
                    target: pg.total // El total por provincia
                }))
            }))
        };

        // 3. Confirmación con SweetAlert2 (Estilo Oxford/Emerald)
        const result = await Swal.fire({
            title: '¿Guardar Configuración Técnica?',
            text: `Se procesarán ${selectedIndicators.length} indicadores para este proyecto.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, guardar todo',
            cancelButtonText: 'Revisar más',
            confirmButtonColor: '#52b788', // Emerald
            cancelButtonColor: '#1b263b',  // Oxford Grey
            background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1b263b' : '#ffffff',
            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1b263b',
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch('/indicators/bulk', {
                    method: 'POST', // O PATCH según prefieras
                    body: JSON.stringify(formattedData)
                });

                if (res.ok) {
                    toast.success("¡Planificación técnica guardada con éxito!");
                    // Opcional: Redirigir al detalle del proyecto
                    // navigate(`/manager/projects/${projectId}`);
                } else {
                    toast.error("Hubo un error al guardar los indicadores.");
                }
            } catch (error) {
                toast.error("Error de conexión con el servidor.");
            }
        }
    };

    // 1. Cargar datos iniciales
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Obtenemos resumen del proyecto (incluye locations)
                const resProj = await apiFetch(`/projects/${projectId}`);
                const dataProj = await resProj.json();
                setProject(dataProj);

                // Obtenemos las competencias que YO (Gerente) tengo en este proyecto
                // Nota: Este endpoint lo definimos en la respuesta anterior
                const resComp = await apiFetch(`/my-assigned-projects`);
                const allMyProjects = await resComp.json();

                // Filtramos las competencias específicas de este proyecto
                const comps = allMyProjects.filter(p => p.project_id === parseInt(projectId));
                setMyCompetences(comps);

                if (comps.length > 0) setSelectedComp(comps[0]);
            } catch (error) {
                toast.error("Error al cargar la configuración técnica");
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [projectId]);

    // 2. Cargar teorías cuando cambie la competencia seleccionada
    useEffect(() => {
        if (selectedComp) {
            const fetchTheories = async () => {
                const res = await apiFetch(`/competence/${selectedComp.competence_id}/theories`);
                const data = await res.json();
                setTheories(data);
            };
            fetchTheories();
        }
    }, [selectedComp]);

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-emerald"></div></div>;

    return (
        <div className="management-page-container">
            <Toaster richColors position="top-right" />
            <div className="container mt-4">
                {/* Header dinámico */}
                <div className="management-card-header mb-4 shadow-sm rounded-3 p-3 bg-white">
                    <h2 className="management-title">Configuración Técnica</h2>
                    <p className="text-muted">Proyecto: <span className="fw-bold text-oxford-grey">{project?.project_name}</span></p>
                </div>

                {/* SELECTOR DE COMPETENCIAS (Pestañas Oxford) */}
                <div className="d-flex gap-2 mb-4">
                    {myCompetences.map(comp => (
                        <button
                            key={comp.competence_id}
                            className={`btn ${selectedComp?.competence_id === comp.competence_id ? 'btn-emerald' : 'btn-outline-oxford'}`}
                            onClick={() => setSelectedComp(comp)}
                        >
                            <i className="fas fa-briefcase me-2"></i>
                            {comp.competence_name}
                        </button>
                    ))}
                </div>

                <div className="row">
                    {/* COLUMNA IZQUIERDA: Árbol de Selección */}
                    <div className="col-md-5">
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-oxford-grey text-white">
                                <i className="fas fa-sitemap me-2"></i> Estructura Técnica
                            </div>
                            <div className="card-body">
                                <label className="form-label fw-bold">1. Seleccione Teoría de Cambio</label>
                                <select className="form-select mb-3 border-emerald" onChange={(e) => {/* Lógica para filtrar resultados */ }}>
                                    <option value="">Seleccione una teoría...</option>
                                    {theories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>

                                {/* Aquí iría el mapeo de Outcomes/Outputs con sus Indicadores */}
                                <div className="col-md-5">
                                    <div className="card shadow-sm border-0 mb-4 card-selector-tecnico">
                                        <div className="card-header bg-oxford-grey text-white d-flex justify-content-between align-items-center">
                                            <span><i className="fas fa-sitemap me-2"></i> Estructura Técnica</span>
                                            <span className="badge bg-emerald">{selectedIndicators.length} Seleccionados</span>
                                        </div>
                                        <div className="card-body bg-white">
                                            <label className="form-label fw-bold text-oxford-grey">1. Seleccione Teoría de Cambio</label>
                                            <select
                                                className="form-select mb-4 border-emerald shadow-sm"
                                                value={selectedTheoryId}
                                                onChange={(e) => setSelectedTheoryId(e.target.value)}
                                            >
                                                <option value="">-- Elige una Teoría --</option>
                                                {theories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>

                                            {/* Renderizado de la Cascada */}
                                            {selectedTheoryId && theories.find(t => t.id === parseInt(selectedTheoryId))?.results.map(result => (
                                                <div key={result.id} className="result-container mb-3">
                                                    <div
                                                        className={`result-header d-flex align-items-center p-2 rounded-2 cursor-pointer ${result.type === 'outcome' ? 'bg-light-emerald' : 'bg-light-grey'}`}
                                                        onClick={() => setExpandedResults(prev => ({ ...prev, [result.id]: !prev[result.id] }))}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <i className={`fas ${expandedResults[result.id] ? 'fa-chevron-down' : 'fa-chevron-right'} me-2 text-muted`}></i>
                                                        <span className={`badge ${result.type === 'outcome' ? 'bg-emerald' : 'bg-oxford-grey'} me-2`}>
                                                            {result.type.toUpperCase()}
                                                        </span>
                                                        <span className="small fw-bold text-dark">{result.name}</span>
                                                    </div>

                                                    {/* Lista de Indicadores (Solo si está expandido) */}
                                                    {expandedResults[result.id] && (
                                                        <div className="indicator-list ms-4 mt-2 border-start ps-3">
                                                            {result.indicators.length > 0 ? result.indicators.map(ind => (
                                                                <div key={ind.id} className="form-check mb-2 p-2 indicator-item-hover rounded">
                                                                    <input
                                                                        className="form-check-input custom-checkbox-emerald"
                                                                        type="checkbox"
                                                                        id={`ind-${ind.id}`}
                                                                        checked={selectedIndicators.some(i => i.template_id === ind.id)}
                                                                        onChange={(e) => handleIndicatorToggle(ind, e.target.checked)}
                                                                    />
                                                                    <label className="form-check-label small d-block cursor-pointer" htmlFor={`ind-${ind.id}`}>
                                                                        <span className="text-emerald fw-bold">{ind.code}</span>: {ind.description}
                                                                    </label>
                                                                </div>
                                                            )) : <p className="text-muted small ms-2">No hay indicadores en este {result.type}</p>}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: Detalle y Metas (Lo que pidió María) */}
                    <div className="col-md-7">
                        {activeIndicatorId ? (
                            <div className="card shadow-lg border-0 fade-in bg-card-dynamic">
                                <div className="management-card-header bg-oxford text-white p-3 d-flex justify-content-between">
                                    <div>
                                        <span className="badge bg-emerald me-2">CONFIGURANDO</span>
                                        <span className="fw-bold">{selectedIndicators.find(i => i.template_id === activeIndicatorId)?.code}</span>
                                    </div>
                                    <button className="btn btn-sm btn-light" onClick={() => setActiveIndicatorId(null)}>
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>

                                <div className="card-body">
                                    {/* Medios de Verificación y Observaciones */}
                                    <div className="row mb-4">
                                        <div className="col-md-6">
                                            <label className="uppercase-label text-muted-dynamic">Medios de Verificación</label>
                                            <textarea
                                                className="form-control"
                                                rows="2"
                                                placeholder="Ej: Listas de asistencia, fotos..."
                                                value={selectedIndicators.find(i => i.template_id === activeIndicatorId)?.verification_means}
                                                onChange={(e) => handleInfoChange(activeIndicatorId, 'verification_means', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="uppercase-label text-muted-dynamic">Observaciones</label>
                                            <textarea
                                                className="form-control"
                                                rows="2"
                                                placeholder="Notas adicionales..."
                                                value={selectedIndicators.find(i => i.template_id === activeIndicatorId)?.observations}
                                                onChange={(e) => handleInfoChange(activeIndicatorId, 'observations', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <h6 className="uppercase-label text-emerald mb-3 border-bottom-dynamic pb-2">
                                        <i className="fas fa-map-marker-alt me-2"></i>Desglose por Estado (Meta Total)
                                    </h6>

                                    <div className="table-responsive custom-scrollbar" style={{ maxHeight: '400px' }}>
                                        <table className="table table-custom-sigssep align-middle">
                                            <thead className="thead-oxford sticky-top">
                                                <tr>
                                                    <th>Provincia</th>
                                                    <th className="text-center">Total</th>
                                                    <th className="text-center m-color"><i className="fas fa-mars"></i> H</th>
                                                    <th className="text-center w-color"><i className="fas fa-venus"></i> M</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedIndicators.find(i => i.template_id === activeIndicatorId)?.province_goals.map((pg, index) => (
                                                    <tr key={`${pg.province_id}-${index}`} className="tr-transparent">
                                                        <td className="text-oxford-dynamic fw-bold">{pg.province_name}</td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className={`form-control form-control-sm meta-input ${(pg.men + pg.women !== pg.total) ? 'border-danger text-danger' : ''}`}
                                                                value={pg.total}
                                                                onChange={(e) => handleMetaChange(activeIndicatorId, pg.province_id, 'total', e.target.value)}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="form-control form-control-sm border-primary-subtle"
                                                                value={pg.men}
                                                                onChange={(e) => handleMetaChange(activeIndicatorId, pg.province_id, 'men', e.target.value)}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="form-control form-control-sm border-danger-subtle"
                                                                value={pg.women}
                                                                onChange={(e) => handleMetaChange(activeIndicatorId, pg.province_id, 'women', e.target.value)}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Resumen de Totales Automático */}
                                    <div className="totals-summary-container mt-4 p-3 bg-oxford text-white rounded-3 shadow">
                                        <div className="row text-center">
                                            <div className="col-4">
                                                <div className="total-label uppercase-label">Total Gral.</div>
                                                <div className="total-number text-emerald">
                                                    {selectedIndicators.find(i => i.template_id === activeIndicatorId)?.province_goals.reduce((acc, curr) => acc + curr.total, 0)}
                                                </div>
                                            </div>
                                            <div className="col-4">
                                                <div className="total-label uppercase-label">Total Hombres</div>
                                                <div className="total-number m-color">
                                                    {selectedIndicators.find(i => i.template_id === activeIndicatorId)?.province_goals.reduce((acc, curr) => acc + curr.men, 0)}
                                                </div>
                                            </div>
                                            <div className="col-4">
                                                <div className="total-label uppercase-label">Total Mujeres</div>
                                                <div className="total-number w-color">
                                                    {selectedIndicators.find(i => i.template_id === activeIndicatorId)?.province_goals.reduce((acc, curr) => acc + curr.women, 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Estado vacío (Placeholder) */
                            <div className="card shadow-sm border-0 bg-card-dynamic py-5 text-center">
                                <i className="fas fa-hand-pointer fa-4xl text-emerald mb-3 opacity-25"></i>
                                <h5 className="text-muted-dynamic">Selecciona un indicador de la izquierda</h5>
                                <p className="small text-muted">Para desglosar metas por género y provincia</p>
                            </div>
                        )}
                    </div>
                    {/* Botón de Guardado Global */}
                    <div className="save-container-floating p-4 d-flex justify-content-end">
                        <button
                            className="btn btn-emerald btn-lg shadow-lg rounded-pill px-5 fw-bold fade-in"
                            onClick={handleSaveAll}
                        >
                            <i className="fas fa-save me-2"></i>
                            FINALIZAR CONFIGURACIÓN TÉCNICA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectTechnicalSetup;