import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import "../styles/userManagement.css";

const urlBase = import.meta.env.VITE_BACKEND_URL;

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        // 1. Obtenemos el token JUSTO ANTES de la petición
        const activeToken = localStorage.getItem("access_token");

        if (!activeToken) {
            toast.error("No se encontró una sesión válida. Por favor, inicia sesión.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${urlBase}/manager/users`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${activeToken}`,
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();

            if (response.ok) {
                setUsers(data);
            } else {
                // Si el error es 401, el token puede ser viejo o inválido
                if (response.status === 401) {
                    toast.error("Sesión expirada o no autorizada.");
                } else {
                    toast.error(data.message || "Error al obtener usuarios");
                }
            }
        } catch (error) {
            console.error("Error en la petición:", error);
            toast.error("Error de conexión con el servidor");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleToggleStatus = async (userId) => {
        if (!userId) {
            console.error("¡Cuidado amiguito! El ID llegó vacío (undefined)");
            toast.error("Error: No se pudo identificar al usuario.");
            return;
        }
        // 2. Aquí también pedimos el token actualizado
        const activeToken = localStorage.getItem("access_token");

        try {
            const response = await fetch(`${urlBase}/manager/users/${userId}/status`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${activeToken}`,
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message);
                fetchUsers(); // Recargamos la lista
            } else {
                toast.error(data.message || "No se pudo cambiar el estado");
            }
        } catch (error) {
            toast.error("Error de red al intentar cambiar el estado");
        }
    };

    if (loading) return <div className="text-center mt-5">Cargando usuarios de SIGSSEP...</div>;

    return (
        <div className="management-page-container">
            <Toaster richColors position="top-right" />

            <div className="container mt-4">
                <div className="card management-card-unified">
                    {/* Cabecera sólida como en el Login */}
                    <div className="management-card-header">
                        <h2 className="management-title">Gestión de Usuarios</h2>
                        <p className="management-subtitle">Administra los accesos y roles del personal de SIGSSEP</p>
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
                                    {users.length > 0 ? (
                                        users.map((user, index) => (
                                            <tr key={user.id_user || index}>
                                                <td className="fw-semibold">{user.name} {user.lastname}</td>
                                                <td>{user.email}</td>
                                                <td>
                                                    <span className="badge role-badge">
                                                        {user.rol?.name_rol || 'Oficial'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${user.is_active ? 'active' : 'pending'}`}>
                                                        {user.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        className={`btn-action ${user.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                                                        onClick={() => handleToggleStatus(user.id_user || user.id)}
                                                    >
                                                        {user.is_active ? "Desactivar" : "Activar"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-4">No hay usuarios registrados.</td>
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

export default UserManagement;