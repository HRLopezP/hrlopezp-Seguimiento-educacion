import React from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/AccessDenied.css";

export const AccessDenied = () => {
    const navigate = useNavigate();

    return (
        <div className="denied-page-wrapper">
            {/* Este div ahora generará el patrón infinito con CSS */}
            <div className="sigssep-pattern"></div>
            
            <div className="denied-container">
                <div className="denied-card shadow-lg animate__animated animate__fadeIn">
                    <div className="denied-icon-wrapper pulse-animation">
                        <div className="shield-stack">
                            <i className="fa-solid fa-shield-halved shield-base"></i>
                            <i className="fa-solid fa-shield-halved shield-overlay"></i>
                        </div>
                    </div>
                    
                    <h1 className="denied-title">Acceso Restringido</h1>
                    
                    <p className="denied-text">
                        Lo sentimos, pero no tienes los permisos necesarios para ver esta sección.
                        Esta área es exclusiva para la <strong>Gerencia de SIGSSEP</strong>.
                    </p>

                    <div className="denied-actions">
                        <button onClick={() => navigate("/")} className="btn-denied-primary">
                            <i className="fa-solid fa-house me-2"></i>Volver al Inicio
                        </button>
                        
                        <button onClick={() => navigate(-1)} className="btn-denied-outline">
                            Regresar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};