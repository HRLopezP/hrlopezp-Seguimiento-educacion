import React from "react";
import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const Navbar = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

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
                <Link className="navbar-brand fw-bold fs-4" to="/" style={{ color: "var(--text-primary)" }}>
                    SIGSSEP
                </Link>

                <div className="ms-auto d-flex align-items-center">
                    {/* Botón de Tema */}
                    <button className="btn border-0 me-3 theme-toggle-btn" onClick={toggleTheme} title="Cambiar modo">
                        {store.theme === "light" ? (
                            <i className="fa-solid fa-moon fs-5" style={{ color: "#1B263B" }}></i>
                        ) : (
                            <i className="fa-solid fa-sun fs-5 text-warning"></i>
                        )}
                    </button>

                    {store.token ? (
                        /* Vista con Usuario Autenticado */
                        <div className="dropdown">
                            <button className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center rounded-pill px-2 py-1" type="button" data-bs-toggle="dropdown">
                                <img src={store.user?.image || "https://via.placeholder.com/150"} alt="profile" className="navbar-avatar" />
                                <span className="small d-none d-md-inline user-nav-name ms-2">{store.user?.name}</span>
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
                                <li className="px-3 py-2">
                                    <small className="text-muted d-block">Rol:</small>
                                    <span className="badge bg-success-soft text-success">
                                        {store.user?.rol_name || "Oficial"}
                                    </span>
                                </li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                    <button className="dropdown-item text-danger" onClick={handleLogout}>
                                        <i className="fa-solid fa-right-from-bracket me-2"></i>Cerrar Sesión
                                    </button>
                                </li>
                            </ul>
                        </div>
                    ) : (
                        /* Vista Invitado (Botones mejorados) */
                        <div className="d-flex gap-2">
                            <Link to="/login" className="btn btn-login-nav rounded-pill px-4 shadow-sm">
                                Iniciar Sesión
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