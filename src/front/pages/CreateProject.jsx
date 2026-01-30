import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import { apiFetch } from '../../utils/api';

const CreateProject = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [allCompetences, setAllCompetences] = useState([]);
    const [availableManagers, setAvailableManagers] = useState([]);
    const [tempCompetence, setTempCompetence] = useState({
        competence_id: '',
        manager_id: ''
    });

    // Estados para la carga de catálogos
    const [provinces, setProvinces] = useState([]);
    const [municipalities, setMunicipalities] = useState([]);
    const [tempLocation, setTempLocation] = useState({
        province_id: '',
        municipality_id: '',
        parish_id: '' // Agregado
    });
    const [parishes, setParishes] = useState([]);

    const [formData, setFormData] = useState({
        unique_code: '',
        name: '',
        donor: '',
        description: '',
        main_scope: '',
        start_date: '',
        end_date: '',
        status: 'En Progreso',
        total_beneficiaries: 0,
        male_beneficiaries: 0,
        female_beneficiaries: 0,
        locations: [], // Guardaremos objetos { province_id, municipality_id, province_name, muni_name }
        province_unique_targets: [],
        indicators: [],
        competences: [],
        theory_template_id: ''
    });


    useEffect(() => {
        const fetchCatalogos = async () => {
            const resComp = await apiFetch("/competences");
            if (resComp?.ok) setAllCompetences(await resComp.json());

            const resMan = await apiFetch("/users/managers");
            if (resMan?.ok) setAvailableManagers(await resMan.json());
        };
        fetchCatalogos();
    }, []);

    // Cargar provincias al montar
    useEffect(() => {
        const fetchProvinces = async () => {
            const res = await apiFetch("/provinces");
            if (res?.ok) setProvinces(await res.json());
        };
        fetchProvinces();
    }, []);

    // Cargar municipios cuando cambie la provincia seleccionada en el mini-form
    useEffect(() => {
        if (tempLocation.province_id) {
            const fetchMuni = async () => {
                const res = await apiFetch(`/provinces/${tempLocation.province_id}/municipalities`);
                if (res?.ok) setMunicipalities(await res.json());
            };
            fetchMuni();
        } else {
            setMunicipalities([]);
            setParishes([]);
        }
    }, [tempLocation.province_id]);

    useEffect(() => {
        if (tempLocation.municipality_id) {
            const fetchParish = async () => {
                const res = await apiFetch(`/municipalities/${tempLocation.municipality_id}/parishes`);
                if (res?.ok) setParishes(await res.json());
            };
            fetchParish();
        } else {
            setParishes([]);
        }
    }, [tempLocation.municipality_id]);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- LÓGICA DE UBICACIONES ---
    const addLocation = () => {
        const { province_id, municipality_id, parish_id } = tempLocation;
        if (!province_id || !municipality_id || !parish_id) return toast.warning("Faltan datos");

        const pName = provinces.find(p => p.id === parseInt(province_id))?.name;
        const mName = municipalities.find(m => m.id === parseInt(municipality_id))?.name;
        const paName = parishes.find(pa => pa.id === parseInt(parish_id))?.name;

        if (formData.locations.some(l => l.parish_id === parish_id)) {
            return toast.error("Esta parroquia ya está en la lista.");
        }

        setFormData(prev => {
            // 1. Agregamos la nueva ubicación con todos sus nombres
            const newLocation = {
                province_id, municipality_id, parish_id,
                province_name: pName, muni_name: mName, parish_name: paName
            };

            // 2. Verificamos si la provincia ya está en la lista de metas
            const alreadyHasProvince = prev.province_unique_targets.some(pt => pt.province_id === province_id);

            return {
                ...prev,
                locations: [...prev.locations, newLocation],
                province_unique_targets: alreadyHasProvince
                    ? prev.province_unique_targets
                    : [...prev.province_unique_targets, { province_id, total: 0, men: 0, women: 0, province_name: pName }]
            };
        });

        setTempLocation({ province_id: '', municipality_id: '', parish_id: '' });
    };

    const removeLocation = (parishId) => {
        setFormData(prev => {
            const updatedLocations = prev.locations.filter(l => l.parish_id !== parishId);

            // Buscamos qué provincias aún tienen al menos una parroquia registrada
            const remainingProvinceIds = [...new Set(updatedLocations.map(l => l.province_id))];

            // Filtramos las metas únicas para que solo queden las de las provincias restantes
            const updatedTargets = prev.province_unique_targets.filter(target =>
                remainingProvinceIds.includes(target.province_id)
            );

            return {
                ...prev,
                locations: updatedLocations,
                province_unique_targets: updatedTargets
            };
        });
    };

    const saveProject = async (isPartial = true) => {
        if (!formData.unique_code) {
            return toast.error("El Código Único es obligatorio amiguito.");
        }

        try {
            // Llamamos a tu utilidad apiFetch
            const response = await apiFetch("/projects", "POST", formData);

            if (response.ok) {
                toast.success(isPartial ? "Progreso guardado" : "¡Proyecto creado!");
                // IMPORTANTE: Verifica que esta ruta exista en tu App.js
                if (!isPartial) navigate('/manager/projects');
            } else {
                const errorData = await response.json();
                toast.error(errorData.msg || "Error al guardar");
            }
        } catch (error) {
            console.error("Error conectando al servidor:", error);
            toast.error("No se pudo conectar con el servidor");
        }
    };


    const handleProvinceTargetChange = (provinceId, field, value) => {
        setFormData(prev => ({
            ...prev,
            province_unique_targets: prev.province_unique_targets.map(pt =>
                pt.province_id === provinceId ? { ...pt, [field]: parseInt(value) || 0 } : pt
            )
        }));
    };


    const addCompetence = () => {
        const { competence_id, manager_id } = tempCompetence;
        if (!competence_id || !manager_id) return toast.warning("Selecciona competencia y gerente, amiguito");

        // Buscamos los nombres para mostrarlos en la UI (badges)
        const compName = allCompetences.find(c => c.id === parseInt(competence_id))?.name;
        const managerObj = availableManagers.find(m => m.id === parseInt(manager_id));
        const managerName = `${managerObj.name} ${managerObj.lastname}`;

        // Evitar duplicados
        if (formData.competences.some(c => c.competence_id === competence_id)) {
            return toast.error("Esta competencia ya fue asignada.");
        }

        setFormData(prev => ({
            ...prev,
            competences: [...prev.competences, {
                competence_id: parseInt(competence_id),
                manager_id: parseInt(manager_id),
                comp_name: compName,
                manager_name: managerName
            }]
        }));

        setTempCompetence({ competence_id: '', manager_id: '' });
    };

    const removeCompetence = (id) => {
        setFormData(prev => ({
            ...prev,
            competences: prev.competences.filter(c => c.competence_id !== id)
        }));
    };


    return (
        <div className="auth-page-container mt-5">
            <Toaster richColors />
            <div className="auth-card-unified shadow-lg" style={{ maxWidth: '850px' }}>

                {/* HEADER DINÁMICO */}
                <div className={`auth-card-header transition-all ${step === 1 ? 'bg-light text-dark' :
                    step === 2 ? 'bg-oxford text-white' : 'bg-emerald-soft text-white'
                    }`}>
                    <h2 className="mb-0">
                        {step === 1 && "📌 Paso 1: Información Básica"}
                        {step === 2 && "⚙️ Paso 2: Configuración y Territorio"}
                        {step === 3 && "✅ Paso 3: Revisión Final"}
                    </h2>
                </div>

                <div className="auth-card-body">
                    {/* STEPPER VISUAL */}
                    <div className="d-flex justify-content-center gap-4 mb-4">
                        {[1, 2, 3].map(num => (
                            <div key={num} className={`rounded-circle d-flex align-items-center justify-content-center transition-all ${step >= num ? 'bg-emerald text-white scale-110' : 'bg-secondary text-white opacity-50'
                                }`} style={{ width: '35px', height: '35px', fontWeight: 'bold' }}>
                                {num}
                            </div>
                        ))}
                    </div>

                    <form>
                        {step === 1 && (
                            <div className="fade-in-up">
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="auth-label">Código Único</label>
                                        <input type="text" name="unique_code" className="auth-input w-100" value={formData.unique_code} onChange={handleChange} placeholder="P-2026-001" />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="auth-label">Donante</label>
                                        <input type="text" name="donor" className="auth-input w-100" value={formData.donor} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="auth-label">Nombre del Proyecto</label>
                                    <input type="text" name="name" className="auth-input w-100" value={formData.name} onChange={handleChange} />
                                </div>
                                <div className="mb-3">
                                    <label className="auth-label">Descripción</label>
                                    <textarea name="description" className="auth-input w-100" rows="2" value={formData.description} onChange={handleChange}></textarea>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="fade-in-up">
                                <div className="mb-4">
                                    <label className="auth-label text-oxford">📍 Ubicación Detallada</label>
                                    <div className="row g-2 bg-light p-3 rounded border">
                                        <div className="col-md-4">
                                            <select className="form-select auth-input" value={tempLocation.province_id}
                                                onChange={(e) => setTempLocation({ province_id: e.target.value, municipality_id: '', parish_id: '' })}>
                                                <option value="">Provincia...</option>
                                                {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <select className="form-select auth-input" value={tempLocation.municipality_id} disabled={!tempLocation.province_id}
                                                onChange={(e) => setTempLocation({ ...tempLocation, municipality_id: e.target.value, parish_id: '' })}>
                                                <option value="">Municipio...</option>
                                                {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <select className="form-select auth-input" value={tempLocation.parish_id} disabled={!tempLocation.municipality_id}
                                                onChange={(e) => setTempLocation({ ...tempLocation, parish_id: e.target.value })}>
                                                <option value="">Parroquia...</option>
                                                {parishes.map(pa => <option key={pa.id} value={pa.id}>{pa.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-12 mt-2">
                                            <button type="button" className="btn btn-emerald w-100" onClick={addLocation}>
                                                <i className="fas fa-plus me-2"></i> Agregar a Cobertura
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lista de ubicaciones con el nuevo formato */}
                                    <div className="mt-3 d-flex flex-wrap gap-2">
                                        {formData.locations.map(loc => (
                                            <span key={loc.parish_id} className="badge bg-oxford p-2 d-flex align-items-center">
                                                <small className="opacity-75 me-1">{loc.muni_name} -</small> {loc.parish_name}
                                                <i className="fas fa-times ms-2 cursor-pointer text-danger" onClick={() => removeLocation(loc.parish_id)}></i>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="auth-label">Meta Principal</label>
                                    <textarea name="main_scope" className="auth-input w-100" rows="2" value={formData.main_scope} onChange={handleChange}></textarea>
                                </div>

                                {/* SECCIÓN DE COMPETENCIAS Y GERENTES */}
                                <div className="mt-4 p-3 border rounded bg-white shadow-sm fade-in-up">
                                    <label className="auth-label text-oxford">🏢 Estructura de Gestión (Competencias)</label>
                                    <p className="small text-muted">Asigna las áreas técnicas y sus responsables.</p>

                                    <div className="row g-2 bg-light p-2 rounded border">
                                        <div className="col-md-5">
                                            <select className="form-select auth-input" value={tempCompetence.competence_id}
                                                onChange={(e) => setTempCompetence({ ...tempCompetence, competence_id: e.target.value })}>
                                                <option value="">Seleccionar Competencia...</option>
                                                {allCompetences.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-5">
                                            <select className="form-select auth-input" value={tempCompetence.manager_id}
                                                onChange={(e) => setTempCompetence({ ...tempCompetence, manager_id: e.target.value })}>
                                                <option value="">Asignar Gerente...</option>
                                                {availableManagers.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name} {m.lastname}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-2">
                                            <button type="button" className="btn btn-oxford w-100 h-100" onClick={addCompetence}>
                                                <i className="fas fa-user-plus"></i>
                                            </button>
                                        </div>
                                    </div>

                                    {/* LISTADO DE COMPETENCIAS ASIGNADAS */}
                                    <div className="mt-3">
                                        {formData.competences.map(c => (
                                            <div key={c.competence_id} className="d-flex justify-content-between align-items-center p-2 mb-2 border-start border-4 border-oxford bg-light rounded">
                                                <div>
                                                    <span className="fw-bold text-oxford">{c.comp_name}</span>
                                                    <br />
                                                    <small className="text-muted"><i className="fas fa-user-tie me-1"></i>Responsable: {c.manager_name}</small>
                                                </div>
                                                <button type="button" className="btn btn-sm btn-outline-danger border-0" onClick={() => removeCompetence(c.competence_id)}>
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        ))}
                                        {formData.competences.length === 0 && (
                                            <div className="text-center p-2 border border-dashed rounded text-muted small">
                                                No hay competencias asignadas aún.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="auth-label">Fecha Inicio</label>
                                        <input type="date" name="start_date" className="auth-input w-100" value={formData.start_date} onChange={handleChange} />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="auth-label">Fecha Fin</label>
                                        <input type="date" name="end_date" className="auth-input w-100" value={formData.end_date} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        )}
                        {formData.province_unique_targets.length > 0 && (
                            <div className="mt-4 p-3 border rounded bg-white shadow-sm fade-in-up">
                                <label className="auth-label text-emerald">📊 Metas de Beneficiarios Únicos por Provincia</label>
                                <p className="small text-muted">Establece el alcance real (sin repetir personas) por cada estado.</p>
                                <div className="table-responsive">
                                    <table className="table table-sm align-middle">
                                        <thead className="bg-light">
                                            <tr>
                                                <th>Provincia</th>
                                                <th>Meta Total</th>
                                                <th>Hombres</th>
                                                <th>Mujeres</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.province_unique_targets.map(pt => (
                                                <tr key={pt.province_id}>
                                                    <td className="fw-bold text-oxford">{pt.province_name}</td>
                                                    <td><input type="number" className="form-control form-control-sm"
                                                        onChange={(e) => handleProvinceTargetChange(pt.province_id, 'total', e.target.value)} /></td>
                                                    <td><input type="number" className="form-control form-control-sm"
                                                        onChange={(e) => handleProvinceTargetChange(pt.province_id, 'men', e.target.value)} /></td>
                                                    <td><input type="number" className="form-control form-control-sm"
                                                        onChange={(e) => handleProvinceTargetChange(pt.province_id, 'women', e.target.value)} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="fade-in-up">
                                <div className="alert alert-success border-0 bg-emerald-soft">
                                    <h5 className="alert-heading font-weight-bold">Confirmación de Datos</h5>
                                    <p className="small mb-0">Revisa la información antes de finalizar el registro oficial en SIGSSEP.</p>
                                </div>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="p-3 border rounded shadow-sm bg-white">
                                            <label className="text-muted small d-block">Identificación</label>
                                            <strong>{formData.unique_code}</strong>
                                            <label className="text-muted small d-block mt-2">Donante</label>
                                            <strong>{formData.donor || 'N/A'}</strong>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="p-3 border rounded shadow-sm bg-white h-100">
                                            <label className="text-muted small d-block">Cobertura Geográfica</label>
                                            <div className="overflow-auto" style={{ maxHeight: '120px' }}>
                                                {formData.locations.length > 0 ?
                                                    formData.locations.map(l => (
                                                        <div key={l.parish_id} className="small border-bottom mb-1 pb-1">
                                                            <i className="bi bi-geo-alt text-success me-1"></i>
                                                            {l.province_name} / {l.muni_name} / <strong>{l.parish_name}</strong>
                                                        </div>
                                                    ))
                                                    : <span className="text-danger small">No hay lugares registrados</span>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 mt-3">
                                        <div className="p-3 border rounded shadow-sm bg-white">
                                            <label className="text-muted small d-block">Competencias y Responsables</label>
                                            <div className="d-flex flex-wrap gap-2">
                                                {formData.competences.map(c => (
                                                    <span key={c.competence_id} className="badge bg-emerald-soft text-dark border p-2">
                                                        {c.comp_name} <span className="opacity-50 mx-1">|</span> 👤 {c.manager_name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BOTONERA */}
                        <div className="d-flex justify-content-between mt-5 pt-3 border-top">
                            <button type="button" className="btn btn-outline-secondary" onClick={handleBack} disabled={step === 1}>
                                Anterior
                            </button>
                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-light border" onClick={() => saveProject(true)}>
                                    <i className="fas fa-save me-1"></i> Guardar Parcial
                                </button>
                                {step < 3 ? (
                                    <button type="button" className="auth-btn-submit px-4" onClick={handleNext}>Siguiente</button>
                                ) : (
                                    <button type="button" className="auth-btn-submit px-4 bg-emerald" onClick={() => saveProject(false)}>Crear Proyecto</button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateProject;