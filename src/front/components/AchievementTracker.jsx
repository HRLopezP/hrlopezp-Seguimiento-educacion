import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import Swal from 'sweetalert2';

const AchievementTracker = ({ activity, onClose, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [achievedMen, setAchievedMen] = useState(0);
    const [achievedWomen, setAchievedWomen] = useState(0);
    const [totalAchieved, setTotalAchieved] = useState(0);
    const [observations, setObservations] = useState("");
    const [file, setFile] = useState(null);
    const [existingRecordId, setExistingRecordId] = useState(null);

    const isEditing = !!existingRecordId;
    const hasEvidence = file || activity.last_evidence;

    const plannedTotal = activity.planned?.total || 0;
    const progressPercent = plannedTotal > 0 ? Math.min((totalAchieved / plannedTotal) * 100, 100) : 0;

    useEffect(() => {
        setTotalAchieved(Number(achievedMen) + Number(achievedWomen));
    }, [achievedMen, achievedWomen]);

    const handleSave = async () => {
        if (totalAchieved <= 0 || (!file && !isEditing)) {
            return Swal.fire('Atención', 'Asegúrate de registrar logros y subir la evidencia.', 'warning');
        }

        setLoading(true);
        try {
            let finalEvidenceUrl = activity.achievements?.[0]?.evidence_url || "";

            // Solo subimos archivo si el usuario seleccionó uno nuevo
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                const uploadRes = await apiFetch("/upload-evidence", { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error("Error al subir evidencia");
                finalEvidenceUrl = uploadData.url;
            }

            const payload = {
                activity_id: activity.id,
                men_reached: Number(achievedMen),
                women_reached: Number(achievedWomen),
                observations: observations.trim(),
                evidence_url: file ? finalEvidenceUrl : activity.last_evidence
            };

            // DECIDIMOS: ¿POST o PATCH?
            const method = isEditing ? 'PATCH' : 'POST';
            const endpoint = isEditing ? `/achievements/${existingRecordId}` : '/achievements';

            const res = await apiFetch(endpoint, {
                method: method,
                body: JSON.stringify(payload)
            });

            if (res?.ok) {
                Swal.fire('¡Éxito!', isEditing ? 'Logro actualizado' : 'Logro registrado', 'success');
                onRefresh();
                onClose();
            }
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        // Si la actividad ya trae los campos que añadimos en la Fase 1:
        if (activity.last_achievement_id) {
            setExistingRecordId(activity.last_achievement_id);
            setAchievedMen(activity.real_progress.men || 0);
            setAchievedWomen(activity.real_progress.women || 0);
            setObservations(activity.last_observations || "");
            // Nota: No seteamos 'file' porque es un objeto de sistema, 
            // pero la URL ya vive en el objeto 'activity'
        }
    }, [activity]);

    return (
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
            <div className="modal-header text-white" style={{ backgroundColor: '#10b981' }}>
                <h5 className="modal-title fw-bold">
                    <i className="fas fa-chart-line me-2"></i> Registrar Avance Real
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
                        <div className="p-3 bg-white border rounded text-center shadow-sm">
                            <span className="text-muted small">TOTAL LOGRADO EN CAMPO:</span>
                            <h2 className="fw-bold text-emerald mb-0">{totalAchieved}</h2>
                        </div>
                    </div>
                    {/* --- Observación  --- */}
                    <div className="col-12">
                        <label className="form-label fw-bold small text-oxford">OBSERVACIONES DE CAMPO</label>
                        <textarea
                            className="form-control border-emerald"
                            rows="2"
                            placeholder="Describe brevemente cómo se desarrolló la actividad..."
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                        ></textarea>
                    </div>
                    {/* --- NUEVO: SUBIDA DE ARCHIVO --- */}
                    <div className="col-12">
                        <label className="form-label fw-bold small text-oxford">ARCHIVO DE RESPALDO (KOBO)</label>
                        <div className="input-group">
                            <input
                                type="file"
                                className="form-control border-emerald"
                                accept=".csv, .xlsx, .pdf, .jpg, .png"
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                            <span className="input-group-text bg-white text-emerald">
                                <i className="fas fa-upload"></i>
                            </span>
                        </div>
                        <small className="text-muted">Formatos permitidos: Excel, CSV, PDF o Imagen.</small>
                    </div>
                </div>
            </div>
            <div className="modal-footer border-0 bg-light">
                <button className="btn btn-outline-secondary px-4" onClick={onClose}>Cancelar</button>
                <button
                    className="btn text-white px-5 shadow"
                    style={{ backgroundColor: hasEvidence && totalAchieved > 0 ? '#10b981' : '#9ca3af' }}
                    onClick={handleSave}
                    disabled={loading || !hasEvidence || totalAchieved <= 0}
                >
                    {loading ? (
                        <span><i className="fas fa-spinner fa-spin me-2"></i> Procesando...</span>
                    ) : (
                        isEditing ? 'Actualizar Logro' : 'Confirmar y Descontar'
                    )}
                </button>
            </div>
        </div>
    );
};

export default AchievementTracker;