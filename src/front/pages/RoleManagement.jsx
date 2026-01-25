import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/auth.css"; 
import "../styles/roleManagement.css";

const RoleManagement = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [roleName, setRoleName] = useState("");
    const [editingId, setEditingId] = useState(null);

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

    useEffect(() => { fetchRoles(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const method = editingId ? "PUT" : "POST";
        const endpoint = editingId ? `/roles/${editingId}` : "/roles";

        try {
            const res = await apiFetch(endpoint, {
                method: method,
                body: JSON.stringify({ name_rol: roleName })
            });

            if (res) {
                const data = await res.json();
                if (res.ok) {
                    toast.success(data.message);
                    setRoleName("");
                    setEditingId(null);
                    fetchRoles();
                } else {
                    toast.error(data.message || "Error en la operación");
                }
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado");
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
            confirmButtonColor: '#d33',
            cancelButtonColor: '#1B263B',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/roles/${role.id}`, { method: "DELETE" });
                if (res) {
                    const data = await res.json();
                    if (res.ok) {
                        toast.success(data.message);
                        fetchRoles();
                    } else {
                        toast.error(data.message);
                    }
                }
            } catch (error) {
                toast.error("Error al intentar eliminar el rol");
            }
        }
    };

    const startEdit = (role) => {
        if (role.name_rol === "Administrador") {
            return toast.warning("El rol Administrador es vital y no debe ser modificado.");
        }
        setEditingId(role.id);
        setRoleName(role.name_rol);
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
                <div className="card management-card-unified">
                    <div className="management-card-header d-flex justify-content-between align-items-center">
                        <div className="text-start">
                            <h2 className="management-title">Gestión de Roles</h2>
                            <p className="management-subtitle">Define los niveles de acceso al sistema</p>
                        </div>
                        <button
                            className="btn-action btn-activate"
                            data-bs-toggle="modal"
                            data-bs-target="#roleModal"
                            onClick={() => { setEditingId(null); setRoleName(""); }}
                        >
                            <i className="fas fa-plus-circle me-2"></i>Nuevo Rol
                        </button>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table align-middle table-sigssep mb-0">
                                <thead><tr><th style={{ width: '80px' }}>ID</th><th>Nombre del Rol</th><th className="text-center">Acciones</th></tr></thead>
                                <tbody>
                                    {roles.map((role) => (
                                        <tr key={role.id}>
                                            <td className="text-muted small">#{role.id}</td>
                                            <td><span className="fw-semibold user-name-text">{role.name_rol}</span></td>
                                            <td className="text-center">
                                                <button className="btn-toggle-status activate me-2" disabled={role.name_rol === "Administrador"} data-bs-toggle="modal" data-bs-target="#roleModal" onClick={() => startEdit(role)}>
                                                    <i className="fas fa-edit me-1"></i> Editar
                                                </button>
                                                <button className="btn-toggle-status deactivate" disabled={role.name_rol === "Administrador" || role.name_rol === "Oficial"} onClick={() => handleDelete(role)}>
                                                    <i className="fas fa-trash-alt me-1"></i> Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL PARA CREAR/EDITAR CON ICONOS */}
            <div className="modal fade" id="roleModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content role-modal-custom">
                        <div className="modal-header border-0">
                            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body text-center p-4">
                                <div className="role-icon-container mb-3">
                                    <i className={`fas ${editingId ? 'fa-key' : 'fa-shield-alt'} fa-3x`}></i>
                                </div>
                                <h4 className="mb-3">{editingId ? "Actualizar Rol" : "Nuevo Rol de Sistema"}</h4>
                                <div className="text-start">
                                    <label className="form-label opacity-75 small">NOMBRE DEL ROL</label>
                                    <input
                                        type="text"
                                        className="form-control login-input"
                                        placeholder="Ej. Auditor, Supervisor..."
                                        value={roleName}
                                        onChange={(e) => setRoleName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer border-0 justify-content-center pb-4">
                                <button type="button" className="btn btn-outline-light px-4" data-bs-dismiss="modal">Cancelar</button>
                                <button type="submit" className="btn btn-action btn-activate px-4" data-bs-dismiss="modal">
                                    {editingId ? "Guardar Cambios" : "Crear Rol"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoleManagement;