import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/auth.css";
import "../styles/roleManagement.css";

const RoleManagement = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Función para cargar los roles desde la API
    const fetchRoles = async () => {
        try {
            const res = await apiFetch("/roles");
            if (res && res.ok) {
                const data = await res.json();
                setRoles(data);
            }
        } catch (error) {
            toast.error("Error al cargar los roles de SIGSSEP");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    /**
     * Lógica Unificada para Crear y Editar usando SweetAlert2
     * Tal como en UserManagement, evitamos modales manuales.
     */
    const handleOpenRoleModal = async (role = null) => {
        const isEditing = !!role;

        if (isEditing && role.name_rol === "Administrador") {
            return toast.warning("El rol Administrador es vital y no debe ser modificado.");
        }

        // Definimos el estilo dinámico según la acción
        const iconHtml = isEditing
            ? `<div class="role-icon-container edit-mode"><i class="fas fa-user-tag"></i></div>`
            : `<div class="role-icon-container create-mode"><i class="fas fa-shield-alt"></i></div>`;

        const { value: newRoleName } = await Swal.fire({
            title: isEditing ? 'Actualizar Rol' : 'Nuevo Rol de Sistema',
            // Inyectamos el icono arriba del input
            html: `
            ${iconHtml}
            <div style="margin-top: 15px;">
                <label class="swal2-input-label">Nombre del rol</label>
            </div>
        `,
            input: 'text',
            inputValue: isEditing ? role.name_rol : '',
            inputPlaceholder: 'Ej. Auditor, Supervisor...',
            showCancelButton: true,
            confirmButtonText: isEditing ? '<i class="fas fa-save me-2"></i>Guardar' : '<i class="fas fa-plus-circle me-2"></i>Crear Rol',
            cancelButtonText: 'Cancelar',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#1B263B',
            customClass: {
                popup: 'role-modal-custom-swal',
                title: 'role-modal-title',
                input: 'role-modal-input'
            },
            inputValidator: (value) => {
                if (!value) return '¡El nombre del rol es obligatorio!';
            }
        });

        // Si el usuario confirmó y escribió algo
        if (newRoleName) {
            const method = isEditing ? "PUT" : "POST";
            const endpoint = isEditing ? `/roles/${role.id}` : "/roles";

            try {
                const res = await apiFetch(endpoint, {
                    method: method,
                    body: JSON.stringify({ name_rol: newRoleName })
                });

                if (res?.ok) {
                    const data = await res.json();
                    toast.success(data.message || (isEditing ? "Rol actualizado" : "Rol creado"));
                    fetchRoles();
                } else {
                    const data = await res.json();
                    toast.error(data.message || "Error en la operación");
                }
            } catch (error) {
                toast.error("Error de conexión con el servidor");
            }
        }
    };

    const handleDelete = async (role) => {
        if (role.name_rol === "Administrador" || role.name_rol === "Oficial") {
            return toast.error("Los roles base del sistema no pueden ser eliminados");
        }

        const result = await Swal.fire({
            title: '¿Eliminar este rol?',
            text: `Esta acción no se puede deshacer y podría afectar a los usuarios asignados a "${role.name_rol}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444', // Rojo para eliminar
            cancelButtonColor: '#1B263B',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/roles/${role.id}`, { method: "DELETE" });
                if (res?.ok) {
                    const data = await res.json();
                    toast.success(data.message || "Rol eliminado");
                    fetchRoles();
                } else {
                    const data = await res.json();
                    toast.error(data.message || "No se pudo eliminar el rol");
                }
            } catch (error) {
                toast.error("Error al intentar eliminar el rol");
            }
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <div className="spinner-border text-info" role="status"></div>
        </div>
    );

    return (
        <div className="management-page-container">
            <Toaster richColors position="top-right" />
            <div className="container mt-4">
                <div className="card management-card-unified shadow-lg">
                    <div className="management-card-header d-flex justify-content-between align-items-center">
                        <div className="text-start">
                            <h2 className="management-title">Gestión de Roles</h2>
                            <p className="management-subtitle">Define los niveles de acceso al sistema</p>
                        </div>
                        <button
                            className="btn-action btn-activate"
                            onClick={() => handleOpenRoleModal()}
                        >
                            <i className="fas fa-plus-circle me-2"></i>Nuevo Rol
                        </button>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table align-middle table-sigssep mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ width: '80px' }}>ID</th>
                                        <th>Nombre del Rol</th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.length > 0 ? roles.map((role) => (
                                        <tr key={role.id}>
                                            <td className="text-muted small">#{role.id}</td>
                                            <td>
                                                <span className="fw-semibold user-name-text">
                                                    {role.name_rol}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    className="btn-toggle-status activate me-2"
                                                    disabled={role.name_rol === "Administrador"}
                                                    onClick={() => handleOpenRoleModal(role)}
                                                >
                                                    <i className="fas fa-edit me-1"></i> Editar
                                                </button>
                                                <button
                                                    className="btn-toggle-status deactivate"
                                                    disabled={role.name_rol === "Administrador" || role.name_rol === "Oficial"}
                                                    onClick={() => handleDelete(role)}
                                                >
                                                    <i className="fas fa-trash-alt me-1"></i> Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" className="text-center p-5 text-muted">
                                                No se encontraron roles registrados.
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

export default RoleManagement;