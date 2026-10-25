"""
Configuration module for D.I. Khan Doctor Appointment System.
Loads environment variables with safe defaults for development and production.
"""

import os
from typing import List
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load backend/.env automatically
backend_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
load_dotenv(dotenv_path=backend_env_path, override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "D.I. Khan Doctor Appointment System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment mode
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Security & JWT
    SECRET_KEY: str = "dikhan-health-secret-key-super-secure-change-in-prod-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database — defaults to relative backend/dikhan_care.db for reliable cross-platform execution
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite+aiosqlite:///{os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'dikhan_care.db')).replace(os.sep, '/')}"
    )
    
    # Redis configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_ENABLED: bool = True
    SLOT_LOCK_TTL_SECONDS: int = 600  # 10 minutes
    OTP_TTL_SECONDS: int = 600        # 10 minutes
    MAX_OTP_ATTEMPTS: int = 3
    RATE_LIMIT_WINDOW_SECONDS: int = 900  # 15 minutes
    
    # Notification / Email (Resend.com driver or Direct Gmail SMTP)
    RESEND_API_KEY: str = ""
    SYSTEM_SENDER_EMAIL: str = "D.I. Khan Healthcare <onboarding@resend.dev>"
    
    # Direct Gmail SMTP settings (via Google App Password)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    GMAIL_USER: str = ""
    GMAIL_APP_PASSWORD: str = ""
    
    # Cloudinary image storage
    CLOUDINARY_URL: str = ""
    
    # Public Frontend Base URL for email notifications (tracking, review, desk)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://dikhan-doctor-appointment.pages.dev")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",
    ]

    class Config:
        env_file = (
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env"),
            ".env"
        )
        case_sensitive = True
        extra = "ignore"

settings = Settings()
