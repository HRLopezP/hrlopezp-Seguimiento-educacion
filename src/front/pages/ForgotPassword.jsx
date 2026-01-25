import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast, Toaster } from "sonner"; // Importamos Toaster para asegurar que se vea
import "../styles/auth.css";
import "../styles/forgotPassword.css";

const urlBase = import.meta.env.VITE_BACKEND_URL;

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSent, setIsSent] = useState(false); // Nuevo estado para controlar la vista de éxito

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`${urlBase}/request-password-reset`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Correo enviado correctamente");
                setIsSent(true); // Cambiamos a la vista de éxito
            } else {
                toast.error(data.message || "Hubo un error al procesar la solicitud.");
            }
        } catch (error) {
            toast.error("Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page"> {/* Cambiado a auth-page para consistencia de fondo */}
            <Toaster position="top-center" richColors />
            <div className="container"> {/* Agregamos container de Bootstrap */}
                <div className="row justify-content-center w-100">
                    <div className="col-12 col-md-6 col-lg-5">
                        <div className="auth-card"> {/* Usamos auth-card global */}
                            <div className="auth-header">
                                <h2 className="mb-0">SIGSSEP</h2>
                                <small className="opacity-75">Recuperar Acceso</small>
                            </div>
                            
                            <div className="auth-body">
                                {!isSent ? (
                                    <form onSubmit={handleSubmit}>
                                        <p className="instruction-text text-center mb-4">
                                            Ingresa tu correo institucional y te enviaremos un enlace seguro para restablecer tu contraseña.
                                        </p>

                                        <div className="mb-3">
                                            <label className="auth-label">Correo Institucional</label>
                                            <input
                                                type="email"
                                                className="form-control auth-input" // Usamos la clase global
                                                placeholder="ejemplo@sigssep.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <button type="submit" className="auth-btn-submit w-100" disabled={loading}>
                                            {loading ? (
                                                <span><i className="fas fa-spinner fa-spin me-2"></i> Enviando...</span>
                                            ) : (
                                                "Enviar Enlace de Recuperación"
                                            )}
                                        </button>
                                    </form>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="success-icon mb-3">
                                            <i className="fas fa-paper-plane fa-3x" style={{color: 'var(--accent-color)'}}></i>
                                        </div>
                                        <h4 style={{color: 'var(--text-primary)'}}>¡Correo Enviado!</h4>
                                        <p className="instruction-text mb-4">
                                            Hemos enviado un enlace a <strong>{email}</strong>. <br />
                                            Revisa tu bandeja de entrada.
                                        </p>
                                        <button className="retry-btn" onClick={() => setIsSent(false)}>
                                            <i className="fas fa-redo me-2"></i>¿No recibiste nada? Reintentar
                                        </button>
                                    </div>
                                )}
                                
                                <div className="mt-4 text-center border-top pt-3">
                                    <Link to="/login" className="back-link small">
                                        <i className="fas fa-arrow-left me-2"></i>Volver al inicio de sesión
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;