import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
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
            toast.error("Error al cargar datos de SIGSSEP");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleChangeRole = async (userId, roleId, roleName) => {
        const result = await Swal.fire({
            title: '¿Confirmar cambio de rol?',
            text: `Asignar rol "${roleName}" al usuario.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#008f39', // Emerald Green para éxito
            cancelButtonColor: '#1B263B',  // Oxford Grey para gestión
            confirmButtonText: 'Sí, cambiar',
            background: '#1B263B', color: '#ffffff'
        });

        if (result.isConfirmed) {
            const res = await apiFetch(`/manager/users/${userId}/role`, {
                method: "PATCH",
                body: JSON.stringify({ rol_id: roleId })
            });

            if (res) {
                const data = await res.json();
                if (res.ok) {
                    toast.success(data.message || "Rol actualizado correctamente");
                    fetchData();
                } else {
                    // Si el backend dice que no (ej: el usuario es el Administrador raíz)
                    toast.error(data.message || "No se pudo cambiar el rol");
                    fetchData(); // Refrescamos para que el select vuelva a la realidad
                }
            }
        } else {
            fetchData(); // Si cancela, revertimos el cambio visual en el select
        }
    };

    const handleToggleStatus = async (userId) => {
        try {
            const res = await apiFetch(`/manager/users/${userId}/status`, { method: "PATCH" });
            if (res) {
                const data = await res.json();
                if (res.ok) {
                    toast.success(data.message || "Estado actualizado");
                    fetchData();
                } else {
                    // Aquí es donde aparecerá el mensaje: "No puedes desactivar al Administrador principal"
                    toast.error(data.message || "Error al cambiar el estado");
                }
            }
        } catch (error) {
            toast.error("Error de conexión con el servidor");
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
                <div className="card management-card-unified">
                    <div className="management-card-header">
                        <h2 className="management-title">Gestión de Usuarios</h2>
                        <p className="management-subtitle">Panel de control de acceso profesional</p>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table align-middle custom-table mb-0">
                                <thead>
                                    <tr>
                                        <th>Nombre Completo</th>
                                        <th>Email</th>
                                        <th>Rol</th>
                                        <th>Estado</th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? users.map((user) => {
                                        // Definimos quién es el Administrador raíz para bloquearlo
                                        // Usamos el email y opcionalmente el rol que trae el objeto user
                                        const isRootAdmin = user.email === "sigssep@gmail.com" || user.rol?.name_rol === "Administrador";

                                        return (
                                            <tr key={user.id}>
                                                <td className="fw-semibold">{user.name} {user.lastname}</td>
                                                <td>{user.email}</td>
                                                <td>
                                                    <select
                                                        className="form-select login-input py-1"
                                                        value={user.rol_id || ""}
                                                        // BLOQUEO: Si es administrador, no se puede cambiar el rol
                                                        disabled={isRootAdmin}
                                                        style={isRootAdmin ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
                                                        onChange={(e) => handleChangeRole(user.id, e.target.value, roles.find(r => r.id == e.target.value)?.name_rol)}
                                                    >
                                                        {roles.map(role => (
                                                            <option key={role.id} value={role.id}>{role.name_rol}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${user.is_active ? 'active' : 'pending'}`}>
                                                        {user.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        className={`btn-action ${user.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                                                        // BLOQUEO: Si es administrador, no se puede desactivar
                                                        disabled={isRootAdmin}
                                                        style={isRootAdmin ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                                        onClick={() => handleToggleStatus(user.id)}
                                                    >
                                                        {user.is_active ? "Desactivar" : "Activar"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan="5" className="text-center p-4">No hay personal registrado en el sistema.</td></tr>
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