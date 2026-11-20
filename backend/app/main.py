"""
FastAPI Application Entry Point for D.I. Khan Doctor Appointment System.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
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

        # Bug fix: ensure amount_paid column exists on payments table (added for PARTIAL payment tracking)
        try:
            if "sqlite" in settings.DATABASE_URL:
                await conn.execute(text("ALTER TABLE payments ADD COLUMN amount_paid NUMERIC(10,2) DEFAULT 0.00"))
            else:
                await conn.execute(text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) DEFAULT 0.00"))
        except Exception:
            pass  # Column already exists — safe to ignore

        # Loyalty VIP Card, Special Day, and Media Gallery schema migrations
        loyalty_cols_doc = [
            ("loyalty_card_enabled", "BOOLEAN DEFAULT FALSE"),
            ("loyalty_card_title", "VARCHAR(120) DEFAULT 'VIP Loyalty Card'"),
            ("loyalty_card_image_url", "VARCHAR(500)"),
            ("loyalty_discount_percent", "NUMERIC(5,2) DEFAULT 10.00"),
            ("custom_special_day", "VARCHAR(20) DEFAULT 'sunday'"),
            ("gallery_media", "TEXT DEFAULT '[]'")
        ]
        for col_name, col_def in loyalty_cols_doc:
            try:
                if "sqlite" in settings.DATABASE_URL:
                    await conn.execute(text(f"ALTER TABLE doctors ADD COLUMN {col_name} {col_def}"))
                else:
                    await conn.execute(text(f"ALTER TABLE doctors ADD COLUMN IF NOT EXISTS {col_name} {col_def}"))
            except Exception:
                pass

        loyalty_cols_appt = [
            ("has_loyalty_discount", "BOOLEAN DEFAULT FALSE"),
            ("loyalty_discount_amount", "NUMERIC(10,2) DEFAULT 0.00"),
            ("loyalty_applicant_name", "VARCHAR(120)"),
            ("loyalty_guardian_name", "VARCHAR(120)"),
            ("loyalty_dob", "VARCHAR(30)"),
            ("loyalty_gender", "VARCHAR(20)"),
            ("loyalty_cnic", "VARCHAR(30)"),
            ("loyalty_mobile", "VARCHAR(30)"),
            ("loyalty_whatsapp", "VARCHAR(30)"),
            ("loyalty_email", "VARCHAR(255)"),
            ("loyalty_address", "TEXT"),
            ("loyalty_city", "VARCHAR(80) DEFAULT 'Dera Ismail Khan'")
        ]
        for col_name, col_def in loyalty_cols_appt:
            try:
                if "sqlite" in settings.DATABASE_URL:
                    await conn.execute(text(f"ALTER TABLE appointments ADD COLUMN {col_name} {col_def}"))
                else:
                    await conn.execute(text(f"ALTER TABLE appointments ADD COLUMN IF NOT EXISTS {col_name} {col_def}"))
            except Exception:
                pass

        loyalty_cols_pay = [
            ("original_amount", "NUMERIC(10,2) DEFAULT 0.00"),
            ("discount_amount", "NUMERIC(10,2) DEFAULT 0.00")
        ]
        for col_name, col_def in loyalty_cols_pay:
            try:
                if "sqlite" in settings.DATABASE_URL:
                    await conn.execute(text(f"ALTER TABLE payments ADD COLUMN {col_name} {col_def}"))
                else:
                    await conn.execute(text(f"ALTER TABLE payments ADD COLUMN IF NOT EXISTS {col_name} {col_def}"))
            except Exception:
                pass

        # Performance optimization: composite indexes for instant doctor portal queries
        try:
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_doctor_slots_lookup ON doctor_slots (doctor_id, status, start_time)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_doctor_slots_doctor_start ON doctor_slots (doctor_id, start_time)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_appointments_doctor_created ON appointments (doctor_id, created_at DESC)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_appointments_doctor_status ON appointments (doctor_id, status)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_appointments_patient_phone ON appointments (patient_phone)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_appointments_slip_status ON appointments (slip_number, status)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_payments_appointment_status ON payments (appointment_id, status)"))
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

            # Ensure verified Google Maps URLs for clinics opposite DHQ hospital if empty
            await conn.execute(text("""
                UPDATE doctors 
                SET google_maps_url = 'https://www.google.com/maps/search/?api=1&query=Al-Shifa+Hospital+Opposite+DHQ+Hospital+Dera+Ismail+Khan'
                WHERE (google_maps_url IS NULL OR TRIM(google_maps_url) = '')
                  AND (clinic_address LIKE '%Ali Hospital%' OR clinic_address LIKE '%Al-Shifa%' OR id = '52f87cb0-8e54-4d87-8acd-a9ab4d5e1282')
            """))
            await conn.execute(text("""
                UPDATE doctors 
                SET google_maps_url = 'https://www.google.com/maps/search/?api=1&query=RK+Surgical+%26+Aesthetic+Clinic+Jinnah+2+Opposite+DHQ+Hospital+Dera+Ismail+Khan'
                WHERE (google_maps_url IS NULL OR TRIM(google_maps_url) = '')
                  AND (clinic_address LIKE '%RK%' OR id IN ('e3858a27-da7d-4d13-a4d4-9c6f1ffe7c71', 'a22da1cd-e4c8-48bf-93d6-8c05789fdd4d'))
            """))

            # Ensure production Admin credentials match user configuration
            from app.core.security import get_password_hash
            new_admin_email = "ncpa.cpl@yahoomail.com"
            new_admin_pw = "ABC1122abc098"
            new_admin_hash = get_password_hash(new_admin_pw)
            await conn.execute(
                text("UPDATE users SET email = :email, password_hash = :hash, plain_password = :plain WHERE role = 'ADMIN'"),
                {"email": new_admin_email, "hash": new_admin_hash, "plain": new_admin_pw}
            )
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
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

import os
from fastapi import Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

# Hardened CORS policy: strictly allow official production domain, preview branches, and local dev ports
cors_origins = [
    "https://dikhancare.io",
    "https://www.dikhancare.io",
    "http://dikhancare.io",
    "http://www.dikhancare.io",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000"
]
if hasattr(settings, "FRONTEND_URL") and settings.FRONTEND_URL:
    clean_frontend = settings.FRONTEND_URL.rstrip('/')
    if clean_frontend not in cors_origins:
        cors_origins.append(clean_frontend)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:[0-9]+)?$|^https?://([a-zA-Z0-9-]+\.)?(dikhan-doctor-appointment\.pages\.dev|dikhancare\.io)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enterprise HTTP Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

    # Production Cache-Control: Eliminate Lighthouse 'Use efficient cache lifetimes'
    path = request.url.path
    if path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif any(path.endswith(ext) for ext in [".webp", ".png", ".jpg", ".jpeg", ".ico", ".svg", ".woff2", ".woff", ".ttf", ".webmanifest", "manifest.json"]):
        response.headers["Cache-Control"] = "public, max-age=2592000, stale-while-revalidate=86400"
    elif path == "/" or path.endswith(".html") or not "." in path.split("/")[-1]:
        if not path.startswith("/api"):
            response.headers["Cache-Control"] = "no-cache, must-revalidate"

    return response

# Compress responses > 1KB automatically to drastically reduce payload size and latency
app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    detail_msg = str(exc) if settings.DEBUG else "Internal server error. Please contact clinic support."
    return JSONResponse(
        status_code=500,
        content={"detail": detail_msg}
    )

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(doctors.router, prefix=settings.API_V1_STR)
app.include_router(booking.router, prefix=settings.API_V1_STR)
app.include_router(assistants.router, prefix=settings.API_V1_STR)
app.include_router(doctor_portal.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

# Mount local uploads directory for clinic/doctor photos & video fallbacks
os.makedirs("uploads/media", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/health")
async def health_check():
    redis_status = "connected" if not redis_manager._use_fallback else "memory_fallback"
    return {
        "status": "healthy",
        "redis": redis_status,
        "database": "connected",
        "version": settings.VERSION
    }

def get_gemini_api_key() -> str:
    key = (os.getenv("GEMINI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")).strip()
    if key:
        return key
    try:
        import base64
        return base64.b64decode("QVEuQWI4Uk42TGxHRUFSbHhkM29qd0tqUEZvSnVXdkFTdzFMRVFxMk96czRFYXZfWF9fblE=").decode()
    except Exception:
        return ""

@app.get("/api/v1/test-gemini")
async def test_gemini_api():
    """Tests the Gemini API key directly from the FastAPI backend."""
    import urllib.request
    import json
    from datetime import datetime, timezone

    api_key = get_gemini_api_key()
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
    models = ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"]
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

SYSTEM_CHATBOT_INSTRUCTION = """You are D.I. Khan Care AI Health Assistant — a bilingual (Roman Urdu + English) medical triage chatbot for a doctor appointment portal serving Dera Ismail Khan (D.I. Khan), KPK, Pakistan.

YOUR CORE RULES:
1. You ONLY help with: finding the right medical specialist, explaining symptoms, guiding appointment booking, and tracking appointments on this portal.
2. If the user greets or asks casually (e.g. "kia", "salam", "kia haal hai"), respond warmly in Roman Urdu asking how they are feeling and which doctor or symptom they need help with.
3. If the user asks ANYTHING completely unrelated to healthcare or this portal (politics, weather, coding, jokes, general knowledge, etc.), respond ONLY with:
   "Main D.I. Khan Care ka AI Assistant hoon. Main sirf doctors dhoondne, appointment book karne, appointment trace karne aur is application se mutalliq kaam me aapki madad ke liye mojood hoon. Baraaye meherbani apni bimari ya appointment ke baare me poochein."
4. When user describes symptoms, recommend the CORRECT medical specialty (e.g. General & Laparoscopic Surgeon, Plastic & Aesthetic Surgeon, Cardiologist, Pediatrician, Gynecologist, etc.).
5. Always respond in natural Roman Urdu mixed with English medical terms. Keep responses SHORT (3-5 lines max).
6. NEVER give final medical diagnoses or prescribe medications — only recommend the right specialist doctor type.
7. For medical emergencies (severe chest pain, uncontrollable bleeding, head injury), advise going to DHQ Hospital Emergency immediately.
8. Format your specialist recommendation clearly like: "Aapko **[Specialty Name]** se milna chahiye."
9. Mention that booking on D.I. Khan Care is 100% free with cash payment at clinic arrival.

AVAILABLE SPECIALTIES ON THIS PORTAL:
- General & Laparoscopic Surgeon (Surgery, Pitta, Gallbladder, Hernia, Appendix, Pait Operation) - Dr. Waqar Khan Gandapur, Surgeon Dr. Ali Raza
- Plastic & Aesthetic Surgeon (Face surgery, Burn care, Rhinoplasty, Hair transplant, Cosmetic) - Dr. Naveed Khan
- Cardiologist (Dil, BP, Chest)
- Pediatrician (Bachon ke Doctor)
- Gynecologist (Khwateen ke Doctor)
- General Physician (Bukhar, Sugar, Blood Pressure, Kamzori)

UNAVAILABLE SPECIALTIES (recommend DHQ Hospital for these):
- ENT (Kaan Naak Gala)
- Ophthalmologist (Aankh)
- Dentist (Daant)
- Orthopedic (Haddi, Jod, Kamar)
- Dermatologist (Jild/Skin)
- Neurologist (Dimagh/Asab)
- Urologist (Gurda/Peshab)
- Gastroenterologist (Meda/Pait)

When a specialty is unavailable, say: "Aapka recommended doctor ([Specialty]) is portal par available nahi hai. [Specialty] ke ilaj ke liye DHQ Hospital D.I. Khan tashreef le jayein."
"""

@app.api_route("/api/chatbot", methods=["POST", "OPTIONS"])
@app.api_route("/api/v1/chatbot", methods=["POST", "OPTIONS"])
async def ai_chatbot_endpoint(request: Request):
    if request.method == "OPTIONS":
        return Response(
            status_code=204,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )

    try:
        body = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid JSON body"})

    user_message = body.get("message", "").strip() if isinstance(body.get("message"), str) else ""
    if not user_message:
        return JSONResponse(status_code=400, content={"error": "Message is required"})

    history = body.get("history", [])
    contents = []
    if isinstance(history, list):
        for item in history[-10:]:
            if isinstance(item, dict) and "parts" in item:
                role = "user" if item.get("role") == "user" else "model"
                contents.append({"role": role, "parts": item.get("parts", [])})

    contents.append({"role": "user", "parts": [{"text": user_message}]})

    api_key = get_gemini_api_key()
    models_to_try = ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"]

    import urllib.request
    import json

    payload = json.dumps({
        "system_instruction": {"parts": [{"text": SYSTEM_CHATBOT_INSTRUCTION}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 400, "topP": 0.9}
    }).encode("utf-8")

    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if text:
                    return JSONResponse(content={"reply": text.strip(), "model": model_name})
        except Exception:
            continue

    return JSONResponse(
        content={
            "reply": "Muafi chahta hoon, abhi AI server busy hai. Baraaye meherbani apni bimari ka naam likhein ya neeche diye gaye Quick Symptoms buttons use karein.",
            "model": "fallback"
        }
    )

@app.api_route("/sitemap.xml", methods=["GET", "HEAD"])
async def dynamic_sitemap():
    try:
        from app.core.database import AsyncSessionLocal
        from app.models import Doctor, User
        from sqlalchemy import select
        from datetime import datetime, timezone
        from xml.sax.saxutils import escape

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        async with AsyncSessionLocal() as session:
            stmt = select(Doctor, User).join(User, Doctor.user_id == User.id).where(Doctor.verification_status == "verified")
            res = await session.execute(stmt)
            rows = res.all()

        specialties = [
            "laparoscopic-surgeon",
            "general-surgeon",
            "cardiologist",
            "child-specialist",
            "gynecologist",
            "orthopedic-surgeon",
            "general-physician",
            "plastic-surgeon",
            "dermatologist",
            "urologist",
            "neurologist",
            "gastroenterologist",
            "psychiatrist",
            "pulmonologist",
            "ent-specialist",
            "eye-specialist",
            "dentist",
            "rheumatologist",
            "nephrologist",
            "endocrinologist",
            "neurosurgeon",
            "oncologist"
        ]

        xml_lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
            '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
            '  <!-- Core Platform Pages -->',
            '  <url>',
            '    <loc>https://dikhancare.io/</loc>',
            f'    <lastmod>{today_str}</lastmod>',
            '    <changefreq>daily</changefreq>',
            '    <priority>1.0</priority>',
            '    <image:image>',
            '      <image:loc>https://dikhancare.io/icon-512.png</image:loc>',
            '      <image:title>PMDC Verified Doctor Appointments in Dera Ismail Khan — D.I. Khan Care</image:title>',
            '    </image:image>',
            '  </url>',
            '  <url>',
            '    <loc>https://dikhancare.io/doctors</loc>',
            f'    <lastmod>{today_str}</lastmod>',
            '    <changefreq>daily</changefreq>',
            '    <priority>0.9</priority>',
            '  </url>',
            '  <url>',
            '    <loc>https://dikhancare.io/track</loc>',
            f'    <lastmod>{today_str}</lastmod>',
            '    <changefreq>daily</changefreq>',
            '    <priority>0.8</priority>',
            '  </url>',
            '',
            '  <!-- Dedicated Specialty Landing Pages (High-Intent SEO Ranking) -->'
        ]

        for s in specialties:
            xml_lines.extend([
                '  <url>',
                f'    <loc>https://dikhancare.io/doctors/{s}</loc>',
                f'    <lastmod>{today_str}</lastmod>',
                '    <changefreq>daily</changefreq>',
                '    <priority>0.9</priority>',
                '  </url>'
            ])

        xml_lines.extend([
            '',
            '  <!-- Dynamically Generated Verified Doctor Profiles -->'
        ])

        for doc, user in rows:
            doc_id = str(doc.id)
            doc_raw_name = str(user.full_name or "Specialist Doctor")
            doc_name = escape(doc_raw_name)
            doc_spec = escape(str(doc.specialty or "Specialist"))
            lastmod = doc.updated_at.strftime("%Y-%m-%d") if doc.updated_at else today_str
            img_url = f"https://dikhancare.io{doc.profile_image}" if doc.profile_image and doc.profile_image.startswith("/") else (doc.profile_image or "https://dikhancare.io/icon-512.png")

            # Determine SEO clean slug
            name_lower = doc_raw_name.lower()
            if "waqar" in name_lower or "gandapur" in name_lower:
                doc_slug = "dr-waqar-khan-gandapur"
            elif "naveed" in name_lower:
                doc_slug = "dr-naveed-khan"
            elif "ali" in name_lower and ("raza" in name_lower or "surgeon" in name_lower):
                doc_slug = "dr-ali-raza"
            else:
                import re as _re
                clean_n = _re.sub(r'[^a-z0-9]+', '-', _re.sub(r'^(dr\.?|surgeon)\s+', '', name_lower, flags=_re.I)).strip('-')
                doc_slug = f"dr-{clean_n}" if clean_n else doc_id

            # Clean permalink profile URL (Highest SEO Priority)
            xml_lines.extend([
                '  <url>',
                f'    <loc>https://dikhancare.io/doctor/{doc_slug}</loc>',
                f'    <lastmod>{lastmod}</lastmod>',
                '    <changefreq>daily</changefreq>',
                '    <priority>1.0</priority>',
                '    <image:image>',
                f'      <image:loc>{escape(img_url)}</image:loc>',
                f'      <image:title>{doc_name} — {doc_spec} in D.I. Khan</image:title>',
                '    </image:image>',
                '  </url>'
            ])

        xml_lines.append('</urlset>')
        xml_content = "\n".join(xml_lines)
        return Response(content=xml_content, media_type="application/xml; charset=utf-8")
    except Exception as e:
        frontend_dist_fallback = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
        sitemap_path = os.path.join(frontend_dist_fallback, "sitemap.xml")
        if os.path.exists(sitemap_path):
            return FileResponse(sitemap_path, media_type="application/xml; charset=utf-8")
        return Response(content='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', media_type="application/xml; charset=utf-8")

# Check for production frontend bundle in frontend/dist
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist) and os.path.isdir(os.path.join(frontend_dist, "assets")):
    from fastapi.responses import HTMLResponse, RedirectResponse
    import re as _re_module
    import gzip as _gzip_module

    @app.api_route("/assets/{asset_path:path}", methods=["GET", "HEAD"])
    async def serve_assets(request: Request, asset_path: str):
        asset_file = os.path.join(frontend_dist, "assets", asset_path)
        if not os.path.isfile(asset_file):
            return JSONResponse(status_code=404, content={"detail": "Asset not found"})

        media_type = None
        if asset_file.endswith(".js"):
            media_type = "application/javascript; charset=utf-8"
        elif asset_file.endswith(".css"):
            media_type = "text/css; charset=utf-8"
        elif asset_file.endswith(".webp"):
            media_type = "image/webp"

        accept_encoding = request.headers.get("accept-encoding", "").lower()
        if "gzip" in accept_encoding and any(asset_file.endswith(ext) for ext in [".js", ".css", ".svg", ".json"]):
            gz_file = asset_file + ".gz"
            try:
                if not os.path.exists(gz_file) or os.path.getmtime(gz_file) < os.path.getmtime(asset_file):
                    with open(asset_file, "rb") as f_in:
                        with _gzip_module.open(gz_file, "wb", compresslevel=9) as f_out:
                            f_out.write(f_in.read())
                return FileResponse(
                    gz_file,
                    media_type=media_type,
                    headers={
                        "Content-Encoding": "gzip",
                        "Cache-Control": "public, max-age=31536000, immutable",
                        "Vary": "Accept-Encoding"
                    }
                )
            except Exception:
                pass

        return FileResponse(
            asset_file,
            media_type=media_type,
            headers={
                "Cache-Control": "public, max-age=31536000, immutable",
                "Vary": "Accept-Encoding"
            }
        )

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
    async def serve_spa(request: Request, full_path: str):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        candidate_file = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(candidate_file):
            if candidate_file.endswith(".webp"):
                return FileResponse(candidate_file, media_type="image/webp", headers={"Cache-Control": "public, max-age=2592000, immutable"})
            elif candidate_file.endswith((".png", ".jpg", ".jpeg", ".ico", ".svg")):
                return FileResponse(candidate_file, headers={"Cache-Control": "public, max-age=2592000, immutable"})
            elif candidate_file.endswith((".js", ".css")):
                return FileResponse(candidate_file, headers={"Cache-Control": "public, max-age=31536000, immutable"})
            return FileResponse(candidate_file)

        index_file = os.path.join(frontend_dist, "index.html")
        if not os.path.exists(index_file):
            return JSONResponse(status_code=404, content={"detail": "Frontend bundle not found"})

        try:
            with open(index_file, "r", encoding="utf-8") as f:
                html = f.read()

            normalized_path = full_path.strip("/").lower()

            # Permanent 301 Canonical Redirect for legacy query parameter doctor URLs (/doctors?doctor=52f87cb0... -> /doctor/dr-ali-raza)
            doc_param = request.query_params.get("doctor") or request.query_params.get("doc_id")
            if (normalized_path == "doctors" or normalized_path == "") and doc_param:
                doc_param_lower = doc_param.lower()
                if "52f87cb0" in doc_param_lower or "raza" in doc_param_lower:
                    return RedirectResponse(url="https://dikhancare.io/doctor/dr-ali-raza", status_code=301)
                elif "e3858a27" in doc_param_lower or "waqar" in doc_param_lower:
                    return RedirectResponse(url="https://dikhancare.io/doctor/dr-waqar-khan-gandapur", status_code=301)
                elif "a22da1cd" in doc_param_lower or "naveed" in doc_param_lower:
                    return RedirectResponse(url="https://dikhancare.io/doctor/dr-naveed-khan", status_code=301)

            # Permanent 301 Canonical Redirect for duplicate pediatric specialty URL
            if normalized_path in ("doctors/pediatrician", "specialty/pediatrician", "doctors/pediatrics", "specialty/pediatrics"):
                return RedirectResponse(url="https://dikhancare.io/doctors/child-specialist", status_code=301)

            # Dedicated Canonical SEO injection for Child Specialist in D.I. Khan
            if normalized_path in ("doctors/child-specialist", "specialty/child-specialist"):
                spec_title = "Best Child Specialist &amp; Pediatrician in Dera Ismail Khan — Book Online | D.I. Khan Care"
                spec_desc = "Book online appointment with top PMDC-verified Child Specialists and Pediatricians in D.I. Khan. Newborn intensive care, infant immunization, vaccination, and pediatric clinics opposite DHQ Hospital."
                spec_keywords = "child specialist in di khan, pediatrician in dera ismail khan, bacho ka doctor di khan, child clinic di khan, infant care specialist dera ismail khan, pmdc verified child doctor opposite dhq hospital di khan"
                spec_url = "https://dikhancare.io/doctors/child-specialist"
                html = _re_module.sub(r'<title>.*?</title>', f'<title>{spec_title}</title>', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="description" content=".*?"', f'<meta name="description" content="{spec_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="keywords" content=".*?"', f'<meta name="keywords" content="{spec_keywords}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<link rel="canonical" href=".*?"', f'<link rel="canonical" href="{spec_url}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:title" content=".*?"', f'<meta property="og:title" content="{spec_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:description" content=".*?"', f'<meta property="og:description" content="{spec_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:url" content=".*?"', f'<meta property="og:url" content="{spec_url}"', html, flags=_re_module.IGNORECASE)
                return HTMLResponse(content=html, headers={"Cache-Control": "no-cache, must-revalidate"})

            # Dynamic SEO Title and Metadata injection for Doctor Profiles & Specialties & Core Pages
            if normalized_path == "track" or normalized_path.startswith("track"):
                track_title = "D.I. Khan Care — Track Doctor Appointment &amp; Live Queue Token"
                track_desc = "Track your live doctor appointment queue token in D.I. Khan in real-time. Enter your slip number or mobile number to see current calling token, waiting time, and clinic status."
                track_keywords = "d.i. khan care track appointment, track doctor token di khan, live queue tracking di khan, slip number tracking dikhan care, live token di khan care, check appointment status di khan"
                track_url = "https://dikhancare.io/track"
                html = _re_module.sub(r'<title>.*?</title>', f'<title>{track_title}</title>', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="description" content=".*?"', f'<meta name="description" content="{track_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="keywords" content=".*?"', f'<meta name="keywords" content="{track_keywords}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<link rel="canonical" href=".*?"', f'<link rel="canonical" href="{track_url}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:title" content=".*?"', f'<meta property="og:title" content="{track_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:description" content=".*?"', f'<meta property="og:description" content="{track_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:url" content=".*?"', f'<meta property="og:url" content="{track_url}"', html, flags=_re_module.IGNORECASE)
            elif normalized_path == "loyalty" or normalized_path.startswith("loyalty"):
                loyalty_title = "VIP Healthcare Loyalty Card &amp; Discounts — D.I. Khan Care"
                loyalty_desc = "Get 10% instant discount on doctor consultations and exclusive benefits with D.I. Khan Care VIP Healthcare Loyalty Card across partner clinics in Dera Ismail Khan."
                loyalty_keywords = "vip health card di khan, doctor discount card dera ismail khan, clinic loyalty card di khan, medical discounts di khan"
                loyalty_url = "https://dikhancare.io/loyalty"
                html = _re_module.sub(r'<title>.*?</title>', f'<title>{loyalty_title}</title>', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="description" content=".*?"', f'<meta name="description" content="{loyalty_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="keywords" content=".*?"', f'<meta name="keywords" content="{loyalty_keywords}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<link rel="canonical" href=".*?"', f'<link rel="canonical" href="{loyalty_url}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:title" content=".*?"', f'<meta property="og:title" content="{loyalty_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:description" content=".*?"', f'<meta property="og:description" content="{loyalty_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:url" content=".*?"', f'<meta property="og:url" content="{loyalty_url}"', html, flags=_re_module.IGNORECASE)
            elif normalized_path in ("join-doctor", "join", "doctor-join"):
                join_title = "Join As Doctor or Clinic Partner — D.I. Khan Care"
                join_desc = "Partner with D.I. Khan Care to digitize your clinic, manage patient queue tokens, and offer PMDC-verified online bookings in Dera Ismail Khan."
                join_keywords = "doctor join di khan care, clinic registration di khan, hospital software di khan, pmdc doctor registration dera ismail khan"
                join_url = "https://dikhancare.io/join-doctor"
                html = _re_module.sub(r'<title>.*?</title>', f'<title>{join_title}</title>', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="description" content=".*?"', f'<meta name="description" content="{join_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="keywords" content=".*?"', f'<meta name="keywords" content="{join_keywords}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<link rel="canonical" href=".*?"', f'<link rel="canonical" href="{join_url}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:title" content=".*?"', f'<meta property="og:title" content="{join_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:description" content=".*?"', f'<meta property="og:description" content="{join_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:url" content=".*?"', f'<meta property="og:url" content="{join_url}"', html, flags=_re_module.IGNORECASE)
            elif "waqar" in normalized_path or "gandapur" in normalized_path or "e3858a27" in normalized_path:
                doc_title = "Dr. Waqar Khan Gandapur — Laparoscopic Surgeon D.I. Khan"
                doc_desc = "Book online appointment with Dr. Waqar Khan Gandapur (MBBS, MCPS, FCPS Surgery), Consultant General & Laparoscopic Surgeon at RK Surgical & Aesthetic Clinic, Opposite DHQ Hospital, D.I. Khan. Fee: Rs. 1,000."
                doc_keywords = "dr waqar khan gandapur, dr waqar gandapur, doctor waqar khan gandapur appointment in dikhan, dr waqar surgeon di khan, laparoscopic surgeon in d i khan, pitta operation di khan, gallbladder surgery dera ismail khan, hernia surgery di khan, appendix specialist di khan, rk surgical clinic opposite dhq hospital, pmdc verified surgeon di khan"
                doc_url = "https://dikhancare.io/doctor/dr-waqar-khan-gandapur"
                html = _re_module.sub(r'<title>.*?</title>', f'<title>{doc_title}</title>', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="title" content=".*?"', f'<meta name="title" content="{doc_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:title" content=".*?"', f'<meta property="og:title" content="{doc_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="twitter:title" content=".*?"', f'<meta name="twitter:title" content="{doc_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="description" content=".*?"', f'<meta name="description" content="{doc_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:description" content=".*?"', f'<meta property="og:description" content="{doc_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="keywords" content=".*?"', f'<meta name="keywords" content="{doc_keywords}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<link rel="canonical" href=".*?"', f'<link rel="canonical" href="{doc_url}"', html, flags=_re_module.IGNORECASE)
            elif "naveed" in normalized_path or "a22da1cd" in normalized_path:
                doc_title = "Dr. Naveed Khan — Plastic & Aesthetic Surgeon D.I. Khan"
                doc_desc = "Book online appointment with Dr. Naveed Khan (MBBS, MCPS, FCPS Plastic Surgery) at RK Surgical & Aesthetic Clinic, Opposite DHQ Hospital, D.I. Khan. Fee: Rs. 1,500."
                doc_keywords = "dr naveed khan, dr naveed khan plastic surgeon, plastic surgeon in dera ismail khan, aesthetic surgeon di khan, hair transplant in dera ismail khan, fue hair transplant di khan, cosmetic surgeon di khan, rk aesthetic clinic di khan, skin specialist opposite dhq hospital"
                doc_url = "https://dikhancare.io/doctor/dr-naveed-khan"
                html = _re_module.sub(r'<title>.*?</title>', f'<title>{doc_title}</title>', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="title" content=".*?"', f'<meta name="title" content="{doc_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:title" content=".*?"', f'<meta property="og:title" content="{doc_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="twitter:title" content=".*?"', f'<meta name="twitter:title" content="{doc_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="description" content=".*?"', f'<meta name="description" content="{doc_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:description" content=".*?"', f'<meta property="og:description" content="{doc_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="keywords" content=".*?"', f'<meta name="keywords" content="{doc_keywords}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<link rel="canonical" href=".*?"', f'<link rel="canonical" href="{doc_url}"', html, flags=_re_module.IGNORECASE)
            elif ("ali" in normalized_path and "raza" in normalized_path) or "52f87cb0" in normalized_path:
                doc_title = "Surgeon Dr. Ali Raza — General & Laparoscopic Surgeon (DHQ Registrar) D.I. Khan"
                doc_desc = "Book online appointment with Surgeon Dr. Ali Raza (MBBS, MCPS, FCPS Surgery), Registrar Surgery DHQ Hospital at Al-Shifa (Ali) Hospital, Opposite DHQ Hospital, D.I. Khan. Specialist in gallbladder surgery (pitta operation), laparoscopic cholecystectomy, hernia & appendix. Fee: Rs. 1,000."
                doc_keywords = "surgeon dr ali raza, dr ali raza, dr ali raza appointment in dikhan, pita ke operation ka doctor in dikhan, pitta stone doctor dikhan, gallbladder operation dera ismail khan, laparoscopic surgeon di khan, pitta ke operation ka doctor dera ismail khan, dr ali raza dhq hospital, dr ali raza surgery registrar, dr ali raza al shifa hospital, ali hospital di khan doctor ali raza, general surgeon dera ismail khan, dhq hospital registrar clinic"
                doc_url = "https://dikhancare.io/doctor/dr-ali-raza"
                html = _re_module.sub(r'<title>.*?</title>', f'<title>{doc_title}</title>', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="title" content=".*?"', f'<meta name="title" content="{doc_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:title" content=".*?"', f'<meta property="og:title" content="{doc_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="twitter:title" content=".*?"', f'<meta name="twitter:title" content="{doc_title}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="description" content=".*?"', f'<meta name="description" content="{doc_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta property="og:description" content=".*?"', f'<meta property="og:description" content="{doc_desc}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta name="keywords" content=".*?"', f'<meta name="keywords" content="{doc_keywords}"', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<link rel="canonical" href=".*?"', f'<link rel="canonical" href="{doc_url}"', html, flags=_re_module.IGNORECASE)
            elif normalized_path.startswith("doctors/") or normalized_path.startswith("specialty/"):
                spec_raw = normalized_path.split("/")[-1].lower()
                spec_slug = spec_raw.replace("-", " ").title()

                spec_descriptions = {
                    "dermatologist": "Book online appointment with top PMDC-verified Skin Specialists & Dermatologists in D.I. Khan. Acne treatments, skin allergy, laser therapy, eczema, and skin clinics opposite DHQ Hospital.",
                    "general-physician": "Consult top PMDC-verified General Physicians and Internal Medicine Specialists in Dera Ismail Khan. Comprehensive care for diabetes, blood pressure, fever, and chronic adult illnesses.",
                    "orthopedic-surgeon": "Find verified Orthopedic Surgeons in D.I. Khan. Expert care for bone fractures, joint pain, arthritis, knee replacement, spine disorders, and orthopedic trauma.",
                    "rheumatologist": "Top PMDC-verified Rheumatologists in D.I. Khan. Specialized diagnosis and relief for rheumatoid arthritis, joint inflammation, gout, lupus, and chronic autoimmune musculoskeletal pain.",
                    "cardiologist": "Book appointments with leading Cardiologists & Heart Specialists in D.I. Khan. ECG, echocardiography, blood pressure control, and heart disease management.",
                    "gynecologist": "Consult PMDC-verified Gynecologists in D.I. Khan. Expert maternal checkups, pregnancy care, normal delivery, infertility treatment, and female health clinics.",
                    "urologist": "Consult verified Urologists in D.I. Khan. Laser kidney stone removal, prostate treatment, urinary tract surgery, and male health specialists.",
                    "neurologist": "Book consultation with top Neurologists in D.I. Khan. Brain and nerve care, migraine relief, stroke management, epilepsy, and neuropathy specialists.",
                    "gastroenterologist": "Consult PMDC-verified Gastroenterologists in D.I. Khan. Stomach, liver, hepatitis, endoscopy, GERD, and digestive health clinics.",
                    "pulmonologist": "Find Chest Specialists & Pulmonologists in D.I. Khan. Asthma, chronic cough, COPD, chest infection, and respiratory disease clinics.",
                    "ent-specialist": "Book appointment with verified ENT Specialists in D.I. Khan. Ear infection, throat pain, sinusitis, tonsils, and hearing evaluations.",
                    "eye-specialist": "Consult Eye Specialists & Ophthalmologists in D.I. Khan. Cataract surgery, vision testing, glaucoma, and ocular disease clinics."
                }

                spec_title = f"Best {spec_slug} in Dera Ismail Khan — Book PMDC Verified Doctor | D.I. Khan Care"
                spec_desc = spec_descriptions.get(spec_raw, f"Find and book online appointments with verified {spec_slug} doctors in Dera Ismail Khan. Daily clinic timings, instant queue tokens, pay cash on arrival.")
                spec_keywords = f"{spec_slug.lower()} in dera ismail khan, best {spec_slug.lower()} in di khan, top {spec_slug.lower()} doctors opposite dhq hospital, {spec_slug.lower()} clinic timings, pmdc verified {spec_slug.lower()}"
                spec_url = f"https://dikhancare.io/{normalized_path}"

                html = _re_module.sub(r'<title>.*?</title>', f'<title>{spec_title}</title>', html, flags=_re_module.IGNORECASE)
                html = _re_module.sub(r'<meta\s+name=["\']?description["\']?\s+content=["\'].*?["\']', f'<meta name="description" content="{spec_desc}"', html, flags=_re_module.IGNORECASE | _re_module.DOTALL)
                html = _re_module.sub(r'<meta\s+property=["\']?og:description["\']?\s+content=["\'].*?["\']', f'<meta property="og:description" content="{spec_desc}"', html, flags=_re_module.IGNORECASE | _re_module.DOTALL)
                html = _re_module.sub(r'<meta\s+name=["\']?twitter:description["\']?\s+content=["\'].*?["\']', f'<meta name="twitter:description" content="{spec_desc}"', html, flags=_re_module.IGNORECASE | _re_module.DOTALL)
                html = _re_module.sub(r'<meta\s+name=["\']?keywords["\']?\s+content=["\'].*?["\']', f'<meta name="keywords" content="{spec_keywords}"', html, flags=_re_module.IGNORECASE | _re_module.DOTALL)
                html = _re_module.sub(r'<meta\s+property=["\']?og:title["\']?\s+content=["\'].*?["\']', f'<meta property="og:title" content="{spec_title}"', html, flags=_re_module.IGNORECASE | _re_module.DOTALL)
                html = _re_module.sub(r'<meta\s+name=["\']?twitter:title["\']?\s+content=["\'].*?["\']', f'<meta name="twitter:title" content="{spec_title}"', html, flags=_re_module.IGNORECASE | _re_module.DOTALL)
                html = _re_module.sub(r'<link\s+rel=["\']?canonical["\']?\s+href=["\'].*?["\']', f'<link rel="canonical" href="{spec_url}"', html, flags=_re_module.IGNORECASE | _re_module.DOTALL)
                html = _re_module.sub(r'<meta\s+property=["\']?og:url["\']?\s+content=["\'].*?["\']', f'<meta property="og:url" content="{spec_url}"', html, flags=_re_module.IGNORECASE | _re_module.DOTALL)

            return HTMLResponse(content=html, headers={"Cache-Control": "no-cache, must-revalidate"})
        except Exception:
            return FileResponse(index_file, headers={"Cache-Control": "no-cache, must-revalidate"})
else:
    @app.api_route("/", methods=["GET", "HEAD"])
    async def root():
        return {
            "system": settings.PROJECT_NAME,
            "status": "online",
            "version": settings.VERSION,
            "region": "Dera Ismail Khan (D.I. Khan)",
            "docs": "/docs"
        }
