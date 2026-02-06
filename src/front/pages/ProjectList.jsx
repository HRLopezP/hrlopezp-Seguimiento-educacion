import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/projectDetail.css"; // Reutilizamos con orgullo
import { toast, Toaster } from 'sonner';

const ProjectList = () => {
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const handleDeleteProject = async (projectId, projectName) => {
        const result = await Swal.fire({
            title: '¿Confirmar eliminación?',
            html: `Estás a punto de borrar permanentemente el proyecto:<br><strong>${projectName}</strong>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            // Colores de tu marca
            confirmButtonColor: '#ae2012', // El rojo profundo que definimos
            cancelButtonColor: '#1b263b',  // Tu Azul Oxford (Seriedad)
            background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1b263b' : '#ffffff',
            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1b263b',
            customClass: {
                popup: 'shadow-lg border-0 rounded-4',
                title: 'fw-bold'
            }
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/projects/${projectId}`, { method: 'DELETE' });
                if (res?.ok) {

                    setProjects(prev => prev.map(p =>
                        p.id === projectId ? { ...p, isDeleting: true } : p
                    ));
                    toast.success("Proyecto eliminado con éxito");
                    setTimeout(() => {
                        setProjects(prev => prev.filter(p => p.id !== projectId));
                    }, 500);
                    // Actualizamos la lista local eliminando el proyecto borrado

                } else {
                    toast.error("Error al intentar eliminar el proyecto");
                }
            } catch (error) {
                toast.error("Error de conexión");
            }
        }
    };

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await apiFetch("/manager/projects");
                if (res && res.ok) {
                    const data = await res.json();
                    setProjects(data);
                    setFilteredProjects(data);
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
        fetchProjects();
    }, []);

    useEffect(() => {
        const results = projects.filter(p =>
            p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.donor_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredProjects(results);
    }, [searchTerm, projects]);

    return (
        <div className="management-page-container"> {/* Cambiado para usar el fondo correcto */}
            <Toaster richColors position="top-right" />
            <div className="container mt-4">
                <div className="card management-card-unified shadow-lg">
                    {/* Header Estilo Management */}
                    <div className="management-card-header d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="management-title">Gestión de Proyectos</h2>
                            <p className="management-subtitle">Supervisión y seguimiento en tiempo real</p>
                        </div>
                        <button
                            className="btn-action btn-activate" // Usamos tu clase de éxito
                            onClick={() => navigate('/manager/projects/create')}
                        >
                            <i className="fas fa-plus-circle me-2"></i>Nuevo Proyecto
                        </button>
                    </div>

                    {/* Filtro/Buscador - Ajustado para no perderse en oscuro */}
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
                                        <tr>
                                            <td colSpan="5" className="text-center py-5">
                                                <div className="spinner-border text-emerald" role="status"></div>
                                            </td>
                                        </tr>
                                    ) : filteredProjects.map((p) => (
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
                                                        style={{ borderWidth: '2px' }} // Para que resalte un poco más la elegancia
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectList;