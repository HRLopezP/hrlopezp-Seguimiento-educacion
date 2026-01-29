import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const CreateProject = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    
    const [formData, setFormData] = useState({
        unique_code: '', 
        name: '',
        donor: '', // <-- Agregado amiguito
        description: '',
        main_scope: '',
        start_date: '',
        end_date: '',
        status: 'En Progreso', 
        locations: [], 
        theory_template_id: ''
    });

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const saveProject = async (isPartial = true) => {
        if (!formData.unique_code) {
            return toast.error("El Código Único es obligatorio amiguito.");
        }
        console.log("Enviando a SIGSSEP:", formData);
        toast.success(isPartial ? "Progreso guardado parcialmente" : "¡Proyecto creado con éxito!");
        if(!isPartial) navigate('/manager/projects'); // Ajustado a tu ruta de gestión
    };

    return (
        <div className="auth-page-container mt-5">
            <div className="auth-card-unified shadow-lg" style={{ maxWidth: '800px' }}>
                
                {/* HEADER DINÁMICO SEGÚN EL PASO */}
                <div className={`auth-card-header transition-all duration-500 ${
                    step === 1 ? 'bg-light text-dark border-bottom' : 
                    step === 2 ? 'bg-oxford text-white' : 'bg-emerald-soft text-white'
                }`}>
                    <h2>
                        {step === 1 && "📌 Paso 1: Información Básica"}
                        {step === 2 && "⚙️ Paso 2: Configuración Técnica"}
                        {step === 3 && "✅ Paso 3: Revisión Final"}
                    </h2>
                    <p className="mb-0 opacity-75">
                        {formData.unique_code ? `Proyecto: ${formData.unique_code}` : 'Nuevo Registro de Proyecto'}
                    </p>
                </div>

                <div className="auth-card-body">
                    {/* STEPPER VISUAL */}
                    <div className="d-flex justify-content-center gap-4 mb-4">
                        {[1, 2, 3].map(num => (
                            <div key={num} className={`rounded-circle d-flex align-items-center justify-content-center transition-all ${
                                step >= num ? 'bg-success text-white scale-110' : 'bg-secondary text-white opacity-50'
                            }`} style={{ width: '40px', height: '40px', fontWeight: 'bold', border: '3px solid white', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
                                {num}
                            </div>
                        ))}
                    </div>

                    <form>
                        {/* CONTENIDO PASO 1 */}
                        {step === 1 && (
                            <div className="fade-in-up">
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="auth-label">Código Único (Obligatorio)</label>
                                        <input 
                                            type="text" name="unique_code" 
                                            className="auth-input w-100" 
                                            value={formData.unique_code} 
                                            onChange={handleChange}
                                            placeholder="P-2026-001"
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="auth-label">Donante / Financiador</label>
                                        <input 
                                            type="text" name="donor" 
                                            className="auth-input w-100" 
                                            value={formData.donor} 
                                            onChange={handleChange}
                                            placeholder="Ej: ONU, Banco Mundial, etc."
                                        />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="auth-label">Nombre del Proyecto</label>
                                    <input 
                                        type="text" name="name" 
                                        className="auth-input w-100" 
                                        value={formData.name} 
                                        onChange={handleChange}
                                        placeholder="Nombre oficial del programa"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="auth-label">Descripción Breve</label>
                                    <textarea 
                                        name="description" 
                                        className="auth-input w-100" 
                                        rows="2"
                                        value={formData.description} 
                                        onChange={handleChange}
                                    ></textarea>
                                </div>
                            </div>
                        )}

                        {/* CONTENIDO PASO 2 (Igual al anterior pero con los estilos de tus variables) */}
                        {step === 2 && (
                            <div className="fade-in-up">
                                <div className="mb-3">
                                    <label className="auth-label">Meta Principal (Scope / Alcance)</label>
                                    <textarea 
                                        name="main_scope" 
                                        className="auth-input w-100" 
                                        rows="3"
                                        value={formData.main_scope} 
                                        onChange={handleChange}
                                        placeholder="Describa el objetivo principal a lograr..."
                                    ></textarea>
                                </div>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="auth-label">Fecha de Inicio</label>
                                        <input type="date" name="start_date" className="auth-input w-100" value={formData.start_date} onChange={handleChange}/>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="auth-label">Fecha de Finalización</label>
                                        <input type="date" name="end_date" className="auth-input w-100" value={formData.end_date} onChange={handleChange}/>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CONTENIDO PASO 3 */}
                        {step === 3 && (
                            <div className="fade-in-up text-center py-4">
                                <div className="icon-box mx-auto mb-3" style={{width: '80px', height: '80px', borderRadius: '50%'}}>
                                    <i className="bi bi-rocket-takeoff" style={{fontSize: '2.5rem'}}></i>
                                </div>
                                <h4 className="fw-bold">Resumen de Planificación</h4>
                                <div className="text-start bg-light p-4 rounded-3 mt-3 shadow-sm border">
                                    <p className="mb-1"><strong>Código:</strong> <span className="text-primary">{formData.unique_code}</span></p>
                                    <p className="mb-1"><strong>Donante:</strong> {formData.donor || 'No especificado'}</p>
                                    <p className="mb-1"><strong>Proyecto:</strong> {formData.name || 'Sin nombre'}</p>
                                    <p className="mb-0"><strong>Estado inicial:</strong> <span className="badge bg-emerald-soft text-dark">{formData.status}</span></p>
                                </div>
                            </div>
                        )}

                        {/* BOTONERA */}
                        <div className="d-flex justify-content-between mt-5 pt-3 border-top">
                            <button 
                                type="button" 
                                className={`btn ${step === 1 ? 'btn-light disabled' : 'btn-outline-secondary'}`} 
                                onClick={handleBack}
                                disabled={step === 1}
                            >
                                <i className="bi bi-arrow-left me-2"></i> Anterior
                            </button>
                            
                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-light border" onClick={() => saveProject(true)}>
                                    <i className="bi bi-save me-2"></i> Guardar Borrador
                                </button>
                                
                                {step < 3 ? (
                                    <button type="button" className="auth-btn-submit px-4" onClick={handleNext}>
                                        Siguiente <i className="bi bi-arrow-right ms-2"></i>
                                    </button>
                                ) : (
                                    <button type="button" className="auth-btn-submit px-4 bg-success" onClick={() => saveProject(false)}>
                                        <i className="bi bi-cloud-upload me-2"></i> Crear Proyecto
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