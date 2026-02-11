import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/auth.css";
import "../styles/roleManagement.css"; 

const VerificationMeansManagement = () => {
    const [means, setMeans] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Obtener los medios desde el nuevo endpoint
    const fetchMeans = async () => {
        try {
            const res = await apiFetch("/verification-means");
            if (res?.ok) {
                const data = await res.json();
                setMeans(data);
            }
        } catch (error) {
            toast.error("Error al conectar con el catálogo de medios");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMeans();
    }, []);

    // 2. Modal dinámico (Crear/Editar) con mejoras visuales
    const handleOpenModal = async (mean = null) => {
        const isEditing = !!mean;

        const { value: name } = await Swal.fire({
            title: isEditing ? 'Editar Medio' : 'Nuevo Medio de Verificación',
            html: `
                <div className="role-icon-container ${isEditing ? 'edit-mode' : 'create-mode'}" style="background: #3b82f622; color: #3b82f6;">
                    <i className="fas fa-paperclip"></i>
                </div>
                <div style="margin-top: 15px;">
                    <label className="swal2-input-label">Nombre del Medio de Verificación</label>
                    <p className="text-muted small">Este nombre aparecerá como opción en todos los indicadores.</p>
                </div>
            `,
            input: 'text',
            inputValue: isEditing ? mean.name : '',
            inputPlaceholder: 'Ej. Listas de asistencia, Registro fotográfico...',
            showCancelButton: true,
            confirmButtonText: isEditing ? 'Guardar Cambios' : 'Registrar Medio',
            confirmButtonColor: '#3b82f6', // Azul para diferenciarlo de competencias
            cancelButtonColor: '#1B263B',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            customClass: {
                popup: 'role-modal-custom-swal',
                input: 'role-modal-input'
            },
            inputValidator: (value) => {
                if (!value) return '¡El nombre es obligatorio para clasificar la evidencia!';
            }
        });

        if (name) {
            const method = isEditing ? "PUT" : "POST";
            const endpoint = isEditing ? `/verification-means/${mean.id}` : "/verification-means";

            try {
                const res = await apiFetch(endpoint, {
                    method: method,
                    body: JSON.stringify({ name: name })
                });

                if (res?.ok) {
                    toast.success(`Medio ${isEditing ? 'actualizado' : 'creado'} correctamente`);
                    fetchMeans();
                } else {
                    const errorData = await res.json();
                    toast.error(errorData.message || "Error en la operación");
                }
            } catch (err) {
                toast.error("Error de red al intentar guardar");
            }
        }
    };

    // 3. Eliminar con advertencia de integridad
    const handleDelete = async (mean) => {
        const result = await Swal.fire({
            title: '¿Eliminar este medio?',
            text: `Si "${mean.name}" está siendo usado en algún indicador, el sistema no permitirá borrarlo por seguridad.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#1B263B',
            confirmButtonText: 'Sí, eliminar permanentemente',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/verification-means/${mean.id}`, { method: "DELETE" });
                if (res?.ok) {
                    toast.success("Medio eliminado del catálogo");
                    fetchMeans();
                } else {
                    const errorData = await res.json();
                    toast.error(errorData.message || "No se pudo eliminar");
                }
            } catch (error) {
                toast.error("Error al procesar la eliminación");
            }
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <div className="spinner-border text-primary" role="status"></div>
        </div>
    );

    return (
        <div className="management-page-container">
            <Toaster richColors position="top-right" />
            <div className="container mt-4">
                <div className="card management-card-unified shadow-lg border-0">
                    <div className="management-card-header d-flex justify-content-between align-items-center bg-white border-bottom p-4">
                        <div>
                            <h2 className="management-title" style={{ color: '#1e293b' }}>Catálogo de Evidencias</h2>
                            <p className="management-subtitle text-muted">Define los medios de verificación oficiales para el seguimiento técnico</p>
                        </div>
                        <button className="btn btn-primary px-4 py-2 rounded-pill shadow-sm" onClick={() => handleOpenModal()}>
                            <i className="fas fa-plus-circle me-2"></i>Nuevo Medio
                        </button>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table align-middle table-hover mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4" style={{ width: '80px' }}>ID</th>
                                        <th>Nombre del Medio de Verificación</th>
                                        <th className="text-center">Estado</th>
                                        <th className="text-end pe-4" style={{ width: '250px' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {means.length > 0 ? means.map((mean) => (
                                        <tr key={mean.id}>
                                            <td className="ps-4 text-muted small">#{mean.id}</td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="me-3 p-2 bg-light rounded-circle text-primary">
                                                        <i className="fas fa-file-alt"></i>
                                                    </div>
                                                    <span className="fw-bold text-dark">{mean.name}</span>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-soft-success text-success rounded-pill px-3">Activo</span>
                                            </td>
                                            <td className="text-end pe-4">
                                                <button className="btn btn-outline-primary btn-sm me-2 border-0" onClick={() => handleOpenModal(mean)}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn btn-outline-danger btn-sm border-0" onClick={() => handleDelete(mean)}>
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="text-center p-5">
                                                <div className="text-muted">
                                                    <i className="fas fa-folder-open fa-3x mb-3 opacity-25"></i>
                                                    <p>No hay medios registrados. Comienza agregando uno nuevo.</p>
                                                </div>
                                            </td>
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

export default VerificationMeansManagement;