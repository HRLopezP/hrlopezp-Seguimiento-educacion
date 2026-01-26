import React from "react";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

export const Home = () => {
    const { store } = useGlobalReducer();

    return (
        <div className="landing-page">
            {/* ENVOLTORIO ÚNICO PARA CONTINUIDAD VISUAL */}
            <div className="hero-and-cards-wrapper">

                {/* 1. HERO SECTION */}
                <header className="hero-section-transparent text-center px-3">
                    <div className="container">
                        <h1 className="display-4 fw-bold mb-3" style={{ color: "var(--hero-text)" }}>
                            Gestión de Supervisión y <br />
                            <span style={{ color: "#52b788" }}>Seguimiento de Proyectos</span>
                        </h1>
                        <p className="lead mb-0 mx-auto" style={{ maxWidth: "800px", opacity: 0.9, color: "var(--hero-text)" }}>
                            Optimización de indicadores, metas y ejecución en tiempo real.
                            La herramienta definitiva para el control estratégico institucional.
                        </p>
                    </div>
                </header>

                {/* 2. BENEFIT CARDS SECTION (Mismo fondo) */}
                <section className="pb-5">
                    <div className="container pb-5">
                        <div className="row g-4 justify-content-center">
                            {/* Tarjeta 1 */}
                            <div className="col-md-4">
                                <div className="benefit-card-elegant shadow-lg">
                                    <i className="fa-regular fa-clock mb-3" style={{ fontSize: "2.5rem", color: "#52b788" }}></i>
                                    <h4 className="fw-bold mb-3">Tiempo Real</h4>
                                    <p className="small opacity-75">Control de indicadores y metas de manera constante para decisiones precisas.</p>
                                </div>
                            </div>

                            {/* Tarjeta 2 */}
                            <div className="col-md-4">
                                <div className="benefit-card-elegant shadow-lg">
                                    <i className="fa-solid fa-location-dot mb-3" style={{ fontSize: "2.5rem", color: "#52b788" }}></i>
                                    <h4 className="fw-bold mb-3">Geolocalización</h4>
                                    <p className="small opacity-75">Registro exacto de intervenciones por provincia y municipio en tiempo real.</p>
                                </div>
                            </div>

                            {/* Tarjeta 3 */}
                            <div className="col-md-4">
                                <div className="benefit-card-elegant shadow-lg">
                                    <i className="fa-solid fa-chart-column mb-3" style={{ fontSize: "2.5rem", color: "#52b788" }}></i>
                                    <h4 className="fw-bold mb-3">Transparencia</h4>
                                    <p className="small opacity-75">Visualización clara de logros y reportes de progreso institucional.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};