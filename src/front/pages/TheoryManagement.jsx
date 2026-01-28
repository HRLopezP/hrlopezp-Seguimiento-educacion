import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/auth.css";
import "../styles/roleManagement.css";
import "../styles/theoryManagement.css";

const TheoryManagement = () => {
    const [theories, setTheories] = useState([]);
    const [competences, setCompetences] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [resTheories, resComps] = await Promise.all([
                apiFetch("/theories"),
                apiFetch("/competences")
            ]);

            if (resTheories?.ok && resComps?.ok) {
                const dataTheories = await resTheories.json();
                const dataComps = await resComps.json();
                setTheories(dataTheories);
                setCompetences(dataComps);
            }
        } catch (error) {
            toast.error("Error al cargar los datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // 2. Mejoramos el modal para recibir una competencia por defecto
    const handleOpenModal = async (theory = null, defaultCompId = null) => {
        const isEditing = !!theory;
        const initialCompId = isEditing ? theory.competence_id : (defaultCompId || "");

        const { value: formValues } = await Swal.fire({
            title: isEditing ? 'Editar Teoría' : 'Nueva Teoría de Cambio',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            html: `
    <div class="mt-3 text-start">
        <label class="form-label management-subtitle">Nombre de la Teoría</label>
        <input id="swal-input-name" class="swal2-input custom-swal-input" 
               placeholder="Ej. Fortalecimiento institucional" 
               value="${isEditing ? theory.name : ''}">
        
        <label class="form-label management-subtitle mt-3">Competencia Asociada</label>
        <select id="swal-input-comp" class="swal2-select custom-swal-input">
            <option value="" disabled ${!initialCompId ? 'selected' : ''}>Seleccione una competencia...</option>
            ${competences.map(c => `
                <option value="${c.id}" ${initialCompId == c.id ? 'selected' : ''} style="color: black;">
                    ${c.name}
                </option>
            `).join('')}
        </select>
    </div>
`,
            showCancelButton: true,
            confirmButtonText: isEditing ? 'Actualizar' : 'Guardar',
            confirmButtonColor: '#10b981', // Emerald Green para éxito
            preConfirm: () => {
                const name = document.getElementById('swal-input-name').value;
                const competence_id = document.getElementById('swal-input-comp').value;
                if (!name || !competence_id) {
                    Swal.showValidationMessage('Todos los campos son obligatorios');
                }
                return { name, competence_id };
            }
        });

        if (formValues) {
            try {
                const method = isEditing ? "PUT" : "POST";
                const endpoint = isEditing ? `/theories/${theory.id}` : "/theories";
                const res = await apiFetch(endpoint, {
                    method: method,
                    body: JSON.stringify(formValues)
                });

                if (res?.ok) {
                    toast.success("Operación exitosa");
                    fetchData(); // 3. Esto reubica automáticamente la teoría
                }
            } catch (error) {
                toast.error("Error de conexión");
            }
        }
    };

    const handleDelete = async (theory) => {
        const result = await Swal.fire({
            title: '¿Eliminar Teoría?',
            text: `Se eliminará "${theory.name}"`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            const res = await apiFetch(`/theories/${theory.id}`, { method: "DELETE" });
            if (res?.ok) {
                toast.success("Eliminado");
                fetchData();
            }
        }
    };

    if (loading) return <div className="spinner-border text-emerald m-5"></div>;

    return (
        <div className="management-page-container theory-page-wrapper p-4">
            <Toaster richColors />
            <div className="container">
                <div className="mb-4">
                    <h2 className="management-title">Gestión de Teorías</h2>
                    <p className="management-subtitle">Estructura jerárquica por competencias</p>
                </div>

                {competences.map(comp => {
                    const filteredTheories = theories.filter(t => t.competence_id === comp.id);

                    return (
                        // CAMBIO: Usamos theory-section-card en lugar de bg-dark
                        <div key={comp.id} className="theory-section-card mb-5">

                            {/* CAMBIO: Header con clase personalizada */}
                            <div className="theory-section-header py-2">
                                <h5 className="mb-0">
                                    <i className="fas fa-layer-group me-2 text-emerald"></i>
                                    Competencia: {comp.name}
                                </h5>
                                <button
                                    className="btn btn-sm btn-add-theory"
                                    onClick={() => handleOpenModal(null, comp.id)}
                                >
                                    <i className="fas fa-plus me-1"></i> Agregar a {comp.name}
                                </button>
                            </div>

                            <div className="card-body p-0">
                                {/* CAMBIO: Quitamos table-light de thead y usamos theory-table */}
                                <table className="table table-sigssep theory-table mb-0">
                                    <thead>
                                        <tr>
                                            <th className="ps-4" style={{ width: '100px' }}>ID</th>
                                            <th>TEORÍA DE CAMBIO</th>
                                            <th className="text-end pe-4">ACCIONES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTheories.length > 0 ? (
                                            filteredTheories.map(t => (
                                                <tr key={t.id} className="theory-row">
                                                    {/* CAMBIO: Usamos text-primary con opacidad para el ID */}
                                                    <td className="ps-4 small" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                                                        #{t.id}
                                                    </td>
                                                    <td className="fw-bold">{t.name}</td>
                                                    <td className="text-end pe-4">
                                                        <button className="btn btn-sm btn-link text-info me-2" onClick={() => handleOpenModal(t)}>
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-link text-danger" onClick={() => handleDelete(t)}>
                                                            <i className="fas fa-trash-alt"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="text-center py-4" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>
                                                    No hay teorías registradas para esta competencia.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TheoryManagement;