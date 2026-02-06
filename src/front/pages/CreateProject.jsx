import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import { apiFetch } from '../../utils/api';
import "../styles/projectDetail.css";

const CreateProject = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Si existe 'id', estamos editando
    const isEdit = Boolean(id);
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
            try {
                // 1. Cargar Competencias
                const resComp = await apiFetch("/competences");

                // TRUCO DE EXPERTO: Si resComp ya es el arreglo, lo usamos directamente.
                // Si es la respuesta cruda de fetch, usamos .json().
                const dataComp = resComp?.json ? await resComp.json() : resComp;

                if (dataComp && Array.isArray(dataComp)) {
                    setAllCompetences(dataComp);
                    console.log("Competencias cargadas:", dataComp); // Mira esto en la consola
                }

                // 2. Cargar Gerentes (por separado para que no se estorben)
                const resMan = await apiFetch("/users/managers");
                const dataMan = resMan?.json ? await resMan.json() : resMan;

                if (dataMan && Array.isArray(dataMan)) {
                    setAvailableManagers(dataMan);
                }
            } catch (error) {
                console.error("Error en la carga:", error);
            }
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


    useEffect(() => {
        if (isEdit && id) {
            const fetchProjectData = async () => {
                const res = await apiFetch(`/projects/${id}`);
                if (res?.ok) {
                    const data = await res.json();
                    setFormData(prev => ({
                        ...prev,
                        unique_code: data.code || '',
                        name: data.project_name || '',
                        donor: data.donor_name || '',
                        description: data.main_objective || '',
                        main_scope: data.results_summary || '',
                        start_date: data.start_date || '',
                        end_date: data.end_date || '',
                        status: data.status || 'En Progreso',
                        locations: (data.locations || []).map(loc => ({
                            // IDs (para lógica y selectores)
                            province_id: loc.province_id,
                            municipality_id: loc.municipality_id,
                            parish_id: loc.parish_id,

                            // Nombres (usando las llaves exactas de tu serialize híbrido)
                            province_name: loc.province,    // Mapeamos 'province' del server a 'province_name'
                            muni_name: loc.municipality,    // Mapeamos 'municipality' del server a 'muni_name'
                            parish_name: loc.parish,        // Mapeamos 'parish' del server a 'parish_name'

                            community_institution: loc.community_institution
                        })),
                        province_unique_targets: (data.province_unique_breakdown || []),
                        // Guardamos las competencias tal cual vienen
                        competences: (data.competences || []).map(cp => ({
                            competence_id: Number(cp.competence_id),
                            manager_id: Number(cp.manager_id),
                            comp_name: cp.name || "", // El backend ya debería enviar el nombre
                            manager_name: cp.manager_name || ""
                        })),
                    }));
                }
            };
            fetchProjectData();
        }
    }, [id, isEdit]); // Eliminamos los catálogos de aquí para que no refresque el form constantemente


    useEffect(() => {
        // Si ya tenemos catálogos y hay competencias sin nombre, las enriquecemos
        if (allCompetences.length > 0 && availableManagers.length > 0 && formData.competences.length > 0) {

            const needsName = formData.competences.some(c => !c.comp_name || !c.manager_name);

            if (needsName) {
                const enriched = formData.competences.map(c => {
                    const foundComp = allCompetences.find(ac => Number(ac.id) === Number(c.competence_id));
                    const foundMan = availableManagers.find(am => Number(am.id) === Number(c.manager_id));

                    return {
                        ...c,
                        comp_name: foundComp ? foundComp.name : c.comp_name,
                        manager_name: foundMan
                            ? `${foundMan.name} ${foundMan.lastname}`
                            : (c.manager_name || "Sin nombre")
                    };
                });

                // Solo actualizamos si los nombres realmente cambiaron
                setFormData(prev => ({ ...prev, competences: enriched }));
            }
        }
    }, [allCompetences, availableManagers]); // Solo cuando cargan los catálogos

    // Quitamos el .length y ponemos el array completo para que detecte el cambio de contenido

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- LÓGICA DE UBICACIONES ---
    const addLocation = () => {
        // 1. Convertimos a número inmediatamente para evitar problemas de tipos
        const pId = Number(tempLocation.province_id);
        const mId = Number(tempLocation.municipality_id);
        const paId = Number(tempLocation.parish_id);

        if (!pId || !mId || !paId) return toast.warning("Faltan datos");

        const pName = provinces.find(p => p.id === pId)?.name;
        const mName = municipalities.find(m => m.id === mId)?.name;
        const paName = parishes.find(pa => pa.id === paId)?.name;

        // 2. Ahora la validación es segura porque comparamos número con número
        if (formData.locations.some(l => Number(l.parish_id) === paId)) {
            return toast.error("Esta parroquia ya está en la lista.");
        }

        setFormData(prev => {
            const newLocation = {
                province_id: pId,
                municipality_id: mId,
                parish_id: paId,
                province_name: pName,
                muni_name: mName,
                parish_name: paName
            };

            const alreadyHasProvince = prev.province_unique_targets.some(pt => Number(pt.province_id) === pId);

            return {
                ...prev,
                locations: [...prev.locations, newLocation],
                province_unique_targets: alreadyHasProvince
                    ? prev.province_unique_targets
                    : [...prev.province_unique_targets, { province_id: pId, total: 0, men: 0, women: 0, province_name: pName }]
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
            return toast.error("El Código Único es obligatorio, amiguito.");
        }

        // 1. Calculamos los totales globales sumando las metas de cada provincia
        // Esto garantiza consistencia: el total del proyecto es la suma de sus partes.
        const calculatedTotal = formData.province_unique_targets.reduce((acc, pt) => acc + Number(pt.total || 0), 0);
        const calculatedMen = formData.province_unique_targets.reduce((acc, pt) => acc + Number(pt.men || 0), 0);
        const calculatedWomen = formData.province_unique_targets.reduce((acc, pt) => acc + Number(pt.women || 0), 0);

        // 2. Preparamos el payload con la estructura EXACTA que espera el backend
        const payload = {
            code: formData.unique_code,
            project_name: formData.name,       // CAMBIADO: de 'name' a 'project_name'
            donor_name: formData.donor,        // CAMBIADO: de 'donor' a 'donor_name'
            main_objective: formData.description, // CAMBIADO: de 'description' a 'main_objective'
            results_summary: formData.main_scope, // CAMBIADO: de 'main_scope' a 'results_summary'
            start_date: formData.start_date,
            end_date: formData.end_date,
            status: isPartial ? "Borrador" : "En Progreso", // Usamos el estado Draft si es parcial

            // El objeto que el backend busca con .get("unique_targets")
            unique_targets: {
                total: calculatedTotal,
                men: calculatedMen,
                women: calculatedWomen,
                disability: 0 // Puedes añadir un campo en el form para esto luego
            },

            // Ubicaciones geográficas
            locations: formData.locations.map(loc => ({
                province_id: parseInt(loc.province_id),
                municipality_id: parseInt(loc.municipality_id),
                parish_id: parseInt(loc.parish_id)
            })),

            // Metas por provincia (Desagregadas)
            province_unique_targets: formData.province_unique_targets.map(pt => ({
                province_id: parseInt(pt.province_id),
                total: Number(pt.total),
                men: Number(pt.men),
                women: Number(pt.women)
            })),
            competences: formData.competences.map(c => ({
                competence_id: c.competence_id,
                manager_id: c.manager_id
            })),

            // Por ahora enviamos indicadores vacíos ya que se configuran en otro paso
            indicators: []
        };

        try {
            const url = isEdit ? `/projects/${id}` : "/projects";
            const method = isEdit ? "PATCH" : "POST";

            const response = await apiFetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                toast.success(isPartial ? "Progreso guardado como borrador" : "¡Proyecto creado con éxito!");
                setTimeout(() => navigate('/manager/projects'), 1000);
            } else {
                toast.error(result.msg || "Error al guardar");
            }
        } catch (error) {
            toast.error("Error de conexión con el servidor");
        }
    };

    const handleProvinceTargetChange = (provinceId, field, value) => {
        // Convertimos a número, pero manejamos el vacío para que no salte el 0 de inmediato
        const numericValue = value === '' ? '' : parseInt(value);

        setFormData(prev => ({
            ...prev,
            province_unique_targets: prev.province_unique_targets.map(pt =>
                pt.province_id === provinceId
                    ? { ...pt, [field]: numericValue }
                    : pt
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


    const calculatedTotal = formData.province_unique_targets.reduce((acc, pt) => acc + Number(pt.total || 0), 0);
    const hasMathErrors = formData.province_unique_targets.some(
        pt => Number(pt.men || 0) + Number(pt.women || 0) !== Number(pt.total || 0)
    );
    const dateError = formData.start_date && formData.end_date &&
        new Date(formData.end_date) <= new Date(formData.start_date);

    // Combinamos errores para el botón (ahora el botón se bloquea por matemáticas o por fechas)
    const canProceed = !hasMathErrors && !dateError;
    const calculatedMen = formData.province_unique_targets.reduce((acc, pt) => acc + Number(pt.men || 0), 0);
    const calculatedWomen = formData.province_unique_targets.reduce((acc, pt) => acc + Number(pt.women || 0), 0);


    return (
        <div className="management-page-container">
            <Toaster richColors />
            <div className="container mt-4">

                {/* HEADER DINÁMICO - Ahora con Oxford en Paso 1 para evitar franjas blancas */}
                <div className={`card management-card-unified shadow-lg ${step === 1 ? 'management-card-unified ' : step === 2 ? 'bg-emerald' : 'bg-success'
                    } text-white shadow-sm`}>
                    <div className="management-card-header d-flex justify-content-between align-items-center">
                        <h2 className="my-3">
                            {step === 1 && "📌 Paso 1: Información Básica"}
                            {step === 2 && "⚙️ Paso 2: Configuración y Territorio"}
                            {step === 3 && "✅ Paso 3: Revisión Final"}
                        </h2>
                        <span className="badge border border-light text-light ms-5" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                            <i className="fas fa-edit me-1 small"></i> Borrador
                        </span>
                    </div>
                </div>

                <div className="management-card-unified p-5">
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
                                <div className="my-3">
                                    <label className="auth-label">Nombre del Proyecto</label>
                                    <input type="text" name="name" className="auth-input w-100" value={formData.name} onChange={handleChange} />
                                </div>
                                <div className="my-4">
                                    <label className="auth-label">Resumen</label>
                                    <textarea name="description" className="auth-input w-100" rows="2" value={formData.description} onChange={handleChange}></textarea>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <>
                                <div className="fade-in-up">
                                    <div className="mb-4">
                                        <label className="auth-label text-oxford mb-3">📍 Lugares de Intervención</label>
                                        <div className="row g-2 auth-input p-4 rounded">
                                            <div className="col-md-4">
                                                <select className="form-select auth-input" value={tempLocation.province_id}
                                                    onChange={(e) => setTempLocation({ province_id: e.target.value, municipality_id: '', parish_id: '' })}>
                                                    <option value="">Estado...</option>
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
                                            <div className="col-12 mt-4">
                                                <button type="button" className="btn btn-emerald w-100" onClick={addLocation}>
                                                    <i className="fas fa-plus me-2"></i> Agregar a Cobertura
                                                </button>
                                            </div>
                                        </div>

                                        {/* Lista de ubicaciones con el nuevo formato */}
                                        <div className="mt-3 d-flex flex-wrap gap-2">
                                            {formData.locations.map((loc, index) => (
                                                <span
                                                    key={`loc-${loc.parish_id || index}`}
                                                    className="badge bg-oxford text-white p-2 d-flex align-items-center gap-2"
                                                    style={{ fontSize: '0.85rem', fontWeight: '400', borderRadius: '6px' }}
                                                >
                                                    <i className="fas fa-map-marker-alt text-emerald"></i>
                                                    {/* Formato jerárquico: Provincia - Municipio - Parroquia */}
                                                    <span>
                                                        {loc.province_name} - {loc.muni_name} - {loc.parish_name}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        className="btn-close btn-close-white ms-2"
                                                        style={{ fontSize: '0.5rem' }}
                                                        onClick={() => removeLocation(loc.parish_id)}
                                                    ></button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="auth-label">Resultados</label>
                                        <textarea name="main_scope" className="auth-input w-100" rows="2" value={formData.main_scope} onChange={handleChange}></textarea>
                                    </div>

                                    {/* SECCIÓN DE COMPETENCIAS Y GERENTES */}
                                    <div className="mt-4 p-3 auth-input rounded shadow-sm fade-in-up">
                                        <label className="auth-label text-oxford">🏢 Estructura de Gestión (Competencias)</label>
                                        <p className="small text-muted-dynamic">Asigna las áreas técnicas y sus responsables.</p>

                                        <div className="row g-2 auth-input p-4 rounded">
                                            <div className="col-md-5">
                                                <select
                                                    className="form-select auth-input border"
                                                    value={tempCompetence.competence_id}
                                                    onChange={(e) => setTempCompetence({ ...tempCompetence, competence_id: e.target.value })}
                                                >
                                                    <option value="">Seleccionar Competencia ({allCompetences.length})...</option>

                                                    {/* Agregamos una validación extra antes del map */}
                                                    {allCompetences && allCompetences.length > 0 ? (
                                                        allCompetences.map(c => (
                                                            <option key={`comp-${c.id}`} value={c.id}>
                                                                {c.name}
                                                            </option>
                                                        ))
                                                    ) : (
                                                        <option disabled>Cargando áreas...</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div className="col-md-5">
                                                <select className="form-select auth-input border" value={tempCompetence.manager_id}
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
                                                <div key={c.competence_id} className="d-flex justify-content-between align-items-center p-2 mb-3 border-start border-2 border-oxford summary-box-dynamic rounded text-muted-dynamic">
                                                    <div>
                                                        <span className="fw-bold text-oxford fs-6 pe-4">{c.comp_name}</span>
                                                        <span className="fs-6"><i className="fas fa-user-tie me-1"></i>Responsable: {c.manager_name}</span>
                                                    </div>
                                                    <button type="button" className="btn btn-sm btn-outline-danger border-0" onClick={() => removeCompetence(c.competence_id)}>
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            ))}
                                            {formData.competences.length === 0 && (
                                                <div className="text-center p-2 border border-dashed rounded text-oxford small">
                                                    No hay competencias asignadas aún.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 p-3 auth-input d-flex justify-content-between rounded shadow-sm fade-in-up">
                                        <div className="col-md-5 mb-3">
                                            <label className="auth-label">Fecha Inicio</label>
                                            <input
                                                type="date"
                                                name="start_date"
                                                className={`auth-input w-100 ${dateError ? 'border-danger' : ''}`}
                                                value={formData.start_date}
                                                onChange={handleChange}
                                            />
                                        </div>
                                        <div className="col-md-5 mb-3">
                                            <label className="auth-label">Fecha Fin</label>
                                            <input
                                                type="date"
                                                name="end_date"
                                                className={`auth-input w-100 ${dateError ? 'border-danger' : ''}`}
                                                value={formData.end_date}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        {/* Mensaje de error de fecha */}
                                        {dateError && (
                                            <div className="col-12">
                                                <p className="text-danger small mb-0">
                                                    <i className="fas fa-calendar-times me-1"></i>
                                                    La fecha de finalización debe ser posterior a la fecha de inicio.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {formData.province_unique_targets.length > 0 && (
                                    <div className="mt-4 p-3 rounded auth-input shadow-sm fade-in-up">
                                        <label className="auth-label text-emerald">📊 Metas de Beneficiarios Únicos por Estado</label>
                                        <p className="small text-muted-dynamic">Establece el alcance real (sin repetir personas) por cada estado.</p>
                                        <div className="table-responsive">
                                            <table className="table table-sm align-middle table-custom-sigssep">
                                                <thead className="thead-oxford">
                                                    <tr>
                                                        <th>Estado</th>
                                                        <th>Meta Total</th>
                                                        <th>Hombres</th>
                                                        <th>Mujeres</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {formData.province_unique_targets.map(pt => {
                                                        // 1. Calculamos el error para esta fila específica
                                                        const isInvalid = Number(pt.men || 0) + Number(pt.women || 0) !== Number(pt.total || 0);

                                                        return (
                                                            <React.Fragment key={`target-row-${pt.province_id}`}>
                                                                {/* FILA DE INPUTS */}
                                                                <tr className={isInvalid ? "table-danger-light" : "tr-transparent"}>
                                                                    <td className="fw-bold text-oxford-dynamic">{pt.province_name}</td>
                                                                    <td>
                                                                        <input type="number"
                                                                            className={`form-control form-control-sm ${isInvalid ? 'border-danger' : ''}`}
                                                                            value={pt.total}
                                                                            onChange={(e) => handleProvinceTargetChange(pt.province_id, 'total', e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input type="number"
                                                                            className={`form-control form-control-sm ${isInvalid ? 'border-danger' : ''}`}
                                                                            value={pt.men}
                                                                            onChange={(e) => handleProvinceTargetChange(pt.province_id, 'men', e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input type="number"
                                                                            className={`form-control form-control-sm ${isInvalid ? 'border-danger' : ''}`}
                                                                            value={pt.women}
                                                                            onChange={(e) => handleProvinceTargetChange(pt.province_id, 'women', e.target.value)}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                                {/* FILA DE MENSAJE DE ERROR (Solo aparece si isInvalid es true) */}
                                                                {isInvalid && (
                                                                    <tr>
                                                                        <td colSpan="4" className="text-danger py-0 border-0" style={{ fontSize: '0.75rem' }}>
                                                                            <i className="fas fa-exclamation-circle me-1"></i>
                                                                            La suma de hombres ({pt.men || 0}) + mujeres ({pt.women || 0}) debe ser {pt.total || 0}.
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* RESUMEN DE TOTALES CALCULADOS */}
                                        <div className="mt-3 p-3 summary-box-dynamic border-start border-4 border-emerald rounded shadow-sm">
                                            <div className="row text-center">
                                                <label className="auth-label text-emerald fs-4">📊 Beneficiarios Únicos</label>
                                                <div className="col-4">
                                                    <small className="text-muted-dynamic d-block fs-5">Total Proyecto</small>
                                                    <span className="h5 mb-0 fw-bold fs-5 text-oxford">{calculatedTotal}</span>
                                                </div>
                                                <div className="col-4">
                                                    <small className="text-muted-dynamic d-block fs-5">Total Hombres</small>
                                                    <span className="h5 mb-0 fw-bold fs-5 text-primary">{calculatedMen}</span>
                                                </div>
                                                <div className="col-4">
                                                    <small className="text-muted-dynamic fs-5 d-block">Total Mujeres</small>
                                                    <span className="h5 mb-0 fw-bold fs-5 text-danger">{calculatedWomen}</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-center">
                                                <small className="text-muted-dynamic" style={{ fontSize: '0.75rem' }}>
                                                    * Estos valores se calculan automáticamente sumando las metas de cada provincia.
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </>
                        )}

                        {step === 3 && (
                            <div className="fade-in-up">
                                {/* Encabezado Principal */}
                                <div className="alert alert-success border-0 summary-box-emerald mb-4">
                                    <h5 className="alert-heading fw-bold text-emerald mb-1">✅ Confirmación de Datos</h5>
                                    <p className="small mb-0 text-muted-dynamic fs-5 opacity-75">Revisa la información antes de finalizar el registro oficial en SIGSSEP.</p>
                                </div>

                                <div className="row g-3">
                                    {/* 1. CABECERA DEL PROYECTO (Ancho completo) */}
                                    <div className="col-12">
                                        <div className="p-4 border rounded shadow-sm auth-input border-emerald-light">
                                            <label className="text-muted-dynamic small d-block uppercase-label">Nombre del Proyecto</label>
                                            <h4 className="text-emerald fw-bold mb-3">{formData.name || 'Sin nombre definido'}</h4>

                                            <div className="row">
                                                <div className="col-md-4">
                                                    <label className="text-muted-dynamic small d-block uppercase-label">Identificación</label>
                                                    <strong className="text-oxford-dynamic">{formData.unique_code}</strong>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="text-muted-dynamic small d-block uppercase-label">Donante</label>
                                                    <strong className="text-oxford-dynamic">{formData.donor || 'N/A'}</strong>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="text-muted-dynamic small d-block uppercase-label">Periodo de Ejecución</label>
                                                    <div className="text-oxford-dynamic">
                                                        <i className="far fa-calendar-alt text-emerald me-1"></i>
                                                        <span>{formData.start_date}</span>
                                                        <i className="fas fa-arrow-right mx-2 opacity-50 small"></i>
                                                        <span>{formData.end_date}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. RESUMEN Y RESULTADOS */}
                                    <div className="col-md-7">
                                        <div className="p-3 border rounded shadow-sm auth-input h-100">
                                            <label className="text-muted-dynamic small d-block uppercase-label mb-2">Resumen Ejecutivo</label>
                                            <p className="text-oxford-dynamic small text-justify" style={{ lineHeight: '1.6' }}>
                                                {formData.description || 'Sin descripción.'}
                                            </p>

                                            <label className="text-muted-dynamic small d-block uppercase-label mt-4 mb-2">Resultados Esperados</label>
                                            <div className="result-list">
                                                {/* CAMBIO AQUÍ: Validamos si hay texto en main_scope en lugar de buscar un array results */}
                                                {formData.main_scope ? (
                                                    <div className="d-flex mb-2 align-items-start fade-in-up">
                                                        <span className="badge bg-emerald-soft text-emerald me-2 mt-1">1</span>
                                                        <span className="text-oxford-dynamic small">
                                                            {formData.main_scope}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted small italic">No se definieron resultados aún.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. COBERTURA Y GESTIÓN (Lateral derecho) */}
                                    <div className="col-md-5">
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <div className="p-3 border rounded shadow-sm auth-input">
                                                    <label className="text-muted-dynamic small d-block uppercase-label mb-2">Cobertura Geográfica</label>
                                                    <div className="overflow-auto custom-scrollbar" style={{ maxHeight: '150px' }}>
                                                        {formData.locations.map(l => (
                                                            <div key={l.parish_id} className="small border-bottom-dynamic mb-1 pb-1">
                                                                <i className="fas fa-map-marker-alt text-emerald me-2"></i>
                                                                <span className="text-oxford-dynamic">{l.province_name} / {l.parish_name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-12">
                                                <div className="p-3 border rounded shadow-sm auth-input">
                                                    <label className="text-muted-dynamic small d-block uppercase-label mb-2">Estructura de Gestión</label>
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {formData.competences.map(c => (
                                                            <span key={c.competence_id} className="badge-sigssep w-100 justify-content-between">
                                                                <span><i className="fas fa-briefcase me-2"></i>{c.comp_name}</span>
                                                                <span className="small opacity-75">👤 {c.manager_name.split(' ')[0]}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 p-3 summary-box-dynamic border-start border-4 border-emerald rounded shadow-sm">
                                        <div className="row text-center">
                                            <label className="auth-label text-emerald fs-4">📊 Beneficiarios Únicos</label>
                                            <div className="col-4">
                                                <small className="text-muted-dynamic d-block fs-5">Total Proyecto</small>
                                                <span className="h5 mb-0 fw-bold fs-5 text-muted-dynamic">{calculatedTotal}</span>
                                            </div>
                                            <div className="col-4">
                                                <small className="text-muted-dynamic d-block fs-5">Total Hombres</small>
                                                <span className="h5 mb-0 fw-bold fs-5 text-primary">{calculatedMen}</span>
                                            </div>
                                            <div className="col-4">
                                                <small className="text-muted-dynamic fs-5 d-block">Total Mujeres</small>
                                                <span className="h5 mb-0 fw-bold fs-5 text-danger">{calculatedWomen}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-center">
                                            <small className="text-muted-dynamic" style={{ fontSize: '0.75rem' }}>
                                                * Estos valores se calculan automáticamente sumando las metas de cada provincia.
                                            </small>
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
                                <button
                                    type="button"
                                    className="btn btn-outline-oxford shadow-sm"
                                    onClick={() => saveProject(true)}
                                >
                                    <i className="fas fa-save me-1"></i> Guardar Parcial
                                </button>

                                {step < 3 ? (
                                    <button
                                        type="button"
                                        className={`auth-btn-submit px-4 ${(hasMathErrors || dateError) && step === 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={handleNext}
                                        disabled={(hasMathErrors || dateError) && step === 2}
                                    >
                                        {(hasMathErrors || dateError) && step === 2 ? "Corregir Errores..." : "Siguiente"}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="auth-btn-submit px-4 bg-emerald"
                                        onClick={() => saveProject(false)}
                                    >
                                        {/* CAMBIO AQUÍ: Texto dinámico según el modo */}
                                        {isEdit ? "Actualizar Proyecto" : "Crear Proyecto"}
                                    </button>
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