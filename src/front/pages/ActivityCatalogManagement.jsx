import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/auth.css";
import "../styles/roleManagement.css";
import Pagination from "../components/Pagination"

const ActivityCatalogManagement = () => {
    const [activities, setActivities] = useState([]);
    const [competences, setCompetences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedCompetence, setSelectedCompetence] = useState("");

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            // Construimos la URL con filtros
            let url = `/activity-catalog?page=${page}`;
            if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
            if (selectedCompetence) url += `&competence_id=${selectedCompetence}`;

            const [resAct, resComp] = await Promise.all([
                apiFetch(url),
                apiFetch("/competences")
            ]);

            if (resAct?.ok) {
                const data = await resAct.json();
                setActivities(data.items || []);
                setTotalPages(data.total_pages || 1);
                setCurrentPage(data.current_page || 1);
                setTotalItems(data.total_items || 0);
            }

            if (resComp?.ok) {
                setCompetences(await resComp.json());
            }
        } catch (error) {
            toast.error("Error al conectar con el servidor de catálogo");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        fetchData(currentPage);
    }, [currentPage]);

    useEffect(() => {
        if (currentPage === 1) {
            fetchData(1);
        } else {
            setCurrentPage(1);
        }
    }, [debouncedSearch, selectedCompetence]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handleOpenModal = async (activity = null) => {
        const isEditing = !!activity;

        const competenceOptions = competences.map(c =>
            `<option value="${c.id}" ${activity?.competence_id === c.id ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        const { value: formValues } = await Swal.fire({
            title: isEditing ? 'Editar Actividad Sugerida' : 'Nueva Actividad Sugerida',
            html: `
                <div class="role-icon-container ${isEditing ? 'edit-mode' : 'create-mode'}" style="background-color: #334155; color: white;">
                    <i class="fas fa-tasks"></i>
                </div>
                <div style="margin-top: 15px; text-align: left;">
                    <label class="swal2-input-label">Descripción de la Actividad</label>
                    <input id="swal-description" class="swal2-input" placeholder="Ej. Entrega de kits escolares" value="${isEditing ? activity.description : ''}">
                    
                    <label class="swal2-input-label">Asociar a Competencia (Opcional)</label>
                    <select id="swal-competence" class="swal2-select" style="display: flex; width: 80%; margin: 10px auto;">
                        <option value="">General (Sin competencia específica)</option>
                        ${competenceOptions}
                    </select>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: isEditing ? 'Actualizar' : 'Registrar',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#1B263B',
            preConfirm: () => {
                const description = document.getElementById('swal-description').value;
                const competence_id = document.getElementById('swal-competence').value;
                if (!description) {
                    Swal.showValidationMessage('La descripción es obligatoria');
                    return false;
                }
                return { description, competence_id: competence_id || null };
            }
        });

        if (formValues) {
            const method = isEditing ? "PUT" : "POST";
            const endpoint = isEditing ? `/activity-catalog/${activity.id}` : "/activity-catalog";

            try {
                const res = await apiFetch(endpoint, {
                    method: method,
                    body: JSON.stringify(formValues)
                });

                if (res?.ok) {
                    toast.success(`Catálogo actualizado con éxito`);
                    fetchData(currentPage);
                } else {
                    const errorData = await res.json();
                    toast.error(errorData.msg || "Error en la operación");
                }
            } catch (err) {
                toast.error("Error de conexión");
            }
        }
    };

    const handleDelete = async (activity) => {
        const result = await Swal.fire({
            title: '¿Retirar del Catálogo?',
            text: `La actividad "${activity.description}" ya no aparecerá como opción para los oficiales.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#1B263B',
            confirmButtonText: 'Sí, eliminar',
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/activity-catalog/${activity.id}`, { method: "DELETE" });
                if (res?.ok) {
                    toast.success("Actividad eliminada del catálogo");
                    fetchData(currentPage);
                } else {
                    const error = await res.json();
                    toast.error(error.msg);
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
                    <div className="management-card-header d-flex justify-content-between align-items-center" style={{ backgroundColor: '#1B263B' }}>
                        <div>
                            <h2 className="management-title text-white">Catálogo de Actividades</h2>
                            <p className="management-subtitle text-light">Define las actividades estándar para que los oficiales seleccionen al planificar</p>
                            <div className="d-flex justify-content-between align-items-center mb-0 px-3">
                                <div className="badge bg-emerald-soft text-emerald px-3 py-3">
                                    <i className="fas fa-info-circle me-2 text-light"></i>
                                    Mostrando <span className="fw-bold text-light">{activities.length}</span> actividades de esta página
                                </div>
                                <div className="badge bg-oxford-soft text-oxford rounded-pill px-3 py-3 shadow-xs">
                                    <i className="fas fa-clipboard-list me-2"></i>
                                    Total: <span className="fw-bold">{totalItems}</span> actividades
                                </div>
                            </div>
                        </div>
                        <button className="btn-action btn-activate" onClick={() => handleOpenModal()} style={{ backgroundColor: '#10b981', border: 'none' }}>
                            <i className="fas fa-plus-circle me-2"></i>Nueva Actividad Sugerida
                        </button>
                    </div>
                    {/* BARRA DE FILTROS */}
                    <div className="p-3 bg-transparent border-bottom border-light">
                        <div className="row g-3">
                            <div className="col-md-6 mt-4">
                                <div className="input-group project-search-group shadow-sm rounded-pill overflow-hidden mt-2">
                                    <span className="input-group-text bg-white border-end-0 text-emerald"><i className="fas fa-search"></i></span>
                                    <input
                                        type="text"
                                        className="form-control border-start-0 ps-0"
                                        placeholder="Buscar por descripción..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="col-md-4 mt-1">
                                <label className="form-label small fw-bold text-muted d-block text-start">
                                    Filtrar por Competencia
                                </label>
                                <select
                                    className="form-select shadow-sm rounded-pill"
                                    value={selectedCompetence}
                                    onChange={(e) => setSelectedCompetence(e.target.value)}
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    <option value="" style={{ color: '#1B263B', backgroundColor: '#ffffff' }}>
                                        Todas las competencias (Incluye General)
                                    </option>

                                    {competences && competences.length > 0 ? (
                                        competences.map((c) => (
                                            <option
                                                key={c.id_competence || c.id} 
                                                value={c.id_competence || c.id} 
                                                style={{
                                                    color: '#1B263B',          
                                                    backgroundColor: '#ffffff'
                                                }}
                                            >
                                                {c.name_competence || c.name}
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled style={{ color: '#1B263B', backgroundColor: '#ffffff' }}>
                                            Cargando competencias...
                                        </option>
                                    )}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <button className="btn btn-outline-secondary w-100 rounded-pill" onClick={() => { setSearchTerm(""); setSelectedCompetence(""); }}>
                                    Limpiar
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table align-middle table-sigssep mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ width: '80px' }}>Código</th>
                                        <th>Actividad Sugerida</th>
                                        <th>Competencia Relacionada</th>
                                        <th className="text-center" style={{ width: '250px' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="3" className="text-center p-5">
                                                <div className="spinner-border text-emerald"></div>
                                            </td>
                                        </tr>
                                    ) : activities.length > 0 ? activities.map((act) => (
                                        <tr key={act.id}>
                                            <td className="text-muted small font-monospace">ACT-{act.id}</td>
                                            <td>
                                                <div className="fw-bold text-oxford">{act.description}</div>
                                            </td>
                                            <td>
                                                <span className={`badge ${act.competence_id ? 'bg-emerald' : 'bg-secondary'}`}>
                                                    {act.competence_name}
                                                </span>
                                            </td>
                                            <td className="text-end" style={{ paddingRight: '20px' }}>
                                                <button className="btn-toggle-status activate me-2" onClick={() => handleOpenModal(act)}>
                                                    <i className="fas fa-edit"></i> Editar
                                                </button>
                                                <button className="btn-toggle-status deactivate" onClick={() => handleDelete(act)}>
                                                    <i className="fas fa-trash-alt"></i> Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="text-center p-5 text-muted">
                                                <i className="fas fa-clipboard-list fa-3x mb-3 d-block opacity-25"></i>
                                                No hay actividades sugeridas en el catálogo.
                                            </td>
                                        </tr>
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

export default ActivityCatalogManagement;