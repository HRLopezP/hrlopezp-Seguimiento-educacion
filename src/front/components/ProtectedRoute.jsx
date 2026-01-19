import React from "react";
import { Navigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

const ProtectedRoute = ({ children }) => {
    const { store } = useGlobalReducer();

    // Si no hay token, el usuario no es bienvenido aquí.
    // Lo redirigimos al login de inmediato.
    if (!store.token) {
        return <Navigate to="/login" replace />;
    }

    // Si hay token, lo dejamos pasar a ver el contenido (children)
    return children;
};

export default ProtectedRoute;