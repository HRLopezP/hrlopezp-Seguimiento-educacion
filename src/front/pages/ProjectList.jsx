import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/projectDetail.css";
import { toast, Toaster } from 'sonner';
import Pagination from "../components/Pagination"

const ProjectList = () => {
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchProjects = async (page = 1) => {
        try {
            setLoading(true);
            // Ahora enviamos el parámetro ?page=
            const res = await apiFetch(`/manager/projects?page=${page}`);
            if (res && res.ok) {
                const data = await res.json();
                // IMPORTANTE: data ahora es un objeto { items: [], total_pages: X, ... }
                setProjects(data.items || []);
                setFilteredProjects(data.items || []);
                setTotalPages(data.total_pages || 1);
                setCurrentPage(data.current_page || 1);
            } else {
                toast.error("No se pudieron cargar los proyectos");
            }
        } catch (error) {
            console.error("Error en fetchProjects:", error);
            toast.error("Error de conexión con el servidor");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects(currentPage);
    }, [currentPage]);


    useEffect(() => {
        const filtered = projects.filter(p =>
            p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.unique_code.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredProjects(filtered);
    }, [searchTerm, projects]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handleDeleteProject = async (projectId, projectName) => {
        const result = await Swal.fire({
            title: '¿Confirmar eliminación?',
            html: `Estás a punto de borrar permanentemente el proyecto:<br><strong>${projectName}</strong>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ae2012',
            cancelButtonColor: '#1b263b',
            background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1b263b' : '#ffffff',
            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1b263b',
            customClass: {
                popup: 'shadow-lg border-0 rounded-4',
                title: 'fw-bold'
            }
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/manager/projects/${projectId}`, { method: "DELETE" });
                if (res && res.ok) {
                    toast.success("Proyecto eliminado correctamente");
                    fetchProjects(currentPage);
                } else {
                    toast.error("No se pudo eliminar el proyecto");
                }
            } catch (error) {
                toast.error("Error al eliminar el proyecto");
            }
        }
    };


    return (
        <div className="management-page-container">
            <Toaster richColors position="top-right" />
            <div className="container mt-4">
                <div className="card management-card-unified shadow-lg">
                    <div className="management-card-header d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="management-title">Gestión de Proyectos</h2>
                            <p className="management-subtitle">Supervisión y seguimiento en tiempo real</p>
                        </div>
                        <button
                            className="btn-action btn-activate"
                            onClick={() => navigate('/manager/projects/create')}
                        >
                            <i className="fas fa-plus-circle me-2"></i>Nuevo Proyecto
                        </button>
                    </div>
                    {/* Filtro/Buscador*/}
                    <div className="p-3 bg-transparent">
                        <div className="row">
                            <div className="col-md-5">
                                <div className="input-group project-search-group shadow-sm">
                                    <span className="input-group-text bg-transparent border-end-0">
                                        <i className="fas fa-search text-emerald"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control border-start-0 ps-0"
                                        placeholder="Buscar por nombre, código o donante..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table align-middle table-sigssep mb-0">
                                <thead>
                                    <tr>
                                        <th className="ps-4">CÓDIGO</th>
                                        <th>DETALLES DEL PROYECTO</th>
                                        <th>ESTADO</th>
                                        <th>CRONOGRAMA</th>
                                        <th className="text-center">ACCIONES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" className="text-center p-5"><div className="spinner-border text-emerald"></div></td></tr>
                                    ) : filteredProjects.length > 0 ? filteredProjects.map((p) => (
                                        <tr key={p.id}
                                            className={`project-row-hover ${p.isDeleting ? 'row-fade-out' : ''}`}>
                                            <td className="ps-4 fw-bold text-emerald">{p.code}</td>
                                            <td>
                                                <div className="text-oxford-dynamic">{p.project_name}</div>
                                                <small className="text-muted-dynamic"><i className="fas fa-hand-holding-usd me-1"></i>{p.donor_name || "Sin Donante"}</small>
                                            </td>
                                            <td>
                                                <span className={`status-badge-mini ${p.status === 'En Progreso' ? 'status-active' : 'status-pending'}`}>
                                                    <i className={`fas ${p.status === 'En Progreso' ? 'fa-sync-alt fa-spin' : 'fa-clock'} me-1`}></i>
                                                    {p.status || "Pendiente"}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="small text-oxford-dynamic">
                                                    <i className="far fa-calendar-alt me-1 text-emerald"></i>
                                                    {p.start_date ? new Date(p.start_date).toLocaleDateString() : '---'}
                                                </div>
                                                <div className="small text-muted-dynamic">
                                                    <i className="far fa-calendar-check me-1"></i>
                                                    {p.end_date ? new Date(p.end_date).toLocaleDateString() : '---'}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center gap-2">
                                                    <button
                                                        className="btn btn-sm btn-outline-oxford rounded-pill"
                                                        title="Ver detalles"
                                                        onClick={() => navigate(`/manager/projects/${p.id}`)}
                                                    >
                                                        <i className="fas fa-eye"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-emerald text-white rounded-pill shadow-sm"
                                                        title="Editar proyecto"
                                                        onClick={() => navigate(`/manager/projects/edit/${p.id}`)}
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>

                                                    <button
                                                        className="btn btn-sm btn-outline-danger rounded-pill shadow-sm"
                                                        title="Eliminar proyecto"
                                                        onClick={() => handleDeleteProject(p.id, p.project_name)}
                                                        style={{ borderWidth: '2px' }}
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-oxford rounded-pill shadow-sm"
                                                        title="Configuración Técnica"
                                                        onClick={() => navigate(`/manager/projects/${p.id}/setup`)}
                                                    >
                                                        <i className="fas fa-cogs me-1"></i> Tech
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="5" className="text-center p-5 text-muted">No se encontraron proyectos registrados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectList;