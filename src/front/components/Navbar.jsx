import React from "react";
import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const Navbar = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const canManageUsers = store.user?.rol_name === "Gerente" || store.user?.rol_name === "Administrador";

    // Verificamos si el usuario tiene competencias específicas asignadas
    const hasCompetence = (compName) => {
        return store.user?.competences?.some(c => c.name === compName);
    };

    const toggleTheme = () => {
        dispatch({ type: "TOGGLE_THEME" });
    };

    const handleLogout = () => {
        dispatch({ type: "LOGOUT" });
        navigate("/login");
    };

    return (
        <nav className="navbar navbar-expand-lg shadow-sm px-3 main-navbar sticky-top">
            <div className="container-fluid">
                <Link className="navbar-brand fw-bold fs-4 d-flex align-items-center" to="/" style={{ color: "var(--text-primary)" }}>
                    <i className="fas fa-project-diagram me-2 text-emerald"></i>
                    SIGSSEP
                </Link>

                {/* NUEVO: Menú Central Dinámico (Solo si hay token) */}
                {store.token && (
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav ms-4">
                            <li className="nav-item">
                                <Link className="nav-link" to="/dashboard">
                                    <i className="fas fa-th-large me-1"></i> Tablero
                                </Link>
                            </li>

                            {/* Renderizado basado en COMPETENCIAS */}
                            {hasCompetence("Proyectos") && (
                                <li className="nav-item">
                                    <Link className="nav-link" to="/projects">Proyectos</Link>
                                </li>
                            )}

                            {/* Renderizado basado en ROL (Gestión Humana) */}
                            {canManageUsers && (
                                <li className="nav-item">
                                    <Link className="nav-link text-emerald fw-semibold" to="/users">
                                        <i className="fas fa-users-cog me-1"></i> Gestión
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>
                )}

                <div className="ms-auto d-flex align-items-center">
                    <button className="btn border-0 me-3 theme-toggle-btn" onClick={toggleTheme} title="Cambiar modo">
                        {store.theme === "light" ? (
                            <i className="fa-solid fa-moon fs-5" style={{ color: "#1B263B" }}></i>
                        ) : (
                            <i className="fa-solid fa-sun fs-5 text-warning"></i>
                        )}
                    </button>

                    {store.token ? (
                        <div className="dropdown">
                            <button className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center rounded-pill px-2 py-1" type="button" data-bs-toggle="dropdown">
                                <img
                                    src={store.user?.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + store.user?.name}
                                    alt="profile"
                                    className="navbar-avatar"
                                />
                                <span className="small d-none d-md-inline user-nav-name ms-2">{store.user?.name}</span>
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2 p-2">
                                <li className="px-3 py-2">
                                    <small className="dropdown-label d-block mb-1">Sesión activa como:</small>
                                    <span className={`badge ${store.user?.rol_name === 'Gerente' ? 'bg-oxford' : 'bg-emerald-soft'} w-100`}>
                                        {store.user?.rol_name || "Oficial"}
                                    </span>
                                </li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                    <Link className="dropdown-item rounded-2" to="/profile">
                                        <i className="fa-solid fa-user-pen me-2"></i>Mi Perfil
                                    </Link>
                                </li>
                                <li>
                                    <button className="dropdown-item text-danger rounded-2" onClick={handleLogout}>
                                        <i className="fa-solid fa-right-from-bracket me-2"></i>Cerrar Sesión
                                    </button>
                                </li>
                            </ul>
                        </div>
                    ) : (
                        <div className="d-flex gap-2">
                            <Link to="/login" className="btn btn-login-nav rounded-pill px-4 shadow-sm">
                                Ingresar
                            </Link>
                            <Link to="/register" className="btn btn-register-nav rounded-pill px-4">
                                Registro
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};