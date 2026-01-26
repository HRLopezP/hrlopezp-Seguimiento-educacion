import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import { Toaster, toast } from "sonner";
import "../styles/auth.css";
import "../styles/login.css";

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_BACKEND_URL;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (response.ok) {
                const { token, user } = data;
                localStorage.setItem('access_token', token);
                localStorage.setItem('user', JSON.stringify(user));
                dispatch({ type: "LOGIN", payload: { token, user } });
                toast.success(`¡Bienvenido de nuevo, ${user.name}!`);
                navigate('/');
            } else {
                setError(data.message || 'Error al iniciar sesión.');
            }
        } catch (err) {
            setError('Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page"> {/* Clase global para el fondo centrado */}
            <Toaster position="top-center" richColors />
            <div className="container">
                <div className="row justify-content-center w-100">
                    <div className="col-12 col-md-6 col-lg-5">
                        <div className="auth-card"> {/* Clase global para la tarjeta */}
                            <div className="auth-header">
                                <h2 className="mb-0">Bienvenido</h2>
                                <small className="opacity-75">Inicia sesión en SIGSSEP</small>
                            </div>

                            <div className="auth-body">
                                <form onSubmit={handleSubmit}>
                                    {error && (
                                        <div className="alert alert-danger py-2 mb-3 small">
                                            <i className="fas fa-exclamation-circle me-2"></i>{error}
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <label className="auth-label">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            className="form-control auth-input"
                                            placeholder="correo@sigssep.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="auth-label">Contraseña</label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-control auth-input"
                                                placeholder="Tu contraseña"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                            <button
                                                className="btn auth-input border-start-0"
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                                                    style={{ color: 'var(--text-primary)' }}></i>
                                            </button>
                                        </div>
                                    </div>

                                    <button type="submit" className="auth-btn-submit w-100" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Autenticando...
                                            </>
                                        ) : "Ingresar"}
                                    </button>
                                </form>

                                <div className="mt-4 text-center">
                                    <div className="d-flex justify-content-center gap-2 flex-wrap">
                                        <Link to="/register" className="login-link small">Registrarme</Link>
                                        <span className="opacity-25">|</span>
                                        <Link to="/forgot-password" className="login-link small">Olvidé mi contraseña</Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};