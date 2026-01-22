import React, { useState, useEffect } from "react";
import { apiFetch } from "../../utils/api";
import { uploadImage } from "../../utils/cloudinary";
import { toast, Toaster } from "sonner";
import "../styles/profile.css";

const Profile = () => {
    const [user, setUser] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(false); // Nuevo estado para errores

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await apiFetch("/user/profile");
                if (res && res.ok) { // Verificamos que res exista y sea ok
                    const data = await res.json();
                    setUser(data);
                } else {
                    console.error("Error en la respuesta del servidor");
                }
            } catch (err) {
                console.error("Error de conexión:", err);
            }
        };
        fetchProfile();
    }, []);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validación de tamaño (opcional pero profesional: max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return toast.error("La imagen es muy pesada (máximo 2MB)");
        }

        try {
            setUploading(true);
            toast.info("Subiendo imagen a la nube...");

            const imageUrl = await uploadImage(file);

            const res = await apiFetch("/user/update-photo", {
                method: "PATCH",
                body: JSON.stringify({ profile_picture: imageUrl })
            });

            if (res?.ok) {
                const data = await res.json();
                // Si el backend devuelve 'image', asegúrate de usar ese nombre
                setUser(prev => ({ ...prev, image: imageUrl }));
                toast.success("¡Foto de perfil actualizada!");
            } else {
                throw new Error("Error en el servidor");
            }
        } catch (error) {
            toast.error("Error al actualizar la foto");
        } finally {
            setUploading(false);
        }
    };

    // Si hubo error de carga
    if (error) return (
        <div className="text-center mt-5">
            <p className="text-danger">Error al conectar con el servidor.</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
    );

    // Mientras carga
    if (!user) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
            <div className="spinner-border text-info" role="status"></div>
        </div>
    );

    return (
        <div className="profile-wrapper">
            <Toaster richColors position="top-right" />
            <div className="profile-card">
                <div className="profile-header-accent"></div>
                <div className="profile-content">
                    <div className="avatar-section">
                        <div className="avatar-container">
                            <img
                                src={user.image || "URL_POR_DEFECTO"}
                                alt="Profile"
                            />
                            <label htmlFor="file-upload" className="edit-badge">
                                {uploading ? (
                                    <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                    <i className="fa-solid fa-camera"></i>
                                )}
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                hidden
                                disabled={uploading}
                            />
                        </div>
                    </div>

                    <div className="user-info text-center mt-3">
                        {/* Usamos Optional Chaining por seguridad */}
                        <h2 className="user-name">{user?.name} {user?.lastname}</h2>
                        <span className="role-badge">{user?.rol_name || "Oficial"}</span>
                        <p className="user-email text-muted">{user?.email}</p>
                    </div>

                    <hr className="my-4 divider" />

                    <div className="profile-actions d-grid gap-2">
                        <button className="btn-profile-edit">Editar Datos Personales</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;