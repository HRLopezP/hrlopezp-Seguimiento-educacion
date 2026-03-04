/**
 * Función para subir imágenes a Cloudinary de forma profesional
 * @param {File} file - El archivo de imagen desde el input
 * @returns {Promise<Object>} - Objeto con URL e ID
 */
export const uploadImage = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) throw new Error("Error al subir imagen");

        const data = await response.json();
        
        // MODIFICACIÓN PROFESIONAL:
        // Ahora retornamos un objeto con los dos datos necesarios
        return {
            url: data.secure_url,
            public_id: data.public_id
        };
        
    } catch (error) {
        console.error("Cloudinary Error:", error);
        throw error;
    }
};