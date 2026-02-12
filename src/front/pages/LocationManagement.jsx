import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/roleManagement.css";

const LocationManagement = () => {
    const [provinces, setProvinces] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState(null);
    const [municipalities, setMunicipalities] = useState([]);
    const [expandedMuni, setExpandedMuni] = useState(null); // Controla qué municipio muestra sus parroquias
    const [parishes, setParishes] = useState([]);

    // --- CARGA DE DATOS ---
    const loadProvinces = async () => {
        const res = await apiFetch("/provinces");
        if (res?.ok) setProvinces(await res.json());
    };

    const loadMunicipalities = async (provinceId) => {
        const res = await apiFetch(`/provinces/${provinceId}/municipalities`);
        if (res?.ok) {
            setMunicipalities(await res.json());
            setExpandedMuni(null); // Reset al cambiar de provincia
        }
    };

    const loadParishes = async (muniId) => {
        if (expandedMuni === muniId) {
            setExpandedMuni(null);
            return;
        }
        const res = await apiFetch(`/municipalities/${muniId}/parishes`);
        if (res?.ok) {
            setParishes(await res.json());
            setExpandedMuni(muniId);
        }
    };

    useEffect(() => { loadProvinces(); }, []);

    // --- LOGICA DE CREACIÓN (SWEETALERT2) ---
    const handleAddParish = async (muniId) => {
        const { value: name } = await Swal.fire({
            title: 'Nueva Parroquia',
            input: 'text',
            inputPlaceholder: 'Nombre de la parroquia...',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            confirmButtonColor: '#2D6A4F',
            customClass: { popup: 'role-modal-custom-swal', input: 'role-modal-input' }
        });

        if (name) {
            const res = await apiFetch("/parishes", {
                method: "POST",
                body: JSON.stringify({ name, municipality_id: muniId })
            });
            if (res?.ok) {
                toast.success("Parroquia registrada");
                loadParishes(muniId); // Recargar la lista anidada
            }
        }
    };

    const handleEditProvince = async (province) => {
        const { value: newName } = await Swal.fire({
            title: 'Editar Provincia',
            input: 'text',
            inputValue: province.name,
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            confirmButtonColor: '#3a86ff',
            showCancelButton: true,
            customClass: { popup: 'role-modal-custom-swal', input: 'role-modal-input' }
        });

        if (newName && newName !== province.name) {
            const res = await apiFetch(`/provinces/${province.id}`, {
                method: "PUT",
                body: JSON.stringify({ name: newName })
            });
            if (res?.ok) {
                toast.success("Provincia actualizada");
                loadProvinces();
                // Si la provincia editada era la seleccionada, actualizamos el estado local
                if (selectedProvince?.id === province.id) {
                    setSelectedProvince({ ...province, name: newName });
                }
            }
        }
    };

    const handleEditMunicipality = async (muni) => {
        const { value: newName } = await Swal.fire({
            title: 'Editar Municipio',
            input: 'text',
            inputValue: muni.name,
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            confirmButtonColor: 'var(--accent-color)', // Usando tu color esmeralda o azul
            customClass: {
                popup: 'role-modal-custom-swal',
                input: 'role-modal-input'
            },
            inputValidator: (value) => {
                if (!value) return '¡El nombre no puede estar vacío!';
            }
        });

        if (newName && newName !== muni.name) {
            try {
                const res = await apiFetch(`/municipalities/${muni.id}`, {
                    method: "PUT",
                    body: JSON.stringify({ name: newName })
                });

                if (res?.ok) {
                    toast.success("Municipio actualizado correctamente");
                    loadMunicipalities(selectedProvince.id); // Recargamos para ver el cambio
                } else {
                    toast.error("No se pudo actualizar el municipio");
                }
            } catch (error) {
                toast.error("Error de conexión");
            }
        }
    };

    const handleEditParish = async (parish, muniId) => {
        const { value: newName } = await Swal.fire({
            title: 'Editar Parroquia',
            input: 'text',
            inputValue: parish.name,
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            confirmButtonColor: '#10b981', // Emerald Green
            showCancelButton: true,
            cancelButtonColor: '#1B263B', // Oxford Grey
            customClass: { popup: 'role-modal-custom-swal', input: 'role-modal-input' }
        });

        if (newName && newName !== parish.name) {
            try {
                const res = await apiFetch(`/parishes/${parish.id}`, {
                    method: "PUT",
                    body: JSON.stringify({ name: newName })
                });
                if (res?.ok) {
                    toast.success("Parroquia actualizada");
                    loadParishes(muniId);
                }
            } catch (error) {
                toast.error("Error al actualizar");
            }
        }
    };

    // --- FUNCIÓN: ELIMINAR PROVINCIA (OPCIONAL) ---
    const handleDeleteProvince = async (province) => {
        const result = await Swal.fire({
            title: '¿Eliminar Provincia?',
            text: `Esto borrará "${province.name}", sus municipios y parroquias.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#1B263B',
            confirmButtonText: 'Sí, eliminar todo',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            const res = await apiFetch(`/provinces/${province.id}`, { method: "DELETE" });
            if (res?.ok) {
                toast.success("Provincia eliminada");
                setSelectedProvince(null);
                loadProvinces();
            }
        }
    };

    const handleAddMunicipality = async () => {
        const { value: name } = await Swal.fire({
            title: 'Registrar Municipio',
            html: `<p class="text-muted">Se añadirá a la provincia de <b>${selectedProvince.name}</b></p>`,
            input: 'text',
            inputPlaceholder: 'Nombre del municipio...',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            confirmButtonColor: '#10b981', // Tu Emerald Green
            cancelButtonColor: '#1B263B', // Tu Oxford Grey
            showCancelButton: true,
            confirmButtonText: 'Crear',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'role-modal-custom-swal', input: 'role-modal-input' }
        });

        if (name) {
            try {
                const res = await apiFetch("/municipalities", {
                    method: "POST",
                    body: JSON.stringify({
                        name: name,
                        province_id: selectedProvince.id
                    })
                });
                if (res?.ok) {
                    toast.success("Municipio creado con éxito");
                    loadMunicipalities(selectedProvince.id); // Refrescamos la lista
                }
            } catch (error) {
                toast.error("Error al conectar con el servidor");
            }
        }
    };

    // --- FUNCIÓN: ELIMINAR MUNICIPIO ---
    const handleDeleteMunicipality = async (muni) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará el municipio "${muni.name}" y todas sus parroquias asociadas.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444', // Rojo peligro
            cancelButtonColor: '#1B263B',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'No, cancelar',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/municipalities/${muni.id}`, { method: "DELETE" });
                if (res?.ok) {
                    toast.success("Municipio eliminado");
                    loadMunicipalities(selectedProvince.id);
                } else {
                    const errorData = await res.json();
                    toast.error(errorData.message || "Error al eliminar");
                }
            } catch (error) {
                toast.error("Error de conexión");
            }
        }
    };


    const handleDeleteParish = async (parish, muniId) => {
        const result = await Swal.fire({
            title: '¿Eliminar parroquia?',
            text: `Estás por eliminar "${parish.name}". Esta acción es irreversible.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#1B263B',
            confirmButtonText: 'Sí, borrar',
            cancelButtonText: 'Cancelar',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            try {
                const res = await apiFetch(`/parishes/${parish.id}`, { method: "DELETE" });

                if (res?.ok) {
                    toast.success("Parroquia eliminada");
                    // Recargamos solo las parroquias de este municipio específico
                    loadParishes(muniId);
                } else {
                    toast.error("No se pudo eliminar la parroquia");
                }
            } catch (error) {
                toast.error("Error de conexión con el servidor");
            }
        }
    };

    const handleAddProvince = async () => {
        const { value: name } = await Swal.fire({
            title: 'Nueva Provincia',
            input: 'text',
            inputPlaceholder: 'Nombre de la provincia...',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            confirmButtonColor: '#2D6A4F', // Emerald Green
            showCancelButton: true,
            customClass: { popup: 'role-modal-custom-swal', input: 'role-modal-input' }
        });

        if (name) {
            const res = await apiFetch("/provinces", {
                method: "POST",
                body: JSON.stringify({ name })
            });
            if (res?.ok) {
                toast.success("Provincia creada");
                loadProvinces(); // Recargar lista
            }
        }
    };

    return (
        <div className="management-page-container">
            <Toaster richColors position="top-right" />
            <div className="container mt-4">
                <div className="row g-4">
                    {/* COLUMNA IZQUIERDA: PROVINCIAS */}
                    <div className="col-md-5">
                        <div className="sigssep-table-container">
                            <div className="auth-header py-3 border-bottom border-success border-3">
                                <h5 className="m-0 fs-6">PROVINCIAS</h5>
                                <button
                                    className="btn btn-sm btn-primary mt-3 bg-opacity-10 text-white border-0"
                                    onClick={handleAddProvince}
                                    title="Nueva Provincia"
                                >
                                    <i className="fas fa-plus-circle"></i>
                                </button>
                            </div>
                            <div className="list-group list-group-flush">
                                {provinces.map(p => (
                                    <button
                                        key={p.id}
                                        className={`list-group-item list-group-item-action border-0 d-flex justify-content-between align-items-center ${selectedProvince?.id === p.id ? 'bg-oxford text-white' : 'bg-transparent text-primary'}`}
                                        onClick={() => { setSelectedProvince(p); loadMunicipalities(p.id); }}
                                    >
                                        {/* --- NUEVO BLOQUE: NOMBRE + EDITAR --- */}
                                        <div className="d-flex align-items-center">
                                            <span className="me-4 my-2">{p.name}</span>
                                            <span
                                                className="badge rounded-pill bg-light bg-opacity-10 p-1 px-2"
                                                style={{ cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditProvince(p);
                                                }}
                                            >
                                                <i className="fas fa-edit fa-xs text-success" style={{ fontSize: '0.7rem' }}></i>
                                            </span>
                                        </div>
                                        <i className={`fas fa-chevron-${selectedProvince?.id === p.id ? 'down' : 'right'} small opacity-50`}></i>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* COLUMNA DERECHA: MUNICIPIOS Y PARROQUIAS */}
                    <div className="col-md-7">
                        {selectedProvince ? (
                            <div className="sigssep-table-container animate__animated animate__fadeIn">
                                <div className="management-card-header d-flex justify-content-between align-items-center p-4">
                                    <div>
                                        <h3 className="management-title m-0">{selectedProvince.name}</h3>
                                        <p className="management-subtitle m-0">Municipios registrados</p>
                                    </div>
                                    <button
                                        className="btn-add-theory"
                                        onClick={() => handleAddMunicipality()}
                                    >
                                        <i className="fas fa-plus-circle me-2"></i> Nuevo Municipio
                                    </button>
                                </div>

                                <div className="p-3">
                                    {municipalities.map(m => (
                                        <div key={m.id} className="mb-3 border rounded overflow-hidden" style={{ borderColor: 'rgba(128,128,128,0.1)' }}>
                                            <div className="d-flex justify-content-between align-items-center p-3 bg-new-list">
                                                <div className="d-flex align-items-center px-3">
                                                    <span className="fw-bold text-primary me-2">{m.name}</span>
                                                    <button
                                                        className="btn btn-sm btn-outline-primary border-0 p-1"
                                                        style={{ fontSize: '0.65rem', opacity: 0.6 }}
                                                        onClick={() => handleEditMunicipality(m)}
                                                    >
                                                        <i className="fas fa-pen"></i>
                                                    </button>
                                                </div>

                                                <div>
                                                    <button className="btn-toggle-status activate me-2" onClick={() => loadParishes(m.id)}>
                                                        <i className={`fas fa-${expandedMuni === m.id ? 'eye-slash' : 'eye'} me-1`}></i>
                                                        {expandedMuni === m.id ? 'Cerrar' : 'Parroquias'}
                                                    </button>
                                                    <button className="btn-toggle-status deactivate" onClick={() => handleDeleteMunicipality(m)}>
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* SECCIÓN ANIDADA: PARROQUIAS */}
                                            {expandedMuni === m.id && (
                                                <div className="p-3 animate__animated animate__slideInDown" style={{ backgroundColor: 'var(--bg-color)' }}>
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <h6 className="m-0 opacity-75 small text-new fw-bold text-uppercase">Parroquias de {m.name}</h6>
                                                        <button className="btn btn-sm btn-outline-success border-0" onClick={() => handleAddParish(m.id)}>
                                                            <i className="fas fa-plus me-1"></i> Añadir
                                                        </button>
                                                    </div>
                                                    <div className="row g-2">
                                                        {parishes.map(pa => (
                                                            <div key={pa.id} className="col-md-4">
                                                                <div className="p-2 border border-success rounded d-flex justify-content-between align-items-center bg-new-list shadow-sm">
                                                                    <span className="small text-dark fw-medium text-new">{pa.name}</span>
                                                                    <div className="d-flex gap-2">
                                                                        {/* Botón Editar Parroquia */}
                                                                        <button
                                                                            className="btn btn-link text-primary p-0 border-0"
                                                                            onClick={() => handleEditParish(pa, m.id)}
                                                                        >
                                                                            <i className="fas fa-pen fa-xs" style={{ fontSize: '0.75rem' }}></i>
                                                                        </button>

                                                                        {/* Botón Eliminar Parroquia */}
                                                                        <button
                                                                            className="btn btn-link text-danger p-0 border-0"
                                                                            title="Eliminar Parroquia"
                                                                            onClick={() => handleDeleteParish(pa, m.id)}
                                                                        >
                                                                            <i className="fas fa-times-circle"></i>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {parishes.length === 0 && <p className="text-muted small table-sigssep text-center w-100">No hay parroquias registradas.</p>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-new p-5 opacity-25">
                                <i className="fas fa-map-marked-alt fa-5x mb-3"></i>
                                <h3>Selecciona una provincia para comenzar</h3>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationManagement;