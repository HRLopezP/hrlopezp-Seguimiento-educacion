export const apiFetch = async (endpoint, options = {}) => {
  const urlBase = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("access_token");

  const defaultHeaders = {
    // EL CAMBIO ESTÁ AQUÍ: Solo agregamos JSON si no es un archivo
    ...(!(options.body instanceof FormData) && { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers, // Esto permite que si mandas headers manuales, se respeten
    },
  };

  try {
    const response = await fetch(`${urlBase}${endpoint}`, config);

    if (response.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
      return null;
    }

    return response;
  } catch (error) {
    if (error.name === "AbortError") return null;
    console.error("Error en la petición:", error);
    throw error;
  }
};