import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/auth.css"; // Estilos base
import "../styles/userManagement.css";

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [usersRes, rolesRes] = await Promise.all([
                apiFetch("/manager/users"),
                apiFetch("/roles")
            ]);
            if (!usersRes || !rolesRes) return;
            const usersData = await usersRes.json();
            const rolesData = await rolesRes.json();
            setUsers(usersData);
            setRoles(rolesData);
        } catch (error) {
            toast.error("Error al cargar datos del sistema");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleChangeRole = async (userId, roleId, roleName) => {
        const result = await Swal.fire({
            title: '¿Confirmar cambio?',
            text: `Asignar rol "${roleName}" al usuario.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10b981', // Emerald
            cancelButtonColor: '#1B263B',  // Oxford
            confirmButtonText: 'Sí, cambiar',
            cancelButtonText: 'Cancelar',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            const res = await apiFetch(`/manager/users/${userId}/role`, {
                method: "PATCH",
                body: JSON.stringify({ rol_id: roleId })
            });
            if (res?.ok) {
                toast.success("Rol actualizado");
                fetchData();
            } else {
                toast.error("Error al cambiar rol");
                fetchData();
            }
        } else {
            fetchData();
        }
    };

    const handleToggleStatus = async (userId) => {
        try {
            const res = await apiFetch(`/manager/users/${userId}/status`, { method: "PATCH" });
            if (res?.ok) {
                toast.success("Estado actualizado");
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.message || "Error de permisos");
            }
        } catch (error) {
            toast.error("Error de conexión");
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <div className="spinner-border text-emerald" role="status"></div>
        </div>
    );


    const handleDeleteUser = async (userId, userName) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Vas a eliminar permanentemente a ${userName}. Esta acción no se puede deshacer.`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#ef4444', // Rojo intenso
            cancelButtonColor: '#1B263B',
            confirmButtonText: 'Sí, eliminar ahora',
            cancelButtonText: 'Cancelar',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/manager/users/${userId}`, { method: "DELETE" });
                if (res?.ok) {
                    toast.success("Usuario eliminado correctamente");
                    fetchData(); // Refrescamos la lista
                } else {
                    const data = await res.json();
                    toast.error(data.message || "No se pudo eliminar");
                }
            } catch (error) {
                toast.error("Error de conexión al intentar eliminar");
            }
        }
    };

    return (
        <div className="management-page-container">
            <Toaster richColors position="top-right" />
            <div className="container mt-4">
                <div className="card management-card-unified shadow-lg">
                    <div className="management-card-header">
                        <h2 className="management-title">Gestión de Usuarios</h2>
                        <p className="management-subtitle">Panel de control de acceso institucional</p>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive sigssep-table-container">
                            {/* Usaremos la clase table-sigssep que es la más robusta de tus archivos */}
                            <table className="table align-middle table-sigssep mb-0">
                                <thead>
                                    <tr>
                                        <th>Personal</th>
                                        <th>Contacto</th>
                                        <th>Privilegios</th>
                                        <th>Estado</th>
                                        <th className="text-start ps-5">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? users.map((user) => {
                                        const isRootAdmin = user.email === "sigssep@gmail.com" || user.rol_name === "Administrador";
                                        return (
                                            <tr key={user.id} className={isRootAdmin ? "row-root-admin" : ""}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="user-avatar-mini me-3">
                                                            {user.name.charAt(0)}{user.lastname.charAt(0)}
                                                        </div>
                                                        <span className="user-name-text">{user.name} {user.lastname}</span>
                                                    </div>
                                                </td>
                                                <td className="user-email-text">{user.email}</td>
                                                <td>
                                                    <select
                                                        className="form-select select-role-custom"
                                                        value={user.rol_id || ""}
                                                        disabled={isRootAdmin}
                                                        onChange={(e) => handleChangeRole(user.id, e.target.value, roles.find(r => r.id == e.target.value)?.name_rol)}
                                                    >
                                                        {roles.map(role => (
                                                            <option key={role.id} value={role.id}>{role.name_rol}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    <span className={`badge-status ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                                                        {user.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="text-start d-flex justify-content-between ps-4">
                                                    <button
                                                        className={`btn-toggle-status ${user.is_active ? 'deactivate' : 'activate'}`}
                                                        disabled={isRootAdmin}
                                                        onClick={() => handleToggleStatus(user.id)}
                                                    >
                                                        <i className={`fas ${user.is_active ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                                                        {user.is_active ? "Suspender" : "Reactivar"}
                                                    </button>
                                                    {/* NUEVO: Botón de Eliminar */}
                                                    <button
                                                        className="btn-delete-user ms-4"
                                                        disabled={isRootAdmin}
                                                        onClick={() => handleDeleteUser(user.id, user.name)}
                                                        title="Eliminar Usuario"
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan="5" className="text-center p-5 text-muted">No se encontraron registros.</td></tr>
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

export default UserManagement;