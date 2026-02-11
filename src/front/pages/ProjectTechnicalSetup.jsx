import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from "../../utils/api";
import { toast, Toaster } from 'sonner';
import Swal from 'sweetalert2';
import "../styles/projectDetail.css";
import "../styles/projectTechnical.css";

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
    const navigate = useNavigate();
    const [expandedTheories, setExpandedTheories] = useState({});
    const [masterMeans, setMasterMeans] = useState([]);

    // Función para cambiar el estado (abrir/cerrar)
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
            result_type: "Output"
        };

        allTheories.forEach(t => {
            t.results?.forEach(r => {
                if (r.indicators?.some(i => i.id === templateId)) {
                    context = { theory_name: t.name, result_name: r.name, result_type: r.type };
                }
            });
        });
        return context;
    };


    const groupedData = selectedIndicators.reduce((acc, ind) => {

        let indicatorName = "Nombre no encontrado";
        theories.forEach(t => {
            t.results?.forEach(r => {
                const found = r.indicators?.find(i => i.id === ind.template_id);
                if (found) indicatorName = found.name;
            });
        });

        const context = getIndicatorContext(ind.template_id, theories);
        const tName = context.theory_name;
        const rType = context.result_type;
        const rName = context.result_name;

        if (!acc[tName]) acc[tName] = {};
        // Agrupamos por TIPO dentro de la teoría
        if (!acc[tName][rType]) acc[tName][rType] = {};
        if (!acc[tName][rType][rName]) acc[tName][rType][rName] = [];

        acc[tName][rType][rName].push({
            ...ind,
            indicator_name: indicatorName // <--- ¡Aquí está la magia!
        });
        return acc;
    }, {});

    const handleMetaChange = (indicatorId, provinceId, field, value) => {
        const numValue = value === '' ? 0 : Number(value);
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


    const handleIndicatorToggle = (ind, isChecked) => {
        if (isChecked) {
            // 1. Buscamos la Teoría y el Resultado (Esto ya lo tenías bien)
            const theory = theories.find(t => String(t.id) === String(selectedTheoryId));
            const result = theory?.results.find(r =>
                r.indicators.some(indicatorInResult => indicatorInResult.id === ind.id)
            );

            // 2. CREAMOS LA LISTA DE PROVINCIAS SIN DUPLICADOS
            // Aquí es donde resolvemos el Error 3
            const uniqueProvinces = [];
            const seen = new Set();

            if (project?.locations && project.locations.length > 0) {
                // Imprimimos para ver qué nombres de propiedades tiene tu objeto realmente
                console.log("Datos de locaciones del proyecto:", project.locations);

                project.locations.forEach(loc => {
                    // Usamos loc.province o loc.province_name según lo que venga de tu base de datos
                    const pName = loc.province || loc.province_name || "Provincia desconocida";
                    const pId = loc.province_id;

                    if (!seen.has(pName)) {
                        seen.add(pName);
                        uniqueProvinces.push({
                            province_id: loc.id_location || loc.province_id,
                            province_name: loc.province || loc.province_name,
                            total: 0,
                            men: 0,
                            women: 0
                        });
                    }
                });
            }

            // 3. Creamos el objeto final para la tabla
            const newIndicator = {
                template_id: ind.id,
                code: ind.code,
                indicator_name: ind.name || ind.title || "Indicador sin nombre",
                description: ind.description,
                theory_name: currentTheory?.name || "Sin Teoría",
                result_type: result?.type || "Output",
                result_name: result?.name || "Sin Resultado",
                verification_means: "",
                observations: "",
                province_goals: uniqueProvinces,
                means_ids: [],
                means_tags: []
            };

            setSelectedIndicators([...selectedIndicators, newIndicator]);
            setActiveIndicatorId(ind.id);

        } else {
            setSelectedIndicators(selectedIndicators.filter(i => i.template_id !== ind.id));
            if (activeIndicatorId === ind.id) {
                setActiveIndicatorId(null);
            }
        }
    };


    const handleInfoChange = (indicatorId, field, value) => {
        setSelectedIndicators(prev => prev.map(ind => {
            if (ind.template_id === indicatorId) {
                let extraData = {};

                // SI ESTAMOS CAMBIANDO LOS MEDIOS DE VERIFICACIÓN
                if (field === 'means_ids') {
                    // Buscamos los objetos completos en el catálogo para tener los nombres
                    // Esto es lo que hace que aparezcan en la tabla SIN recargar
                    extraData.means_tags = masterMeans.filter(m => value.includes(m.id));
                }

                return {
                    ...ind,
                    [field]: value,
                    ...extraData // Esto inyecta los means_tags si existen
                };
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
            indicators: selectedIndicators.map(ind => {
                const finalMeansIds = ind.means_ids && ind.means_ids.length > 0
                    ? ind.means_ids
                    : (ind.means_tags ? ind.means_tags.map(t => t.id) : []);

                return {
                    template_id: ind.template_id,
                    means_ids: finalMeansIds, // Enviamos IDs siempre
                    target_total: ind.province_goals.reduce((acc, curr) => acc + curr.total, 0),
                    target_men: ind.province_goals.reduce((acc, curr) => acc + curr.men, 0),
                    target_women: ind.province_goals.reduce((acc, curr) => acc + curr.women, 0),
                    verification_means: ind.verification_means,
                    observations: ind.observations,
                    goals_by_province: ind.province_goals.map(pg => ({
                        province_id: pg.province_id,
                        target: pg.total,
                        target_men: pg.men,
                        target_women: pg.women
                    }))
                };
            })
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


    const confirmDelete = (indicatorId, code) => {
        Swal.fire({
            title: `¿Eliminar indicador ${code}?`,
            text: "Se borrará permanentemente del servidor.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar de la DB',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                // 1. Filtramos localmente
                const updatedIndicators = selectedIndicators.filter(i => i.template_id !== indicatorId);

                // 2. Transformamos exacto como en handleSaveAll (Tu lógica de image_ae4889.png)
                const formattedData = {
                    project_id: parseInt(projectId),
                    indicators: updatedIndicators.map(ind => {
                        const finalMeansIds = ind.means_ids && ind.means_ids.length > 0
                            ? ind.means_ids
                            : (ind.means_tags ? ind.means_tags.map(t => t.id) : []);

                        return {
                            template_id: ind.template_id,
                            means_ids: finalMeansIds, // <-- Ahora sí está protegido
                            target_total: ind.province_goals.reduce((acc, curr) => acc + curr.total, 0),
                            target_men: ind.province_goals.reduce((acc, curr) => acc + curr.men, 0),
                            target_women: ind.province_goals.reduce((acc, curr) => acc + curr.women, 0),
                            verification_means: ind.verification_means,
                            observations: ind.observations,
                            goals_by_province: ind.province_goals.map(pg => ({
                                province_id: pg.province_id,
                                target: pg.total,
                                target_men: pg.men,
                                target_women: pg.women
                            }))
                        };
                    })
                };

                try {
                    // 3. ¡LLAMADA VITAL AL BACKEND!
                    const res = await apiFetch('/indicators/bulk', {
                        method: 'POST',
                        body: JSON.stringify(formattedData)
                    });

                    if (res.ok) {
                        setSelectedIndicators(updatedIndicators); // Actualiza pantalla
                        if (activeIndicatorId === indicatorId) setActiveIndicatorId(null);
                        toast.success("Eliminado permanentemente del servidor");
                    } else {
                        toast.error("El servidor recibió la orden pero no borró el dato.");
                    }
                } catch (error) {
                    toast.error("Error de conexión con el servidor.");
                }
            }
        });
    };

    // 1. Cargar datos iniciales
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);

                // 1. Cargamos el Proyecto
                const [resProj, resMaster] = await Promise.all([
                    apiFetch(`/projects/${projectId}`),
                    apiFetch('/verification-means')
                ]);
                const dataProj = await resProj.json();
                const dataMaster = await resMaster.json();
                setProject(dataProj);
                setMasterMeans(dataMaster);

                // 2. Cargamos las Competencias y la primera Teoría (ESTO DEBE IR ANTES)
                const resComp = await apiFetch(`/my-assigned-projects`);
                const allMyProjects = await resComp.json();
                const comps = allMyProjects.filter(p => p.project_id === parseInt(projectId));
                setMyCompetences(comps);

                let loadedTheories = [];
                if (comps.length > 0) {
                    setSelectedComp(comps[0]);
                    // Traemos las teorías de la primera competencia para tener el "mapa"
                    const resT = await apiFetch(`/competence/${comps[0].competence_id}/theories`);
                    loadedTheories = await resT.json();
                    setTheories(loadedTheories);
                }

                // 3. CARGAMOS LOS INDICADORES GUARDADOS (Ahora que ya tenemos loadedTheories)
                const resSaved = await apiFetch(`/projects/${projectId}/indicators`);
                if (resSaved.ok) {
                    const savedData = await resSaved.json();

                    const formattedSaved = savedData.map(ind => {
                        // USAMOS LA FUNCIÓN BUSCADORA AQUÍ
                        const info = getIndicatorContext(ind.template_id, loadedTheories);

                        return {
                            template_id: ind.template_id,
                            code: ind.indicator_code,
                            description: ind.description,
                            // Aplicamos lo que el detective encontró
                            theory_name: info.theory_name,
                            result_name: info.result_name,
                            result_type: info.result_type,
                            means_tags: ind.means_tags || [], // Para mostrar los badges en la tabla
                            means_ids: ind.means_ids || [],
                            verification_means: ind.verification_means || "",
                            observations: ind.observations || "",
                            province_goals: ind.goals_by_province.map(g => ({
                                province_id: g.province_id,
                                province_name: g.province_name,
                                total: g.target || 0, // Si 'target' viene en 0, se queda en 0
                                men: g.men || 0,
                                women: g.women || 0
                            }))
                        };
                    });
                    setSelectedIndicators(formattedSaved);
                }

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

    useEffect(() => {
        const loadMasterMeans = async () => {
            const res = await apiFetch("/verification-means");
            if (res?.ok) {
                const data = await res.json();
                setMasterMeans(data);
            }
        };
        loadMasterMeans();
    }, []);

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
                            className={`btn ${selectedComp?.competence_id === comp.competence_id ? 'btn-emerald' : 'btn-outline-oxford'}`}
                            onClick={() => setSelectedComp(comp)}
                        >
                            <i className="fas fa-briefcase me-2"></i>
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
                                                    <i className={`fas ${expandedResults[result.id] ? 'fa-chevron-down' : 'fa-chevron-right'} me-2 text-muted`}></i>
                                                    <span className={`badge ${result.type === 'outcome' ? 'bg-emerald' : 'bg-primary'} me-2`}>
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
                                                                    onChange={(e) => handleIndicatorToggle(ind, e.target.checked)}
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

                                    <h6 className="uppercase-label text-emerald mb-3 border-bottom-dynamic pb-2 small fw-bold">
                                        <i className="fas fa-map-marker-alt me-2"></i>Desglose por Estado
                                    </h6>

                                    <div className="table-responsive custom-scrollbar" style={{ maxHeight: '400px' }}>
                                        <table className="table table-custom-sigssep align-middle">
                                            <thead className="thead-oxford sticky-top">
                                                <tr>
                                                    <th>Provincia</th>
                                                    <th className="text-center">Total</th>
                                                    <th className="text-center"><i className="fas fa-mars m-color"></i> H</th>
                                                    <th className="text-center"><i className="fas fa-venus w-color"></i> M</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Aquí recorremos las metas del indicador activo */}
                                                {activeInd.province_goals.map((pg, index) => (
                                                    <tr key={`${pg.province_id}-${index}`} className="tr-transparent">
                                                        <td className="text-oxford-dynamic fw-bold">{pg.province_name || "Sin nombre"}</td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className={`form-control form-control-sm meta-input ${(pg.men + pg.women !== pg.total) ? 'border-danger text-danger' : ''}`}
                                                                value={pg.total === 0 ? '' : pg.total}
                                                                onChange={(e) => handleMetaChange(activeIndicatorId, pg.province_id, 'total', e.target.value)}
                                                                placeholder="0"
                                                            />
                                                        </td>
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
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* TABLA DERECHA RESUMEN*/
                            <div className="card shadow-sm border-dynamic bg-card-dynamic p-4 fade-in">
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
                                            {selectedIndicators.length > 0 ? (
                                                selectedIndicators.map((ind, idx) => (
                                                    <tr key={idx} className="cursor-pointer transition-all hover-oxford-soft" onClick={() => setActiveIndicatorId(ind.template_id)}>
                                                        <td className="fw-bold text-emerald">{ind.code}</td>
                                                        <td className="fw-bold text-center">
                                                            <span className="badge bg-emerald text-navy px-3 py-2" style={{ fontSize: '0.9rem' }}>
                                                                {ind.province_goals.reduce((acc, curr) => acc + (curr.total || 0), 0)}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
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
                                                                    e.stopPropagation(); // ¡Importante! Evita que se dispare el onClick de la fila
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
                                                                        {/* 1. Chips del Catálogo (usando means_tags de tu serialize) */}
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
                                                                                                <i className="fas fa-map-marker-alt me-1 text-emerald" style={{ fontSize: '0.7rem' }}></i>
                                                                                                {pg.province_name}
                                                                                            </span>
                                                                                            <span className="badge rounded-pill text-oxford-dynamic">
                                                                                                {pg.total || pg.target}
                                                                                            </span>
                                                                                        </div>
                                                                                        {/* Desagregación compacta */}
                                                                                        <div className="d-flex gap-3 justify-content-end text-oxford-dynamic" style={{ fontSize: '0.75rem' }}>
                                                                                            <span><i className="fas fa-mars text-primary me-1"></i>{pg.men}</span>
                                                                                            <span><i className="fas fa-venus text-danger me-1"></i>{pg.women}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                ))
                                                                            }
                                                                            {/* Mensaje amigable si todo está en cero */}
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