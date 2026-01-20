import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Toaster, toast } from "sonner";
import "../styles/resetPassword.css";

const urlBase = import.meta.env.VITE_BACKEND_URL;

const passwordRequirements = [
    { key: 'minLength', label: 'Mínimo 8 caracteres', regex: /.{8,}/ },
    { key: 'lowerCase', label: 'Al menos una letra minúscula', regex: /[a-z]/ },
    { key: 'upperCase', label: 'Al menos una letra mayúscula', regex: /[A-Z]/ },
    { key: 'number', label: 'Al menos un número', regex: /[0-9]/ },
    { key: 'specialChar', label: 'Al menos un caracter especial (!@#$%^&*...)', regex: /[!@#$%^&*()-+\.]/ },
];

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    // Estados independientes para mostrar/ocultar contraseñas
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [loading, setLoading] = useState(false);

    const [passwordValidity, setPasswordValidity] = useState({
        minLength: false,
        lowerCase: false,
        upperCase: false,
        number: false,
        specialChar: false,
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
        if (!isPasswordValid) return toast.error("La contraseña no cumple con los niveles de seguridad.");
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
                setTimeout(() => navigate("/login"), 3000);
            } else {
                const data = await response.json();
                toast.error(data.message || "Error al restablecer la contraseña");
            }
        } catch (error) {
            toast.error("Error de conexión con el servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page-container">
            <Toaster position="top-center" richColors />
            <div className="auth-card-unified">
                <div className="auth-card-header">
                    <h2>SIGSSEP</h2>
                    <p>Actualizar Contraseña</p>
                </div>
                <div className="auth-card-body">
                    <form onSubmit={handleSubmit}>
                        
                        {/* 1. Campo Nueva Contraseña */}
                        <div className="form-group mb-3">
                            <label className="register-label mb-2">Nueva Contraseña</label>
                            <div className="input-group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className={`form-control register-input ${password.length > 0 && (isPasswordValid ? 'is-valid' : 'is-invalid')}`}
                                    value={password}
                                    onChange={handlePasswordChange}
                                    onFocus={() => setIsPasswordFocused(true)}
                                    onBlur={() => setIsPasswordFocused(false)}
                                    placeholder="Nueva contraseña..."
                                    required
                                />
                                <button
                                    className="btn btn-outline-secondary"
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        {/* Cuadro de Requisitos (Estilo Esmeralda/Rojo) */}
                        {shouldShowRequirements && (
                            <div className="password-requirements-box mb-4">
                                <h6 className="font-bold mb-2 register-label" style={{ fontSize: '0.8rem' }}>
                                    Seguridad Requerida:
                                </h6>
                                <ul className="list-unstyled mb-0">
                                    {passwordRequirements.map(req => {
                                        const isCompleted = passwordValidity[req.key];
                                        return (
                                            <li key={req.key} className="d-flex align-items-center mb-1">
                                                <i className={`fa-solid ${isCompleted ? 'fa-circle-check' : 'fa-circle-xmark'} me-2`}
                                                    style={{ color: isCompleted ? '#2D6A4F' : '#e63946', fontSize: '0.8rem' }}></i>
                                                <span className="requirement-text" style={{ fontSize: '0.75rem' }}>{req.label}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        {/* 2. Confirmar Contraseña (¡OJITO RECUPERADO!) */}
                        <div className="form-group mb-4">
                            <label className="register-label mb-2">Confirmar Contraseña</label>
                            <div className="input-group">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    className={`form-control register-input ${confirmPassword.length > 0 && (password === confirmPassword ? 'is-valid' : 'is-invalid')}`}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repite la contraseña..."
                                    required
                                />
                                <button
                                    className="btn btn-outline-secondary"
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                            {passwordsDoNotMatch && (
                                <p className="text-danger mt-2" style={{ fontSize: '0.85rem' }}>
                                    ¡Las contraseñas no coinciden!
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="register-submit-btn w-100"
                            disabled={loading || !isPasswordValid || password !== confirmPassword}
                        >
                            {loading ? "Procesando..." : "Restablecer Contraseña"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;