import React from "react";

export const Footer = () => {
    return (
        <footer className="main-footer py-3"> {/* Reducimos py-4 a py-2 para que sea más delgado */}
            <div className="container-fluid px-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center">
                    
                    {/* Izquierda: Marca y Descripción corta */}
                    <div className="d-flex align-items-center mb-2 mb-md-0">
                        <span className="fw-bold footer-brand me-2">SIGSSEP</span>
                        <span className="small opacity-50 d-none d-lg-inline">| Sistema de Gestión de Proyectos</span>
                    </div>

                    {/* Centro: Copyright */}
                    <div className="mb-2 mb-md-0">
                        <small className="opacity-75">
                            © {new Date().getFullYear()} Todos los derechos reservados.
                        </small>
                    </div>

                    {/* Derecha: Enlaces */}
                    <div className="footer-links">
                        <a href="#" className="text-decoration-none small me-3">Soporte</a>
                        <a href="#" className="text-decoration-none small">Privacidad</a>
                    </div>

                </div>
            </div>
        </footer>
    );
};