import React from "react";
import { Navigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

const ManagerRoute = ({ children }) => {
    const { store } = useGlobalReducer();

    // 1. Primero verificamos si hay token. Si no hay, ¡fuera!
    if (!store.token) {
        return <Navigate to="/login" replace />;
    }

    // 2. Si hay token, verificamos si el rol es el correcto.
    // Usamos el campo 'rol' que viene en el objeto 'user' de tu store
    if (store.user?.rol !== "Gerente") {
        console.warn("Acceso denegado: Se requiere rol de Gerente.");
        // Si es un Oficial intentando entrar a zona de Gerentes, 
        // lo mandamos a la Home (o una página de acceso denegado)
        return <Navigate to="/denied" replace />;
    }

    // 3. Si es Gerente, lo dejamos pasar
    return children;
};

export default ManagerRoute;