import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Toaster, toast } from "sonner";
import "../styles/auth.css";

const initialUserState = {
    name: "",
    lastname: "",
    email: "",
    password: "",
    confirmPassword: ""
};

const passwordRequirements = [
    { key: 'minLength', label: 'Mínimo 8 caracteres', regex: /.{8,}/ },
    { key: 'lowerCase', label: 'Al menos una letra minúscula', regex: /[a-z]/ },
    { key: 'upperCase', label: 'Al menos una letra mayúscula', regex: /[A-Z]/ },
    { key: 'number', label: 'Al menos un número', regex: /[0-9]/ },
    { key: 'specialChar', label: 'Al menos un caracter especial (!@#$%^&*...)', regex: /[!@#$%^&*()-+\.]/ },
];

const Register = () => {
    const [user, setUser] = useState(initialUserState);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [passwordValidity, setPasswordValidity] = useState({
        minLength: false, lowerCase: false, upperCase: false, number: false, specialChar: false,
    });

    const navigate = useNavigate();

    const validatePassword = (password) => {
        const newValidity = {};
        passwordRequirements.forEach(req => {
            newValidity[req.key] = req.regex.test(password);
        });
        setPasswordValidity(newValidity);
    };

    const handleChange = ({ target }) => {
        const { name, value } = target;
        setUser(prev => ({ ...prev, [name]: value }));
        if (name === 'password') validatePassword(value);
    };

    const isPasswordValid = Object.values(passwordValidity).every(v => v);
    const isFormIncomplete = !user.email || !user.name || !user.lastname || !isPasswordValid || user.password !== user.confirmPassword;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: user.name,
                    lastname: user.lastname,
                    email: user.email,
                    password: user.password
                })
            });

            if (res.ok) {
                toast.success("¡Registro exitoso! Bienvenido");
                setTimeout(() => navigate("/login"), 1500);
            } else {
                const data = await res.json();
                toast.error(data.message || "Error al registrar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        }
    };

    return (
        <div className="auth-page">
            <Toaster position="top-center" richColors />
            <div className="container">
                <div className="row justify-content-center w-100">
                    <div className="col-12 col-md-8 col-lg-6">
                        <div className="auth-card">
                            <div className="auth-header">
                                <h2 className="mb-0">Crea tu cuenta</h2>
                                <small className="opacity-75">Únete al sistema SIGSSEP</small>
                            </div>

                            <div className="auth-body">
                                <form onSubmit={handleSubmit}>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="auth-label">Nombre</label>
                                            <input
                                                type="text" name="name" className="form-control auth-input"
                                                placeholder="Ej. Jhon" value={user.name} onChange={handleChange} required
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="auth-label">Apellido</label>
                                            <input
                                                type="text" name="lastname" className="form-control auth-input"
                                                placeholder="Ej. Doe" value={user.lastname} onChange={handleChange} required
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="auth-label">Correo Electrónico</label>
                                        <input
                                            type="email" name="email" className="form-control auth-input"
                                            placeholder="correo@sigssep.com" value={user.email} onChange={handleChange} required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="auth-label">Contraseña</label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword ? "text" : "password"} name="password"
                                                className={`form-control auth-input ${user.password.length > 0 && (isPasswordValid ? 'is-valid' : 'is-invalid')}`}
                                                placeholder="******************" value={user.password}
                                                onChange={handleChange} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)} required
                                            />
                                            <button className="btn auth-input border-start-0" type="button" onClick={() => setShowPassword(!showPassword)}>
                                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{color: 'var(--text-primary)'}}></i>
                                            </button>
                                        </div>

                                        {(isPasswordFocused || user.password.length > 0) && (
                                            <div className="mt-3 p-3 rounded shadow-inner border" style={{backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.1)'}}>
                                                <h6 className="auth-label border-bottom pb-1 mb-2">Seguridad Requerida:</h6>
                                                <ul className="list-unstyled mb-0">
                                                    {passwordRequirements.map(req => (
                                                        <li key={req.key} className="d-flex align-items-center mb-1 small">
                                                            <i className={`fa-solid ${passwordValidity[req.key] ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'} me-2`}></i>
                                                            <span style={{color: 'var(--text-primary)'}}>{req.label}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <label className="auth-label">Confirmar Contraseña</label>
                                        <div className="input-group">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"} name="confirmPassword"
                                                className={`form-control auth-input ${user.confirmPassword.length > 0 && (user.password === user.confirmPassword ? 'is-valid' : 'is-invalid')}`}
                                                placeholder="******************" value={user.confirmPassword} onChange={handleChange} required
                                            />
                                            <button className="btn auth-input border-start-0" type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{color: 'var(--text-primary)'}}></i>
                                            </button>
                                        </div>
                                        {user.confirmPassword && user.password !== user.confirmPassword && (
                                            <p className="text-danger small mt-2">¡Las contraseñas no coinciden!</p>
                                        )}
                                    </div>

                                    <button type="submit" className="auth-btn-submit w-100" disabled={isFormIncomplete}>
                                        Registrarme Ahora
                                    </button>

                                    <div className="mt-4 text-center">
                                        <Link to="/login" className="text-decoration-none small" style={{color: 'var(--text-primary)'}}>
                                            ¿Ya tienes cuenta? Inicia sesión
                                        </Link>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;