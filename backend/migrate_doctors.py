import asyncio
import sqlite3
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text, select
from app.core.database import AsyncSessionLocal, engine, Base
from app.models import User, Doctor
from app.core.security import get_password_hash

async def migrate_sqlite_to_supabase():
    print("[MIGRATION] Checking local SQLite database for user-created doctors...")
    
    # 1. Connect to SQLite
    sqlite_conn = sqlite3.connect("dikhan_health.db")
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()
    
    # Fetch all doctors from SQLite
    cursor.execute("""
        SELECT d.*, u.full_name, u.email, u.phone, u.role, u.status 
        FROM doctors d
        JOIN users u ON d.user_id = u.id
    """)
    sqlite_doctors = cursor.fetchall()
    print(f"[MIGRATION] Found {len(sqlite_doctors)} doctors in local SQLite database.")
    
    # 2. Connect to Supabase via AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        for doc in sqlite_doctors:
            email = doc["email"]
            # Check if doctor exists in Supabase by email
            existing = await session.execute(select(User).where(User.email == email))
            existing_user = existing.scalar_one_or_none()
            
            if not existing_user:
                print(f"[MIGRATION] Transferring '{doc['full_name']}' ({email}) to Supabase...")
                user_obj = User(
                    id=doc["user_id"],
                    full_name=doc["full_name"],
                    email=doc["email"],
                    phone=doc["phone"],
                    password_hash=get_password_hash("DoctorPass123!"),
                    role="DOCTOR",
                    status="active"
                )
                session.add(user_obj)
                await session.flush()
                
                doc_obj = Doctor(
                    id=doc["id"],
                    user_id=doc["user_id"],
                    specialty=doc["specialty"],
                    sub_region=doc["sub_region"],
                    clinic_address=doc["clinic_address"],
                    google_maps_url=doc["google_maps_url"],
                    fee_clinic=doc["fee_clinic"],
                    shift=doc["shift"],
                    is_spotlight=bool(doc["is_spotlight"]),
                    verification_status=doc["verification_status"] or "verified"
                )
                session.add(doc_obj)
                print(f"✅ Migrated doctor '{doc['full_name']}' to Supabase!")
            else:
                print(f"[MIGRATION] Doctor '{doc['full_name']}' already exists in Supabase.")
                
        await session.commit()
    sqlite_conn.close()
    print("[MIGRATION] All doctors from local SQLite successfully migrated to Supabase!")

if __name__ == "__main__":
    asyncio.run(migrate_sqlite_to_supabase())
