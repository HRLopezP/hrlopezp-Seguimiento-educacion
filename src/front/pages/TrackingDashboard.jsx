import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from "../../utils/api";
import ContextSelector from '../components/ContextSelector';
import ProgressSummary from "../components/ProgressSummary";
import { toast } from "sonner";

export const TrackingDashboard = () => {
    const [context, setContext] = useState(null);
    const [summaryData, setSummaryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [projectHeader, setProjectHeader] = useState(null);

    const loadProgressSummary = useCallback(async (proyectoId, competenciaId) => {
        if (!proyectoId || !competenciaId) return;
        setLoading(true);
        try {
            const res = await apiFetch(`/project/${proyectoId}/progress-summary?competence_id=${competenciaId}&extended=true`);
            if (res?.ok) {
                const json = await res.json();
                setSummaryData(json.indicators || []);
                setProjectHeader(json.project_info);
            }
        } catch (error) {
            toast.error("Error al cargar el resumen de progreso");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (context?.proyectoId && context?.competenciaId) {
            loadProgressSummary(context.proyectoId, context.competenciaId);
        } else {
            setSummaryData([]);
        }
    }, [context, loadProgressSummary]);

    return (
        <div className="project-detail-main-container fade-in">
            <div className="container py-4">
                <header className="mb-4">
                    <h2 className="text-oxford-dynamic fw-bold m-0">Seguimiento de Indicadores</h2>
                </header>

                <ContextSelector onContextChange={setContext} />

                {context ? (
                    <div className="mt-4">
                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-success" role="status"></div>
                                <p className="mt-2 text-muted">Calculando avances en tiempo real...</p>
                            </div>
                        ) : (
                            <ProgressSummary
                                data={summaryData}
                                projectInfo={projectHeader}
                                competenceName={context?.competenciaNombre} />
                        )}
                    </div>
                ) : (
                    <div className="text-center py-5 opacity-50">
                        <i className="fas fa-chart-line fa-3x mb-3"></i>
                        <p>Selecciona un proyecto para visualizar el progreso de metas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};