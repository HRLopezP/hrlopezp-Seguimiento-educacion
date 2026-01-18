import { json } from "react-router-dom";
import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Toaster, toast } from "sonner";
import "../styles/register.css";


const initialUserState = {
    name: "",
    lastname: "",
    email: "",
    password: "",
    confirmPassword: ""
}

const urlBase = import.meta.env.VITE_BACKEND_URL

const passwordRequirements = [
    { key: 'minLength', label: 'Mínimo 8 caracteres', regex: /.{8,}/ },
    { key: 'lowerCase', label: 'Al menos una letra minúscula', regex: /[a-z]/ },
    { key: 'upperCase', label: 'Al menos una letra mayúscula', regex: /[A-Z]/ },
    { key: 'number', label: 'Al menos un número', regex: /[0-9]/ },
    { key: 'specialChar', label: 'Al menos un caracter especial (!@#$%^&*...)', regex: /[!@#$%^&*()-+\.]/ },
];

const Register = () => {
    const [user, setUser] = useState(initialUserState)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [passwordValidity, setPasswordValidity] = useState({
        minLength: false,
        lowerCase: false,
        upperCase: false,
        number: false,
        specialChar: false,
    });

    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const navigate = useNavigate()

    const validatePassword = (password) => {
        const newValidity = {};
        let isAllValid = true;

        passwordRequirements.forEach(req => {
            const isValid = req.regex.test(password);
            newValidity[req.key] = isValid;
            if (!isValid) {
                isAllValid = false;
            }
        });

        setPasswordValidity(newValidity);
        return isAllValid;
    };


    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };


    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    const handleChange = ({ target }) => {
        const { name, value } = target;

        setUser(prevUser => {
            const newUser = {
                ...prevUser,
                [name]: value
            };
            if (name === 'password') {
                validatePassword(value);
            }

            return newUser;
        });
    }

    const shouldShowRequirements = isPasswordFocused || user.password.length > 0;
    const isPasswordValid = Object.values(passwordValidity).every(isValid => isValid);
    const isFormIncompleteOrInvalid = !user.email || !user.name || !user.lastname || !isPasswordValid || user.password !== user.confirmPassword;


    const handleSubmit = async (event) => {
        event.preventDefault()

        if (user.password !== user.confirmPassword) {
            toast.error("Las contraseñas no coinciden. Por favor, revísalas.");
            return;
        }

        if (!isPasswordValid) {
            toast.error("La contraseña no cumple todos los requisitos de seguridad.");
            return;
        }

        const payload = {
            name: user.name,
            email: user.email,
            password: user.password,
            lastname: user.lastname,
        }

        try {
            const response = await fetch(`${urlBase}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            })

            const data = await response.json();

            if (response.ok) {
                toast.success("¡Registro exitoso! Bienvenido");
                setUser(initialUserState)
                setTimeout(() => {
                    navigate("/")
                }, 1500)
            } else if (response.status === 422) {
                toast.error("El correo ya está registrado, inicia sesión.");
            } else {
                toast.error("Error al registrar usuario, intenta nuevamente")
            }
        } catch (error) {
            toast.error("Error de conexión con el servidor. Intenta de nuevo más tarde.");
        }
    }


    return (
        <div className="register-page-container">
            <Toaster position="top-center" richColors />
            <div className="container">
                <div className="row justify-content-center w-100">
                    <div className="col-12 col-md-8 col-lg-6">
                        <div className="card register-card">
                            <div className="register-header">
                                <h2 className="mb-0">Crea tu cuenta</h2>
                                <small className="opacity-75">Únete al sistema SIGSSEP</small>
                            </div>

                            <div className="card-body register-body">
                                <form onSubmit={handleSubmit}>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="register-label">Nombre</label>
                                            <input
                                                type="text"
                                                className="form-control register-input"
                                                name="name"
                                                placeholder="Ej. Jhon"
                                                onChange={handleChange}
                                                value={user.name}
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="register-label">Apellido</label>
                                            <input
                                                type="text"
                                                className="form-control register-input"
                                                name="lastname"
                                                placeholder="Ej. Doe"
                                                onChange={handleChange}
                                                value={user.lastname}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="register-label">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            className="form-control register-input"
                                            name="email"
                                            placeholder="correo@sigssep.com"
                                            onChange={handleChange}
                                            value={user.email}
                                        />
                                    </div>

                                    <div className="form-group my-4">
                                        <label htmlFor="btnPassword" className="mb-2"><b>Contraseña:</b> </label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="******************"
                                                className={`form-control ${user.password.length > 0 && (isPasswordValid ? 'is-valid' : 'is-invalid')}`}
                                                id="btnPassword"
                                                name="password"
                                                onChange={handleChange}
                                                value={user.password}
                                                required
                                                onFocus={() => setIsPasswordFocused(true)}
                                                onBlur={() => setIsPasswordFocused(false)}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={togglePasswordVisibility}
                                            >
                                                {showPassword ? (
                                                    <i className="fa-solid fa-eye-slash"></i>
                                                ) : (
                                                    <i className="fa-solid fa-eye"></i>
                                                )}

                                            </button>
                                        </div>
                                        {shouldShowRequirements && (
                                            <div
                                                className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-inner text-sm border border-gray-300 dark:border-yellow-500 transition-opacity duration-300"
                                            >
                                                <h6 className="font-bold text-base text-gray-800 dark:text-yellow-400 mb-2 border-b border-gray-300 dark:border-yellow-600 pb-1 register-label">Seguridad Requerida:</h6>
                                                <ul className="list-unstyled space-y-1">
                                                    {passwordRequirements.map(req => {
                                                        const isCompleted = passwordValidity[req.key];
                                                        return (
                                                            <li key={req.key} className="d-flex align-items-center mb-1">
                                                                <i className={`fa-solid ${isCompleted ? 'fa-circle-check' : 'fa-circle-xmark'} me-2`}
                                                                    style={{ color: isCompleted ? '#2D6A4F' : '#e63946' }}></i>
                                                                <span className="requirement-text">{req.label}</span> {/* <--- Clase añadida */}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group my-4">
                                        <label htmlFor="btnConfirmPassword" className="mb-2"><b>Confirmar Contraseña:</b> </label>
                                        <div className="input-group">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="******************"
                                                className={`form-control ${user.confirmPassword.length > 0 && user.password.length > 0 && (user.password === user.confirmPassword ? 'is-valid' : 'is-invalid')}`}
                                                id="btnConfirmPassword"
                                                name="confirmPassword"
                                                onChange={handleChange}
                                                value={user.confirmPassword}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={toggleConfirmPasswordVisibility}
                                            >
                                                {showConfirmPassword ? (
                                                    <i className="fa-solid fa-eye-slash"></i>
                                                ) : (
                                                    <i className="fa-solid fa-eye"></i>
                                                )}
                                            </button>
                                        </div>
                                        {user.confirmPassword && user.password && user.password !== user.confirmPassword && (
                                            <p className="text-danger mt-2">¡Las contraseñas no coinciden!</p>
                                        )}
                                    </div>

                                    <button
                                        className="register-submit-btn w-100 mt-4 shadow-sm"
                                        disabled={isFormIncompleteOrInvalid}
                                    >
                                        Registrarme Ahora
                                    </button>

                                    <p className="text-center mt-3 text-sm" style={{ color: "var(--text-primary)", opacity: 0.8 }}>
                                        ¿Ya tienes una cuenta? <Link to="/login" className="login-link">Inicia sesión</Link>
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;