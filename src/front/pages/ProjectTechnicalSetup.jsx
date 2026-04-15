import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from "../../utils/api";
import { toast, Toaster } from 'sonner';
import Swal from 'sweetalert2';
import "../styles/projectDetail.css";
import "../styles/projectTechnical.css";

const ProjectTechnicalSetup = () => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [myCompetences, setMyCompetences] = useState([]);
    const [selectedComp, setSelectedComp] = useState(null);
    const [theories, setTheories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTheoryId, setSelectedTheoryId] = useState("");
    const [selectedIndicators, setSelectedIndicators] = useState([]);
    const [expandedResults, setExpandedResults] = useState({});
    const [activeIndicatorId, setActiveIndicatorId] = useState(null);
    const navigate = useNavigate();
    const [expandedTheories, setExpandedTheories] = useState({});
    const [masterMeans, setMasterMeans] = useState([]);

    const toggleTheory = (tName) => {
        setExpandedTheories(prev => ({
            ...prev,
            [tName]: !prev[tName]
        }));
    };

    const getIndicatorContext = (templateId, allTheories) => {
        let context = {
            theory_name: "Sin Teoría asignada",
            result_name: "Sin Resultado asignado",
            result_type: "output",
            comp_name: "Sin Competencia"
        };

        for (const t of allTheories) {
            if (!t.results) continue;

            for (const r of t.results) {
                const found = r.indicators?.find(i => Number(i.id) === Number(templateId));

                if (found) {
                    return {
                        theory_name: t.name,
                        result_name: r.name,
                        result_type: r.type?.toLowerCase() || "output",
                        comp_name: t.competence_name || selectedComp?.competence_name || "General",
                        indicator_name: found.name
                    };
                }
            }
        }
        return context;
    };

    const groupedData = useMemo(() => {
        if (!selectedComp || !theories.length) return {};

        return selectedIndicators.reduce((acc, ind) => {
            const context = getIndicatorContext(ind.template_id, theories);

            if (context.theory_name === "Sin Teoría asignada") {
                return acc;
            }

            const tName = context.theory_name;
            const rType = context.result_type;
            const rName = context.result_name;

            if (!acc[tName]) acc[tName] = {};
            if (!acc[tName][rType]) acc[tName][rType] = {};

            if (!acc[tName][rType][rName]) {
                acc[tName][rType][rName] = [];
            }

            acc[tName][rType][rName].push({
                ...ind,
                indicator_name: context.indicator_name,
                result_type: rType,
                theory_name: tName
            });

            return acc;
        }, {});
    }, [selectedIndicators, theories, selectedComp]);


    const handleMetaChange = (indicatorId, provinceId, field, value) => {
        const numValue = parseFloat(value) || 0;

        setSelectedIndicators(prev => prev.map(ind => {
            if (ind.template_id !== indicatorId) return ind;

            const isOutcome = ind.result_type?.toLowerCase() === 'outcome';

            const updatedProvinces = ind.province_goals.map(p => {
                if (p.province_id !== provinceId) return p;

                if (isOutcome && (field === 'men' || field === 'women')) return p;

                let updatedProvince = { ...p, [field]: numValue };

                if (!isOutcome && (field === 'men' || field === 'women')) {
                    updatedProvince.total = updatedProvince.men + updatedProvince.women;
                }

                return updatedProvince;
            });

            return { ...ind, province_goals: updatedProvinces };
        }));
    };


    const handleIndicatorToggle = (ind, isChecked, resultObj) => {
        if (isChecked) {
            const uniqueProvinces = [];
            const seen = new Set();
            if (project?.locations && project.locations.length > 0) {
                project.locations.forEach(loc => {
                    const pName = loc.province || loc.province_name || "Provincia desconocida";
                    if (!seen.has(pName)) {
                        seen.add(pName);
                        uniqueProvinces.push({
                            province_id: loc.id_location || loc.province_id,
                            province_name: pName,
                            total: 0,
                            men: 0,
                            women: 0
                        });
                    }
                });
            }

            const newIndicator = {
                template_id: ind.id,
                code: ind.code,
                indicator_name: ind.name || "Indicador sin nombre",
                description: ind.description,
                project_result_id: resultObj?.id || null,
                theory_name: currentTheory?.name || "Sin Teoría",
                result_type: resultObj?.type || "output",
                result_name: resultObj?.name || "General",
                verification_means: "",
                observations: "",
                province_goals: uniqueProvinces,
                means_ids: [],
                means_tags: [],
                calculation_type: resultObj?.type === 'outcome' ? 'dependent' : 'direct',
                measurement_unit: resultObj?.type === 'outcome' ? 'percentage' : 'absolute',
                depends_on_ids: [],
            };

            setSelectedIndicators(prev => {
                const alreadyExists = prev.find(i => i.template_id === newIndicator.template_id);
                if (alreadyExists) return prev;
                return [...prev, newIndicator];
            });

            console.log("✅ Nuevo indicador capturado con éxito:", newIndicator);
            setActiveIndicatorId(ind.id);
        } else {
            setSelectedIndicators(prev => prev.filter(i => i.template_id !== ind.id));
            if (activeIndicatorId === ind.id) setActiveIndicatorId(null);
        }
    };

    const handleInfoChange = (indicatorId, field, value) => {
        setSelectedIndicators(prev => prev.map(ind => {
            if (ind.template_id === indicatorId) {
                let extraData = {};

                // Caso A: Selección de medios de verificación
                if (field === 'means_ids') {
                    extraData.means_tags = masterMeans.filter(m => value.includes(m.id));
                }

                // Caso B: Cambio de estrategia (Si pasa a independiente, limpiamos dependencias)
                if (field === 'calculation_type' && value === 'independent') {
                    extraData.depends_on_ids = [];
                }

                // Caso C: EL CORAZÓN DEL PROBLEMA - Cambio en dependencias
                if (field === 'depends_on_ids') {
                    // 1. Buscamos cuáles son los indicadores "padres" según los IDs en 'value'
                    const parentIndicators = prev.filter(s => value.includes(s.template_id));

                    // 2. Creamos un Set con los IDs de las provincias que cubren esos padres
                    const validProvinceIds = new Set();
                    parentIndicators.forEach(p => {
                        p.province_goals.forEach(pg => {
                            // Si el padre tiene meta (H, M o total) en esa provincia, es válida
                            if (pg.total > 0 || pg.men > 0 || pg.women > 0) {
                                validProvinceIds.add(pg.province_id);
                            }
                        });
                    });

                    // 3. Sincronizamos las metas locales del indicador actual
                    extraData.province_goals = ind.province_goals.map(pg => {
                        // Si la provincia ya no está en los padres, reseteamos sus valores a 0
                        if (!validProvinceIds.has(pg.province_id)) {
                            return { ...pg, total: 0, men: 0, women: 0 };
                        }
                        return pg;
                    });
                }

                return {
                    ...ind,
                    [field]: value,
                    ...extraData
                };
            }
            return ind;
        }));
    };

    const validateData = () => {
        for (const ind of selectedIndicators) {
            const type = ind.result_type?.toLowerCase();

            if (type === 'outcome' && ind.calculation_type === 'dependent') {
                if (!ind.depends_on_ids || ind.depends_on_ids.length === 0) {
                    Swal.fire({
                        title: 'Faltan Dependencias',
                        text: `El indicador ${ind.code} es dependiente, pero no has seleccionado ningún Output del cual dependa.`,
                        icon: 'warning',
                        confirmButtonColor: '#1b263b'
                    });
                    return false;
                }
            }

            if (type === 'outcome') continue;

            for (const pg of ind.province_goals) {
                const h = Number(pg.men || 0);
                const m = Number(pg.women || 0);
                const t = Number(pg.total || 0);

                if (h + m !== t) {
                    Swal.fire({
                        title: 'Error de cálculo',
                        html: `En el indicador <b>${ind.code}</b>,<br>la suma de hombres (${h}) y mujeres (${m}) <br>no coincide con el total (${t}) en la provincia <b>${pg.province_name}</b>.`,
                        icon: 'error',
                        confirmButtonColor: '#1b263b'
                    });
                    return false;
                }
            }
        }
        return true;
    };

    const refreshProjectIndicators = async (allTheories = theories) => {
        try {
            const resSaved = await apiFetch(`/projects/${projectId}/indicators`);
            if (resSaved.ok) {
                const savedData = await resSaved.json();
                const formattedSaved = savedData.map(ind => {
                    const info = getIndicatorContext(ind.template_id, allTheories);

                    return {
                        ...ind,
                        template_id: ind.template_id,
                        code: ind.indicator_code,
                        description: ind.description,
                        indicator_name: info.indicator_name || ind.indicator_name,
                        result_type: ind.result_type || info.result_type,
                        depends_on_ids: ind.depends_on_ids || [],
                        means_tags: ind.means_tags || [],
                        province_goals: (ind.goals_by_province || []).map(g => ({
                            province_id: g.province_id,
                            province_name: g.province_name,
                            total: g.target || 0,
                            men: g.men,
                            women: g.women
                        }))
                    };
                });
                setSelectedIndicators(formattedSaved);
            }
        } catch (error) {
            console.error("Error en refresh de SIGSSEP:", error);
        }
    };

    const prepareIndicatorsForServer = (indicatorsList) => {
        return indicatorsList.map(ind => {
            const isOutcome = ind.result_type?.toLowerCase() === 'outcome';

            const finalDependsOn = Array.isArray(ind.depends_on_ids) ? ind.depends_on_ids : [];

            const finalMeansIds = ind.means_tags ? ind.means_tags.map(t => t.id) : (ind.means_ids || []);

            return {
                template_id: ind.template_id,
                calculation_type: ind.calculation_type || 'direct',
                measurement_unit: ind.measurement_unit || (isOutcome ? 'percentage' : 'absolute'),
                depends_on_ids: finalDependsOn,
                means_ids: finalMeansIds,
                target_total: ind.province_goals?.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0) || 0,
                target_men: isOutcome ? null : (ind.province_goals?.reduce((acc, curr) => acc + (parseFloat(curr.men) || 0), 0) || 0),
                target_women: isOutcome ? null : (ind.province_goals?.reduce((acc, curr) => acc + (parseFloat(curr.women) || 0), 0) || 0),
                verification_means: ind.verification_means || "",
                observations: ind.observations || "",
                goals_by_province: ind.province_goals?.map(pg => ({
                    province_id: pg.province_id,
                    target: parseFloat(pg.total) || 0,
                    target_men: isOutcome ? null : (parseFloat(pg.men) || 0),
                    target_women: isOutcome ? null : (parseFloat(pg.women) || 0)
                })) || []
            };
        });
    };

    const handleSaveAll = async () => {
        if (selectedIndicators.length === 0) {
            return toast.error("No has seleccionado ningún indicador.");
        }

        if (!validateData()) return;

        const formattedData = {
            project_id: parseInt(projectId),
            indicators: prepareIndicatorsForServer(selectedIndicators)
        };

        const result = await Swal.fire({
            title: '¿Guardar Configuración Técnica?',
            text: `Se procesarán ${selectedIndicators.length} indicadores para este proyecto.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, guardar todo',
            cancelButtonText: 'Revisar más',
            confirmButtonColor: '#52b788',
            cancelButtonColor: '#1b263b',
            background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1b263b' : '#ffffff',
            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1b263b',
        });

        if (result.isConfirmed) {
            try {
                console.log("Datos a enviar:", formattedData)
                const res = await apiFetch('/indicators/bulk', {
                    method: 'POST',
                    body: JSON.stringify(formattedData)
                });

                if (res.ok) {
                    toast.success("¡Planificación técnica guardada con éxito!");
                    await refreshProjectIndicators();
                    setActiveIndicatorId(null);

                } else {
                    toast.error("Hubo un error al guardar los indicadores.");
                }
            } catch (error) {
                toast.error("Error de conexión con el servidor.");
            }
        }
    };


    const confirmDelete = (indicatorId, code) => {
        Swal.fire({
            title: `¿Eliminar indicador ${code}?`,
            text: "Se borrará permanentemente del servidor y se actualizarán las dependencias.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#1b263b',
            confirmButtonText: 'Sí, eliminar de la DB',
            cancelButtonText: 'Cancelar',
            background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1b263b' : '#ffffff',
            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1b263b',
        }).then(async (result) => {
            if (result.isConfirmed) {
                const remainingIndicators = selectedIndicators.filter(i => i.template_id !== indicatorId);

                const formattedData = {
                    project_id: parseInt(projectId),
                    indicators: prepareIndicatorsForServer(remainingIndicators)
                };

                try {
                    const res = await apiFetch('/indicators/bulk', {
                        method: 'POST',
                        body: JSON.stringify(formattedData)
                    });

                    if (res.ok) {
                        toast.success("Eliminado y sincronizado con el servidor");
                        await refreshProjectIndicators();

                        if (activeIndicatorId === indicatorId) setActiveIndicatorId(null);
                    } else {
                        toast.error("El servidor no pudo procesar la eliminación.");
                    }
                } catch (error) {
                    toast.error("Error de conexión al intentar eliminar.");
                }
            }
        });
    };


    const handleCompetenceChange = async (comp) => {
        setLoading(true);
        try {
            setSelectedComp(comp);
            const res = await apiFetch(`/competence/${comp.competence_id}/theories`);
            const newTheories = await res.json();

            setTheories(newTheories);

            await refreshProjectIndicators(newTheories);

        } catch (error) {
            toast.error("Error al cambiar de competencia");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const [resProj, resMaster, resMyProjs] = await Promise.all([
                    apiFetch(`/projects/${projectId}`),
                    apiFetch('/verification-means'),
                    apiFetch(`/my-assigned-projects`)
                ]);

                const dataProj = await resProj.json();
                const dataMaster = await resMaster.json();
                const allMyProjects = await resMyProjs.json();

                setProject(dataProj);
                setMasterMeans(dataMaster);

                const myComps = allMyProjects.filter(p => p.project_id === parseInt(projectId));
                setMyCompetences(myComps);

                if (myComps.length > 0) {
                    setSelectedComp(myComps[0]);
                    const resTheory = await apiFetch(`/competence/${myComps[0].competence_id}/theories`);
                    const initialTheories = await resTheory.json();
                    setTheories(initialTheories);

                    await refreshProjectIndicators(initialTheories);
                }
            } catch (error) {
                toast.error("Error al sincronizar SIGSSEP");
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [projectId]);


    const indicatorsOfSelectedComp = useMemo(() => {
        if (!selectedComp || !theories.length) return [];
        const currentTheoryNames = theories.map(t => t.name);
        return selectedIndicators.filter(ind => currentTheoryNames.includes(ind.theory_name));
    }, [selectedIndicators, theories, selectedComp]);

    const currentTheory = theories.find(t => String(t.id) === String(selectedTheoryId));
    const activeInd = selectedIndicators.find(i => i.template_id === activeIndicatorId);

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-emerald"></div></div>;

    return (
        <div className="management-page-container min-vh-100 transition-all">
            <Toaster richColors position="top-right" />
            <div className="container mt-4">
                <div className="mb-4">
                    <button
                        onClick={() => navigate('/manager/projects')}
                        className="btn btn-link text-decoration-none p-0 d-inline-flex align-items-center transition-all hover-translate-x text-muted-dynamic"
                        style={{ fontSize: '0.9rem', fontWeight: '500' }}
                    >
                        <i className="fas fa-arrow-left me-2 text-emerald"></i>
                        Volver a la lista de proyectos
                    </button>
                </div>
                <div className="management-card-header mb-4 shadow-sm rounded-3 p-3 bg-card-dynamic border-dynamic">
                    <h2 className="management-title">Configuración Técnica</h2>
                    <p className="text-muted mb-0">
                        Proyecto: <span className="fw-bold text-emerald">{project?.project_name}</span>
                    </p>
                </div>
                {/* SELECTOR DE COMPETENCIAS*/}
                <div className="d-flex flex-wrap gap-2 mb-4">
                    {myCompetences.map(comp => (
                        <button
                            key={comp.competence_id}
                            className={`btn ${selectedComp?.competence_id === comp.competence_id ? 'btn-emerald' : 'btn-outline-oxford'} shadow-sm`}
                            style={{ borderRadius: '8px', transition: 'all 0.3s ease' }}
                            onClick={() => handleCompetenceChange(comp)}
                        >
                            <i className={`fas fa-briefcase me-2 ${selectedComp?.competence_id === comp.competence_id ? 'text-white' : ''}`}></i>
                            {comp.competence_name}
                        </button>
                    ))}
                </div>
                <div className="row">
                    <div className="col-md-5">
                        <div className="card shadow-sm border-dynamic bg-card-dynamic">
                            <div className="card-header py-4 bg-oxford-grey border-bottom border-success text-white d-flex justify-content-between align-items-center border-0">
                                <span className="small fw-bold text-oxford-dynamic"><i className="fas fa-sitemap me-2"></i>Estructura Técnica</span>
                                <span className="badge bg-emerald">{selectedIndicators.length} Seleccionados</span>
                            </div>
                            <div className="card-body">
                                <label className="form-label fw-bold text-oxford-grey">1. Seleccione Teoría de Cambio</label>
                                <select
                                    className="form-select mb-4 border-emerald shadow-sm"
                                    value={selectedTheoryId}
                                    onChange={(e) => setSelectedTheoryId(e.target.value)}
                                >
                                    <option value="">-- Elige una Teoría --</option>
                                    {theories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <div className="theory-scroll custom-scrollbar" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                    {currentTheory?.results ? (
                                        currentTheory.results.map(result => (
                                            <div key={result.id} className="result-container mb-3">
                                                <div
                                                    className={`result-header d-flex align-items-center p-2 rounded-2 cursor-pointer ${result.type === 'outcome' ? 'bg-light-emerald' : 'bg-light-grey'}`}
                                                    onClick={() => setExpandedResults(prev => ({ ...prev, [result.id]: !prev[result.id] }))}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <i className={`fas ${expandedResults[result.id] ? 'fa-chevron-down' : 'fa-chevron-right'} me-2 ${expandedResults[result.id] ? 'text-emerald' : 'text-oxford-dynamic'}`}></i>
                                                    <span className={`badge ${result.type === 'outcome' ? 'bg-primary' : 'bg-emerald'} me-2`}>
                                                        {result.type.toUpperCase()}
                                                    </span>
                                                    <span className="small fw-bold text-oxford-dynamic">{result.name}</span>
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
                                                                    disabled={selectedIndicators.some(i => i.template_id === ind.id)}
                                                                    onChange={(e) => {
                                                                        if (result) {
                                                                            handleIndicatorToggle(ind, e.target.checked, result);
                                                                        } else {
                                                                            console.error("SIGSSEP Error: El objeto 'result' no llegó al checkbox.");
                                                                        }
                                                                    }}
                                                                />
                                                                <label className="form-check-label small d-block cursor-pointer" htmlFor={`ind-${ind.id}`}>
                                                                    {selectedIndicators.some(i => i.template_id === ind.id) && (
                                                                        <i className="fas fa-check-circle text-emerald me-1 animate__animated animate__fadeIn"
                                                                            title={`Configurado`}
                                                                            style={{ cursor: 'help' }}></i>
                                                                    )}
                                                                    <span className={selectedIndicators.some(i => i.template_id === ind.id) ? "text-emerald fw-bold" : "text-oxford-grey"}>
                                                                        {ind.code}
                                                                    </span>: {ind.name}
                                                                </label>
                                                            </div>
                                                        )) : <p className="text-muted small ms-2">No hay indicadores en este {result.type}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        selectedTheoryId && <div className="text-center p-3 text-muted small italic">Cargando estructura...</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* COLUMNA DERECHA*/}
                    <div className="col-md-7">
                        {activeIndicatorId && activeInd ? (
                            <div className="card shadow-lg border-dynamic fade-in bg-card-dynamic">
                                <div className="card-header bg-oxford-grey border-bottom border-success text-white p-3 d-flex justify-content-between align-items-center border-0">
                                    <div>
                                        <span className="badge bg-emerald me-2">CONFIGURANDO</span>
                                        <span className="fw-bold text-oxford-dynamic">{activeInd.code}</span>
                                    </div>
                                    <button className="btn btn-sm text-oxford-dynamic" onClick={() => setActiveIndicatorId(null)}>
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                                <div className="card-body">
                                    <div className="row mb-4">
                                        <div className="col-md-7">
                                            <label className="uppercase-label text-emerald small fw-bold mb-2 d-block">
                                                <i className="fas fa-check-double me-2 text-emerald"></i>Medios de Verificación
                                            </label>
                                            <div className="means-selection-list p-2 border-dynamic rounded bg-input-dynamic custom-scrollbar"
                                                style={{ height: '160px', overflowY: 'auto' }}>
                                                {masterMeans.map(mean => (
                                                    <div key={mean.id} className="custom-check-item p-2 mb-1 rounded hover-shadow">
                                                        <div className="form-check d-flex align-items-center m-0 w-100">
                                                            <input
                                                                className="form-check-input flex-shrink-0"
                                                                type="checkbox"
                                                                id={`mean-${mean.id}`}
                                                                checked={(activeInd.means_ids || []).includes(mean.id)}
                                                                onChange={(e) => {
                                                                    let currentIds = [...(activeInd.means_ids || [])];
                                                                    if (e.target.checked) currentIds.push(mean.id);
                                                                    else currentIds = currentIds.filter(id => id !== mean.id);
                                                                    handleInfoChange(activeIndicatorId, 'means_ids', currentIds);
                                                                }}
                                                            />
                                                            <label className="form-check-label ps-2 flex-grow-1 cursor-pointer mb-0 text-main-dynamic"
                                                                htmlFor={`mean-${mean.id}`} style={{ fontSize: '0.85rem' }}>
                                                                {mean.name}
                                                            </label>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Campo híbrido: Nota extra para medios */}
                                            <input
                                                type="text"
                                                className="form-control form-control-sm mt-2 bg-input-dynamic border-dynamic text-main-dynamic"
                                                placeholder="Nota adicional sobre medios..."
                                                value={activeInd.verification_means || ''}
                                                onChange={(e) => handleInfoChange(activeIndicatorId, 'verification_means', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-5">
                                            <label className="uppercase-label text-emerald small fw-bold mb-2 d-block">
                                                <i className="fas fa-comment-dots me-2 text-emerald"></i>Observaciones
                                            </label>
                                            <textarea
                                                className="form-control bg-input-dynamic border-dynamic text-main-dynamic"
                                                rows="4"
                                                placeholder="Notas adicionales..."
                                                value={activeInd.observations || ''}
                                                onChange={(e) => handleInfoChange(activeIndicatorId, 'observations', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {/* SECCIÓN DE DEPENDENCIAS (Solo para Outcomes) */}
                                    {activeInd.result_type === 'outcome' && (
                                        <div className="mb-4 fade-in">
                                            {/* INTERRUPTOR DE ESTRATEGIA */}
                                            <label className="uppercase-label text-emerald small fw-bold mb-2 d-block">
                                                <i className="fas fa-cog me-2"></i>Estrategia de Medición
                                            </label>

                                            <div className="d-flex gap-2 mb-3">
                                                <button
                                                    className={`btn btn-sm flex-grow-1 ${activeInd.calculation_type === 'dependent' ? 'btn-emerald' : 'btn-outline-secondary text-main-dynamic'}`}
                                                    onClick={() => handleInfoChange(activeIndicatorId, 'calculation_type', 'dependent')}
                                                >
                                                    <i className="fas fa-project-diagram me-2"></i>Porcentaje Dependiente
                                                </button>
                                                <button
                                                    className={`btn btn-sm flex-grow-1 ${activeInd.calculation_type === 'independent' ? 'btn-oxford' : 'btn-outline-secondary text-main-dynamic'}`}
                                                    onClick={() => handleInfoChange(activeIndicatorId, 'calculation_type', 'independent')}
                                                >
                                                    <i className="fas fa-user-check me-2"></i>Logro Independiente
                                                </button>
                                            </div>

                                            {/* CONTENIDO CONDICIONAL: Solo mostramos el acordeón si es DEPENDIENTE */}
                                            {activeInd.calculation_type === 'dependent' ? (
                                                <div className="dependency-container animate__animated animate__fadeIn">
                                                    <label className="uppercase-label text-muted small fw-bold mb-2 d-block">
                                                        <i className="fas fa-link me-2"></i>Vincular a Indicadores de Contribución (Outputs)
                                                    </label>

                                                    <div className="accordion accordion-flush shadow-sm border-dynamic rounded" id="accordionDependencies">
                                                        {Object.keys(groupedData).map((theoryName) => (
                                                            <React.Fragment key={theoryName}>
                                                                {groupedData[theoryName]['output'] && Object.keys(groupedData[theoryName]['output']).map((resultName) => {
                                                                    const indicatorsInGroup = groupedData[theoryName]['output'][resultName];
                                                                    const collapseId = `collapse-${resultName.replace(/\s+/g, '-')}`;

                                                                    return (
                                                                        <div className="accordion-item bg-card-dynamic border-dynamic" key={resultName}>
                                                                            <h2 className="accordion-header">
                                                                                <button
                                                                                    className="accordion-button collapsed py-2 px-3 fw-bold small"
                                                                                    type="button"
                                                                                    data-bs-toggle="collapse"
                                                                                    data-bs-target={`#${collapseId}`}
                                                                                    style={{ backgroundColor: 'var(--bg-input-dynamic)', color: 'var(--text-main-dynamic)' }}
                                                                                >
                                                                                    {resultName}
                                                                                    <span className="badge bg-emerald ms-auto">{indicatorsInGroup.length}</span>
                                                                                </button>
                                                                            </h2>
                                                                            <div id={collapseId} className="accordion-collapse collapse" data-bs-parent="#accordionDependencies">
                                                                                <div className="accordion-body p-2">
                                                                                    {indicatorsInGroup.map((outputInd) => (
                                                                                        <div className="custom-check-item p-2 mb-1 rounded hover-shadow-sm" key={outputInd.template_id}>
                                                                                            <div className="form-check m-0">
                                                                                                <input
                                                                                                    className="form-check-input"
                                                                                                    type="checkbox"
                                                                                                    id={`chk-${outputInd.template_id}`}
                                                                                                    checked={(activeInd.depends_on_ids || []).includes(outputInd.template_id)}
                                                                                                    onChange={(e) => {
                                                                                                        let currentDeps = [...(activeInd.depends_on_ids || [])];
                                                                                                        if (e.target.checked) currentDeps.push(outputInd.template_id);
                                                                                                        else currentDeps = currentDeps.filter(id => id !== outputInd.template_id);
                                                                                                        handleInfoChange(activeIndicatorId, 'depends_on_ids', currentDeps);
                                                                                                    }}
                                                                                                />
                                                                                                <label className="form-check-label ms-2 cursor-pointer d-block" htmlFor={`chk-${outputInd.template_id}`}>
                                                                                                    <span className="text-emerald fw-bold small">{outputInd.code}:</span>
                                                                                                    <span className="ms-1 text-main-dynamic" style={{ fontSize: '0.75rem' }}>{outputInd.indicator_name}</span>
                                                                                                </label>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </React.Fragment>
                                                        ))}
                                                        {Object.keys(groupedData).length === 0 && (
                                                            <div className="p-3 text-center text-muted small">
                                                                <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
                                                                Debes seleccionar indicadores de tipo Output primero.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Mensaje para Logro Independiente */
                                                <div className="alert alert-info border-0 shadow-sm d-flex align-items-center mb-0 py-2">
                                                    <i className="fas fa-info-circle me-3 fs-4"></i>
                                                    <small className="text-dark">
                                                        Este indicador se medirá de forma <strong>directa</strong>.
                                                        El oficial registrará el avance manualmente sin depender de otros indicadores.
                                                    </small>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <h6 className="uppercase-label text-emerald mb-3 border-bottom-dynamic pb-2 small fw-bold">
                                        <i className="fas fa-map-marker-alt me-2"></i>Desglose por Estado
                                    </h6>

                                    <div className="table-responsive custom-scrollbar" style={{ maxHeight: '400px' }}>
                                        <table className="table table-custom-sigssep align-middle">
                                            <thead className="thead-oxford sticky-top">
                                                <tr>
                                                    <th>Provincia</th>
                                                    {/* Solo mostramos H y M si NO es outcome */}
                                                    {activeInd.result_type !== 'outcome' && (
                                                        <>
                                                            <th className="text-center"><i className="fas fa-mars m-color"></i> H</th>
                                                            <th className="text-center"><i className="fas fa-venus w-color"></i> M</th>
                                                        </>
                                                    )}
                                                    <th className="text-center">Total {activeInd.result_type === 'outcome' ? '(%)' : ''}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activeInd.province_goals.map((pg, index) => {
                                                    // --- INICIO LÓGICA DE FILTRO ---
                                                    const isOutcome = activeInd.result_type?.toLowerCase() === 'outcome';
                                                    const hasDependencies = activeInd.depends_on_ids && activeInd.depends_on_ids.length > 0;

                                                    let isVisible = true;

                                                    if (isOutcome && hasDependencies) {
                                                        const parentIndicators = selectedIndicators.filter(s =>
                                                            activeInd.depends_on_ids.includes(s.template_id)
                                                        );
                                                        isVisible = parentIndicators.some(parent =>
                                                            parent.province_goals.some(parentPg =>
                                                                parentPg.province_id === pg.province_id && parentPg.total > 0
                                                            )
                                                        );
                                                    }

                                                    if (!isVisible) return null;

                                                    return (
                                                        <tr key={`${pg.province_id}-${index}`} className="tr-transparent">
                                                            <td className="text-oxford-dynamic fw-bold">
                                                                {pg.province_name || "Sin nombre"}
                                                            </td>
                                                            {/* Columnas H y M condicionadas */}
                                                            {activeInd.result_type !== 'outcome' && (
                                                                <>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            className="form-control form-control-sm border-primary-subtle"
                                                                            value={pg.men === 0 ? '' : pg.men}
                                                                            onChange={(e) => handleMetaChange(activeIndicatorId, pg.province_id, 'men', e.target.value)}
                                                                            placeholder="0"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            className="form-control form-control-sm border-danger-subtle"
                                                                            value={pg.women === 0 ? '' : pg.women}
                                                                            onChange={(e) => handleMetaChange(activeIndicatorId, pg.province_id, 'women', e.target.value)}
                                                                            placeholder="0"
                                                                        />
                                                                    </td>
                                                                </>
                                                            )}
                                                            {/* Columna TOTAL con Input dinámico */}
                                                            <td>
                                                                <div className="input-group input-group-sm">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={activeInd.result_type === 'outcome' ? "100" : undefined}
                                                                        className={`form-control meta-input ${activeInd.result_type !== 'outcome' && (pg.men + pg.women !== pg.total)
                                                                            ? 'border-danger text-danger'
                                                                            : ''
                                                                            }`}
                                                                        value={pg.total === 0 ? '' : pg.total}
                                                                        disabled={activeInd.result_type !== 'outcome'}
                                                                        onChange={(e) => {
                                                                            let val = parseFloat(e.target.value);
                                                                            if (activeInd.result_type === 'outcome' && val > 100) val = 100;
                                                                            handleMetaChange(activeIndicatorId, pg.province_id, 'total', val || 0);
                                                                        }}
                                                                        placeholder="0"
                                                                    />
                                                                    {activeInd.result_type === 'outcome' && (
                                                                        <span className="input-group-text bg-light-emerald text-emerald fw-bold">%</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* TABLA DERECHA RESUMEN*/
                            <div className="card shadow-sm border-dynamic bg-card-dynamic p-4 fade-in resumen-exitoso">
                                <div className="text-center border-bottom border-success mb-4">
                                    <div className="icon-circle-emerald mb-3">
                                        <i className="fas fa-clipboard-check fa-2x text-emerald"></i>
                                    </div>
                                    <h5 className="text-oxford-dynamic fw-bold">Resumen de Configuración</h5>
                                    <p className="text-oxford-dynamic small text-muted">Indicadores procesados para este proyecto</p>
                                </div>
                                <div className="table-responsive rounded  bg-card-dynamic border-dynamic">
                                    <table className="table table-hover align-middle table-custom-sigssep mb-0 text-main-dynamic" style={{ fontSize: '0.85rem' }}>
                                        <thead className="bg-oxford-soft text-oxford-dynamic">
                                            <tr>
                                                <th>Código</th>
                                                <th className="text-center">Meta</th>
                                                <th className="text-center">H / M</th>
                                                <th className="text-end">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {indicatorsOfSelectedComp.length > 0 ? (
                                                indicatorsOfSelectedComp.map((ind, idx) => (
                                                    <tr key={ind.template_id || idx} className="cursor-pointer transition-all hover-oxford-soft" onClick={() => setActiveIndicatorId(ind.template_id)}>
                                                        <td className="fw-bold text-emerald">{ind.code}</td>

                                                        <td className="fw-bold text-center">
                                                            {ind.result_type?.toLowerCase() === 'outcome' ? (
                                                                <span className="badge bg-primary text-navy px-3 py-2" style={{ fontSize: '0.9rem' }}>
                                                                    {(ind.province_goals.reduce((acc, curr) => acc + (curr.total || 0), 0) /
                                                                        ind.province_goals.filter(p => (p.total || 0) > 0).length || 0).toFixed(0)}%
                                                                </span>
                                                            ) : (
                                                                <span className="badge bg-emerald text-navy px-3 py-2" style={{ fontSize: '0.9rem' }}>
                                                                    {ind.province_goals.reduce((acc, curr) => acc + (curr.total || 0), 0)}
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="text-center">
                                                            {ind.result_type?.toLowerCase() === 'outcome' ? (
                                                                <div className="d-flex flex-column gap-1 align-items-center">
                                                                    {ind.province_goals.filter(pg => pg.total > 0).map((pg, i) => (
                                                                        <span key={i} className="badge border text-oxford-dynamic" style={{ fontSize: '0.65rem', minWidth: '80px' }}>
                                                                            {pg.province_name.substring(0, 3)}: {pg.total}%
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="d-flex justify-content-center gap-1">
                                                                    <span className="badge bg-blue-100 text-primary border border-primary-subtle" title="Hombres">
                                                                        <i className="fas fa-mars me-1"></i>
                                                                        {ind.province_goals.reduce((acc, curr) => acc + (curr.men || 0), 0)}
                                                                    </span>
                                                                    <span className="badge bg-pink-100 text-danger border border-danger-subtle" title="Mujeres">
                                                                        <i className="fas fa-venus me-1"></i>
                                                                        {ind.province_goals.reduce((acc, curr) => acc + (curr.women || 0), 0)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className="badge bg-emerald-light text-emerald border border-emerald">
                                                                <i className="fas fa-check-circle me-1"></i> Listo
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <button
                                                                className="btn btn-sm btn-outline-danger border-0"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    confirmDelete(ind.template_id, ind.code);
                                                                }}
                                                                title="Eliminar este indicador"
                                                            >
                                                                <i className="fas fa-trash-alt"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-5 text-muted">
                                                        <i className="fas fa-info-circle me-2"></i>
                                                        No has configurado ningún indicador todavía.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-3 text-end">
                                    <small className="text-oxford-dynamic italic">* Haz clic en una fila para volver a editar.</small>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* TABLA INFERIOR */}
                    <div className="mt-5 p-4 rounded shadow-sm border-dynamic bg-card-dynamic">
                        <h5 className="text-oxford-grey border-bottom border-success fw-bold mb-4 pb-4">
                            <i className="fas fa-project-diagram me-2 text-emerald"></i>
                            Matriz de Planificación Técnica (Marco Lógico)
                        </h5>
                        <div className="table-responsive">
                            <table className="table table-custom-sigssep align-middle">
                                <thead className="bg-oxford-grey text-oxford-dynamic">
                                    <tr>
                                        <th style={{ width: '25%' }}>Teoría / Resultado / código</th>
                                        <th style={{ width: '20%' }}>Título /<br /> <div>descripción</div></th>
                                        <th style={{ width: '15%' }}>Medios de Verificación</th>
                                        <th className="text-center">Metas por estado</th>
                                        <th>Observaciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(groupedData).map(tName => (
                                        <React.Fragment key={tName}>
                                            {/* NIVEL 1: TEORÍA */}
                                            <tr
                                                className="bg-oxford-grey text-emerald fw-bold theory-row"
                                                onClick={() => toggleTheory(tName)}
                                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                            >
                                                <td colSpan="5" className="py-3 px-3">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span>
                                                            <i
                                                                className={`fas fa-chevron-right me-3 text-emerald`}
                                                                style={{
                                                                    transform: expandedTheories[tName] ? 'rotate(90deg)' : 'rotate(0deg)',
                                                                    transition: 'transform 0.3s ease'
                                                                }}
                                                            ></i>
                                                            <i className="fas fa-university me-2 text-emerald"></i>
                                                            TEORÍA: {tName}
                                                        </span>
                                                        <small className="text-emerald opacity-75" style={{ fontSize: '0.65rem' }}>
                                                            {expandedTheories[tName] ? 'CONTRAER' : 'EXPANDIR'}
                                                        </small>
                                                    </div>
                                                </td>
                                            </tr>

                                            {expandedTheories[tName] && Object.keys(groupedData[tName]).map(rType => (
                                                <React.Fragment key={rType}>
                                                    {Object.keys(groupedData[tName][rType]).map(rName => (
                                                        <React.Fragment key={rName}>
                                                            {/* NIVEL 2: RESULTADO */}
                                                            <tr className=" row-fade-in">
                                                                <td colSpan="5" className="ps-4 border-emerald border-1">
                                                                    <span className={`badge ${rType.toLowerCase() === 'outcome' ? 'bg-primary' : 'bg-emerald'} me-2`}>
                                                                        {rType.toUpperCase()}
                                                                    </span>
                                                                    <span className="fw-bold text-oxford-dynamic">{rName}</span>
                                                                </td>
                                                            </tr>

                                                            {/* NIVEL 3: INDICADORES */}
                                                            {groupedData[tName][rType][rName].map(ind => (
                                                                <tr key={ind.template_id} className="row-fade-in border-outcome ">
                                                                    <td className="fw-bold text-center" style={{ verticalAlign: 'top' }}>
                                                                        <span className="text-emerald">{ind.code}</span>
                                                                    </td>
                                                                    <td>
                                                                        <div className="fw-bold text-oxford-dynamic">{ind.indicator_name}</div>
                                                                        <div className="text-muted-dynamic" style={{ fontSize: '0.8rem' }}>{ind.description}</div>
                                                                    </td>
                                                                    <td style={{ verticalAlign: 'top' }}>
                                                                        {/* 1. Chips del Catálogo  */}
                                                                        {ind.means_tags && ind.means_tags.length > 0 && (
                                                                            <div className="d-flex flex-wrap gap-1 mb-2">
                                                                                {ind.means_tags.map((mean, i) => (
                                                                                    <span key={i} className="auth-input" style={{ fontSize: '0.7rem' }}>
                                                                                        <i className="fas fa-check-circle text-emerald me-1"></i>
                                                                                        {mean.name}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {ind.verification_means && (
                                                                            <div className="small text-secondary mt-1 pt-1 italic">
                                                                                {ind.verification_means}
                                                                            </div>
                                                                        )}
                                                                        {!ind.verification_means && (!ind.means_tags || ind.means_tags.length === 0) && (
                                                                            <span className="text-muted small">---</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-0" style={{ minWidth: '180px' }}>
                                                                        <div className="list-group list-group-flush" style={{ fontSize: '0.85rem' }}>
                                                                            {ind.province_goals
                                                                                // FILTRO: Solo mostramos si el total es mayor a 0
                                                                                .filter(pg => pg.total > 0 || pg.target > 0)
                                                                                .map((pg, idx) => (
                                                                                    <div key={idx} className="list-group-item py-2 px-3 border-0 bg-transparent">
                                                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                                                            <span className="fw-bold text-oxford-dynamic">
                                                                                                <i className="fas fa-map-marker-alt me-1 text-emerald" style={{ fontSize: '1rem' }}></i>
                                                                                                {pg.province_name}
                                                                                            </span>
                                                                                            <span className="badge rounded-pill text-oxford-dynamic" style={{ fontSize: '1rem' }}>
                                                                                                {pg.total || pg.target}
                                                                                                {ind.result_type?.toLowerCase() === 'outcome' ? '%' : ''}
                                                                                            </span>
                                                                                        </div>
                                                                                        {/* Desagregación compacta */}
                                                                                        {ind.result_type?.toLowerCase() !== 'outcome' && (
                                                                                            <div className="d-flex gap-3 justify-content-end text-oxford-dynamic" style={{ fontSize: '0.85rem' }}>
                                                                                                <span><i className="fas fa-mars text-primary me-1"></i>{pg.men}</span>
                                                                                                <span><i className="fas fa-venus text-danger me-1"></i>{pg.women}</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ))
                                                                            }
                                                                            {ind.province_goals.every(pg => (pg.total || pg.target) === 0) && (
                                                                                <div className="p-2 text-center text-muted small italic">
                                                                                    Sin metas asignadas
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="small text-secondary">
                                                                        {ind.observations || "---"}
                                                                    </td>
                                                                </tr>
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