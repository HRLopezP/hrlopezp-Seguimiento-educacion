export const apiFetch = async (endpoint, options = {}) => {
  const urlBase = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("access_token");

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers, 
  };


  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    ...options,
    headers,
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

    console.error("Error en la comunicación con la API:", error);
    throw error;
  }
};