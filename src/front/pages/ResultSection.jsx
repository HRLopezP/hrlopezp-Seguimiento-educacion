import React from "react";
import Swal from 'sweetalert2';
import { toast } from "sonner";
import { apiFetch } from "../../utils/api";


const ResultSection = ({ type, theoryId, results, onRefresh }) => {

    // --- FUNCIONES DE LÓGICA (POST, PUT, DELETE) ---

    const handleAddResult = async () => {
        const { value: name } = await Swal.fire({
            title: `Nuevo ${type.toUpperCase()}`,
            input: 'text',
            inputLabel: `Nombre del ${type}`,
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });
        if (name) {
            const res = await apiFetch("/results", {
                method: "POST",
                body: JSON.stringify({ name, type, theory_id: theoryId })
            });
            if (res?.ok) { toast.success("Creado con éxito"); onRefresh(); }
        }
    };

    const handleEditResult = async (result) => {
        const { value: name } = await Swal.fire({
            title: `Editar ${type}`,
            input: 'text',
            inputValue: result.name,
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });
        if (name && name !== result.name) {
            const res = await apiFetch(`/results/${result.id}`, {
                method: "PUT",
                body: JSON.stringify({ name })
            });
            if (res?.ok) { toast.success("Actualizado"); onRefresh(); }
        }
    };

    const handleAddIndicator = async (resultId) => {
        const { value: formValues } = await Swal.fire({
            title: 'Nuevo Indicador',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            html: `
                <input id="swal-code" class="swal2-input custom-swal-input" placeholder="Código (ej. IND-01)">
                <input id="swal-name" class="swal2-input custom-swal-input" placeholder="Nombre del indicador">
                <textarea id="swal-desc" class="swal2-textarea custom-swal-input" placeholder="Descripción detallada"></textarea>
            `,
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            preConfirm: () => {
                const code = document.getElementById('swal-code').value;
                const name = document.getElementById('swal-name').value;
                const description = document.getElementById('swal-desc').value;
                if (!code || !name || !description) return Swal.showValidationMessage("Todos los campos son requeridos");
                return { code, name, description, result_id: resultId };
            }
        });
        if (formValues) {
            const res = await apiFetch("/indicators", {
                method: "POST",
                body: JSON.stringify(formValues)
            });
            if (res?.ok) { toast.success("Indicador creado"); onRefresh(); }
        }
    };

    const handleEditIndicator = async (ind) => {
        const { value: formValues } = await Swal.fire({
            title: 'Editar Indicador',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            html: `
                <input id="edit-code" class="swal2-input custom-swal-input" value="${ind.code}" placeholder="Código">
                <input id="edit-name" class="swal2-input custom-swal-input" value="${ind.name}" placeholder="Nombre">
                <textarea id="edit-desc" class="swal2-textarea custom-swal-input" placeholder="Descripción">${ind.description}</textarea>
            `,
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            preConfirm: () => {
                const code = document.getElementById('edit-code').value;
                const name = document.getElementById('edit-name').value;
                const description = document.getElementById('edit-desc').value;
                if (!code || !name || !description) return Swal.showValidationMessage("Todos los campos son requeridos");
                return { code, name, description };
            }
        });
        if (formValues) {
            const res = await apiFetch(`/indicators/${ind.id}`, {
                method: "PUT",
                body: JSON.stringify(formValues)
            });
            if (res?.ok) { toast.success("Actualizado"); onRefresh(); }
        }
    };

    const handleDelete = async (endpoint, id) => {
        const confirm = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonText: 'Cancelar'
        });
        if (confirm.isConfirmed) {
            const res = await apiFetch(`${endpoint}/${id}`, { method: "DELETE" });
            if (res?.ok) { toast.success("Eliminado correctamente"); onRefresh(); }
        }
    };

    // --- RENDERIZADO DEL COMPONENTE ---

    return (
        <div className="animate__animated animate__fadeIn">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="management-subtitle mb-0">Listado de {type}s</h4>
                <button className="btn btn-add-theory" onClick={handleAddResult}>
                    <i className="fas fa-plus me-2"></i> Nuevo {type}
                </button>
            </div>

            {results.map(r => (
                <div key={r.id} className="result-card mb-4">
                    {/* CABECERA DEL RESULTADO (OUTCOME/OUTPUT) */}
                    <div className="result-card-header d-flex justify-content-between align-items-center">
                        <span><i className="fas fa-chevron-right text-emerald me-2"></i> {r.name}</span>
                        <div>
                            <button className="btn btn-sm text-info me-2" onClick={() => handleEditResult(r)}>
                                <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-sm text-danger" onClick={() => handleDelete('/results', r.id)}>
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>

                    {/* TABLA DE INDICADORES */}
                    <div className="p-3">
                        <table className="table table-sm table-sigssep">
                            <thead>
                                <tr>
                                    <th style={{ width: '150px' }}>CÓDIGO</th>
                                    <th style={{ width: '200px' }}>NOMBRE</th>
                                    <th>DESCRIPCIÓN</th>
                                    <th className="text-end">ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {r.indicators && r.indicators.length > 0 ? (
                                    r.indicators.map(ind => (
                                        <tr key={ind.id}>
                                            <td className="fw-bold text-emerald">{ind.code}</td>
                                            <td className="fw-semibold">{ind.name}</td>
                                            <td>{ind.description}</td>
                                            <td className="text-end">
                                                <button className="btn btn-link text-info btn-sm me-2" onClick={() => handleEditIndicator(ind)}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn btn-link text-danger btn-sm" onClick={() => handleDelete('/indicators', ind.id)}>
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" className="text-center text-muted small py-3">No hay indicadores registrados</td></tr>
                                )}
                                {/* BOTÓN PARA AÑADIR INDICADOR */}
                                <tr>
                                    <td colSpan="3" className="text-center p-0">
                                        <button
                                            className="btn btn-link text-emerald btn-sm w-100 py-2"
                                            onClick={() => handleAddIndicator(r.id)}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <i className="fas fa-plus-circle me-1"></i> Añadir Indicador
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ResultSection;