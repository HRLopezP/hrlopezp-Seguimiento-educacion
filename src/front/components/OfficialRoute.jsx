import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export const OfficialRoute = ({ children }) => {
    const token = localStorage.getItem("access_token");
    const location = useLocation(); 

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
            localStorage.removeItem("access_token");
            return <Navigate to="/login" state={{ from: location }} replace />;
        }

        if (decoded.sub) {
            return children;
        }

        return <Navigate to="/denied" replace />;

    } catch (error) {
        console.error("Token inválido:", error);
        localStorage.removeItem("access_token");
        return <Navigate to="/login" replace />;
    }
};