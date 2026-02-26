import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import Swal from 'sweetalert2';

const AchievementTracker = ({ activity, onClose, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [achievedMen, setAchievedMen] = useState(0);
    const [achievedWomen, setAchievedWomen] = useState(0);
    const [totalAchieved, setTotalAchieved] = useState(0);

    // Cálculos de progreso (Visual)
    const plannedTotal = activity.planned?.total || 0;
    const progressPercent = plannedTotal > 0 ? Math.min((totalAchieved / plannedTotal) * 100, 100) : 0;

    // Auto-calcular total
    useEffect(() => {
        setTotalAchieved(Number(achievedMen) + Number(achievedWomen));
    }, [achievedMen, achievedWomen]);

    const handleSave = async () => {
        if (totalAchieved <= 0) {
            Swal.fire('Atención', 'Debes registrar al menos un logro.', 'warning');
            return;
        }

        setLoading(true);
        try {
            // PROFE: Alineamos las llaves exactamente como las pide tu AchievementRecord
            const payload = {
                activity_id: activity.id_activity || activity.id, // Enviamos el ID aquí
                men_reached: Number(achievedMen),
                women_reached: Number(achievedWomen),
                disability_reached: 0, // Podemos añadirlo luego si lo necesitas
                observations: "Registro desde el panel de oficial"
            };

            // PROFE: Cambiamos la URL a la ruta POST que tienes en el Backend
            // Y usamos POST en lugar de PATCH
            const res = await apiFetch("/achievements", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                Swal.fire('¡Logro Registrado!', 'El avance se ha descontado de la meta global.', 'success');
                onRefresh();
                onClose();
            } else {
                const errorData = await res.json();
                Swal.fire('Error', errorData.message || 'Error al guardar', 'error');
            }
        } catch (error) {
            console.error("Error en el tracker:", error);
            Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
            <div className="modal-header text-white" style={{ backgroundColor: '#10b981' }}>
                <h5 className="modal-title fw-bold">
                    <i className="fas fa-chart-line me-2"></i>
                    Registrar Avance Real
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4 bg-light">
                {/* Resumen de lo planificado */}
                <div className="card mb-4 border-0 shadow-sm" style={{ backgroundColor: '#f1f5f9' }}>
                    <div className="card-body">
                        <h6 className="text-oxford fw-bold small mb-3 text-uppercase">Resumen de Planificación</h6>
                        <div className="row text-center">
                            <div className="col-4 border-end">
                                <p className="mb-0 small text-muted">Meta Total</p>
                                <h4 className="fw-bold text-oxford">{plannedTotal}</h4>
                            </div>
                            <div className="col-4 border-end">
                                <p className="mb-0 small text-muted">Hombres</p>
                                <h4 className="fw-bold text-primary">{activity.planned?.men || 0}</h4>
                            </div>
                            <div className="col-4">
                                <p className="mb-0 small text-muted">Mujeres</p>
                                <h4 className="fw-bold text-danger">{activity.planned?.women || 0}</h4>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Barra de Progreso Dinámica */}
                <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1">
                        <span className="small fw-bold text-oxford">Progreso de la Actividad</span>
                        <span className="small fw-bold text-emerald">{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="progress" style={{ height: '12px', borderRadius: '10px' }}>
                        <div
                            className="progress-bar progress-bar-striped progress-bar-animated bg-emerald"
                            role="progressbar"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>

                {/* Inputs de Logros Reales */}
                <div className="row g-3">
                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-oxford">HOMBRES LOGRADOS</label>
                        <input type="number" className="form-control border-emerald"
                            value={achievedMen} onChange={(e) => setAchievedMen(e.target.value)} />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-oxford">MUJERES LOGRADAS</label>
                        <input type="number" className="form-control border-emerald"
                            value={achievedWomen} onChange={(e) => setAchievedWomen(e.target.value)} />
                    </div>
                    <div className="col-12">
                        <div className="p-3 bg-white border rounded text-center">
                            <span className="text-muted small">TOTAL LOGRADO EN CAMPO:</span>
                            <h2 className="fw-bold text-emerald mb-0">{totalAchieved}</h2>
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal-footer border-0 bg-light">
                <button className="btn btn-outline-secondary px-4" onClick={onClose}>Cancelar</button>
                <button className="btn text-white px-5 shadow"
                    style={{ backgroundColor: '#10b981' }}
                    onClick={handleSave} disabled={loading}
                >
                    {loading ? 'Procesando...' : 'Confirmar y Descontar'}
                </button>
            </div>
        </div>
    );
};

export default AchievementTracker;