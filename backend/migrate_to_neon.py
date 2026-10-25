"""
Migration Script: SQLite → Neon PostgreSQL
Exports all data from the local dikhan_care.db and imports into Neon PostgreSQL.

Usage:
    python migrate_to_neon.py <NEON_DATABASE_URL>

Example:
    python migrate_to_neon.py "postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
"""

import sys
import sqlite3
import asyncio
import asyncpg

# Table export order (respects foreign key dependencies)
TABLES_IN_ORDER = [
    "users",
    "doctors",
    "doctor_assistants",
    "doctor_slots",
    "appointments",
    "payments",
    "audit_logs",
    "doctor_reviews",
]


def get_sqlite_data(db_path: str) -> dict:
    """Read all data from SQLite database."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    data = {}
    for table in TABLES_IN_ORDER:
        try:
            cursor.execute(f"SELECT * FROM {table}")
            rows = [dict(row) for row in cursor.fetchall()]
            data[table] = rows
            print(f"  ✅ {table}: {len(rows)} rows")
        except sqlite3.OperationalError as e:
            print(f"  ⚠️  {table}: skipped ({e})")
            data[table] = []

    conn.close()
    return data


# PostgreSQL CREATE TABLE statements matching your SQLAlchemy models
CREATE_TABLES_SQL = """
-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    whatsapp_number VARCHAR(20),
    password_hash VARCHAR(255),
    plain_password VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'PATIENT',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Doctors
CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialty VARCHAR(100) NOT NULL,
    sub_region VARCHAR(100) NOT NULL DEFAULT 'Circular Road',
    clinic_address TEXT NOT NULL,
    google_maps_url TEXT,
    fee_clinic NUMERIC(10,2) NOT NULL DEFAULT 1000.00,
    shift VARCHAR(20) NOT NULL DEFAULT 'EVENING',
    morning_start VARCHAR(10) NOT NULL DEFAULT '09:00',
    morning_end VARCHAR(10) NOT NULL DEFAULT '13:00',
    evening_start VARCHAR(10) NOT NULL DEFAULT '17:00',
    evening_end VARCHAR(10) NOT NULL DEFAULT '21:00',
    is_spotlight BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(20) DEFAULT 'pending',
    profile_image VARCHAR(500),
    off_days VARCHAR(120) DEFAULT 'sunday',
    bio TEXT,
    expertise VARCHAR(255),
    experience_years INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Doctor Assistants
CREATE TABLE IF NOT EXISTS doctor_assistants (
    doctor_id VARCHAR(36) REFERENCES doctors(id) ON DELETE CASCADE,
    assistant_user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (doctor_id, assistant_user_id)
);

-- 4. Doctor Slots
CREATE TABLE IF NOT EXISTS doctor_slots (
    id VARCHAR(36) PRIMARY KEY,
    doctor_id VARCHAR(36) NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (doctor_id, start_time)
);

-- 5. Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES users(id),
    doctor_id VARCHAR(36) NOT NULL REFERENCES doctors(id),
    slot_id VARCHAR(36) REFERENCES doctor_slots(id),
    assistant_id VARCHAR(36) REFERENCES users(id),
    status VARCHAR(40) DEFAULT 'PENDING_ASSISTANT_APPROVAL',
    slip_number VARCHAR(50) UNIQUE,
    patient_name VARCHAR(120),
    patient_phone VARCHAR(30),
    patient_email VARCHAR(255),
    notes TEXT,
    reschedule_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Payments
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    appointment_id VARCHAR(36) UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING_CASH',
    paid_at TIMESTAMPTZ,
    collected_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    actor_id VARCHAR(36) REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    before_value TEXT,
    after_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Doctor Reviews
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id VARCHAR(36) PRIMARY KEY,
    doctor_id VARCHAR(36) NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_id VARCHAR(36) UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    patient_name VARCHAR(120) NOT NULL,
    patient_phone VARCHAR(30) NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    tags VARCHAR(255),
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS ix_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS ix_doctors_sub_region ON doctors(sub_region);
CREATE INDEX IF NOT EXISTS ix_doctors_is_spotlight ON doctors(is_spotlight);
CREATE INDEX IF NOT EXISTS ix_doctor_slots_doctor_id ON doctor_slots(doctor_id);
CREATE INDEX IF NOT EXISTS ix_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS ix_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS ix_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS ix_appointments_slip_number ON appointments(slip_number);
CREATE INDEX IF NOT EXISTS ix_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS ix_doctor_reviews_doctor_id ON doctor_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS ix_doctor_reviews_appointment_id ON doctor_reviews(appointment_id);
"""


async def migrate_to_neon(neon_url: str, sqlite_path: str = "dikhan_care.db"):
    """Migrate all data from SQLite to Neon PostgreSQL."""

    print("\n📦 Step 1: Reading data from SQLite...")
    data = get_sqlite_data(sqlite_path)

    print(f"\n🔗 Step 2: Connecting to Neon PostgreSQL...")
    conn = await asyncpg.connect(neon_url)
    print("  ✅ Connected!")

    print(f"\n🏗️  Step 3: Creating tables...")
    await conn.execute(CREATE_TABLES_SQL)
    print("  ✅ All tables created!")

    # Clean existing data for safe re-run (reverse FK order)
    print(f"\n🧹 Step 3b: Cleaning existing data for fresh import...")
    for t in reversed(TABLES_IN_ORDER):
        try:
            await conn.execute(f"DELETE FROM {t}")
        except Exception:
            pass

    print(f"\n📤 Step 4: Inserting data...")

    # Datetime columns that need string→datetime conversion
    DATETIME_COLS = {
        'created_at', 'updated_at', 'paid_at', 'start_time', 'end_time'
    }
    # Numeric/Decimal columns
    DECIMAL_COLS = {'fee_clinic', 'amount'}

    from datetime import datetime as dt
    from decimal import Decimal

    def parse_datetime(val):
        """Convert SQLite datetime string to Python datetime object."""
        if val is None:
            return None
        if isinstance(val, dt):
            return val
        for fmt in (
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f%z",
            "%Y-%m-%d %H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%S.%f%z",
            "%Y-%m-%dT%H:%M:%S%z",
        ):
            try:
                return dt.strptime(str(val), fmt)
            except (ValueError, TypeError):
                continue
        # Last resort: try dateutil
        try:
            from dateutil.parser import parse as dateutil_parse
            return dateutil_parse(str(val))
        except Exception:
            pass
        return str(val)  # Return as-is if all parsing fails

    for table in TABLES_IN_ORDER:
        rows = data.get(table, [])
        if not rows:
            print(f"  ⏭️  {table}: 0 rows (skipped)")
            continue

        columns = list(rows[0].keys())
        placeholders = ", ".join(f"${i+1}" for i in range(len(columns)))
        col_names = ", ".join(columns)

        # Use ON CONFLICT DO NOTHING to skip duplicates
        if table == "doctor_assistants":
            conflict_clause = "ON CONFLICT (doctor_id, assistant_user_id) DO NOTHING"
        else:
            conflict_clause = "ON CONFLICT (id) DO NOTHING"

        insert_sql = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) {conflict_clause}"

        inserted = 0
        for row in rows:
            values = []
            for col in columns:
                val = row[col]
                # Convert SQLite boolean integers to Python bools for PostgreSQL
                if col in ('is_spotlight', 'is_verified') and isinstance(val, int):
                    val = bool(val)
                # Convert datetime strings to Python datetime objects
                elif col in DATETIME_COLS and isinstance(val, str):
                    val = parse_datetime(val)
                # Convert numeric strings to Decimal
                elif col in DECIMAL_COLS and val is not None:
                    try:
                        val = Decimal(str(val))
                    except Exception:
                        pass
                values.append(val)
            try:
                await conn.execute(insert_sql, *values)
                inserted += 1
            except Exception as e:
                print(f"    ⚠️  {table} row error: {e}")

        print(f"  ✅ {table}: {inserted}/{len(rows)} rows inserted")

    # Verify counts
    print(f"\n✅ Step 5: Verifying migration...")
    for table in TABLES_IN_ORDER:
        try:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
            print(f"  📊 {table}: {count} rows in Neon")
        except Exception:
            pass

    await conn.close()
    print("\n🎉 Migration complete! Your data is now on Neon PostgreSQL.")
    print("   Update your .env DATABASE_URL to the Neon connection string.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python migrate_to_neon.py <NEON_DATABASE_URL>")
        print('Example: python migrate_to_neon.py "postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"')
        sys.exit(1)

    neon_url = sys.argv[1]
    asyncio.run(migrate_to_neon(neon_url))
