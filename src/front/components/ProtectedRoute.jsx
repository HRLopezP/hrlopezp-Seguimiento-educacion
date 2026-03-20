import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

// Añadimos 'allowedRoles' como parámetro para que sea dinámico
export const ProtectedRoute = ({ children, allowedRoles = ["Administrador", "Gerente"] }) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    try {
        const decoded = jwtDecode(token);
        // El rol viene en el token (asegúrate que la clave sea 'rol' o 'rol_name' según tu JWT)
        const userRol = decoded.rol; 
        
        // Verificamos si el rol del usuario está en la lista de permitidos para ESTA ruta
        if (allowedRoles.includes(userRol)) {
            return children;
        } else {
            console.log("Acceso denegado para el rol:", userRol);
            return <Navigate to="/denied" replace />;
        }
    } catch (error) {
        console.error("Error en validación de ruta:", error);
        return <Navigate to="/login" replace />;
    }
};