import asyncio
import sqlite3
import uuid
import asyncpg
from decimal import Decimal

DB_HOST = "aws-0-ap-northeast-1.pooler.supabase.com"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres.hwoihhfdynmhdplvdcke"
DB_PASS = "Subh@n1245!"

async def migrate():
    print("[MIGRATOR] Connecting to Supabase...")
    pg_conn = await asyncpg.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        ssl="require"
    )

    sqlite_conn = sqlite3.connect("dikhan_health.db")
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    sqlite_cur.execute("""
        SELECT d.*, u.email, u.full_name 
        FROM doctors d
        JOIN users u ON d.user_id = u.id
    """)
    sqlite_doctors = sqlite_cur.fetchall()

    for d in sqlite_doctors:
        email = d["email"]
        full_name = d["full_name"]
        
        pg_user = await pg_conn.fetchrow("SELECT id FROM users WHERE email = $1", email)
        if not pg_user:
            print(f"Skipping doctor {full_name} because user not found in Supabase")
            continue
            
        pg_user_id = str(pg_user["id"])
        
        existing_doc = await pg_conn.fetchrow("SELECT id FROM doctors WHERE user_id = $1", pg_user_id)
        if not existing_doc:
            doc_id = str(uuid.UUID(d["id"]))
            fee = Decimal(str(d["fee_clinic"])) if d["fee_clinic"] is not None else Decimal("1000.00")
            spotlight = bool(d["is_spotlight"])
            
            print(f"Migrating Doctor: '{full_name}' ({email}) to Supabase...")
            await pg_conn.execute("""
                INSERT INTO doctors (
                    id, user_id, specialty, sub_region, clinic_address, 
                    google_maps_url, fee_clinic, shift, is_spotlight, 
                    verification_status, created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
                ON CONFLICT DO NOTHING
            """, doc_id, pg_user_id, d["specialty"], d["sub_region"], d["clinic_address"],
               d["google_maps_url"], fee, d["shift"], spotlight, d["verification_status"])
            print(f"SUCCESS: Added Doctor '{full_name}' to Supabase!")
        else:
            print(f"Doctor '{full_name}' already exists in Supabase.")

    sqlite_conn.close()
    await pg_conn.close()
    print("\nMIGRATION COMPLETE! All your created doctors are now live in Supabase!")

if __name__ == "__main__":
    asyncio.run(migrate())
