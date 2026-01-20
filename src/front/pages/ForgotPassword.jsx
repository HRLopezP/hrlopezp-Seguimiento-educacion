import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast, Toaster } from "sonner"; // Importamos Toaster para asegurar que se vea
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
        <div className="auth-page-container">
            <Toaster position="top-center" richColors />
            <div className="auth-card-unified">
                <div className="auth-card-header">
                    <h2>SIGSSEP</h2>
                    <p>Recuperar Acceso</p>
                </div>
                <div className="auth-card-body">
                    {!isSent ? (
                        // VISTA 1: FORMULARIO ORIGINAL
                        <form onSubmit={handleSubmit} className="forgot-form">
                            <p className="instruction-text">
                                Ingresa tu correo institucional y te enviaremos un enlace seguro para restablecer tu contraseña.
                            </p>

                            <div className="input-group-sigssep">
                                <label htmlFor="email">Correo Institucional</label>
                                <input
                                    type="email"
                                    id="email"
                                    placeholder="ejemplo@sigssep.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn-primary-sigssep" disabled={loading}>
                                {loading ? (
                                    <span><i className="fas fa-spinner fa-spin me-2"></i> Enviando...</span>
                                ) : (
                                    "Enviar Enlace de Recuperación"
                                )}
                            </button>
                        </form>
                    ) : (
                        // VISTA 2: MENSAJE DE ÉXITO (EMERALD GREEN)
                        <div className="success-message-container text-center py-4">
                            <div className="success-icon">
                                <i className="fas fa-paper-plane fa-3x"></i>
                            </div>
                            <h4>¡Correo Enviado!</h4>
                            <p className="instruction-text">
                                Hemos enviado un enlace a <strong>{email}</strong>. <br />
                                Por favor, revisa tu bandeja de entrada para continuar.
                            </p>
                            <button
                                className="retry-btn"
                                onClick={() => setIsSent(false)}
                            >
                                <i className="fas fa-redo me-2"></i>¿No recibiste nada? Reintentar
                            </button>
                        </div>
                    )}
                    <div className="text-center mt-3 border-top pt-3">
                        <Link to="/login" className="back-link">
                            <i className="fas fa-arrow-left me-2"></i>Volver al inicio de sesión
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;