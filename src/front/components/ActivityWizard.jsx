import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from "../../utils/api";
import Swal from 'sweetalert2';

const ActivityWizard = ({ selectedDate, proyectoId, initialData, onClose }) => {
    const [indicadores, setIndicadores] = useState([]);
    const [lugares, setLugares] = useState([]);
    const [catalogo, setCatalogo] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [customActivity, setCustomActivity] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [activeResult, setActiveResult] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

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
                const [resCat, resInd] = await Promise.all([
                    apiFetch("/activity-catalog"),
                    apiFetch(`/official/projects/${proyectoId}/indicators`)
                ]);

                if (resCat?.ok) setCatalogo(await resCat.json());
                if (resInd?.ok) setIndicadores(await resInd.json());

                if (initialData) {
                    if (initialData.description) {
                        setSelectedActivities(initialData.description.split(", "));
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
                    if (initialData.indicator_id) cargarLugares(initialData.indicator_id);
                }
            } catch (err) {
                console.error("Error inicializando Wizard:", err);
            }
        };
        if (proyectoId) loadInitialData();
    }, [proyectoId, initialData, selectedDate]);

    const cargarLugares = async (indicatorId) => {
        try {
            const res = await apiFetch(`/official/indicators/${indicatorId}/locations`);
            if (res?.ok) setLugares(await res.json());
        } catch (error) { console.error("Error lugares:", error); }
    };

    const selectIndicator = (ind) => {
        setForm({
            ...form,
            indicator_id: ind.id,
            project_competence_id: ind.project_competence_id || ''
        });
        cargarLugares(ind.id);
    };


    const handleIndicatorChange = (e) => {
        const id = e.target.value;
        const sel = indicadores.find(i => String(i.id) === String(id));
        setForm({ ...form, indicator_id: id, project_competence_id: sel?.project_competence_id || '' });
        if (id) cargarLugares(id);
    };

    const handleSave = async () => {
        const finalDescription = selectedActivities.join(", ");
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
                Swal.fire('¡Éxito!', 'Planificación guardada.', 'success');
                onClose();
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar.', 'error');
        } finally { setLoading(false); }
    };

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
                        <label className="form-label fw-bold small text-oxford">UBICACIÓN (Prov-Mun-Parroquia)</label>
                        <select className="form-select border-emerald" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} disabled={!form.indicator_id}>
                            <option value="">{form.indicator_id ? "Seleccione ubicación..." : "Seleccione primero un indicador"}</option>
                            {lugares.map(loc => (
                                <option key={loc.id_location} value={loc.id_location}>
                                    {loc.province_name} - {loc.municipality_name} - {loc.parish_name}
                                </option>
                            ))}
                        </select>
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

                    {/* Metas con Autocompletado */}
                    <div className="col-12 mt-3">
                        <div className="p-3 rounded border-start border-4 border-emerald bg-white shadow-sm">
                            <p className="fw-bold small text-oxford mb-2">METAS DE BENEFICIARIOS</p>
                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="small fw-bold">Hombres</label>
                                    <input type="number" className="form-control" value={form.planned_men} onChange={(e) => setForm({ ...form, planned_men: e.target.value })} />
                                </div>
                                <div className="col-md-4">
                                    <label className="small fw-bold">Mujeres</label>
                                    <input type="number" className="form-control" value={form.planned_women} onChange={(e) => setForm({ ...form, planned_women: e.target.value })} />
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