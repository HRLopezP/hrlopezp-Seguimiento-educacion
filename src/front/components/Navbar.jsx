import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import NotificationBadge from "./NotificationBadge";

export const Navbar = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const role = store.user?.rol_name;
    const isManager = role === "Gerente" || role === "Administrador";
    const isMonitor = role === "Monitoreo";
    const isOperationalRole = store.token && !isManager && !isMonitor;

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
                {/* --- SECCIÓN 1: MENÚ CENTRAL DINÁMICO (Solo si hay token) --- */}
                {store.token && (
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav ms-4 gap-2">
                            {/* ENLACE AL NUEVO COMPONENTE: ESTADO DE SALUD */}
                            <li className="nav-item">
                                <NavLink
                                    className={({ isActive }) => `nav-link rounded-pill px-3 ${isActive ? 'active-sigssep' : ''}`}
                                    to="/official/health-status"
                                >
                                    <i className="fas fa-heartbeat me-2 text-emerald"></i>
                                    Pulso de Proyectos
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink
                                    className={({ isActive }) => `nav-link rounded-pill px-3 ${isActive ? 'active-sigssep' : ''}`}
                                    to="/official/planning"
                                >
                                    <i className="fas fa-heartbeat me-2 text-emerald"></i>
                                    Plan
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink
                                    className={({ isActive }) => `nav-link rounded-pill px-3 ${isActive ? 'active-sigssep' : ''}`}
                                    to="/official/tracking"
                                >
                                    <i className="fas fa-heartbeat me-2 text-emerald"></i>
                                    Seguir
                                </NavLink>
                            </li>
                            {/* 1. RUTAS DE GERENTE / ADMIN (Acceso Total Organizado) */}
                            {isManager && (
                                <>
                                    <li className="nav-item">
                                        <NavLink className="nav-link" to="/manager/dashboard">
                                            <i className="fas fa-chart-line me-1"></i> Tablero
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink className="nav-link" to="manager/dashboard-plan">
                                            <i className="fas fa-chart-line me-1"></i> Planif.
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink className="nav-link" to="/manager/projects">
                                            <i className="fas fa-tasks me-1"></i> Proyectos
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        {/* Este podría llevar un badge de notificaciones luego */}
                                        <NavLink className="nav-link position-relative" to="/manager/audit-inbox">
                                            <i className="fas fa-clipboard-check me-1"></i> Auditoría
                                        </NavLink>
                                    </li>
                                    {/* Dropdown de Gestión Humana (Uso Frecuente) */}
                                    <li className="nav-item dropdown">
                                        <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                                            <i className="fas fa-users-cog me-1"></i> Organización
                                        </a>
                                        <ul className="dropdown-menu shadow-sm border-0 mt-2">
                                            <li><NavLink className="dropdown-item" to="/manager/users">Usuarios</NavLink></li>
                                            <li><NavLink className="dropdown-item" to="/manager/roles">Roles</NavLink></li>
                                            <li><NavLink className="dropdown-item" to="/manager/competences">Competencias</NavLink></li>
                                        </ul>
                                    </li>
                                    {/* Dropdown de Bancos y Catálogos (Uso Menos Frecuente) */}
                                    <li className="nav-item dropdown">
                                        <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                                            <i className="fas fa-database me-1"></i> Bancos
                                        </a>
                                        <ul className="dropdown-menu shadow-sm border-0 mt-2">
                                            <li><NavLink className="dropdown-item" to="/manager/theories">Indicadores y Teorías</NavLink></li>
                                            <li><NavLink className="dropdown-item" to="/manager/locations">Ubicaciones</NavLink></li>
                                            <li><hr className="dropdown-divider" /></li>
                                            <li><NavLink className="dropdown-item" to="/manager/catalogs/activities">Catálogo Actividades</NavLink></li>
                                            <li><NavLink className="dropdown-item" to="/manager/catalogs/verification-means">Medios de Verificación</NavLink></li>
                                        </ul>
                                    </li>
                                </>
                            )}
                            {/* 2. RUTA DE MONITOREO */}
                            {isMonitor && (
                                <li className="nav-item">
                                    <NavLink className="nav-link" to="/manager/audit-inbox">
                                        <i className="fas fa-clipboard-check me-1"></i> Auditoría de Logros
                                    </NavLink>
                                </li>
                            )}
                            {/* 3. RUTA DE OFICIAL */}
                            {isOperationalRole && (
                                <li className="nav-item">
                                    <NavLink className="nav-link" to="/official/dashboard">
                                        <i className="fas fa-calendar-alt me-1"></i> Mi Planificación
                                    </NavLink>
                                </li>
                            )}
                            {isOperationalRole && (
                                <li className="nav-item">
                                    <NavLink className="nav-link" to="/official/my-activities">
                                        <i className="fa-solid fa-inbox me-1"></i> Mis Logros
                                    </NavLink>
                                </li>
                            )}
                        </ul>
                    </div>
                )}
                {/* --- SECCIÓN 2: PARTE DERECHA (TEMA Y PERFIL ORIGINAL) --- */}
                <div className="ms-auto d-flex align-items-center">
                    {/* 3. Insertamos el Badge de Notificaciones si está logueado */}
                    {store.token && <NotificationBadge />}
                    {/* Botón de Tema */}
                    <button className="btn border-0 me-3 theme-toggle-btn" onClick={toggleTheme} title="Cambiar modo">
                        {store.theme === "light" ? (
                            <i className="fa-solid fa-moon fs-5" style={{ color: "#1B263B" }}></i>
                        ) : (
                            <i className="fa-solid fa-sun fs-5 text-warning"></i>
                        )}
                    </button>
                    {store.token ? (
                        /* --- DROPDOWN DE PERFIL --- */
                        <div className="dropdown">
                            <button className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center rounded-pill px-2 py-1" type="button" data-bs-toggle="dropdown">
                                <img
                                    src={store.user?.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + store.user?.name}
                                    alt="profile"
                                    className="navbar-avatar"
                                    style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} // Aseguramos el estilo inline si no está en CSS
                                />
                                <span className="small d-none d-md-inline user-nav-name ms-2">{store.user?.name}</span>
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2 p-2">
                                <li className="px-3 py-2">
                                    <small className="dropdown-label d-block mb-1">Sesión activa como:</small>
                                    <span className={`badge ${role === 'Gerente' || role === 'Administrador' ? 'bg-oxford' : 'bg-emerald-soft'} w-100 role-badge`}>
                                        {role || "Oficial"}
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
                        /* Botones de Login/Registro */
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