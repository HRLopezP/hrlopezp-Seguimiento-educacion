import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from "../../utils/api";
import Swal from 'sweetalert2';
import { invalidateGapCache } from "./ActivityWizard";

const AchievementTracker = ({ activity, onClose, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [achievedMen, setAchievedMen] = useState(0);
    const [achievedWomen, setAchievedWomen] = useState(0);
    const [totalAttended, setTotalAttended] = useState(0);
    const [totalApproved, setTotalApproved] = useState(0);
    const [observations, setObservations] = useState("");
    const [file, setFile] = useState(null);
    const [existingRecordId, setExistingRecordId] = useState(null);

    const isOutcome = activity.indicator?.type === 'Outcome';
    const isEditing = !!existingRecordId;

    const totalAchieved = useMemo(() => {
        return isOutcome
            ? Number(totalApproved)
            : (Number(achievedMen) + Number(achievedWomen));
    }, [isOutcome, totalApproved, achievedMen, achievedWomen]);

    const hasEvidence = useMemo(() => {
        const previousEvidence = activity?.last_evidence_url;
        return !!file || !!previousEvidence;
    }, [file, activity]);

    const plannedTotal = activity.planned?.total || 0;
    const progressPercent = plannedTotal > 0 ? Math.min((totalAchieved / plannedTotal) * 100, 100) : 0;


    useEffect(() => {
        const history = activity?.achievements_history || [];
        const lastRecord = history.length > 0 ? history[history.length - 1] : null;

        if (lastRecord) {
            setExistingRecordId(lastRecord.id);

            const prog = lastRecord.real_progress;
            setAchievedMen(prog?.men || 0);
            setAchievedWomen(prog?.women || 0);
            setTotalAttended(prog?.attended || 0);
            setTotalApproved(prog?.approved || 0);
            setObservations(lastRecord.observations || "");
        }
    }, [activity]);

    const handleSave = async () => {
        if (totalAchieved <= 0) {
            return Swal.fire('Atención', 'El logro debe ser mayor a 0 para poder descontar de la meta.', 'warning');
        }

        if (isOutcome && totalApproved > totalAttended) {
            return Swal.fire('Error de Lógica', 'Los aprobados no pueden superar a los evaluados.', 'error');
        }

        if (!hasEvidence) {
            return Swal.fire('Falta Evidencia', 'Es obligatorio subir un respaldo (Kobo/Excel) para registrar el avance.', 'warning');
        }

        setLoading(true);
        try {
            let finalEvidenceUrl = activity?.last_evidence_url || "";
            let finalPublicId = activity?.last_evidence_public_id || "";

            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('folder', 'sigssep_evidences');
                const uploadRes = await apiFetch("/upload-evidence", { method: 'POST', body: formData });
                if (!uploadRes.ok) throw new Error("Error al subir la evidencia al servidor.");
                const uploadData = await uploadRes.json();
                finalEvidenceUrl = uploadData.url;
                finalPublicId = uploadData.public_id;
            }

            const payload = {
                activity_id: activity.id,
                observations: observations.trim(),
                evidence_url: finalEvidenceUrl,
                evidence_public_id: finalPublicId,
                men_reached: isOutcome ? 0 : Number(achievedMen),
                women_reached: isOutcome ? 0 : Number(achievedWomen),
                attended_count: isOutcome ? Number(totalAttended) : 0,
                approved_count: isOutcome ? Number(totalApproved) : 0
            };

            const method = isEditing ? 'PATCH' : 'POST';
            const endpoint = isEditing ? `/achievements/${existingRecordId}` : '/achievements';

            const res = await apiFetch(endpoint, {
                method: method,
                body: JSON.stringify(payload)
            });

            if (res?.ok) {
                invalidateGapCache(activity.location_id);
                await Swal.fire({
                    title: '¡Logrado!',
                    text: isEditing ? 'Registro actualizado.' : 'El logro se ha descontado de la meta.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                onRefresh();
                onClose();
            }
        } catch (error) {
            Swal.fire('Error de Sistema', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
            <div className="modal-header text-white" style={{ backgroundColor: '#10b981' }}>
                <h5 className="modal-title fw-bold">
                    <i className="fas fa-bullseye me-2"></i>
                    {isEditing ? 'Editar Avance' : 'Registrar Avance Real'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4 bg-light">
                {/* Resumen de planificación */}
                <div className="card mb-4 border-0 shadow-sm" style={{ backgroundColor: '#f8fafc', borderLeft: '5px solid #334155' }}>
                    <div className="card-body py-2">
                        <div className="row text-center">
                            <div className="col-4 border-end">
                                <p className="mb-0 x-small text-muted">META</p>
                                <h5 className="fw-bold mb-0">{plannedTotal}</h5>
                            </div>
                            <div className="col-8">
                                <p className="mb-0 x-small text-muted text-uppercase">Indicador ({activity.indicator?.type})</p>
                                <p className="mb-0 small fw-bold text-truncate">{activity.indicator?.code}</p>
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
                    {isOutcome ? (
                        <>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small">PERSONAS EVALUADAS</label>
                                <input
                                    type="number"
                                    className="form-control form-control-lg border-primary"
                                    value={totalAttended === 0 ? '' : totalAttended}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const numVal = val === '' ? 0 : Math.max(0, parseInt(val));
                                        setTotalAttended(numVal);
                                        if (numVal < totalApproved) {
                                            setTotalApproved(numVal);
                                        }
                                    }}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small">PERSONAS APROBADAS</label>
                                <input
                                    type="number"
                                    className="form-control form-control-lg border-emerald"
                                    value={totalApproved === 0 ? '' : totalApproved}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const numVal = val === '' ? 0 : Math.max(0, parseInt(val));

                                        if (numVal > totalAttended) {
                                            setTotalApproved(totalAttended);
                                        } else {
                                            setTotalApproved(numVal);
                                        }
                                    }}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small">HOMBRES</label>
                                <input
                                    type="number"
                                    className="form-control form-control-lg"
                                    value={achievedMen === 0 ? '' : achievedMen}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setAchievedMen(val === '' ? 0 : Math.max(0, parseInt(val)));
                                    }}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small">MUJERES</label>
                                <input
                                    type="number"
                                    className="form-control form-control-lg"
                                    value={achievedWomen === 0 ? '' : achievedWomen}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setAchievedWomen(val === '' ? 0 : Math.max(0, parseInt(val)));
                                    }}
                                />
                            </div>
                        </>
                    )}
                    <div className="col-12 mt-4 text-center">
                        <div className="p-3 bg-white border rounded-3 shadow-sm">
                            <span className="text-muted small text-uppercase fw-bold">Total a descontar de la meta:</span>
                            <h1 className="display-5 fw-bold text-emerald mb-0">{totalAchieved}</h1>
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