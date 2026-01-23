export const initialStore = () => {
  return {
    token: localStorage.getItem("access_token") ?? null,
    user: JSON.parse(localStorage.getItem("user")) ?? null,
    // Leemos el tema del localStorage o usamos 'light' por defecto
    theme: localStorage.getItem("theme") ?? "light",
  };
};

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    case "TOGGLE_THEME":
      const newTheme = store.theme === "light" ? "dark" : "light";
      localStorage.setItem("theme", newTheme); // Guardamos la elección
      return {
        ...store,
        theme: newTheme,
      };

    case "LOGIN":
      // Guardamos en el baúl (localStorage) para que sobreviva al F5
      localStorage.setItem("access_token", action.payload.token);
      localStorage.setItem("user", JSON.stringify(action.payload.user));

      return {
        ...store,
        token: action.payload.token,
        user: action.payload.user,
      };

    case "LOGOUT":
      localStorage.removeItem("access_token"); // ¡No olvides limpiar el storage!
      localStorage.removeItem("user");
      return {
        ...store,
        token: null,
        user: null,
      };

    case "SET_TOKEN":
      return {
        ...store,
        token: action.payload,
      };

    case "SET_USER":
      // ¡Importante! Guardamos en el localStorage para que el cambio sea permanente
      localStorage.setItem("user", JSON.stringify(action.payload));
      return {
        ...store,
        user: action.payload,
      };

    default:
      return store;
  }
}
