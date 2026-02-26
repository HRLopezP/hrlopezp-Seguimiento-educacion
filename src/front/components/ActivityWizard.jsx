import React, { useState, useEffect } from 'react';
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

    // --- MEJORA: Autocompletado de Total ---
    useEffect(() => {
        const total = (parseInt(form.planned_men) || 0) + (parseInt(form.planned_women) || 0);
        setForm(prev => ({ ...prev, planned_total: total }));
    }, [form.planned_men, form.planned_women]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const resCat = await apiFetch("/activity-catalog");
                if (resCat?.ok) setCatalogo(await resCat.json());

                const resInd = await apiFetch(`/official/projects/${proyectoId}/indicators`);
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
                    {/* Indicador */}
                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-oxford">INDICADOR</label>
                        <select className="form-select border-emerald" value={form.indicator_id} onChange={handleIndicatorChange}>
                            <option value="">Seleccione indicador...</option>
                            {indicadores.map(ind => (
                                <option key={ind.id} value={ind.id}>{ind.indicator_code} - {ind.indicator_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Ubicación con Parroquia */}
                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-oxford">UBICACIÓN (Prov-Mun-Parroquia)</label>
                        <select className="form-select border-emerald" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} disabled={!form.indicator_id}>
                            <option value="">Seleccione ubicación...</option>
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