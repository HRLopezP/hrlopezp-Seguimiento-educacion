import React from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/AccessDenied.css";

export const AccessDenied = () => {
    const navigate = useNavigate();

    return (
        /* Eliminamos d-flex y justify aquí porque ya lo haremos en el CSS personalizado */
        <div className="denied-container">
            <div className="denied-card shadow-lg">
                <div className="denied-icon-wrapper">
                    <i className="fa-solid fa-shield-halved denied-icon"></i>
                </div>
                {/* Quitamos text-dark para usar var(--text-primary) */}
                <h1 className="denied-title">Acceso Restringido</h1>
                {/* Quitamos text-muted para controlar la opacidad nosotros */}
                <p className="denied-text">
                    Lo sentimos, pero no tienes los permisos necesarios para ver esta sección.
                    Esta área es exclusiva para la Gerencia de SIGSSEP.
                </p>
                <div className="denied-actions">
                    <button
                        onClick={() => navigate("/")}
                        className="btn-denied-primary"
                    >
                        <i className="fa-solid fa-house me-2"></i>Volver al Inicio
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="btn-denied-outline"
                    >
                        Regresar
                    </button>
                </div>
            </div>
        </div>
    );
};