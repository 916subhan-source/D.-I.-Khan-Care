import os
import urllib.parse
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
from typing import Optional
from app.core.config import settings

def configure_cloudinary():
    load_dotenv()
    cloudinary_url = getattr(settings, 'CLOUDINARY_URL', None) or os.getenv("CLOUDINARY_URL")
    if not cloudinary_url:
        return False
    try:
        parsed = urllib.parse.urlparse(cloudinary_url)
        cloudinary.config(
            cloud_name=parsed.hostname,
            api_key=parsed.username,
            api_secret=parsed.password,
            secure=True
        )
        return True
    except Exception as e:
        print(f"Failed to configure Cloudinary: {e}")
        return False

# Initialize on module load
configure_cloudinary()

def upload_doctor_photo(file_bytes: bytes, doctor_id: str) -> Optional[str]:
    """
    Uploads a doctor profile picture to Cloudinary with automatic face-detection,
    smart cropping, and format/quality optimization.
    """
    configure_cloudinary()
    try:
        res = cloudinary.uploader.upload(
            file_bytes,
            folder="dikhan_doctors",
            public_id=f"doc_{doctor_id}",
            overwrite=True,
            resource_type="image",
            transformation=[
                {"width": 800, "height": 800, "crop": "fill", "gravity": "face"},
                {"quality": "auto"},
                {"fetch_format": "auto"}
            ]
        )
        return res.get("secure_url")
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        raise e

def delete_doctor_photo(doctor_id: str) -> bool:
    """
    Deletes the doctor's custom photo from Cloudinary.
    """
    configure_cloudinary()
    try:
        cloudinary.uploader.destroy(f"dikhan_doctors/doc_{doctor_id}")
        return True
    except Exception as e:
        print(f"Cloudinary delete error: {e}")
        return False
