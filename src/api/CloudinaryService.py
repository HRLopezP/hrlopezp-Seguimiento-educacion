import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

load_dotenv()

# Configuración centralizada
cloudinary.config(
    cloud_name = os.getenv('VITE_CLOUDINARY_CLOUD_NAME'),
    api_key = os.getenv('CLOUDINARY_API_KEY'),
    api_secret = os.getenv('CLOUDINARY_API_SECRET'),
    secure = True
)

class CloudinaryService:
    @staticmethod
    def upload_file(file, folder="sigssep_general"):
        """
        Sube un archivo y retorna (url, public_id).
        """
        try:
            result = cloudinary.uploader.upload(
                file,
                folder=folder,
                resource_type="auto"
            )
            return result.get("secure_url"), result.get("public_id")
        except Exception as e:
            print(f"Error en Cloudinary Upload: {str(e)}")
            return None, None

    @staticmethod
    def delete_file(public_id):
        """
        Elimina un archivo de la nube usando su ID único.
        Es la forma más segura y profesional.
        """
        if not public_id: 
            return False
        try:
            res = cloudinary.uploader.destroy(public_id)
            return res.get("result") == "ok"
        except Exception as e:
            print(f"Error al eliminar en Cloudinary: {str(e)}")
            return False

    @staticmethod
    def validate_cloudinary_url(url):
        """
        Verifica si una URL pertenece a nuestra cuenta de Cloudinary.
        """
        if not url: return False
        cloud_name = os.getenv('VITE_CLOUDINARY_CLOUD_NAME')
        return f"res.cloudinary.com/{cloud_name}" in url