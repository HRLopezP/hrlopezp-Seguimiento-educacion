import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { apiFetch } from "../../utils/api";
import ResultSection from "./ResultSection"; // Componente que crearemos abajo

const TheoryConsole = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [theory, setTheory] = useState(null);
    const [activeTab, setActiveTab] = useState("output"); // 'outcome' o 'output'

    const loadData = async () => {
        const res = await apiFetch(`/theories/${id}/details`);
        if (res?.ok) {
            const data = await res.json();
            setTheory(data);
        } else {
            toast.error("No se pudo cargar la teoría");
            navigate("/theories");
        }
    };

    useEffect(() => { loadData(); }, [id]);

    if (!theory) return <div className="spinner-border text-emerald m-5"></div>;

    return (
        <div className="management-page-container theory-console-wrapper p-4">
            <Toaster richColors />

            {/* Header de la Consola */}
            <div className="console-header mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <button className="btn btn-link text-primary p-0 mb-2" onClick={() => navigate("/manager/theories")}>
                        <i className="fas fa-arrow-left me-2"></i> Volver a Gestión
                    </button>
                    <h2 className="management-title">{theory.name}</h2>
                    <span className="badge bg-oxford">Competencia: {theory.competence_name}</span>
                </div>
            </div>

            {/* Selector de Pestañas (Tabs) */}
            <ul className="nav nav-tabs custom-console-tabs mb-4">
                <li className="nav-item">
                    <button className={`nav-link ${activeTab === "output" ? "active" : ""}`} onClick={() => setActiveTab("output")}>
                        <i className="fas fa-clipboard-check me-2"></i> Outputs (Productos)
                    </button>
                </li>
                <li className="nav-item">
                    <button className={`nav-link ${activeTab === "outcome" ? "active" : ""}`} onClick={() => setActiveTab("outcome")}>
                        <i className="fas fa-bullseye me-2"></i> Outcomes (Resultados)
                    </button>
                </li>
            </ul>

            {/* Contenido Dinámico */}
            <div className="tab-content">
                <ResultSection
                    type={activeTab}
                    theoryId={id}
                    results={theory.results?.filter(r => r.type === activeTab) || []}
                    onRefresh={loadData}
                />
            </div>
        </div>
    );
};

export default TheoryConsole;