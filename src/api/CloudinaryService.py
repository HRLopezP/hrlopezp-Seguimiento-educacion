import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

load_dotenv()

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
        NUEVO: Esta función recibe el archivo y lo sube.
        Retorna la URL segura que nos da Cloudinary.
        """
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="auto"
        )
        return result.get("secure_url")

    @staticmethod
    def validate_cloudinary_url(url):

        cloud_name = os.getenv('VITE_CLOUDINARY_CLOUD_NAME')
        return f"res.cloudinary.com/{cloud_name}" in url

    @staticmethod
    def delete_old_image(image_url):
        if not image_url: return
        try:
            public_id = "/".join(image_url.split("/")[-2:]).split(".")[0]
            cloudinary.uploader.destroy(public_id)
            return True
        except Exception as e:
            print(f"Error al eliminar imagen vieja: {str(e)}")
            return False
        