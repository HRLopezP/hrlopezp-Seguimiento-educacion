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
		/* Quitamos bg-dark para que use el color de nuestra variable CSS */
		<nav className="navbar navbar-expand-lg shadow-sm px-3 main-navbar">
			<div className="container-fluid">
				<Link className="navbar-brand fw-bold" to="/" style={{ color: "var(--text-primary)" }}>
					SIGSSEP
				</Link>

				<div className="ms-auto d-flex align-items-center">
					{/* Botón de Tema (Sol/Luna) siempre visible */}
					<button
						className="btn border-0 me-3 theme-toggle-btn"
						onClick={toggleTheme}
						title="Cambiar modo"
					>
						{store.theme === "light" ? (
							<i className="fa-solid fa-moon fs-5" style={{ color: "#1B263B" }}></i>
						) : (
							<i className="fa-solid fa-sun fs-5 text-warning"></i>
						)}
					</button>

					{store.token ? (
						<div className="dropdown">
							<button
								className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center rounded-pill px-3"
								type="button"
								id="userDropdown"
								data-bs-toggle="dropdown"
								aria-expanded="false"
							>
								<img
									src={store.user?.image}
									alt="profile"
									className="rounded-circle me-2"
									style={{ width: "28px", height: "28px", objectFit: "cover" }}
								/>
								<span className="small d-none d-md-inline">{store.user?.name}</span>
							</button>
							<ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2" aria-labelledby="userDropdown">
								<li>
									<div className="dropdown-item-text">
										<small className="text-muted d-block">Rol asignado:</small>
										<span className="badge bg-primary-soft text-primary">{store.user?.rol}</span>
									</div>
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
						<Link to="/login" className="btn btn-primary rounded-pill px-4 shadow-sm">
							Iniciar Sesión
						</Link>
					)}
				</div>
			</div>
		</nav>
	);
};