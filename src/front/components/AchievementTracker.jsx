import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from "../../utils/api";
import Swal from 'sweetalert2';

const AchievementTracker = ({ activity, onClose, onRefresh }) => {
    // 1. ESTADOS: Siempre van al principio
    const [loading, setLoading] = useState(false);
    const [achievedMen, setAchievedMen] = useState(0);
    const [achievedWomen, setAchievedWomen] = useState(0);
    const [totalAchieved, setTotalAchieved] = useState(0);
    const [observations, setObservations] = useState("");
    const [file, setFile] = useState(null);
    const [existingRecordId, setExistingRecordId] = useState(null);

    // 2. LÓGICA DE DERIVACIÓN
    const isEditing = !!existingRecordId;

    // IMPORTANTE: Aquí usamos 'last_evidence_url' porque así viene de tu consola (image_b80820.png)
    const hasEvidence = useMemo(() => {
        const previousEvidence = activity?.last_evidence_url || activity?.real_progress?.evidence_url;
        return !!file || !!previousEvidence;
    }, [file, activity]);

    const plannedTotal = activity.planned?.total || 0;
    const progressPercent = plannedTotal > 0 ? Math.min((totalAchieved / plannedTotal) * 100, 100) : 0;

    // 3. EFECTOS
    useEffect(() => {
        setTotalAchieved(Number(achievedMen) + Number(achievedWomen));
    }, [achievedMen, achievedWomen]);

    useEffect(() => {
        if (activity?.last_achievement_id) {
            setExistingRecordId(activity.last_achievement_id);
            setAchievedMen(activity.real_progress?.men || 0);
            setAchievedWomen(activity.real_progress?.women || 0);
            setObservations(activity.last_observations || "");
        }
    }, [activity]);

    // 4. ACCIONES
    const handleSave = async () => {
        if (totalAchieved <= 0 || !hasEvidence) {
            return Swal.fire('Atención', 'Logros en 0 o falta evidencia.', 'warning');
        }

        setLoading(true);
        try {
            // Variables para los datos finales
            let finalEvidenceUrl = activity?.last_evidence_url || activity?.real_progress?.evidence_url || "";
            let finalPublicId = activity?.last_evidence_public_id || ""; // <-- NUEVO: Recuperamos el ID previo si existe

            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('folder', 'sigssep_evidences'); // Organizar por carpetas es pro

                const uploadRes = await apiFetch("/upload-evidence", { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();

                if (!uploadRes.ok) throw new Error("Error al subir evidencia");

                // Ahora capturamos ambos campos del JSON que devuelve el backend
                finalEvidenceUrl = uploadData.url;
                finalPublicId = uploadData.public_id; // <-- NUEVO
            }

            const payload = {
                activity_id: activity.id,
                men_reached: Number(achievedMen),
                women_reached: Number(achievedWomen),
                observations: observations.trim(),
                evidence_url: finalEvidenceUrl,
                evidence_public_id: finalPublicId // <-- NUEVO: Enviamos el ID al backend
            };

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
    
    // 5. RENDER (EL "DIBUJO")
    return (
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
            <div className="modal-header text-white" style={{ backgroundColor: '#10b981' }}>
                <h5 className="modal-title fw-bold">
                    <i className="fas fa-chart-line me-2"></i> Registrar Avance Real
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4 bg-light">
                {/* Resumen de planificación */}
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

                {/* Barra de progreso */}
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

                {/* Formulario */}
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
                    <div className="col-12 text-center">
                        <div className="p-3 bg-white border rounded shadow-sm">
                            <span className="text-muted small">TOTAL LOGRADO EN CAMPO:</span>
                            <h2 className="fw-bold text-emerald mb-0">{totalAchieved}</h2>
                        </div>
                    </div>
                    <div className="col-12">
                        <label className="form-label fw-bold small text-oxford">OBSERVACIONES DE CAMPO</label>
                        <textarea
                            className="form-control border-emerald"
                            rows="2"
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                        ></textarea>
                    </div>

                    {/* --- SECCIÓN DE EVIDENCIA --- */}
                    <div className="col-12">
                        <label className="form-label fw-bold small text-oxford">ARCHIVO DE RESPALDO (KOBO)</label>

                        {/* AQUÍ UBICAMOS EL CÓDIGO QUE BUSCABAS: Muestra evidencia previa si existe */}
                        {activity?.last_evidence_url && !file && (
                            <div className="alert alert-info d-flex align-items-center p-2 mb-2" style={{ fontSize: '0.85rem' }}>
                                <i className="fas fa-check-circle me-2"></i>
                                <span className="text-truncate flex-grow-1">Ya existe una evidencia cargada</span>
                                <a href={activity.last_evidence_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-link text-info p-0 ms-2">
                                    Ver archivo
                                </a>
                            </div>
                        )}

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
                        <small className="text-muted">Formatos: Excel, CSV, PDF o Imagen.</small>
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