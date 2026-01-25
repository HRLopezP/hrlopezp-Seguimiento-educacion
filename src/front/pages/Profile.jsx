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

    // Visibilidad de contraseñas
    const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
    const [passMatch, setPassMatch] = useState(true);

    // Modal de Contraseña
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
        if (name === "new" || name === "confirm") {
            setPassMatch(updatedData.new === updatedData.confirm || updatedData.confirm === "");
        }
    };

    const updatePassword = async () => {
        if (passData.new !== passData.confirm) return toast.error("Las contraseñas no coinciden");
        const res = await apiFetch("/user/change-password", {
            method: "PATCH",
            body: JSON.stringify({ current_password: passData.current, new_password: passData.new })
        });

        if (res.ok) {
            toast.success("Contraseña actualizada");
            setShowPassModal(false);
            setPassData({ current: "", new: "", confirm: "" });
        } else {
            toast.error("Contraseña actual incorrecta");
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
                setUser(data.user);
                dispatch({ type: "SET_USER", payload: data.user });
                toast.success("¡Imagen de perfil actualizada!");
            }
        } catch (error) {
            toast.error("Error al procesar la imagen");
        } finally {
            setUploading(false);
        }
    };

    if (!user) return <div className="d-flex justify-content-center p-5"><div className="spinner-border text-success"></div></div>;

    return (
        <div className="profile-wrapper">
            <Toaster richColors position="top-right" />

            <div className="profile-card shadow">
                <div className="profile-header-accent-dark">
                    <h5 className="profile-header-title">
                        <i className="fas fa-user-circle me-2"></i> Perfil de Usuario
                    </h5>
                </div>
                
                <div className="profile-content">
                    {/* Sección Avatar */}
                    <div className="avatar-section">
                        <div className="avatar-container">
                            <img
                                src={user.image || "https://via.placeholder.com/150"}
                                className="profile-avatar"
                                alt="Profile"
                            />
                            {uploading && <div className="uploading-overlay"><span className="spinner-border spinner-border-sm"></span></div>}
                            <label htmlFor="file-upload" className="edit-badge">
                                <i className="fa-solid fa-camera"></i>
                            </label>
                            <input id="file-upload" type="file" accept="image/*" hidden disabled={uploading} onChange={handleFileChange} />
                        </div>
                    </div>

                    {/* Info de Usuario */}
                    <div className="user-info text-center mt-3">
                        {isEditing ? (
                            <div className="edit-form-container px-3">
                                <input className="form-control auth-input mb-2 text-center" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nombre" />
                                <input className="form-control auth-input mb-3 text-center" value={formData.lastname} onChange={(e) => setFormData({ ...formData, lastname: e.target.value })} placeholder="Apellido" />
                                <div className="d-flex gap-2 justify-content-center">
                                    <button className="btn btn-emerald btn-sm px-4" onClick={handleUpdateProfile}>Guardar</button>
                                    <button className="btn btn-outline-secondary btn-sm px-4" onClick={() => setIsEditing(false)}>Cancelar</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="user-name">
                                    {user.name} {user.lastname}
                                    <i className="fa-solid fa-pen-to-square edit-icon-pencil ms-2" onClick={() => setIsEditing(true)}></i>
                                </h2>
                                <span className="badge role-badge-custom mb-2">{user.rol_name || "Oficial"}</span>
                                <p className="user-email">{user.email}</p>
                            </>
                        )}
                    </div>

                    <hr className="my-4 opacity-10" />

                    <div className="profile-actions">
                        <button className="btn btn-change-pass w-100" onClick={() => setShowPassModal(true)}>
                            <i className="fas fa-shield-alt me-2"></i> Cambiar contraseña
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL DE CONTRASEÑA */}
            {showPassModal && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-content card shadow-lg border-0">
                        <div className="custom-modal-header">
                            <h5 className="mb-0 fs-6"><i className="fas fa-key me-2"></i>Cambiar Contraseña</h5>
                            <button className="btn-close btn-close-white ms-auto" onClick={() => setShowPassModal(false)}></button>
                        </div>

                        <div className="card-body p-4">
                            {['current', 'new', 'confirm'].map((field) => (
                                <div className="mb-3" key={field}>
                                    <label className="auth-label mb-1">
                                        {field === 'current' ? 'Contraseña Actual' : field === 'new' ? 'Nueva Contraseña' : 'Confirmar Nueva'}
                                    </label>
                                    <div className="input-group">
                                        <input
                                            type={showPass[field] ? "text" : "password"}
                                            name={field}
                                            className={`form-control auth-input ${field === 'confirm' && !passMatch ? 'is-invalid' : ''}`}
                                            onChange={handlePassChange}
                                            value={passData[field]}
                                        />
                                        <button className="btn auth-input border-start-0" type="button" onClick={() => setShowPass({...showPass, [field]: !showPass[field]})}>
                                            <i className={`fa-solid ${showPass[field] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                        </button>
                                    </div>
                                    {field === 'confirm' && !passMatch && <small className="text-danger">Las contraseñas no coinciden</small>}
                                </div>
                            ))}

                            <div className="password-requirements-box mb-4">
                                {passwordRequirements.map(req => (
                                    <div key={req.key} className="requirement-item">
                                        <i className={`fa-solid ${passwordValidity[req.key] ? 'fa-check-circle text-success' : 'fa-circle-xmark text-danger'} me-2`}></i>
                                        {req.label}
                                    </div>
                                ))}
                            </div>

                            <div className="d-flex gap-2">
                                <button className="btn btn-emerald w-100" onClick={updatePassword} disabled={!passMatch || !passwordValidity.minLength}>Actualizar</button>
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