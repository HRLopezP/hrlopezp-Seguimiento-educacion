import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from "../../utils/api";
import Swal from 'sweetalert2';

const gapCache = {};

const ActivityWizard = ({ selectedDate, proyectoId, initialData, onClose, onSaveSuccess }) => {
    const [indicadores, setIndicadores] = useState([]);
    const [lugares, setLugares] = useState([]);
    const [catalogo, setCatalogo] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [customActivity, setCustomActivity] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [loadingLugares, setLoadingLugares] = useState(false);
    const [gapData, setGapData] = useState(null);
    const [loadingGap, setLoadingGap] = useState(false);

    const [form, setForm] = useState({
        indicator_id: '',
        location_id: '',
        planned_total: 0,
        planned_men: 0,
        planned_women: 0,
        start_date: selectedDate || '',
        end_date: selectedDate || '',
        project_id: proyectoId,
        project_competence_id: ''
    });

    const filteredIndicators = useMemo(() => {
        return indicadores.filter(ind =>
            ind.indicator_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ind.indicator_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [indicadores, searchTerm]);

    const groupedIndicators = useMemo(() => {
        return filteredIndicators.reduce((acc, curr) => {
            const theory = curr.theory_name || "Sin Teoría";
            const type = curr.result_type || "output";
            const result = curr.result_name || "General";

            if (!acc[theory]) acc[theory] = {};
            if (!acc[theory][type]) acc[theory][type] = {};
            if (!acc[theory][type][result]) acc[theory][type][result] = [];

            acc[theory][type][result].push(curr);
            return acc;
        }, {});
    }, [filteredIndicators]);


    useEffect(() => {
        const total = (parseInt(form.planned_men) || 0) + (parseInt(form.planned_women) || 0);
        setForm(prev => ({ ...prev, planned_total: total }));
    }, [form.planned_men, form.planned_women]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);

                const promesas = [apiFetch(`/official/projects/${proyectoId}/indicators`)];

                if (initialData?.indicator_id) {
                    promesas.push(apiFetch(`/official/indicators/${initialData.indicator_id}/locations`));
                }

                const respuestas = await Promise.all(promesas);
                const resInd = respuestas[0];
                const resLoc = respuestas[1];

                let listaIndicadores = [];
                if (resInd?.ok) {
                    listaIndicadores = await resInd.json();
                    setIndicadores(listaIndicadores);
                }

                if (initialData) {
                    if (resLoc?.ok) {
                        const todasLasLoc = await resLoc.json();
                        const indSeleccionado = listaIndicadores.find(i => String(i.id) === String(initialData.indicator_id));

                        const provinciasPermitidas = indSeleccionado?.goals_by_province
                            ?.filter(g => g.target > 0)
                            ?.map(g => g.province_name.trim().toLowerCase()) || [];

                        const filtradas = todasLasLoc.filter(loc =>
                            provinciasPermitidas.includes(loc.province_name?.trim().toLowerCase())
                        );
                        setLugares(filtradas);
                    }

                    setForm({
                        indicator_id: initialData.indicator_id || '',
                        location_id: initialData.location_id || '',
                        planned_total: initialData.planned?.total || 0,
                        planned_men: initialData.planned?.men || 0,
                        planned_women: initialData.planned?.women || 0,
                        start_date: initialData.period?.start || selectedDate,
                        end_date: initialData.period?.end || selectedDate,
                        project_id: proyectoId,
                        project_competence_id: initialData.project_competence_id || ''
                    });

                    if (initialData.description) {
                        setSelectedActivities(initialData.description.split(", "));
                    }
                }
            } catch (err) {
                console.error("Error en carga inicial:", err);
            } finally {
                setLoading(false);
            }
        };

        if (proyectoId) loadInitialData();
    }, [proyectoId, initialData]);


    const cargarLugares = async (indicatorId, indicadorDirecto = null) => {
        try {
            setLoadingLugares(true);
            const ind = indicadorDirecto || indicadores.find(i => String(i.id) === String(indicatorId));

            const provinciasPermitidasNombres = ind?.goals_by_province
                ?.filter(g => g.target > 0)
                ?.map(g => g.province_name.trim().toLowerCase()) || [];

            const res = await apiFetch(`/official/indicators/${indicatorId}/locations`);
            if (res?.ok) {
                const todasLasUbicaciones = await res.json();
                const ubicacionesFiltradas = todasLasUbicaciones.filter(loc => {
                    const nombreLugar = loc.province_name?.trim().toLowerCase();
                    return provinciasPermitidasNombres.includes(nombreLugar);
                });

                setLugares(ubicacionesFiltradas);
                return ubicacionesFiltradas;
            }
        } catch (error) {
            console.error("Error en cargarLugares:", error);
        } finally {
            setLoadingLugares(false);
        }
        return [];
    };

    const selectIndicator = (ind) => {
        setForm(prev => ({
            ...prev,
            indicator_id: ind.id,
            location_id: '',
            project_competence_id: ind.project_competence_id || ''
        }));
        cargarLugares(ind.id, ind);
    };

    const handleSave = async () => {
        const finalDescription = selectedActivities.join(", ");

        if (parseInt(form.planned_total) <= 0) {
            Swal.fire('Atención', 'Debes asignar al menos un beneficiario (hombre o mujer) para guardar.', 'warning');
            return;
        }

        if (!form.indicator_id || !form.location_id || selectedActivities.length === 0) {
            Swal.fire('Faltan datos', 'Completa los campos obligatorios.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const url = initialData ? `/official/activities/${initialData.id}` : "/official/activities";
            const method = initialData ? "PATCH" : "POST";

            const res = await apiFetch(url, {
                method,
                body: JSON.stringify({ ...form, description: finalDescription })
            });

            if (res?.ok) {
                // ✨ LIMPIEZA DE CACHÉ: Obligamos a recalcular brechas en la siguiente consulta
                delete gapCache[form.location_id];

                // Opcional: Si tienes una caché global de indicadores, también podrías limpiarla aquí

                await Swal.fire('¡Éxito!', 'Planificación guardada correctamente.', 'success');

                // Resetear estados críticos antes de salir
                setSelectedActivities([]);

                if (typeof onSaveSuccess === 'function') {
                    onSaveSuccess();
                } else {
                    onClose();
                }
            } else {
                // 💡 MEJORA: Intentar capturar el mensaje de error del servidor
                const errorData = await res.json().catch(() => ({}));
                Swal.fire('Error', errorData.message || 'No se pudo procesar la solicitud.', 'error');
            }
        } catch (error) {
            console.error("Save Error:", error);
            Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();

        const fetchGap = async () => {
            // Solo actuamos si tenemos indicador y lugar
            if (form.indicator_id && form.location_id) {

                // --- ESTRATEGIA DE CACHÉ ---
                // ¿Ya consultamos esta ubicación antes?
                if (gapCache[form.location_id]) {
                    const data = gapCache[form.location_id];
                    // Buscamos el indicador específico dentro de los datos guardados
                    const currentGap = data.find(d => String(d.indicator_id) === String(form.indicator_id));
                    setGapData(currentGap);
                    return; // ¡LISTO! Salimos sin ir al servidor.
                }

                setLoadingGap(true);
                try {
                    const res = await apiFetch(
                        `/project/${proyectoId}/progress-summary?location_id=${form.location_id}`,
                        { signal: controller.signal }
                    );

                    if (res?.ok) {
                        const data = await res.json();

                        // Guardamos en nuestra "memoria fotográfica"
                        gapCache[form.location_id] = data;

                        const currentGap = data.find(d => String(d.indicator_id) === String(form.indicator_id));
                        setGapData(currentGap);
                    }
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error("Error real cargando brecha:", err);
                    }
                } finally {
                    // AJUSTE VITAL: Siempre quitamos el loading para que no se quede pegado
                    setLoadingGap(false);
                }
            } else {
                setGapData(null);
            }
        };

        fetchGap();
        return () => controller.abort();
    }, [form.indicator_id, form.location_id, proyectoId]);


    useEffect(() => {
        const fetchCatalogo = async () => {
            if (!form.indicator_id) return;

            const ind = indicadores.find(i => String(i.id) === String(form.indicator_id));

            // Usamos el ID de la competencia maestra para el catálogo
            const compId = ind?.competence_id;

            if (!compId) return;

            try {
                const res = await apiFetch(`/activity-catalog?competence_id=${compId}`);
                if (res?.ok) {
                    const data = await res.json();
                    setCatalogo(data);
                }
            } catch (error) {
                console.error("Error al cargar catálogo:", error);
            }
        };

        fetchCatalogo();
    }, [form.indicator_id]); // Solo se ejecuta cuando cambias el indicador

    return (
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
            {/* Header con Oxford Grey */}
            <div className="modal-header text-white" style={{ backgroundColor: '#1B263B' }}>
                <h5 className="modal-title fw-bold">
                    <i className="fas fa-calendar-check me-2 text-emerald"></i>
                    {initialData ? 'Editar Planificación' : 'Nueva Planificación'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4 bg-light text-start">
                <div className="row g-3">
                    <div className="mb-3">
                        <div className="input-group">
                            <span className="input-group-text bg-white border-emerald"><i className="fas fa-search text-emerald"></i></span>
                            <input
                                type="text"
                                className="form-control border-emerald"
                                placeholder="Buscar por código o nombre de indicador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    {/* SECCIÓN DE ACORDEONES PARA INDICADORES */}
                    <div className="col-12">
                        <label className="form-label fw-bold small text-oxford">SELECCIONE EL INDICADOR</label>
                        <div className="accordion accordion-flush shadow-sm" id="wizardIndicatorsAccordion">
                            {Object.keys(groupedIndicators).map((theoryName) => (
                                <React.Fragment key={theoryName}>
                                    {/* Iteramos por tipos (output/outcome) para mantener el orden de tus imágenes */}
                                    {['output', 'outcome'].map(type => (
                                        groupedIndicators[theoryName][type] && Object.keys(groupedIndicators[theoryName][type]).map((resultName) => {
                                            const indicatorsInGroup = groupedIndicators[theoryName][type][resultName];
                                            const collapseId = `collapse-${resultName.replace(/\s+/g, '-')}-${type}`;
                                            const isSelected = indicatorsInGroup.some(ind => String(ind.id) === String(form.indicator_id));

                                            return (
                                                <div className="accordion-item border-bottom" key={`${resultName}-${type}`}>
                                                    <h2 className="accordion-header">
                                                        <button
                                                            className={`accordion-button ${isSelected ? '' : 'collapsed'} py-2 px-3 fw-bold`}
                                                            type="button"
                                                            data-bs-toggle="collapse"
                                                            data-bs-target={`#${collapseId}`}
                                                            style={{ fontSize: '0.9rem' }}
                                                        >
                                                            <span className={`badge me-3 ${type === 'outcome' ? 'bg-info' : 'bg-emerald text-white'}`} style={{ width: '80px' }}>
                                                                {type.toUpperCase()}
                                                            </span>
                                                            <span className="text-dark">{resultName}</span>
                                                            <span className="badge bg-secondary ms-auto small rounded-pill">
                                                                {indicatorsInGroup.length}
                                                            </span>
                                                        </button>
                                                    </h2>
                                                    <div id={collapseId} className={`accordion-collapse collapse ${isSelected ? 'show' : ''}`} data-bs-parent="#wizardIndicatorsAccordion">
                                                        <div className="accordion-body p-2 bg-light">
                                                            <div className="list-group list-group-flush shadow-sm rounded">
                                                                {indicatorsInGroup.map((ind) => (
                                                                    <button
                                                                        key={ind.id}
                                                                        type="button"
                                                                        className={`list-group-item list-group-item-action d-flex align-items-start border-0 ${String(form.indicator_id) === String(ind.id) ? 'bg-white border-start border-4 border-emerald' : ''}`}
                                                                        onClick={() => selectIndicator(ind)}
                                                                    >
                                                                        <div className="me-2">
                                                                            <i className={`fas ${String(form.indicator_id) === String(ind.id) ? 'fa-check-circle text-emerald' : 'fa-circle text-muted opacity-25'}`}></i>
                                                                        </div>
                                                                        <div>
                                                                            <span className="fw-bold text-emerald" style={{ fontSize: '0.8rem' }}>{ind.indicator_code}:</span>
                                                                            <p className="mb-0 text-muted" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>{ind.indicator_name}</p>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    {/* Ubicación*/}
                    <div className="col-md-12">
                        <label className="form-label fw-bold small text-oxford">
                            UBICACIÓN (Solo provincias asignadas al indicador)
                        </label>
                        <select
                            className="form-select border-emerald"
                            value={form.location_id}
                            onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                            disabled={!form.indicator_id || loadingLugares || lugares.length === 0}
                        >
                            <option value="">
                                {!form.indicator_id
                                    ? "Seleccione primero un indicador"
                                    : loadingLugares
                                        ? "Cargando ubicaciones válidas..." // Mensaje mientras la API responde
                                        : "Seleccione ubicación..."}
                            </option>
                            {lugares.map(loc => (
                                <option key={loc.id_location} value={loc.id_location}>
                                    {loc.province_name} - {loc.municipality_name} - {loc.parish_name}
                                </option>
                            ))}
                        </select>
                        {form.indicator_id && !loadingLugares && lugares.length === 0 && (
                            <div className="form-text text-danger small animate__animated animate__fadeIn">
                                <i className="fas fa-exclamation-triangle me-1"></i>
                                Este indicador no tiene metas geográficas asignadas en su planificación.
                            </div>
                        )}
                    </div>
                    {/* Actividades Multi-selección */}
                    <div className="col-12">
                        <label className="form-label fw-bold small text-oxford">ACTIVIDADES</label>
                        <select className="form-select mb-2" onChange={(e) => {
                            if (e.target.value === "OTRA") setShowCustomInput(true);
                            else if (e.target.value && !selectedActivities.includes(e.target.value)) {
                                setSelectedActivities([...selectedActivities, e.target.value]);
                            }
                            e.target.value = "";
                        }}>
                            <option value="">+ Agregar del catálogo...</option>
                            {catalogo.map(act => <option key={act.id} value={act.description}>{act.description}</option>)}
                            <option value="OTRA" className="text-success fw-bold">✍️ Escribir manual...</option>
                        </select>

                        {showCustomInput && (
                            <div className="input-group mb-2">
                                <input type="text" className="form-control" value={customActivity} onChange={(e) => setCustomActivity(e.target.value)} placeholder="¿Qué actividad?" />
                                <button className="btn btn-emerald text-white" onClick={() => {
                                    if (customActivity) setSelectedActivities([...selectedActivities, customActivity]);
                                    setCustomActivity(""); setShowCustomInput(false);
                                }}>Añadir</button>
                            </div>
                        )}

                        <div className="d-flex flex-wrap gap-2 p-2 border rounded bg-white">
                            {selectedActivities.map((act, i) => (
                                <span key={i} className="badge bg-oxford p-2">{act} <i className="fas fa-times ms-2 cursor-pointer text-emerald" onClick={() => setSelectedActivities(selectedActivities.filter(a => a !== act))}></i></span>
                            ))}
                        </div>
                    </div>
                    {/* SECCIÓN 3: FECHAS (RESTABLECIDAS) */}
                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-oxford">FECHA INICIO</label>
                        <input type="date" className="form-control" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-oxford">FECHA FIN</label>
                        <input type="date" className="form-control" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                    </div>
                    {/* PANEL DE BRECHA PROFESIONAL */}
                    {loadingGap ? (
                        <div className="text-center p-3">
                            <div className="spinner-border spinner-border-sm text-emerald" role="status"></div>
                            <span className="ms-2 small">Calculando brecha...</span>
                        </div>
                    ) : gapData && (
                        <div className="mt-3 animate__animated animate__fadeIn">
                            <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '12px' }}>
                                <div className="bg-emerald-light p-2 border-start border-4 border-emerald">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="small fw-bold text-oxford">
                                            <i className="fas fa-chart-line me-2 text-emerald"></i>
                                            ESTADO ACTUAL EN ESTA PROVINCIA
                                        </span>
                                        <span className="badge bg-white text-emerald border border-emerald">Pendiente</span>
                                    </div>
                                </div>
                                <div className="card-body py-3 bg-white">
                                    <div className="row text-center g-0">
                                        <div className="col-4 border-end">
                                            <p className="text-muted mb-0" style={{ fontSize: '0.65rem' }}>HOMBRES</p>
                                            <h5 className={`fw-bold mb-0 ${gapData.gap.men > 0 ? 'text-primary' : 'text-success'}`}>
                                                {gapData.gap.men}
                                            </h5>
                                        </div>
                                        <div className="col-4 border-end">
                                            <p className="text-muted mb-0" style={{ fontSize: '0.65rem' }}>MUJERES</p>
                                            <h5 className={`fw-bold mb-0 ${gapData.gap.women > 0 ? 'text-primary' : 'text-success'}`}>
                                                {gapData.gap.women}
                                            </h5>
                                        </div>
                                        <div className="col-4">
                                            <p className="text-muted mb-0" style={{ fontSize: '0.65rem' }}>TOTAL PENDIENTE</p>
                                            <h5 className={`fw-bold mb-0 ${gapData.gap.total > 0 ? 'text-danger' : 'text-success'}`}>
                                                {gapData.gap.total}
                                            </h5>
                                        </div>
                                    </div>
                                    {/* Barra de progreso visual */}
                                    <div className="mt-3">
                                        <div className="d-flex justify-content-between small mb-1" style={{ fontSize: '0.7rem' }}>
                                            <span className="text-muted">Meta: {gapData.target.total}</span>
                                            <span className="fw-bold text-emerald">Logrado: {gapData.achieved.total}</span>
                                        </div>
                                        <div className="progress" style={{ height: '6px' }}>
                                            <div
                                                className="progress-bar bg-emerald"
                                                style={{ width: `${Math.min(100, (gapData.achieved.total / gapData.target.total) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Metas con Autocompletado */}
                    <div className="col-12 mt-3">
                        <div className="p-3 rounded border-start border-4 border-emerald bg-white shadow-sm">
                            <p className="fw-bold small text-oxford mb-2">METAS DE BENEFICIARIOS</p>
                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="small fw-bold">Hombres</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={form.planned_men === 0 ? '' : form.planned_men}
                                        onChange={(e) => {
                                            const valRaw = e.target.value;
                                            const valNum = parseInt(valRaw) || 0;
                                            setForm({
                                                ...form,
                                                planned_men: valRaw === '' ? 0 : valNum,
                                                planned_total: (valRaw === '' ? 0 : valNum) + (parseInt(form.planned_women) || 0)
                                            });
                                        }} />
                                </div>
                                <div className="col-md-4">
                                    <label className="small fw-bold">Mujeres</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={form.planned_women === 0 ? '' : form.planned_women}
                                        onChange={(e) => {
                                            const valRaw = e.target.value;
                                            const valNum = parseInt(valRaw) || 0;

                                            setForm({
                                                ...form,
                                                planned_women: valRaw === '' ? 0 : valNum,
                                                planned_total: (valRaw === '' ? 0 : valNum) + (parseInt(form.planned_men) || 0)
                                            });
                                        }}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="small fw-bold text-muted">Total (Auto)</label>
                                    <input type="number" className="form-control bg-light" value={form.planned_total} readOnly />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal-footer bg-light border-0">
                <button className="btn btn-outline-secondary px-4" onClick={onClose}>Cancelar</button>
                <button className="btn btn-emerald text-white px-5" onClick={handleSave} disabled={loading}>
                    {loading ? 'Guardando...' : 'Confirmar Planificación'}
                </button>
            </div>
        </div>
    );
};

export default ActivityWizard;