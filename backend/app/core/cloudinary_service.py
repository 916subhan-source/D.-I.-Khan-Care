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

def optimize_cloudinary_url(url: Optional[str], width: int = 600) -> Optional[str]:
    """
    Injects automatic format (f_auto -> AVIF/WebP), intelligent compression (q_auto:eco),
    and responsive dimensions into Cloudinary URLs for ultra-fast CDN delivery.
    """
    if not url or "res.cloudinary.com" not in url or "/upload/" not in url:
        return url

    upload_idx = url.find("/upload/")
    if upload_idx == -1:
        return url

    prefix = url[:upload_idx + 8]
    suffix = url[upload_idx + 8:]

    # If the URL already contains transformation segments, strip them out first
    if any(suffix.startswith(k) for k in ["f_auto", "w_", "q_", "c_"]):
        slash_idx = suffix.find("/")
        if slash_idx != -1:
            suffix = suffix[slash_idx + 1:]

    return f"{prefix}f_auto,q_auto:eco,w_{width},c_fill,g_face,dpr_auto/{suffix}"

def upload_doctor_photo(file_bytes: bytes, doctor_id: str) -> Optional[str]:
    """
    Uploads a doctor profile picture to Cloudinary with automatic face-detection,
    smart cropping, format/quality optimization, and eager edge CDN caching.
    """
    configure_cloudinary()
    try:
        res = cloudinary.uploader.upload(
            file_bytes,
            folder="dikhan_doctors",
            public_id=f"doc_{doctor_id}",
            overwrite=True,
            resource_type="image",
            eager=[
                {
                    "width": 600,
                    "height": 600,
                    "crop": "fill",
                    "gravity": "face",
                    "quality": "auto:eco",
                    "fetch_format": "auto"
                }
            ],
            eager_async=False
        )
        raw_url = res.get("secure_url")
        return optimize_cloudinary_url(raw_url, 600)
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

def upload_loyalty_card_photo(file_bytes: bytes, doctor_id: str) -> Optional[str]:
    """
    Uploads a doctor's VIP loyalty card image to Cloudinary with quality & format optimization.
    """
    configure_cloudinary()
    try:
        res = cloudinary.uploader.upload(
            file_bytes,
            folder="dikhan_loyalty_cards",
            public_id=f"loyalty_{doctor_id}",
            overwrite=True,
            resource_type="image",
            eager=[
                {
                    "quality": "auto:eco",
                    "fetch_format": "auto"
                }
            ],
            eager_async=False
        )
        raw_url = res.get("secure_url")
        return raw_url
    except Exception as e:
        print(f"Cloudinary loyalty card upload error: {e}")
        raise e
