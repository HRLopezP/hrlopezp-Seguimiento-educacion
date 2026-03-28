import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/auth.css";
import "../styles/userManagement.css";
import Pagination from "../components/Pagination"

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [allCompetences, setAllCompetences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchData = async (page = 1) => {
        try {
            setLoading(true);
            const [usersRes, rolesRes, compRes] = await Promise.all([
                apiFetch(`/manager/users?page=${page}`),
                apiFetch("/roles"),
                apiFetch("/competences")
            ]);

            if (!usersRes || !rolesRes || !compRes) return;

            const usersData = await usersRes.json();
            const rolesData = await rolesRes.json();
            const compData = await compRes.json();

            setUsers(usersData.items || []);
            setTotalPages(usersData.total_pages || 1);
            setCurrentPage(usersData.current_page || 1);

            setRoles(rolesData);
            setAllCompetences(compData);
        } catch (error) {
            console.error("Error detallado:", error);
            toast.error("Error al cargar datos del sistema");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage);
    }, [currentPage]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handleChangeRole = async (userId, roleId, roleName) => {
        const result = await Swal.fire({
            title: '¿Confirmar cambio?',
            text: `Asignar rol "${roleName}" al usuario.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#1B263B',
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
                toast.success("Rol actualizado correctamente");
                fetchData(currentPage);
            } else {
                toast.error("Error al cambiar rol");
                fetchData(currentPage);
            }
        } else {
            fetchData(currentPage);
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        const action = currentStatus ? "suspender" : "reactivar";
        const result = await Swal.fire({
            title: `¿Deseas ${action} al usuario?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#2D6A4F',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/manager/users/${userId}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ is_active: !currentStatus })
                });
                if (res.ok) {
                    toast.success(`Usuario ${currentStatus ? 'suspendido' : 'activado'} con éxito`);
                    fetchData(currentPage); 
                }
            } catch (error) {
                toast.error("Error al cambiar el estado del usuario");
            }
        }
    };

    const openCompetenceModal = async (user) => {
        if (!allCompetences || allCompetences.length === 0) {
            toast.error("No hay competencias cargadas en el sistema");
            return;
        }

        const competenceHtml = allCompetences.map(comp => {
            const isSelected = user.competences?.some(c => c.id === comp.id) || false;
            return `
            <div class="swal-comp-item">
                <input type="checkbox" id="comp-${comp.id}" class="comp-checkbox" 
                    value="${comp.id}" ${isSelected ? 'checked' : ''}>
                <label for="comp-${comp.id}" class="comp-label">
                    <i class="fas fa-check-circle check-icon"></i>
                    ${comp.name}
                </label>
            </div>
            `;
        }).join('');

        const { value: selectedIds } = await Swal.fire({
            title: `<span style="color: #ffffff">Competencias: ${user.name}</span>`,
            html: `
                <div class="swal-comp-container">
                    <p style="color: var(--text-primary); font-size: 0.9rem;">Seleccione las áreas de acceso para este oficial:</p>
                    <div class="swal-comp-grid">
                        ${competenceHtml}
                    </div>
                </div>
            `,
            background: 'var(--card-bg)',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#1B263B',
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            customClass: {
                title: 'management-card-header w-100 m-0 p-3 fs-5',
                popup: 'p-0 rounded-4 overflow-hidden'
            },
            preConfirm: () => {
                const checked = document.querySelectorAll('.comp-checkbox:checked');
                return Array.from(checked).map(cb => parseInt(cb.value));
            }
        });

        if (selectedIds) {
            try {
                const res = await apiFetch(`/user/${user.id}/competences`, {
                    method: "PUT",
                    body: JSON.stringify({ competence_ids: selectedIds })
                });

                if (res?.ok) {
                    toast.success("Permisos actualizados correctamente");
                    fetchData(currentPage);
                } else {
                    toast.error("No se pudieron actualizar las competencias");
                }
            } catch (error) {
                toast.error("Error de conexión");
            }
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
            confirmButtonColor: '#ef4444',
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
                    fetchData(currentPage);
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
                        <span className="badge bg-emerald-soft text-emerald px-3 py-2">
                            Mostrando {users.length} usuarios de esta página
                        </span>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive sigssep-table-container">
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
                                    {loading ? (
                                        <tr><td colSpan="5" className="text-center p-5"><div className="spinner-border text-emerald"></div></td></tr>
                                    ) : users.length > 0 ? users.map((user) => {
                                        const isRootAdmin = user.email === "sigssep@gmail.com" || user.rol_name === "Administrador";
                                        return (
                                            <tr key={user.id} className={isRootAdmin ? "row-root-admin" : ""}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="user-avatar-mini me-3">
                                                            {user.name.charAt(0)}{user.lastname.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <span className="user-name-text d-block">{user.name} {user.lastname}</span>
                                                            <div className="d-flex flex-wrap gap-1 mt-1">
                                                                {user.competences?.map(c => (
                                                                    <span key={c.id} className="badge bg-primary text-dark" style={{ fontSize: '0.65rem' }}>
                                                                        {c.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
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
                                                <td className="text-start d-flex align-items-center ps-4">
                                                    {!isRootAdmin && (
                                                        <button
                                                            className="btn-competence-badge me-3"
                                                            onClick={() => openCompetenceModal(user)}
                                                        >
                                                            <i className="fas fa-shield-alt me-1"></i>
                                                            <span className="btn-text">Permisos</span>
                                                        </button>
                                                    )}

                                                    <button
                                                        className={`btn-toggle-status ${user.is_active ? 'deactivate' : 'activate'}`}
                                                        disabled={isRootAdmin}
                                                        onClick={() => handleToggleStatus(user.id)}
                                                    >
                                                        <i className={`fas ${user.is_active ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                                                        {user.is_active ? "Suspender" : "Reactivar"}
                                                    </button>
                                                    <button
                                                        className="btn-delete-user ms-3"
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

export default UserManagement;