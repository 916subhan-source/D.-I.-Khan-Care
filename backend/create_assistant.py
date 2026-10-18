"""Create an assistant for Dr. Subhan Sultan."""
import asyncio
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models import User, Doctor, DoctorAssistant
from sqlalchemy import select

async def run():
    async with AsyncSessionLocal() as s:
        # Find Dr. Subhan Sultan's doctor record
        result = await s.execute(
            select(Doctor).where(Doctor.id == "3930a7d5-9b0c-4a22-ba0a-1973b09cfd7c")
        )
        doctor = result.scalar_one_or_none()
        if not doctor:
            print("ERROR: Doctor not found!")
            return

        # Create assistant user
        assistant = User(
            full_name="Adnan Wazir",
            email="adnan.reception@dikhanhealth.pk",
            phone="+923065557890",
            password_hash=get_password_hash("AssistantPass123!"),
            role="ASSISTANT",
            status="active"
        )
        s.add(assistant)
        await s.flush()

        # Link to doctor
        link = DoctorAssistant(
            doctor_id=doctor.id,
            assistant_user_id=assistant.id,
            status="active"
        )
        s.add(link)
        await s.commit()

        print(f"SUCCESS: Created assistant '{assistant.full_name}' for Dr. Subhan Sultan")
        print(f"  Email: {assistant.email}")
        print(f"  Password: AssistantPass123!")

asyncio.run(run())
