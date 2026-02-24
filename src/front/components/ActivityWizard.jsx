import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import Swal from 'sweetalert2'; // Importamos para la confirmación

const ActivityWizard = ({ selectedDate, proyectoId, onClose }) => {
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
        project_competence_id: '' // AGREGADO: Requerido por el modelo
    });

    // 1. Cargar indicadores del proyecto
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

    // 2. Cargar lugares cuando se selecciona un indicador
    const handleIndicatorChange = async (e) => {
        const id = e.target.value;
        const selectedInd = indicadores.find(i => i.id === parseInt(id));

        // Limpiamos el lugar seleccionado previamente y ponemos el nuevo indicator_id
        setForm({ ...form, indicator_id: id, location_id: '', project_competence_id: selectedInd ? selectedInd.project_competence_id : '' });

        if (!id) {
            setLugares([]);
            return;
        }

        try {
            // Llamamos al nuevo endpoint que creamos en el Paso 1
            const res = await apiFetch(`/official/indicators/${id}/locations`);

            if (res && res.ok) {
                const data = await res.json();
                setLugares(data); // Ahora 'lugares' solo tendrá lo que el indicador permite
            } else {
                setLugares([]);
                toast.error("Este indicador no tiene lugares asignados");
            }
        } catch (error) {
            console.error("Error cargando lugares:", error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/official/activities", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res?.ok) {
                // AQUÍ USAMOS SWEETALERT PARA EL ÉXITO (Elegante y profesional)
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Actividad planificada correctamente',
                    icon: 'success',
                    confirmButtonColor: '#10b981', // Emerald Green
                });
                onClose();
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar la planificación', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-content border-0 shadow-lg">
            {/* El encabezado Oxford Grey que te gusta */}
            <div className="modal-header bg-oxford text-white py-3" style={{ backgroundColor: '#334155' }}>
                <h5 className="modal-title font-weight-bold">
                    <i className="fas fa-calendar-plus me-2"></i>
                    Planificar: {selectedDate}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4 bg-light-grey">
                <div className="row g-3 text-start">
                    <div className="col-12">
                        <label className="form-label text-oxford fw-bold small">INDICADOR</label>
                        <select className="form-select border-emerald" onChange={handleIndicatorChange}>
                            <option value="">Selecciona un indicador...</option>
                            {indicadores.map(ind => (
                                // AJUSTADO: Usamos ind.indicator_code e ind.indicator_name del serialize
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
                            onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                        >
                            <option value="">Selecciona ubicación...</option>
                            {lugares.map(loc => (
                                // AJUSTADO: Usamos loc.province_name y loc.municipality_name del nuevo endpoint
                                <option key={loc.id_location} value={loc.id_location}>
                                    {loc.province_name} - {loc.municipality_name} ({loc.community})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-12">
                        <label className="form-label text-oxford fw-bold small">DESCRIPCIÓN DE LA ACTIVIDAD</label>
                        <textarea
                            className="form-control"
                            rows="2"
                            placeholder="Ej: Taller de capacitación en..."
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label text-oxford fw-bold small">META PLANIFICADA</label>
                        <input
                            type="number"
                            className="form-control border-emerald"
                            onChange={(e) => setForm({ ...form, planned_target: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="modal-footer bg-white border-0">
                <button className="btn btn-outline-secondary px-4" onClick={onClose}>Cancelar</button>
                <button
                    className="btn text-white px-4"
                    style={{ backgroundColor: '#10b981' }} // Emerald Green
                    onClick={handleSave}
                    disabled={loading || !form.location_id}
                >
                    {loading ? "Guardando..." : "Confirmar Planificación"}
                </button>
            </div>
        </div>
    );
};

export default ActivityWizard;