import { Outlet } from "react-router-dom" // Corregido el import
import ScrollToTop from "../components/ScrollToTop"
import { Navbar } from "../components/Navbar"
import { Footer } from "../components/Footer"
import useGlobalReducer from "../hooks/useGlobalReducer"; // Importamos el hook

export const Layout = () => {
    const { store } = useGlobalReducer(); // Accedemos al estado global para saber el tema

    return (
        /* Envolvemos todo en un div que controle el tema. 
          'min-vh-100' asegura que el fondo ocupe siempre el alto total de la pantalla.
        */
        <div data-theme={store.theme} className="min-vh-100 d-flex flex-column">
            <ScrollToTop>
                <Navbar />
                {/* Agregamos una clase para que el contenido crezca y empuje al footer */}
                <main className="flex-grow-1">
                    <Outlet />
                </main>
                <Footer />
            </ScrollToTop>
        </div>
    )
}