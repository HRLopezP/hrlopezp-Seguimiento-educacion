import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export const ProtectedRoute = ({ children }) => {
    // 1. Cambiamos 'token' por 'access_token' para que coincida con tu captura
    const token = localStorage.getItem("access_token");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    try {
        const decoded = jwtDecode(token);
        // 1. Definimos quiénes pueden entrar a estas vistas
        const authorizedRoles = ["Administrador", "Gerente"];
        
        // 2. Verificamos si el rol incluido en el token tiene permiso
        if (authorizedRoles.includes(decoded.rol)) {
            return children;
        } else {
            console.log("Acceso denegado para el rol:", decoded.rol);
            return <Navigate to="/denied" replace />;
        }
    } catch (error) {
        console.error("Error en validación de ruta:", error);
        return <Navigate to="/login" replace />;
    }
};