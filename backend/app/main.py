"""
FastAPI Application Entry Point for D.I. Khan Doctor Appointment System.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.core.redis import redis_manager
from app.routers import auth, doctors, booking, assistants, doctor_portal, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to Redis & Create database tables if not existing
    await redis_manager.connect()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Database schema synchronization for SQLite and PostgreSQL
        from sqlalchemy import text
        for col_name, col_type in [
            ("patient_name", "VARCHAR(120)"),
            ("patient_phone", "VARCHAR(30)"),
            ("patient_email", "VARCHAR(255)")
        ]:
            try:
                if "sqlite" in settings.DATABASE_URL:
                    await conn.execute(text(f"ALTER TABLE appointments ADD COLUMN {col_name} {col_type}"))
                else:
                    await conn.execute(text(f"ALTER TABLE appointments ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
            except Exception:
                pass

        for col_name, col_type, default_val in [
            ("profile_image", "VARCHAR(500)", None),
            ("morning_start", "VARCHAR(10)", "'09:00'"),
            ("morning_end", "VARCHAR(10)", "'13:00'"),
            ("evening_start", "VARCHAR(10)", "'17:00'"),
            ("evening_end", "VARCHAR(10)", "'21:00'")
        ]:
            try:
                default_clause = f" DEFAULT {default_val}" if default_val else ""
                if "sqlite" in settings.DATABASE_URL:
                    await conn.execute(text(f"ALTER TABLE doctors ADD COLUMN {col_name} {col_type}{default_clause}"))
                else:
                    await conn.execute(text(f"ALTER TABLE doctors ADD COLUMN IF NOT EXISTS {col_name} {col_type}{default_clause}"))
            except Exception:
                pass

        try:
            await conn.execute(text("UPDATE appointments SET patient_name = (SELECT full_name FROM users WHERE users.id = appointments.patient_id) WHERE patient_name IS NULL"))
            await conn.execute(text("UPDATE appointments SET patient_phone = (SELECT phone FROM users WHERE users.id = appointments.patient_id) WHERE patient_phone IS NULL"))
            await conn.execute(text("UPDATE appointments SET patient_email = (SELECT email FROM users WHERE users.id = appointments.patient_id) WHERE patient_email IS NULL"))
            await conn.execute(text("UPDATE doctors SET morning_start = '09:00' WHERE morning_start IS NULL"))
            await conn.execute(text("UPDATE doctors SET morning_end = '13:00' WHERE morning_end IS NULL"))
            await conn.execute(text("UPDATE doctors SET evening_start = '17:00' WHERE evening_start IS NULL"))
            await conn.execute(text("UPDATE doctors SET evening_end = '21:00' WHERE evening_end IS NULL"))
        except Exception:
            pass
    # Startup: Launch periodic 1-hour appointment reminder background runner
    # NOTE: Only runs in non-serverless environments (Vercel serverless doesn't support long-running tasks)
    import asyncio
    import os
    from app.core.database import AsyncSessionLocal
    from app.services.notification_service import notification_service

    reminder_task = None
    is_serverless = os.getenv("VERCEL", "") or os.getenv("AWS_LAMBDA_FUNCTION_NAME", "")

    if not is_serverless:
        async def periodic_1h_reminder_loop():
            """Periodically checks and sends 1-hour reminder notifications."""
            while True:
                try:
                    await asyncio.sleep(60) # Initial 1m delay, then runs every 3 minutes
                    async with AsyncSessionLocal() as session:
                        await notification_service.check_and_send_1h_reminders(session)
                except asyncio.CancelledError:
                    break
                except Exception as loop_err:
                    import logging
                    logging.getLogger("reminder_loop").warning(f"Reminder loop error: {loop_err}")
                await asyncio.sleep(180)

        reminder_task = asyncio.create_task(periodic_1h_reminder_loop())

    yield

    # Shutdown: Cancel background tasks, disconnect Redis and dispose DB pool
    if reminder_task:
        reminder_task.cancel()
        try:
            await reminder_task
        except asyncio.CancelledError:
            pass
    await redis_manager.disconnect()
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

import os
from fastapi import Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

# Configure CORS using settings with wildcards and regex support
cors_origins = list(settings.BACKEND_CORS_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if "*" not in cors_origins else ["*"],
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) or "Internal server error"}
    )

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(doctors.router, prefix=settings.API_V1_STR)
app.include_router(booking.router, prefix=settings.API_V1_STR)
app.include_router(assistants.router, prefix=settings.API_V1_STR)
app.include_router(doctor_portal.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    redis_status = "connected" if not redis_manager._use_fallback else "memory_fallback"
    return {
        "status": "healthy",
        "redis": redis_status,
        "database": "connected",
        "version": settings.VERSION
    }

@app.get("/api/v1/test-gemini")
async def test_gemini_api():
    """Tests the Gemini API key directly from the FastAPI backend."""
    import urllib.request
    import json
    import os
    from datetime import datetime, timezone

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return JSONResponse(
            status_code=500,
            content={
                "status": "ERROR",
                "backend": "FastAPI (Python)",
                "gemini_api_key_valid": False,
                "error": "GEMINI_API_KEY environment variable is not configured on this server.",
                "tested_at": datetime.now(timezone.utc).isoformat()
            }
        )
    models = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.5-flash"]
    payload = json.dumps({
        "contents": [{
            "role": "user",
            "parts": [{ "text": "Salam! Confirm in one short sentence that Gemini API is working properly on FastAPI backend." }]
        }]
    }).encode("utf-8")

    last_err = "No models reached"
    for m in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if text:
                    return {
                        "status": "SUCCESS",
                        "backend": "FastAPI (Python)",
                        "gemini_api_key_valid": True,
                        "model_used": m,
                        "ai_response": text.strip(),
                        "message": "FastAPI backend successfully communicated with Google Gemini API!",
                        "tested_at": datetime.now(timezone.utc).isoformat()
                    }
        except Exception as e:
            last_err = str(e)

    return JSONResponse(
        status_code=502,
        content={
            "status": "ERROR",
            "backend": "FastAPI (Python)",
            "gemini_api_key_valid": False,
            "error": last_err,
            "tested_at": datetime.now(timezone.utc).isoformat()
        }
    )

# Check for production frontend bundle in frontend/dist
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist) and os.path.isdir(os.path.join(frontend_dist, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        candidate_file = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(candidate_file):
            return FileResponse(candidate_file)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    async def root():
        return {
            "system": settings.PROJECT_NAME,
            "status": "online",
            "version": settings.VERSION,
            "region": "Dera Ismail Khan (D.I. Khan)",
            "docs": "/docs"
        }
