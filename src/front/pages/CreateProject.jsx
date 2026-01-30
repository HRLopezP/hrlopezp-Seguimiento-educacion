import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import { apiFetch } from '../../utils/api';

const CreateProject = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);

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
        locations: [], // Guardaremos objetos { province_id, municipality_id, province_name, muni_name }
        theory_template_id: '',
    });

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

        if (!province_id || !municipality_id || !parish_id) {
            return toast.warning("Debes llegar hasta el nivel de Parroquia, amiguito.");
        }

        const pName = provinces.find(p => p.id === parseInt(province_id))?.name;
        const mName = municipalities.find(m => m.id === parseInt(municipality_id))?.name;
        const paName = parishes.find(pa => pa.id === parseInt(parish_id))?.name;

        // Evitar duplicados por Parroquia (es el nivel más bajo)
        if (formData.locations.some(l => l.parish_id === parish_id)) {
            return toast.error("Esta parroquia ya está en la lista.");
        }

        setFormData(prev => ({
            ...prev,
            locations: [...prev.locations, {
                province_id, municipality_id, parish_id,
                province_name: pName, muni_name: mName, parish_name: paName
            }]
        }));

        // Reset local
        setTempLocation({ province_id: '', municipality_id: '', parish_id: '' });
    };

    const removeLocation = (muniId) => {
        setFormData(prev => ({
            ...prev,
            locations: prev.locations.filter(l => l.municipality_id !== muniId)
        }));
    };

    const saveProject = async (isPartial = true) => {
        if (!formData.unique_code) {
            return toast.error("El Código Único es obligatorio amiguito.");
        }
        console.log("Enviando a SIGSSEP:", formData);
        toast.success(isPartial ? "Progreso guardado parcialmente" : "¡Proyecto creado con éxito!");
        if (!isPartial) navigate('/manager/projects');
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