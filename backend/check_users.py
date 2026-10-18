import asyncio
import asyncpg
from app.core.security import verify_password

async def check():
    conn = await asyncpg.connect("postgresql://postgres.hwoihhfdynmhdplvdcke:Subh%40n1245%21@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres", ssl="require")
    rows = await conn.fetch("SELECT email, full_name, password_hash, role FROM users WHERE role = 'DOCTOR'")
    print("--- DOCTOR ACCOUNTS ---")
    for r in rows:
        is_default = verify_password("DoctorPass123!", r["password_hash"])
        pwd_info = "DoctorPass123!" if is_default else "(Custom / User set password)"
        print(f"Doctor: {r['full_name']} | Email: {r['email']} | Password: {pwd_info}")
    
    assts = await conn.fetch("SELECT id, email, full_name, plain_password, password_hash FROM users WHERE role = 'ASSISTANT'")
    print("--- ASSISTANT ACCOUNTS ---")
    for a in assts:
        print(f"Assistant: {a['full_name']} | Email: {a['email']} | plain_password: {a['plain_password']}")
    await conn.close()

asyncio.run(check())
