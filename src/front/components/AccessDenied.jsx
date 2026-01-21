import React from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/access-denied.css";

export const AccessDenied = () => {
    const navigate = useNavigate();

    return (
        <div className="denied-container d-flex align-items-center justify-content-center">
            <div className="text-center denied-card p-5 shadow-lg">
                <div className="denied-icon-wrapper mb-4">
                    <i className="fa-solid fa-shield-halved denied-icon"></i>
                </div>
                <h1 className="display-4 fw-bold text-dark">Acceso Restringido</h1>
                <p className="lead text-muted mb-4">
                    Lo sentimos, pero no tienes los permisos necesarios para ver esta sección.
                    Esta área es exclusiva para la Gerencia de SIGSSEP.
                </p>
                <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
                    <button
                        onClick={() => navigate("/")}
                        className="btn btn-primary btn-lg px-4 gap-3 shadow-sm"
                    >
                        <i className="fa-solid fa-house me-2"></i>Volver al Inicio
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn-outline-secondary btn-lg px-4"
                    >
                        Regresar
                    </button>
                </div>
            </div>
        </div>
    );
};