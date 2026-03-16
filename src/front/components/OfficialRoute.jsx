import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export const OfficialRoute = ({ children }) => {
    const token = localStorage.getItem("access_token");

    if (!token) return <Navigate to="/login" replace />;

    try {
        const decoded = jwtDecode(token);
        const authorizedRoles = ["Oficial", "Coordinador", "Gerente", "Administrador"];
        
        if (authorizedRoles.includes(decoded.rol)) {
            return children;
        } else {
            return <Navigate to="/denied" replace />;
        }
    } catch (error) {
        return <Navigate to="/login" replace />;
    }
};