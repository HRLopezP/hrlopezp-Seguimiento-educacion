import React, { useState, useEffect } from 'react';
import { apiFetch } from "../../utils/api";
import { toast } from 'sonner';
import "../styles/projectDetail.css";

const ContextSelector = ({ onContextChange }) => {
    const [competencias, setCompetencias] = useState([]);
    const [proyectos, setProyectos] = useState([]);
    const [selection, setSelection] = useState({
        competenciaId: '',
        proyectoId: ''
    });

    // 1. Cargar competencias
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const response = await apiFetch("/official/competences");

                // Verificamos si la respuesta es exitosa (caja abierta con éxito)
                if (response && response.ok) {
                    const data = await response.json(); // <--- Aquí abrimos la caja localmente
                    setCompetencias(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Error en competencias:", error);
                toast.error("Error al cargar tus áreas de especialidad");
            }
        };
        loadInitialData();
    }, []);

    // 2. Cargar proyectos
    useEffect(() => {
        if (!selection.competenciaId) {
            setProyectos([]);
            return;
        }

        const loadProyectos = async (id) => {
            try {
                const response = await apiFetch(`/official/projects?competencia_id=${id}`);

                if (response && response.ok) {
                    const data = await response.json(); // <--- Abrimos la caja localmente
                    setProyectos(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Error en proyectos:", error);
                toast.error("Error al filtrar proyectos");
            }
        };

        loadProyectos(selection.competenciaId);
    }, [selection.competenciaId]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        const numericValue = value ? parseInt(value, 10) : '';
        const newSelection = { ...selection, [name]: numericValue };

        if (name === 'competenciaId') newSelection.proyectoId = '';

        setSelection(newSelection);

        if (newSelection.competenciaId && newSelection.proyectoId) {
            onContextChange(newSelection);
        }
    };

    console.log("¿Qué hay en competencias?:", competencias, "Tipo:", typeof competencias);

    return (
        <div className="card shadow-sm border-0 bg-card-dynamic mb-4">
            <div className="card-body p-4">
                <div className="row align-items-end">
                    {/* Selector de Competencia */}
                    <div className="col-md-5">
                        <label className="uppercase-label text-muted-dynamic mb-2">
                            <i className="fas fa-star me-2 text-emerald"></i>Mi Especialidad
                        </label>
                        <select
                            className="form-select shadow-none border-emerald-light"
                            name="competenciaId"
                            value={selection.competenciaId}
                            onChange={handleChange}
                        >
                            <option value="">Selecciona una competencia...</option>
                            {(competencias && Array.isArray(competencias) ? competencias : []).map((comp) => (
                                <option key={comp.id} value={comp.id}>
                                    {comp.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-1 text-center d-none d-md-block">
                        <i className="fas fa-chevron-right text-muted opacity-25 mb-2"></i>
                    </div>

                    {/* Selector de Proyecto */}
                    <div className="col-md-6">
                        <label className="uppercase-label text-muted-dynamic mb-2">
                            <i className="fas fa-project-diagram me-2 text-emerald"></i>Proyecto Asignado
                        </label>
                        <select
                            className="form-select shadow-none border-emerald-light"
                            name="proyectoId"
                            value={selection.proyectoId}
                            onChange={handleChange}
                            disabled={!selection.competenciaId}
                        >
                            <option value="">
                                {!selection.competenciaId
                                    ? "Primero elige una competencia"
                                    : "Selecciona un proyecto..."}
                            </option>
                            {proyectos.map(p => (
                                <option key={p.id} value={p.id}>{p.project_name} ({p.code})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Feedback Visual de Conexión */}
                {selection.proyectoId && (
                    <div className="mt-3 fade-in">
                        <span className="badge-sigssep">
                            <i className="fas fa-link me-2 text-emerald"></i>
                            Conectado a: <strong className="ms-1">{proyectos.find(p => p.id == selection.proyectoId)?.code}</strong>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContextSelector;