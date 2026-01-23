import React, { useState, useEffect } from "react";
import { apiFetch } from "../../utils/api";
import { toast, Toaster } from "sonner";
import "../styles/profile.css";
import useGlobalReducer from '../hooks/useGlobalReducer';
import { uploadImage } from "../../utils/cloudinary";

const passwordRequirements = [
    { key: 'minLength', label: 'Mínimo 8 caracteres', regex: /.{8,}/ },
    { key: 'lowerCase', label: 'Al menos una letra minúscula', regex: /[a-z]/ },
    { key: 'upperCase', label: 'Al menos una letra mayúscula', regex: /[A-Z]/ },
    { key: 'number', label: 'Al menos un número', regex: /[0-9]/ },
    { key: 'specialChar', label: 'Al menos un caracter especial', regex: /[!@#$%^&*()-+\.]/ },
];

const Profile = () => {
    const { store, dispatch } = useGlobalReducer();
    const [user, setUser] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: "", lastname: "" });

    // Estados para visibilidad de contraseña (los "ojitos")
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passMatch, setPassMatch] = useState(true);

    // Estados para el Modal de Contraseña
    const [showPassModal, setShowPassModal] = useState(false);
    const [passData, setPassData] = useState({ current: "", new: "", confirm: "" });
    const [passwordValidity, setPasswordValidity] = useState({});

    useEffect(() => {
        const fetchProfile = async () => {
            const res = await apiFetch("/user/profile");
            if (res?.ok) {
                const data = await res.json();
                setUser(data);
                setFormData({ name: data.name, lastname: data.lastname });
            }
        };
        fetchProfile();
    }, []);

    const validatePassword = (pass) => {
        const newValidity = {};
        passwordRequirements.forEach(req => {
            newValidity[req.key] = req.regex.test(pass);
        });
        setPasswordValidity(newValidity);
    };

    const handlePassChange = (e) => {
        const { name, value } = e.target;
        const updatedData = { ...passData, [name]: value };
        setPassData(updatedData);

        if (name === "new") validatePassword(value);

        // Validación de coincidencia en tiempo real
        if (name === "new" || name === "confirm") {
            setPassMatch(updatedData.new === updatedData.confirm || updatedData.confirm === "");
        }
    };

    const updatePassword = async () => {
        if (passData.new !== passData.confirm) return toast.error("Las contraseñas no coinciden");

        const res = await apiFetch("/user/change-password", {
            method: "PATCH",
            body: JSON.stringify({
                current_password: passData.current,
                new_password: passData.new
            })
        });

        if (res.ok) {
            toast.success("Contraseña actualizada correctamente");
            setShowPassModal(false);
            setPassData({ current: "", new: "", confirm: "" });
        } else {
            toast.error("Error: La contraseña actual es incorrecta");
        }
    };

    const handleUpdateProfile = async () => {
        const res = await apiFetch("/user/update-profile", {
            method: "PATCH",
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            dispatch({ type: "SET_USER", payload: data.user });
            setIsEditing(false);
            toast.success("¡Datos actualizados!");
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const imageUrl = await uploadImage(file);

            const res = await apiFetch("/user/update-avatar", {
                method: "PATCH",
                body: JSON.stringify({ image_url: imageUrl }),
            });

            if (res.ok) {
                const data = await res.json();
                // Actualizamos el estado local
                setUser(data.user);
                // ¡Actualizamos el store global para que se vea en el Navbar!
                dispatch({ type: "SET_USER", payload: data.user });
                toast.success("¡Imagen de perfil actualizada!");
            }
        } catch (error) {
            toast.error("Error al procesar la imagen");
        } finally {
            setUploading(false);
        }
    };

    if (!user) return <div className="spinner-border text-info m-5"></div>;

    return (
        <div className="profile-wrapper">
            <Toaster richColors position="top-right" />

            <div className="profile-card card shadow">
                <div className="profile-header-accent-dark d-flex px-4">
                    {/* Quitamos mt-1 y dejamos que el padding del padre haga el trabajo */}
                    <h5 className="mb-0 fs-6 text-white">
                        <i className="fas fa-user-circle me-2"></i> Perfil de Usuario
                    </h5>
                </div>
                <div className="profile-content card-body">
                    {/* Sección Avatar */}
                    <div className="avatar-section text-center">
                        <div className="avatar-container"> {/* Quitamos las clases de Bootstrap aquí para usar nuestro CSS personalizado */}
                            <img
                                src={user.image || "https://via.placeholder.com/150"}
                                className="profile-avatar"
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
                                hidden
                                disabled={uploading}
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    {/* Info de Usuario */}
                    <div className="user-info text-center mt-3">
                        {isEditing ? (
                            <div className="px-4">
                                <input
                                    className="form-control mb-2 text-center input-edit-profile"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Nombre"
                                />
                                <input
                                    className="form-control mb-2 text-center input-edit-profile"
                                    value={formData.lastname}
                                    onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                                    placeholder="Apellido"
                                />
                                <div className="d-flex gap-2 justify-content-center">
                                    {/* Botón Esmeralda para completar */}
                                    <button className="btn btn-sm text-white" onClick={handleUpdateProfile} style={{ backgroundColor: '#10b981' }}>Guardar</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)}>Cancelar</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="user-name fw-bold d-flex align-items-center justify-content-center gap-2">
                                    {user.name} {user.lastname}
                                    <i
                                        className="fa-solid fa-pen-to-square edit-icon-pencil fs-5"
                                        onClick={() => setIsEditing(true)}
                                    ></i>
                                </h2>
                                <span className="badge rounded-pill mb-2 role-badge-custom">{user.rol_name || "Oficial"}</span>
                                <p className="text-muted">{user.email}</p>
                            </>
                        )}
                    </div>

                    <hr />

                    {/* Acciones de Seguridad */}
                    <div className="profile-actions d-grid">
                        <button className="btn btn-change-pass d-flex align-items-center justify-content-center gap-2" onClick={() => setShowPassModal(true)}>
                            <i className="fas fa-shield-alt"></i> Cambiar Contraseña
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL DE CONTRASEÑA */}
            {showPassModal && (
                <div className="custom-modal-overlay d-flex align-items-center justify-content-center">
                    <div className="custom-modal-content card shadow-lg p-0 border-0" style={{ width: '400px' }}>
                        <div className="custom-modal-header">
                            <h5 className="mb-0 fs-6">
                                <i className="fas fa-key me-2"></i>Seguridad de la Cuenta
                            </h5>
                        </div>

                        <div className="card-body p-4">
                            {/* Inputs con visibilidad toggle */}
                            {['current', 'new', 'confirm'].map((field) => (
                                <div className="mb-3" key={field}>
                                    <label className="small fw-bold mb-1">
                                        {field === 'current' ? 'Contraseña Actual' : field === 'new' ? 'Nueva Contraseña' : 'Confirmar Nueva'}
                                    </label>

                                    <div className="input-group">
                                        <input
                                            type={field === 'current' ? (showCurrent ? "text" : "password") : field === 'new' ? (showNew ? "text" : "password") : (showConfirm ? "text" : "password")}
                                            name={field}
                                            className={`form-control ${field === 'confirm' && !passMatch ? 'is-invalid' : ''}`}
                                            onChange={handlePassChange}
                                            value={passData[field]}
                                        />
                                        <button className="btn btn-outline-secondary" type="button" onClick={() => field === 'current' ? setShowCurrent(!showCurrent) : field === 'new' ? setShowNew(!showNew) : setShowConfirm(!showConfirm)}>
                                            <i className={`fa-solid ${eval(`show${field.charAt(0).toUpperCase() + field.slice(1)}`) ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                        </button>
                                    </div>
                                    {field === 'confirm' && !passMatch && <div className="invalid-feedback d-block small">Las contraseñas no coinciden</div>}
                                </div>
                            ))}

                            {/* Checklist Visual */}
                            <div className="p-2 rounded mb-3" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                                {passwordRequirements.map(req => (
                                    <div key={req.key} className="small d-flex align-items-center mb-1">
                                        <i className={`fa-solid ${passwordValidity[req.key] ? 'fa-check-circle text-success' : 'fa-circle-xmark text-danger'} me-2`}></i>
                                        {req.label}
                                    </div>
                                ))}
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    className="btn text-white w-100"
                                    style={{ backgroundColor: '#10b981', border: 'none' }}
                                    onClick={updatePassword}
                                    disabled={!passMatch}
                                >
                                    Actualizar
                                </button>
                                <button className="btn btn-light border w-100" onClick={() => setShowPassModal(false)}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;