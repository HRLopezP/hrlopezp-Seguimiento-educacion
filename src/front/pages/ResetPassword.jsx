import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Toaster, toast } from "sonner";
import "../styles/auth.css"; // Estilos base
import "../styles/resetPassword.css"; // Estilos específicos

const urlBase = import.meta.env.VITE_BACKEND_URL;

const passwordRequirements = [
    { key: 'minLength', label: 'Mínimo 8 caracteres', regex: /.{8,}/ },
    { key: 'lowerCase', label: 'Al menos una letra minúscula', regex: /[a-z]/ },
    { key: 'upperCase', label: 'Al menos una letra mayúscula', regex: /[A-Z]/ },
    { key: 'number', label: 'Al menos un número', regex: /[0-9]/ },
    { key: 'specialChar', label: 'Al menos un caracter especial', regex: /[!@#$%^&*()-+\.]/ },
];

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [loading, setLoading] = useState(false);

    const [passwordValidity, setPasswordValidity] = useState({
        minLength: false, lowerCase: false, upperCase: false, number: false, specialChar: false,
    });

    const validatePassword = (value) => {
        const newValidity = {};
        passwordRequirements.forEach(req => {
            newValidity[req.key] = req.regex.test(value);
        });
        setPasswordValidity(newValidity);
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        validatePassword(value);
    };

    const isPasswordValid = Object.values(passwordValidity).every(isValid => isValid);
    const shouldShowRequirements = isPasswordFocused || password.length > 0;
    const passwordsDoNotMatch = confirmPassword.length > 0 && password !== confirmPassword;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isPasswordValid) return toast.error("La contraseña no es segura.");
        if (password !== confirmPassword) return toast.error("Las contraseñas no coinciden.");

        setLoading(true);
        try {
            const response = await fetch(`${urlBase}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password })
            });

            if (response.ok) {
                toast.success("¡Contraseña actualizada con éxito!");
                setTimeout(() => navigate("/login"), 2000);
            } else {
                const data = await response.json();
                toast.error(data.message || "Error al restablecer");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <Toaster position="top-center" richColors />
            <div className="container">
                <div className="row justify-content-center w-100">
                    <div className="col-12 col-md-6 col-lg-5">
                        <div className="auth-card">
                            <div className="auth-header text-center">
                                <h2 className="mb-0">SIGSSEP</h2>
                                <p className="mb-0 opacity-75">Nueva Contraseña</p>
                            </div>
                            <div className="auth-body">
                                <form onSubmit={handleSubmit}>
                                    
                                    <div className="mb-3">
                                        <label className="auth-label">Nueva Contraseña</label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className={`form-control auth-input ${password.length > 0 && (isPasswordValid ? 'border-success' : 'border-danger')}`}
                                                value={password}
                                                onChange={handlePasswordChange}
                                                onFocus={() => setIsPasswordFocused(true)}
                                                onBlur={() => setIsPasswordFocused(false)}
                                                placeholder="Mínimo 8 caracteres"
                                                required
                                            />
                                            <button 
                                                className="btn auth-input border-start-0" 
                                                type="button" 
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{color: 'var(--text-primary)'}}></i>
                                            </button>
                                        </div>
                                    </div>

                                    {shouldShowRequirements && (
                                        <div className="password-requirements-box mb-3">
                                            <ul className="list-unstyled mb-0">
                                                {passwordRequirements.map(req => {
                                                    const isCompleted = passwordValidity[req.key];
                                                    return (
                                                        <li key={req.key} className="d-flex align-items-center mb-1">
                                                            <i className={`fa-solid ${isCompleted ? 'fa-circle-check' : 'fa-circle-xmark'} me-2`}
                                                                style={{ color: isCompleted ? 'var(--accent-color)' : '#e63946', fontSize: '0.8rem' }}></i>
                                                            <span className="requirement-text">{req.label}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <label className="auth-label">Confirmar Contraseña</label>
                                        <div className="input-group">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                className={`form-control auth-input ${confirmPassword.length > 0 && (password === confirmPassword ? 'border-success' : 'border-danger')}`}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Repite tu contraseña"
                                                required
                                            />
                                            <button 
                                                className="btn auth-input border-start-0" 
                                                type="button" 
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{color: 'var(--text-primary)'}}></i>
                                            </button>
                                        </div>
                                        {passwordsDoNotMatch && (
                                            <small className="text-danger mt-1 d-block">Las contraseñas no coinciden</small>
                                        )}
                                    </div>

                                    <button type="submit" className="auth-btn-submit w-100" disabled={loading || !isPasswordValid || password !== confirmPassword}>
                                        {loading ? "Procesando..." : "Actualizar Contraseña"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;