import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from "../../utils/api";
import { toast, Toaster } from 'sonner';

const ProjectList = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await apiFetch("/manager/projects");
                if (res && res.ok) {
                    const data = await res.json();
                    console.log("Datos recibidos del SIGSSEP:", data);
                    setProjects(data);
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

    return (
        <div className="container mt-5 fade-in">
            <Toaster richColors />
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-oxford fw-bold">📋 Gestión de Proyectos</h2>
                <button
                    className="btn btn-emerald text-white shadow-sm"
                    onClick={() => navigate('/manager/projects/create')}
                >
                    <i className="fas fa-plus me-2"></i>Nuevo Proyecto
                </button>
            </div>

            <div className="card shadow-sm border-0">
                <div className="sigssep-table-container">
                    <table className="table-sigssep">
                        <thead>
                            <tr>
                                <th className="ps-4">Código</th>
                                <th>Nombre del Proyecto</th>
                                <th>Donante</th>
                                <th>Estado</th>
                                <th>Inicio</th>
                                <th className="text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">{/* Pegamos la llave al tbody */}
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5">Cargando proyectos...</td>
                                </tr>
                            ) : projects.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">No hay proyectos registrados aún.</td>
                                </tr>
                            ) : (
                                projects.map((p) => (
                                    <tr key={p.id}>
                                        <td className="ps-4 fw-bold text-oxford">{p.code}</td>
                                        <td><span className="user-name-text">{p.project_name}</span></td>
                                        <td>{p.donor_name}</td>
                                        <td>
                                            <span className={`role-badge ${p.status === 'En Progreso' ? 'bg-emerald-soft' : 'bg-oxford'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td>{p.start_date ? new Date(p.start_date).toLocaleDateString() : "---"}</td>
                                        <td className="text-center">
                                            <button
                                                className="btn btn-sm btn-outline-oxford me-2"
                                                onClick={() => navigate(`/manager/projects/${p.id}`)}
                                            >
                                                <i className="fas fa-eye"></i>
                                            </button>
                                            <button className="btn btn-sm btn-outline-secondary">
                                                <i className="fas fa-edit"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProjectList;