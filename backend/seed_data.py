"""
Seed script for D.I. Khan healthcare facilities, doctors, assistants, and admin accounts.
Can be executed directly or called via test_runner.py.
"""

import asyncio
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import User, Doctor, DoctorSlot, DoctorAssistant
from sqlalchemy import select

async def seed_database():
    print("[SEED] Initializing schema tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(select(User).where(User.email == "admin@dikhanhealth.pk"))
        if result.scalar_one_or_none():
            print("[SEED] Database already contains seed data. Skipping duplicate seed.")
            return

        print("[SEED] Creating Admin / Developer Account...")
        admin = User(
            full_name="D.I. Khan System Admin",
            email="admin@dikhanhealth.pk",
            phone="+923001234567",
            password_hash=get_password_hash("AdminPass123!"),
            role="ADMIN",
            status="active"
        )
        session.add(admin)

        print("[SEED] Creating D.I. Khan Specialist Doctors...")
        # 1. Cardiologist on Circular Road (Spotlighted)
        dr_tariq_user = User(
            full_name="Dr. Tariq Mehmood Babar",
            email="dr.tariq@dikhanhealth.pk",
            phone="+923007654321",
            password_hash=get_password_hash("DoctorPass123!"),
            role="DOCTOR",
            status="active"
        )
        session.add(dr_tariq_user)
        await session.flush()

        dr_tariq = Doctor(
            user_id=dr_tariq_user.id,
            specialty="Consultant Cardiologist",
            sub_region="Circular Road",
            clinic_address="Babar Heart Clinic, Opposite DHQ Hospital, Circular Road, D.I. Khan",
            google_maps_url="https://maps.google.com/?q=DHQ+Hospital+DI+Khan",
            fee_clinic=Decimal("1500.00"),
            shift="EVENING",
            is_spotlight=True,
            verification_status="verified"
        )
        session.add(dr_tariq)

        # 2. Gynecologist on University Road
        dr_sadia_user = User(
            full_name="Dr. Sadia Rehman",
            email="dr.sadia@dikhanhealth.pk",
            phone="+923019876543",
            password_hash=get_password_hash("DoctorPass123!"),
            role="DOCTOR",
            status="active"
        )
        session.add(dr_sadia_user)
        await session.flush()

        dr_sadia = Doctor(
            user_id=dr_sadia_user.id,
            specialty="Consultant Gynecologist & Obstetrician",
            sub_region="University Road",
            clinic_address="Rehman Medical Complex, University Road, D.I. Khan",
            fee_clinic=Decimal("1200.00"),
            shift="BOTH",
            is_spotlight=False,
            verification_status="verified"
        )
        session.add(dr_sadia)

        # 3. Child Specialist on Topanwala Chowk
        dr_asif_user = User(
            full_name="Dr. Asif Khan Gandapur",
            email="dr.asif@dikhanhealth.pk",
            phone="+923023456789",
            password_hash=get_password_hash("DoctorPass123!"),
            role="DOCTOR",
            status="active"
        )
        session.add(dr_asif_user)
        await session.flush()

        dr_asif = Doctor(
            user_id=dr_asif_user.id,
            specialty="Pediatrician & Child Specialist",
            sub_region="Commissionery Bazaar / Topanwala",
            clinic_address="Gandapur Children Clinic, Near Topanwala Chowk, D.I. Khan",
            fee_clinic=Decimal("1000.00"),
            shift="EVENING",
            is_spotlight=True,
            verification_status="verified"
        )
        session.add(dr_asif)
        await session.flush()

        print("[SEED] Creating Clinic Assistant and linking directly to Dr. Tariq...")
        # Assistant for Dr. Tariq
        assistant_user = User(
            full_name="Muhammad Zeeshan",
            email="zeeshan.reception@dikhanhealth.pk",
            phone="+923035551234",
            password_hash=get_password_hash("AssistantPass123!"),
            role="ASSISTANT",
            status="active"
        )
        session.add(assistant_user)
        await session.flush()

        dr_assistant_link = DoctorAssistant(
            doctor_id=dr_tariq.id,
            assistant_user_id=assistant_user.id,
            status="active"
        )
        session.add(dr_assistant_link)

        # Assistant for Dr. Sadia
        assistant_sadia = User(
            full_name="Fatima Bibi",
            email="fatima.reception@dikhanhealth.pk",
            phone="+923045559876",
            password_hash=get_password_hash("AssistantPass123!"),
            role="ASSISTANT",
            status="active"
        )
        session.add(assistant_sadia)
        await session.flush()

        dr_sadia_link = DoctorAssistant(
            doctor_id=dr_sadia.id,
            assistant_user_id=assistant_sadia.id,
            status="active"
        )
        session.add(dr_sadia_link)

        # Assistant for Dr. Asif
        assistant_asif = User(
            full_name="Kamran Ali",
            email="kamran.reception@dikhanhealth.pk",
            phone="+923055554567",
            password_hash=get_password_hash("AssistantPass123!"),
            role="ASSISTANT",
            status="active"
        )
        session.add(assistant_asif)
        await session.flush()

        dr_asif_link = DoctorAssistant(
            doctor_id=dr_asif.id,
            assistant_user_id=assistant_asif.id,
            status="active"
        )
        session.add(dr_asif_link)

        print("[SEED] Generating initial doctor appointment slots...")
        now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        # Add 6 slots for tomorrow evening
        base_slot_time = now + timedelta(days=1, hours=16) # 4:00 PM tomorrow
        for i in range(6):
            slot_start = base_slot_time + timedelta(minutes=i * 20)
            slot_end = slot_start + timedelta(minutes=20)
            slot = DoctorSlot(
                doctor_id=dr_tariq.id,
                start_time=slot_start,
                end_time=slot_end,
                status="available"
            )
            session.add(slot)

        await session.commit()
        print("[SEED] Successfully seeded D.I. Khan initial doctors, slots, and assistant links!")

if __name__ == "__main__":
    asyncio.run(seed_database())
