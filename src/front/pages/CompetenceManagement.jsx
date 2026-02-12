import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/auth.css";
import "../styles/roleManagement.css"; 

const CompetenceManagement = () => {
    const [competences, setCompetences] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchCompetences = async () => {
        try {
            const res = await apiFetch("/competences");
            if (res?.ok) {
                const data = await res.json();
                setCompetences(data);
            }
        } catch (error) {
            toast.error("Error al conectar con el servidor de competencias");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompetences();
    }, []);

    // Modal dinámico para Crear/Editar
    const handleOpenModal = async (competence = null) => {
        const isEditing = !!competence;

        const { value: name } = await Swal.fire({
            title: isEditing ? 'Editar Competencia' : 'Nueva Competencia',
            html: `
                <div class="role-icon-container ${isEditing ? 'edit-mode' : 'create-mode'}">
                    <i class="fas fa-award"></i>
                </div>
                <div style="margin-top: 15px;">
                    <label class="swal2-input-label">Nombre de la Competencia</label>
                </div>
            `,
            input: 'text',
            inputValue: isEditing ? competence.name : '',
            inputPlaceholder: 'Ej. Gestión de Proyectos, Auditoría...',
            showCancelButton: true,
            confirmButtonText: isEditing ? 'Guardar Cambios' : 'Crear Competencia',
            confirmButtonColor: '#10b981', // Verde Esmeralda
            cancelButtonColor: '#1B263B', // Azul Oxford
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            customClass: {
                popup: 'role-modal-custom-swal',
                input: 'role-modal-input'
            },
            inputValidator: (value) => {
                if (!value) return '¡El nombre es obligatorio!';
            }
        });

        if (name) {
            const method = isEditing ? "PUT" : "POST";
            const endpoint = isEditing ? `/competences/${competence.id}` : "/competences";

            try {
                const res = await apiFetch(endpoint, {
                    method: method,
                    body: JSON.stringify({ name: name })
                });

                if (res?.ok) {
                    toast.success(`Competencia ${isEditing ? 'actualizada' : 'creada'} con éxito`);
                    fetchCompetences();
                } else {
                    const errorData = await res.json();
                    toast.error(errorData.message || "Ocurrió un error");
                }
            } catch (err) {
                toast.error("Error de conexión");
            }
        }
    };

    const handleDelete = async (comp) => {
        const result = await Swal.fire({
            title: '¿Eliminar Competencia?',
            text: `Se eliminará "${comp.name}". Esto podría afectar los registros de seguimiento.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#1B263B',
            confirmButtonText: 'Sí, eliminar',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/competences/${comp.id}`, { method: "DELETE" });
                if (res?.ok) {
                    toast.success("Competencia eliminada");
                    fetchCompetences();
                }
            } catch (error) {
                toast.error("Error al eliminar");
            }
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <div className="spinner-border text-emerald" role="status"></div>
        </div>
    );

    return (
        <div className="management-page-container">
            <Toaster richColors position="top-right" />
            <div className="container mt-4">
                <div className="card management-card-unified shadow-lg">
                    <div className="management-card-header d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="management-title">Gestión de Competencias</h2>
                            <p className="management-subtitle">Administra las áreas de especialidad para el seguimiento de proyectos</p>
                        </div>
                        <button className="btn-action btn-activate" onClick={() => handleOpenModal()}>
                            <i className="fas fa-plus-circle me-2"></i>Nueva Competencia
                        </button>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table align-middle table-sigssep mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>ID</th>
                                        <th>Nombre de Competencia</th>
                                        <th className="text-center mx-5" style={{ width: '250px', paddingRight: '40px' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {competences.length > 0 ? competences.map((comp) => (
                                        <tr key={comp.id}>
                                            <td className="text-muted small">#{comp.id}</td>
                                            <td><span className="fw-semibold user-name-text">{comp.name}</span></td>
                                            <td className="text-end" style={{ paddingRight: '40px' }}>
                                                <button className="btn-toggle-status activate me-2" onClick={() => handleOpenModal(comp)}>
                                                    <i className="fas fa-edit"></i> <span className="d-none d-md-inline">Editar</span>
                                                </button>
                                                <button className="btn-toggle-status deactivate me-3" onClick={() => handleDelete(comp)}>
                                                    <i className="fas fa-trash-alt"></i> <span className="d-none d-md-inline">Eliminar</span>
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" className="text-center p-5 text-muted">No hay competencias registradas.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompetenceManagement;