import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import Swal from 'sweetalert2';

const ActivityWizard = ({ selectedDate, proyectoId, initialData, onClose }) => {
    const [indicadores, setIndicadores] = useState([]);
    const [lugares, setLugares] = useState([]);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        description: '',
        indicator_id: '',
        location_id: '',
        planned_target: 0,
        start_date: selectedDate,
        end_date: selectedDate,
        project_id: proyectoId,
        project_competence_id: ''
    });

    // Función para cargar lugares (definida fuera para reusarla)
    const cargarLugares = async (indicatorId) => {
        try {
            const res = await apiFetch(`/official/indicators/${indicatorId}/locations`);
            if (res && res.ok) {
                const data = await res.json();
                setLugares(data);
            }
        } catch (error) {
            console.error("Error cargando lugares:", error);
        }
    };

    // EFECTO 1: Carga de datos iniciales (Modo Edición)
    useEffect(() => {
        if (initialData) {
            console.log("Datos recibidos en el Wizard:", initialData); // Esto te dirá qué nombres de campos llegan realmente

            setForm({
                description: initialData.description || '',
                // Ajustamos para capturar el ID sin importar si viene como objeto o número
                indicator_id: initialData.indicator_id || initialData.indicator?.id || '',
                location_id: initialData.location_id || initialData.location?.id || '',
                planned_target: initialData.planned_target || 0,
                start_date: initialData.start_date || initialData.period?.start || selectedDate,
                end_date: initialData.end_date || initialData.period?.end || selectedDate,
                project_id: initialData.project_id || proyectoId,
                project_competence_id: initialData.project_competence_id || ''
            });

            // Disparamos la carga de lugares para que el select de ubicación se llene
            const indicatorId = initialData.indicator_id || initialData.indicator?.id;
            if (indicatorId) {
                cargarLugares(indicatorId);
            }
        }
    }, [initialData, selectedDate, proyectoId]);
    

    // EFECTO 2: Cargar indicadores al inicio
    useEffect(() => {
        const loadIndicadores = async () => {
            try {
                const res = await apiFetch(`/official/projects/${proyectoId}/indicators`);
                if (res && res.ok) {
                    const data = await res.json();
                    setIndicadores(data);
                }
            } catch (err) { console.error("Error indicadores:", err); }
        };
        if (proyectoId) loadIndicadores();
    }, [proyectoId]);

    // Manejador de cambio de indicador (Modo Creación)
    const handleIndicatorChange = async (e) => {
        const id = e.target.value;
        if (!id) {
            setForm({ ...form, indicator_id: '', project_competence_id: '', location_id: '' });
            setLugares([]);
            return;
        }

        const selectedInd = indicadores.find(i => String(i.id) === String(id));
        const competenciaId = selectedInd?.project_competence_id || selectedInd?.template_id;

        setForm({
            ...form,
            indicator_id: id,
            location_id: '', // Reseteamos lugar al cambiar indicador
            project_competence_id: competenciaId
        });

        // Cargamos los lugares para este nuevo indicador
        cargarLugares(id);
    };

    const handleSave = async () => {
        if (!form.indicator_id || !form.location_id || !form.project_competence_id) {
            Swal.fire('Atención', 'Por favor selecciona un Indicador y un Lugar antes de guardar.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const url = initialData ? `/official/activities/${initialData.id}` : "/official/activities";
            const method = initialData ? "PATCH" : "POST";

            const res = await apiFetch(url, {
                method: method,
                body: JSON.stringify(form)
            });

            if (res && res.ok) {
                await Swal.fire({
                    title: '¡Éxito!',
                    text: initialData ? 'Planificación actualizada' : 'Planificación guardada',
                    icon: 'success',
                    timer: 2000
                });
                onClose();
            } else {
                const errorData = await res.json();
                throw new Error(errorData.msg || "Error en el servidor");
            }
        } catch (error) {
            Swal.fire('Error', `No se pudo guardar: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-oxford text-white py-3" style={{ backgroundColor: '#334155' }}>
                <h5 className="modal-title font-weight-bold">
                    <i className="fas fa-calendar-plus me-2"></i>
                    {initialData ? 'Editar Planificación' : `Planificar: ${selectedDate}`}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4 bg-light-grey">
                <div className="row g-3 text-start">
                    <div className="col-12">
                        <label className="form-label text-oxford fw-bold small">INDICADOR</label>
                        <select className="form-select border-emerald" value={form.indicator_id} onChange={handleIndicatorChange}>
                            <option value="">Selecciona un indicador...</option>
                            {indicadores.map(ind => (
                                <option key={ind.id} value={ind.id}>
                                    {ind.indicator_code} - {ind.indicator_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-12">
                        <label className="form-label text-oxford fw-bold small">LUGAR DE INTERVENCIÓN</label>
                        <select
                            className="form-select border-emerald"
                            disabled={!form.indicator_id}
                            value={form.location_id}
                            onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                        >
                            <option value="">Selecciona ubicación...</option>
                            {lugares.map(loc => (
                                <option key={loc.id_location} value={loc.id_location}>
                                    {loc.province_name} - {loc.municipality_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-12">
                        <label className="form-label text-oxford fw-bold small">DESCRIPCIÓN DE LA ACTIVIDAD</label>
                        <textarea
                            className="form-control"
                            rows="2"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label text-oxford fw-bold small">META PLANIFICADA</label>
                        <input
                            type="number"
                            className="form-control border-emerald"
                            value={form.planned_target}
                            onChange={(e) => setForm({ ...form, planned_target: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="modal-footer bg-white border-0">
                <button className="btn btn-outline-secondary px-4" onClick={onClose}>Cancelar</button>
                <button
                    className="btn text-white px-4"
                    style={{ backgroundColor: '#10b981' }}
                    onClick={handleSave}
                    disabled={loading || !form.location_id}
                >
                    {loading ? "Guardando..." : "Confirmar"}
                </button>
            </div>
        </div>
    );
};

export default ActivityWizard;