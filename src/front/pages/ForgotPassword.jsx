import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner"; // Usamos Sonner para notificaciones profesionales
import "../styles/forgotPassword.css"; 


const urlBase = import.meta.env.VITE_BACKEND_URL

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

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
                toast.success(data.message || "Enlace enviado. Revisa tu correo.");
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
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <div className="card-header-sigssep text-center">
                    <h2 className="brand-logo">SIGSSEP</h2>
                    <p className="subtitle">Recuperar Acceso</p>
                </div>
                
                <form onSubmit={handleSubmit} className="forgot-form">
                    <p className="instruction-text">
                        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
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
                        {loading ? "Enviando..." : "Enviar Enlace de Recuperación"}
                    </button>
                </form>

                <div className="card-footer-sigssep text-center">
                    <Link to="/login" className="back-link">
                        <i className="fas fa-arrow-left"></i> Volver al Inicio de Sesión
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;