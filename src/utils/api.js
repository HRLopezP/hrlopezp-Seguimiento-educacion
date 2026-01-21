// src/utils/api.js
export const apiFetch = async (endpoint, options = {}) => {
    const urlBase = import.meta.env.VITE_BACKEND_URL;
    const token = localStorage.getItem("access_token");

    const defaultHeaders = {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${urlBase}${endpoint}`, config);

        // Si el token expiró, limpiamos y redirigimos
        if (response.status === 401) {
            localStorage.removeItem("access_token");
            window.location.href = "/login"; 
            return null;
        }

        return response;
    } catch (error) {
        console.error("Error en la petición:", error);
        throw error;
    }
};