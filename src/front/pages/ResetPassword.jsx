import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const urlBase = import.meta.env.VITE_BACKEND_URL

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return toast.error("Las contraseñas no coinciden");
        }

        setLoading(true);
        try {
            const response = await fetch(`${urlBase}/api/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("¡Contraseña actualizada! Ahora puedes iniciar sesión.");
                setTimeout(() => navigate("/login"), 3000);
            } else {
                toast.error(data.message || "Error al restablecer la contraseña");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <h2 className="brand-logo text-center">SIGSSEP</h2>
                <p className="subtitle text-center">Nueva Contraseña</p>

                <form onSubmit={handleSubmit} className="forgot-form">
                    <div className="input-group-sigssep">
                        <label>Nueva Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 8 caracteres..."
                            required
                        />
                    </div>

                    <div className="input-group-sigssep">
                        <label>Confirmar Contraseña</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repite tu contraseña..."
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary-sigssep" disabled={loading}>
                        {loading ? "Actualizando..." : "Restablecer Contraseña"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;