import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import Swal from 'sweetalert2';

const ActivityWizard = ({ selectedDate, proyectoId, initialData, onClose }) => {
    const [indicadores, setIndicadores] = useState([]);
    const [lugares, setLugares] = useState([]);
    const [catalogo, setCatalogo] = useState([]);
    const [loading, setLoading] = useState(false);

    // Estados para la selección múltiple
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

    // 1. Cargar Datos Iniciales (Catálogo e Indicadores)
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Cambiamos el Promise.all por peticiones individuales para que una no mate a la otra
                const resCat = await apiFetch("/activity-catalog");
                if (resCat?.ok) {
                    const catData = await resCat.json();
                    setCatalogo(catData);
                } else {
                    console.error("Error en catálogo:", resCat?.status);
                }

                const resInd = await apiFetch(`/official/projects/${proyectoId}/indicators`);
                if (resInd?.ok) {
                    const indData = await resInd.json();
                    setIndicadores(indData);
                }

                // IMPORTANTE: Solo mapear si initialData existe Y tiene la estructura de tu serialize()
                if (initialData && initialData.period) {
                    console.log("Wizard detectó initialData:", initialData);

                    if (initialData.description) {
                        setSelectedActivities(initialData.description.split(", "));
                    }

                    setForm({
                        indicator_id: initialData.indicator_id || '',
                        location_id: initialData.location_id || '',
                        planned_total: initialData.planned?.total || 0,
                        planned_men: initialData.planned?.men || 0,
                        planned_women: initialData.planned?.women || 0,
                        start_date: initialData.period?.start || '',
                        end_date: initialData.period?.end || '',
                        project_id: proyectoId,
                        project_competence_id: initialData.project_competence_id || ''
                    });

                    if (initialData.indicator_id) {
                        cargarLugares(initialData.indicator_id);
                    }
                }
            } catch (err) {
                console.error("Fallo catastrófico en loadInitialData:", err);
            }
        };

        if (proyectoId) {
            loadInitialData();
        }
    }, [proyectoId, initialData]); // Se dispara cuando cambia el ID del proyecto o la actividad seleccionada

    // 2. Cargar Lugares al cambiar indicador
    const cargarLugares = async (indicatorId) => {
        try {
            const res = await apiFetch(`/official/indicators/${indicatorId}/locations`);
            if (res?.ok) setLugares(await res.json());
        } catch (error) { console.error("Error lugares:", error); }
    };

    const handleIndicatorChange = (e) => {
        const id = e.target.value;
        if (!id) {
            setForm({ ...form, indicator_id: '', location_id: '', project_competence_id: '' });
            setLugares([]);
            return;
        }
        const sel = indicadores.find(i => String(i.id) === String(id));
        setForm({ ...form, indicator_id: id, project_competence_id: sel?.project_competence_id || '' });
        cargarLugares(id);
    };

    // 3. Lógica de Selección de Actividades
    const addActivityFromCatalog = (e) => {
        const value = e.target.value;
        if (!value) return;
        if (value === "OTRA") {
            setShowCustomInput(true);
        } else if (!selectedActivities.includes(value)) {
            setSelectedActivities([...selectedActivities, value]);
        }
        e.target.value = "";
    };

    const removeActivity = (activity) => {
        setSelectedActivities(selectedActivities.filter(a => a !== activity));
    };

    const addCustomActivity = () => {
        if (customActivity.trim() && !selectedActivities.includes(customActivity)) {
            setSelectedActivities([...selectedActivities, customActivity.trim()]);
            setCustomActivity("");
            setShowCustomInput(false);
        }
    };

    // 4. Guardar
    const handleSave = async () => {
        const finalDescription = selectedActivities.join(", ");

        if (!form.indicator_id || !form.location_id || selectedActivities.length === 0) {
            Swal.fire('Faltan datos', 'Por favor selecciona indicador, lugar y al menos una actividad.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...form,
                description: finalDescription,
                planned_target: parseFloat(form.planned_total) || 0,
                planned_men: parseFloat(form.planned_men) || 0,
                planned_women: parseFloat(form.planned_women) || 0
            };

            const url = initialData ? `/official/activities/${initialData.id}` : "/official/activities";
            const method = initialData ? "PATCH" : "POST";
            const res = await apiFetch(url, { method, body: JSON.stringify(payload) });

            if (res?.ok) {
                Swal.fire('¡Éxito!', 'Planificación guardada correctamente.', 'success');
                onClose();
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudo procesar la solicitud.', 'error');
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px', overflow: 'hidden' }}>
            <div className="modal-header text-white" style={{ backgroundColor: '#1B263B', padding: '1.5rem' }}>
                <h5 className="modal-title fw-bold">
                    <i className="fas fa-tasks me-2 text-emerald"></i>
                    {initialData ? 'Editar Planificación' : 'Nueva Planificación'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4 bg-light text-start">
                <div className="row g-3">
                    {/* SECCIÓN 1: INDICADOR Y LUGAR */}
                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-oxford">INDICADOR DEL PROYECTO</label>
                        <select className="form-select border-emerald" value={form.indicator_id} onChange={handleIndicatorChange}>
                            <option value="">Seleccione indicador...</option>
                            {indicadores.map(ind => (
                                <option key={ind.id} value={ind.id}>{ind.indicator_code} - {ind.indicator_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-oxford">LUGAR DE INTERVENCIÓN</label>
                        <select className="form-select border-emerald" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} disabled={!form.indicator_id}>
                            <option value="">Seleccione ubicación...</option>
                            {lugares.map(loc => (
                                <option key={loc.id_location} value={loc.id_location}>
                                    {loc.province_name} - {loc.municipality_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* SECCIÓN 2: SELECCIÓN MÚLTIPLE DE ACTIVIDADES */}
                    <div className="col-12">
                        <label className="form-label fw-bold small text-oxford">ACTIVIDADES A REALIZAR</label>
                        <select className="form-select mb-2" onChange={addActivityFromCatalog}>
                            <option value="">+ Agregar actividad del catálogo...</option>
                            {catalogo.map(act => (
                                <option key={act.id} value={act.description}>{act.description}</option>
                            ))}
                            <option value="OTRA" className="text-emerald fw-bold">✍️ Escribir otra manualmente...</option>
                        </select>

                        {showCustomInput && (
                            <div className="input-group mb-2 shadow-sm">
                                <input type="text" className="form-control border-emerald" placeholder="Ej: Entrega de suministros médicos"
                                    value={customActivity} onChange={(e) => setCustomActivity(e.target.value)} />
                                <button className="btn btn-emerald text-white" onClick={addCustomActivity}>Añadir</button>
                                <button className="btn btn-outline-secondary" onClick={() => setShowCustomInput(false)}>X</button>
                            </div>
                        )}

                        <div className="d-flex flex-wrap gap-2 p-3 border rounded bg-white" style={{ minHeight: '60px' }}>
                            {selectedActivities.length === 0 && <small className="text-muted">Ninguna actividad seleccionada aún.</small>}
                            {selectedActivities.map((act, index) => (
                                <span key={index} className="badge d-flex align-items-center p-2 shadow-sm" style={{ backgroundColor: '#1B263B', color: 'white', fontSize: '0.85rem' }}>
                                    {act}
                                    <i className="fas fa-times-circle ms-2 cursor-pointer text-emerald" title="Eliminar" onClick={() => removeActivity(act)}></i>
                                </span>
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

                    {/* SECCIÓN 4: METAS PLANIFICADAS */}
                    <div className="col-12 mt-3">
                        <div className="p-3 rounded" style={{ backgroundColor: '#f8fafc', borderLeft: '5px solid #10b981', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <p className="fw-bold small text-oxford mb-2">METAS PLANIFICADAS (LO QUE SE ESPERA LOGRAR)</p>
                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="small fw-bold">Meta Total</label>
                                    <input type="number" className="form-control form-control-sm" value={form.planned_total} onChange={(e) => setForm({ ...form, planned_total: e.target.value })} />
                                </div>
                                <div className="col-md-4">
                                    <label className="small fw-bold text-primary">Hombres</label>
                                    <input type="number" className="form-control form-control-sm" value={form.planned_men} onChange={(e) => setForm({ ...form, planned_men: e.target.value })} />
                                </div>
                                <div className="col-md-4">
                                    <label className="small fw-bold text-danger">Mujeres</label>
                                    <input type="number" className="form-control form-control-sm" value={form.planned_women} onChange={(e) => setForm({ ...form, planned_women: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal-footer border-0 bg-light p-3">
                <button className="btn btn-outline-secondary px-4 shadow-sm" onClick={onClose}>Cancelar</button>
                <button className="btn text-white px-5 shadow-sm" style={{ backgroundColor: '#10b981' }} onClick={handleSave} disabled={loading}>
                    {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-save me-2"></i>}
                    Confirmar Planificación
                </button>
            </div>
        </div>
    );
};

export default ActivityWizard;