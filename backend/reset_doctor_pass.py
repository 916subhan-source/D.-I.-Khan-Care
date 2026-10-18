import asyncio
import asyncpg
from app.core.security import get_password_hash

async def reset_doctor_passwords():
    conn = await asyncpg.connect("postgresql://postgres.hwoihhfdynmhdplvdcke:Subh%40n1245%21@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres", ssl="require")
    new_hash = get_password_hash("DoctorPass123!")
    
    await conn.execute("UPDATE users SET password_hash = $1 WHERE role = 'DOCTOR'", new_hash)
    rows = await conn.fetch("SELECT email, full_name FROM users WHERE role = 'DOCTOR'")
    
    print("ALL DOCTOR PASSWORDS SET TO: DoctorPass123!")
    for r in rows:
        print(f"Doctor: {r['full_name']} | Email: {r['email']} | Password: DoctorPass123!")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(reset_doctor_passwords())
