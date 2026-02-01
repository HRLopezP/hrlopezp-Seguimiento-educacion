import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from "../../utils/api";
import { toast, Toaster } from 'sonner';
import Swal from 'sweetalert2';

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjectDetail = async () => {
            try {
                const res = await apiFetch(`/manager/projects/${id}`);
                if (res && res.ok) {
                    const data = await res.json();
                    setProject(data);
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: 'No se pudo encontrar la información del proyecto.',
                        icon: 'error',
                        confirmButtonColor: '#1b263b' // Oxford Grey
                    });
                    navigate('/manager/projects');
                }
            } catch (error) {
                toast.error("Error de conexión con SIGSSEP");
            } finally {
                setLoading(false);
            }
        };
        fetchProjectDetail();
    }, [id, navigate]);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="spinner-border text-emerald" role="status">
                <span className="visually-hidden">Cargando...</span>
            </div>
        </div>
    );

    if (!project) return null;

    return (
        <div className="container mt-4 mb-5 fade-in">
            <Toaster richColors />
            
            {/* HEADER CON CRONÓMETRO */}
            <div className="auth-card-unified mb-4 shadow-sm">
                <div className="auth-header d-flex justify-content-between align-items-center flex-wrap px-4 py-3 bg-oxford text-white">
                    <div className="text-start">
                        <h2 className="mb-0 fs-3">{project.project_name || "Proyecto sin nombre"}</h2>
                        <span className="badge bg-emerald-soft text-white mt-1">CÓDIGO: {project.code}</span>
                    </div>
                    {/* Cronómetro usando remaining_time_detailed del endpoint */}
                    <div className="text-center bg-white text-dark rounded-pill px-4 py-2 shadow-sm border border-emerald">
                        <small className="d-block fw-bold text-muted">TIEMPO RESTANTE</small>
                        <span className="text-oxford fw-bold fs-5">
                            {project.remaining_time_detailed?.years || 0}a {project.remaining_time_detailed?.months || 0}m {project.remaining_time_detailed?.days || 0}d
                        </span>
                    </div>
                </div>

                <div className="auth-body bg-white p-4">
                    <div className="row g-4">
                        {/* FICHA TÉCNICA COMPLETA */}
                        <div className="col-md-4 border-end">
                            <h5 className="text-oxford fw-bold border-bottom pb-2">📋 Ficha Técnica</h5>
                            <ul className="list-unstyled">
                                <li className="mb-2"><strong>Donante:</strong> {project.donor_name || "No asignado"}</li>
                                <li className="mb-2"><strong>Inicio:</strong> {project.start_date || "---"}</li>
                                <li className="mb-2"><strong>Cierre:</strong> {project.end_date || "---"}</li>
                                <li className="mb-3"><strong>Estado:</strong> 
                                    <span className="ms-2 badge bg-emerald text-white">{project.status}</span>
                                </li>
                                <li className="mt-3 small text-muted">
                                    <strong>Resumen de Resultados:</strong><br/>
                                    {project.results_summary || "Sin resumen registrado."}
                                </li>
                            </ul>
                        </div>

                        {/* BENEFICIARIOS ÚNICOS - DASHBOARD STYLE */}
                        <div className="col-md-8">
                            <h5 className="text-oxford fw-bold border-bottom pb-2 text-center">👥 Beneficiarios Únicos (Metas Generales)</h5>
                            <div className="row text-center mt-3">
                                <div className="col-3 border-end">
                                    <h3 className="text-emerald fw-bold">{project.unique_targets?.total || 0}</h3>
                                    <small className="text-muted">TOTAL</small>
                                </div>
                                <div className="col-3 border-end">
                                    <h3 className="text-primary fw-bold">{project.unique_targets?.men || 0}</h3>
                                    <small className="text-muted">HOMBRES</small>
                                </div>
                                <div className="col-3 border-end">
                                    <h3 className="text-danger fw-bold">{project.unique_targets?.women || 0}</h3>
                                    <small className="text-muted">MUJERES</small>
                                </div>
                                <div className="col-3">
                                    <h3 className="text-warning fw-bold">{project.unique_targets?.disability || 0}</h3>
                                    <small className="text-muted">DISCAPACIDAD</small>
                                </div>
                            </div>
                            
                            {/* OBJETIVO PRINCIPAL DESTACADO */}
                            <div className="mt-4 p-3 rounded bg-light border-start border-4 border-oxford">
                                <h6 className="fw-bold text-oxford">Objetivo Principal:</h6>
                                <p className="text-muted mb-0">{project.main_objective || "No se ha definido un objetivo principal."}</p>
                            </div>
                        </div>
                    </div>

                    {/* DESGLOSE POR PROVINCIA (OPCIONAL/ADICIONAL) */}
                    {project.province_unique_breakdown?.length > 0 && (
                        <div className="mt-4">
                            <h6 className="text-muted fw-bold small mb-2">METAS ÚNICAS POR PROVINCIA:</h6>
                            <div className="d-flex flex-wrap gap-2">
                                {project.province_unique_breakdown.map((pb, i) => (
                                    <span key={i} className="badge border text-oxford bg-light">
                                        {pb.province_name}: {pb.total}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TABLA DE LUGARES DE INTERVENCIÓN */}
                    <div className="mt-5">
                        <h5 className="text-oxford fw-bold mb-3">
                            <i className="fas fa-map-marker-alt me-2 text-emerald"></i>Lugares de Intervención
                        </h5>
                        <div className="sigssep-table-container shadow-sm rounded">
                            <table className="table-sigssep table-hover">
                                <thead>
                                    <tr>
                                        <th className="ps-4">Estado/Provincia</th>
                                        <th>Municipio</th>
                                        <th>Parroquia</th>
                                        <th>Comunidad / Institución</th>
                                    </tr>
                                </thead>
                                <tbody>{project.locations && project.locations.length > 0 ? (
                                        project.locations.map((loc, idx) => (
                                            <tr key={idx}>
                                                <td className="ps-4 fw-bold text-oxford">{loc.province}</td>
                                                <td>{loc.municipality}</td>
                                                <td>{loc.parish || '---'}</td>
                                                <td>{loc.community_institution || '---'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="text-center py-3">No hay ubicaciones registradas.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="d-flex justify-content-between">
                <button className="btn btn-outline-secondary px-4 shadow-sm" onClick={() => navigate('/manager/projects')}>
                    <i className="fas fa-arrow-left me-2"></i>Volver a la lista
                </button>
                <div className="d-flex gap-2">
                    <button className="btn btn-oxford text-white px-4 shadow-sm">
                        <i className="fas fa-print me-2"></i>Exportar PDF
                    </button>
                    <button className="btn btn-emerald text-white px-4 shadow-sm">
                        <i className="fas fa-edit me-2"></i>Editar Proyecto
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;