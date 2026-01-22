import cloudinary
import cloudinary.uploader
import os

# Configuración centralizada
cloudinary.config(
    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key = os.getenv('CLOUDINARY_API_KEY'),
    api_secret = os.getenv('CLOUDINARY_API_SECRET'),
    secure = True
)

class CloudinaryService:
    @staticmethod
    def delete_old_image(image_url):
        """
        Elimina una imagen de Cloudinary si el usuario la cambia,
        para no llenar tu nube de archivos basura.
        """
        if not image_url:
            return
        
        try:
            # Extraemos el 'public_id' de la URL (lo que Cloudinary usa para identificar archivos)
            # Ejemplo: .../sigssep_profile/foto1.jpg -> sigssep_profile/foto1
            public_id = "/".join(image_url.split("/")[-2:]).split(".")[0]
            cloudinary.uploader.destroy(public_id)
            return True
        except Exception as e:
            print(f"Error al eliminar imagen vieja: {str(e)}")
            return False

    @staticmethod
    def validate_cloudinary_url(url):
        """Verifica que la URL provenga realmente de tu cuenta de Cloudinary"""
        return "res.cloudinary.com/dowqpndnq" in url