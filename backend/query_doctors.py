"""Query all doctors and their assistant links."""
import asyncio
from app.core.database import AsyncSessionLocal
from app.models import Doctor, User, DoctorAssistant
from sqlalchemy import select
from sqlalchemy.orm import joinedload

async def run():
    async with AsyncSessionLocal() as s:
        result = await s.execute(select(Doctor).options(joinedload(Doctor.user)))
        docs = result.scalars().all()
        print("=== ALL DOCTORS ===")
        for d in docs:
            print(f"  ID: {d.id}")
            print(f"  Name: {d.user.full_name}")
            print(f"  Specialty: {d.specialty}")
            print(f"  Region: {d.sub_region}")
            print()

        result2 = await s.execute(
            select(DoctorAssistant).options(joinedload(DoctorAssistant.assistant_user))
        )
        links = result2.scalars().all()
        print("=== ASSISTANT LINKS ===")
        for l in links:
            print(f"  Doctor ID: {l.doctor_id}")
            print(f"  Assistant: {l.assistant_user.full_name} ({l.assistant_user.email})")
            print()

        # Find doctors WITHOUT assistants
        linked_doc_ids = set(l.doctor_id for l in links)
        unlinked = [d for d in docs if d.id not in linked_doc_ids]
        if unlinked:
            print("=== DOCTORS WITHOUT ASSISTANTS ===")
            for d in unlinked:
                print(f"  {d.user.full_name} (ID: {d.id}, Specialty: {d.specialty})")

asyncio.run(run())
