import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export const ProtectedRoute = ({ children }) => {
    // 1. Cambiamos 'token' por 'access_token' para que coincida con tu captura
    const token = localStorage.getItem("access_token");

    if (!token) {
        console.log("No se encontró access_token, redirigiendo...");
        return <Navigate to="/login" replace />;
    }

    try {
        const decoded = jwtDecode(token);
        console.log("Token decodificado:", decoded); // Esto te ayudará a ver qué hay dentro

        // 2. Verificamos el rol. 
        // Nota: Asegúrate que en el token diga "Gerente" (puedes verlo en jwt.io)
        if (decoded.rol === "Gerente") {
            return children;
        } else {
            console.log("Rol insuficiente:", decoded.rol);
            return <Navigate to="/denied" replace />;
        }
    } catch (error) {
        console.error("Error al decodificar token:", error);
        return <Navigate to="/login" replace />;
    }
};