import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from "../../utils/api";
import "../styles/projectDetail.css";
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
        <div className="project-detail-main-container fade-in py-4">
            <div className="container-fluid mt-4 mb-5 px-4 fade-in" style={{ maxWidth: '1200px' }}>
                <Toaster richColors />

                {/* HEADER PRINCIPAL */}
                <div className="sigssep-table-container mb-4 shadow-lg overflow-hidden border-0">
                    <div className="auth-header d-flex justify-content-between align-items-center flex-wrap px-4 py-4 bg-oxford text-white">
                        <div className="text-start">
                            <h2 className="mb-1 fw-bold fs-2">{project.project_name || "Proyecto sin nombre"}</h2>
                            <span className="badge bg-emerald-soft text-dark fw-bold">ID: {project.code}</span>
                        </div>

                        <div className="time-display-container text-center shadow-sm mt-2 mt-md-0">
                            <small className="time-label">TIEMPO RESTANTE</small>
                            <span className="time-counter">
                                {project.remaining_time_detailed?.years || 0}a {project.remaining_time_detailed?.months || 0}m {project.remaining_time_detailed?.days || 0}d
                            </span>
                        </div>
                    </div>

                    <div className="p-4" style={{ backgroundColor: 'var(--card-bg)' }}>
                        <div className="row g-4">
                            {/* COLUMNA IZQUIERDA: FICHA TÉCNICA */}
                            <div className="col-lg-4 border-end-dynamic">
                                <h5 className="text-oxford-dynamic fw-bold mb-4 d-flex align-items-center">
                                    <i className="fas fa-clipboard-list me-2 text-emerald"></i> Ficha Técnica
                                </h5>
                                <div className="tech-info-grid">
                                    <div className="mb-3">
                                        {/* Esta clase text-muted ahora es controlada por el CSS que pusimos arriba */}
                                        <label className="small text-muted d-block">DONANTE</label>
                                        <span className="fw-bold">{project.donor_name || "No asignado"}</span>
                                    </div>
                                    <div className="row mb-3">
                                        <div className="col-6">
                                            <label className="small text-muted d-block">INICIO</label>
                                            <span className="fw-bold text-oxford-dynamic">{project.start_date}</span>
                                        </div>
                                        <div className="col-6">
                                            <label className="small text-muted d-block">CIERRE</label>
                                            <span className="fw-bold text-oxford-dynamic">{project.end_date}</span>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="small text-muted d-block fw-bold mb-1">ESTADO DEL PROYECTO</label>
                                        <span className="status-badge bg-emerald shadow-sm">
                                            {project.status || "En Progreso"}
                                        </span>
                                    </div>

                                    <h6 className="fw-bold mt-4 mb-3 small text-muted text-uppercase">Metas por Provincia</h6>
                                    <div className="d-flex flex-wrap gap-3">
                                        {project.province_unique_breakdown?.map((pb, i) => (
                                            <div key={i} className="province-badge-detailed">
                                                <div className="province-header d-flex justify-content-between">
                                                    <span>{pb.province_name}</span>
                                                    <span className="text-emerald">{pb.total}</span>
                                                </div>
                                                <div className="gender-split">
                                                    <span className="m-color">H: {pb.men || 0}</span>
                                                    <span className="w-color">M: {pb.women || 0}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: BENEFICIARIOS Y OBJETIVO */}
                            <div className="col-lg-8 ps-lg-5">
                                <h5 className="text-oxford-dynamic fw-bold mb-4 text-center">
                                    <i className="fas fa-users me-2 text-emerald"></i>Beneficiarios Únicos
                                </h5>

                                <div className="beneficiaries-container mb-4">
                                    {/* FILA SUPERIOR: TOTAL CENTRADO */}
                                    <div className="d-flex justify-content-center mb-3">
                                        <div className="b-item total-main shadow-sm">
                                            <span className="num-large">{project.unique_targets?.total || 0}</span>
                                            <label className="label-text">Total Beneficiarios</label>
                                        </div>
                                    </div>

                                    {/* FILA INFERIOR: DESGLOSE */}
                                    <div className="beneficiaries-grid">
                                        <div className="b-item secondary men">
                                            <span className="num-medium">{project.unique_targets?.men || 0}</span>
                                            <label className="label-text">Hombres</label>
                                        </div>
                                        <div className="b-item secondary women">
                                            <span className="num-medium">{project.unique_targets?.women || 0}</span>
                                            <label className="label-text">Mujeres</label>
                                        </div>
                                        <div className="b-item secondary disability">
                                            <span className="num-medium">{project.unique_targets?.disability || 0}</span>
                                            <label className="label-text">Discapacidad</label>
                                        </div>
                                    </div>
                                </div>

                                <div className="objective-box p-4 rounded-4 shadow-sm">
                                    <h6 className="fw-bold text-emerald mb-2"><i className="fas fa-bullseye me-2"></i>Objetivo Estratégico</h6>
                                    <p className="mb-0 fs-5 lh-sm italic-management">
                                        "{project.main_objective || "No definido."}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABLA DE UBICACIONES (ANCHO COMPLETO) */}
                <div className="mb-5">
                    <h5 className="text-oxford-dynamic fw-bold mb-3 px-2">
                        <i className="fas fa-map-marked-alt me-2 text-emerald"></i>Lugares de Intervención
                    </h5>
                    <div className="sigssep-table-container shadow-sm border-0">
                        <table className="table-sigssep">
                            <thead>
                                <tr>
                                    <th className="ps-4">Estado / Provincia</th>
                                    <th>Municipio</th>
                                    <th>Parroquia</th>
                                    <th>Comunidad / Institución</th>
                                </tr>
                            </thead>
                            <tbody>
                                {project.locations?.map((loc, idx) => (
                                    <tr key={idx}>
                                        <td className="ps-4 fw-bold">{loc.province}</td>
                                        <td>{loc.municipality}</td>
                                        <td>{loc.parish || '---'}</td>
                                        <td>{loc.community_institution || '---'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="d-flex justify-content-between align-items-center bg-card-dynamic p-4 rounded-4 shadow-sm border border-light-subtle mt-4">
                    <button className="btn btn-outline-oxford px-4" onClick={() => navigate('/manager/projects')}>
                        <i className="fas fa-arrow-left me-2"></i>Volver a la lista
                    </button>
                    <div className="d-flex gap-3">
                        <button className="btn btn-oxford px-4 shadow-sm text-white d-flex align-items-center">
                            <i className="fas fa-file-pdf me-2"></i> Exportar PDF
                        </button>
                        <Link
                            to={`/manager/projects/edit/${id}`}
                            className="btn btn-emerald px-4 shadow-sm text-white d-flex align-items-center"
                        >
                            <i className="fas fa-edit me-2"></i> Editar Proyecto
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;