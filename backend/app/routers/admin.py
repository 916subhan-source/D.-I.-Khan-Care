"""
Admin / Developer Portal Router:
- Exclusive Spotlight Control: pin/unpin doctors to top of D.I. Khan directory
- Doctor Account Verification: review PMDC credentials and approve accounts
- Platform-Wide Audit Log Viewer: inspect all staff mutations and cash transactions
- Redis Cache Management: inspect and purge directory cache
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, delete, update
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.deps import require_roles
from app.core.redis import redis_manager
from app.core.security import get_password_hash
from app.services.audit_service import audit_service
from app.models import User, Doctor, DoctorSlot, DoctorAssistant, DoctorReview, Appointment, Payment, AuditLog
from app.schemas import SpotlightToggleRequest, DoctorResponse, AdminDoctorCreateSchema, AdminDoctorUpdateSchema

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.get("/doctors", response_model=List[DoctorResponse])
async def list_all_doctors_admin(
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to fetch all registered doctors regardless of verification status."""
    query = select(Doctor).options(selectinload(Doctor.user)).order_by(Doctor.created_at.desc())
    result = await db.execute(query)
    doctors = result.scalars().all()
    return [
        {
            "id": doc.id,
            "user_id": doc.user_id,
            "full_name": doc.user.full_name if doc.user else "Doctor",
            "email": doc.user.email if doc.user else None,
            "phone": doc.user.phone if doc.user else None,
            "plain_password": doc.user.plain_password if doc.user else None,
            "specialty": doc.specialty,
            "sub_region": doc.sub_region,
            "clinic_address": doc.clinic_address,
            "google_maps_url": doc.google_maps_url,
            "fee_clinic": float(doc.fee_clinic),
            "shift": doc.shift,
            "morning_start": doc.morning_start or "09:00",
            "morning_end": doc.morning_end or "13:00",
            "evening_start": doc.evening_start or "17:00",
            "evening_end": doc.evening_end or "21:00",
            "is_spotlight": doc.is_spotlight,
            "verification_status": doc.verification_status,
            "created_at": doc.created_at
        }
        for doc in doctors
    ]

@router.post("/doctors", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor_admin(
    payload: AdminDoctorCreateSchema,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Admin creates a new doctor account and clinic profile."""
    # Check duplicate email or phone
    dup_user = (await db.execute(select(User).where((User.email == payload.email) | (User.phone == payload.phone)))).scalar_one_or_none()
    if dup_user:
        raise HTTPException(status_code=400, detail="A user with this email or phone number already exists.")

    hashed_pwd = get_password_hash(payload.password)
    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hashed_pwd,
        plain_password=payload.password,  # Store recoverable copy for admin view
        role="DOCTOR",
        status="active"
    )
    db.add(new_user)
    await db.flush()

    new_doctor = Doctor(
        user_id=new_user.id,
        specialty=payload.specialty,
        sub_region=payload.sub_region,
        clinic_address=payload.clinic_address,
        google_maps_url=payload.google_maps_url,
        fee_clinic=payload.fee_clinic,
        shift=payload.shift,
        morning_start=payload.morning_start or "09:00",
        morning_end=payload.morning_end or "13:00",
        evening_start=payload.evening_start or "17:00",
        evening_end=payload.evening_end or "21:00",
        is_spotlight=payload.is_spotlight,
        verification_status=payload.verification_status or "verified",
        qualification=payload.qualification or "MBBS, FCPS"
    )
    db.add(new_doctor)
    await db.flush()

    # Automatically generate default appointment slots for tomorrow so doctor is immediately ready for bookings
    from datetime import datetime, timezone, timedelta
    from app.models import DoctorSlot
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    base_slot_time = now + timedelta(days=1, hours=16)  # 4:00 PM tomorrow
    for i in range(6):
        slot_start = base_slot_time + timedelta(minutes=i * 20)
        slot_end = slot_start + timedelta(minutes=20)
        slot = DoctorSlot(
            doctor_id=new_doctor.id,
            start_time=slot_start,
            end_time=slot_end,
            status="available"
        )
        db.add(slot)

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="CREATE_DOCTOR",
        entity="Doctor",
        entity_id=new_doctor.id,
        before_value="None",
        after_value=f"Name: {payload.full_name}, Specialty: {payload.specialty}, Clinic: {payload.sub_region}"
    )

    await db.commit()
    await db.refresh(new_doctor)
    await redis_manager.clear_cache_pattern("doctors:")

    return {
        "id": new_doctor.id,
        "user_id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email,
        "phone": new_user.phone,
        "plain_password": new_user.plain_password,
        "specialty": new_doctor.specialty,
        "sub_region": new_doctor.sub_region,
        "clinic_address": new_doctor.clinic_address,
        "google_maps_url": new_doctor.google_maps_url,
        "fee_clinic": float(new_doctor.fee_clinic),
        "shift": new_doctor.shift,
        "morning_start": new_doctor.morning_start,
        "morning_end": new_doctor.morning_end,
        "evening_start": new_doctor.evening_start,
        "evening_end": new_doctor.evening_end,
        "is_spotlight": new_doctor.is_spotlight,
        "verification_status": new_doctor.verification_status,
        "qualification": new_doctor.qualification or "MBBS, FCPS",
        "created_at": new_doctor.created_at
    }

@router.put("/doctors/{doctor_id}", response_model=DoctorResponse)
async def update_doctor_admin(
    doctor_id: str,
    payload: AdminDoctorUpdateSchema,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Admin updates any detail of a doctor and user profile."""
    query = select(Doctor).options(selectinload(Doctor.user)).where(Doctor.id == doctor_id)
    doc = (await db.execute(query)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    user = doc.user
    changes = []

    if payload.full_name is not None and payload.full_name != user.full_name:
        changes.append(f"full_name: {user.full_name} -> {payload.full_name}")
        user.full_name = payload.full_name

    if payload.email is not None and payload.email != user.email:
        dup = (await db.execute(select(User).where(User.email == payload.email, User.id != user.id))).scalar_one_or_none()
        if dup:
            raise HTTPException(status_code=400, detail="Email is already used by another user account.")
        changes.append(f"email: {user.email} -> {payload.email}")
        user.email = payload.email

    if payload.phone is not None and payload.phone != user.phone:
        dup = (await db.execute(select(User).where(User.phone == payload.phone, User.id != user.id))).scalar_one_or_none()
        if dup:
            raise HTTPException(status_code=400, detail="Phone is already used by another user account.")
        changes.append(f"phone: {user.phone} -> {payload.phone}")
        user.phone = payload.phone

    if payload.password is not None and payload.password.strip():
        user.password_hash = get_password_hash(payload.password)
        user.plain_password = payload.password  # Update recoverable copy
        user.status = "active"  # Reactivate account with new credentials
        changes.append("password: updated (previous credentials and sessions suspended)")

    if payload.specialty is not None:
        doc.specialty = payload.specialty
    if payload.sub_region is not None:
        doc.sub_region = payload.sub_region
    if payload.clinic_address is not None:
        doc.clinic_address = payload.clinic_address
    if payload.google_maps_url is not None:
        doc.google_maps_url = payload.google_maps_url
    if payload.fee_clinic is not None:
        doc.fee_clinic = payload.fee_clinic
    if payload.shift is not None:
        doc.shift = payload.shift
    if payload.morning_start is not None:
        doc.morning_start = payload.morning_start
    if payload.morning_end is not None:
        doc.morning_end = payload.morning_end
    if payload.evening_start is not None:
        doc.evening_start = payload.evening_start
    if payload.evening_end is not None:
        doc.evening_end = payload.evening_end
    if payload.verification_status is not None:
        doc.verification_status = payload.verification_status
    if payload.is_spotlight is not None:
        doc.is_spotlight = payload.is_spotlight
    if payload.qualification is not None:
        doc.qualification = payload.qualification

    has_cred_update = any("password" in c or "email" in c for c in changes)
    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="UPDATE_DOCTOR_CREDENTIALS" if has_cred_update else "UPDATE_DOCTOR",
        entity="Doctor",
        entity_id=doc.id,
        before_value="Previous credentials/state",
        after_value="; ".join(changes) if changes else "Updated details"
    )

    await db.commit()
    await redis_manager.clear_cache_pattern("doctors:")

    return {
        "id": doc.id,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "plain_password": user.plain_password,
        "specialty": doc.specialty,
        "sub_region": doc.sub_region,
        "clinic_address": doc.clinic_address,
        "google_maps_url": doc.google_maps_url,
        "fee_clinic": float(doc.fee_clinic),
        "shift": doc.shift,
        "morning_start": doc.morning_start or "09:00",
        "morning_end": doc.morning_end or "13:00",
        "evening_start": doc.evening_start or "17:00",
        "evening_end": doc.evening_end or "21:00",
        "is_spotlight": doc.is_spotlight,
        "verification_status": doc.verification_status,
        "created_at": doc.created_at
    }

@router.delete("/doctors/{doctor_id}")
async def delete_doctor_admin(
    doctor_id: str,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Admin deletes a doctor profile and user account, cleanly cascading all related records."""
    query = select(Doctor).options(selectinload(Doctor.user)).where(Doctor.id == doctor_id)
    doc = (await db.execute(query)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    doc_name = doc.user.full_name if doc.user else "Doctor"
    user = doc.user
    user_id = user.id if user else None

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="DELETE_DOCTOR",
        entity="Doctor",
        entity_id=doc.id,
        before_value=f"Name: {doc_name}",
        after_value="DELETED"
    )

    # 1. Cleanly delete payments & reviews linked to this doctor's appointments
    appt_ids_query = select(Appointment.id).where(Appointment.doctor_id == doctor_id)
    appt_ids = (await db.execute(appt_ids_query)).scalars().all()
    if appt_ids:
        await db.execute(delete(Payment).where(Payment.appointment_id.in_(appt_ids)))
        await db.execute(delete(DoctorReview).where(DoctorReview.appointment_id.in_(appt_ids)))

    # 2. Delete all appointments belonging to this doctor
    await db.execute(delete(Appointment).where(Appointment.doctor_id == doctor_id))

    # 3. Delete doctor reviews directly linked to this doctor
    await db.execute(delete(DoctorReview).where(DoctorReview.doctor_id == doctor_id))

    # 4. Delete assistant associations
    await db.execute(delete(DoctorAssistant).where(DoctorAssistant.doctor_id == doctor_id))

    # 5. Delete all slots belonging to this doctor
    await db.execute(delete(DoctorSlot).where(DoctorSlot.doctor_id == doctor_id))

    # 6. Nullify actor_id in audit_logs for the doctor user to prevent foreign-key violation
    if user_id:
        await db.execute(update(AuditLog).where(AuditLog.actor_id == user_id).values(actor_id=None))

    # 7. Delete the doctor record
    await db.delete(doc)

    # 8. Delete the user record
    if user:
        await db.delete(user)

    await db.commit()

    # 9. Purge cache patterns
    await redis_manager.clear_cache_pattern("doctors:")
    await redis_manager.clear_cache_pattern(f"doctor_slots:{doctor_id}")

    return {"status": "SUCCESS", "message": f"Doctor {doc_name} deleted successfully."}

@router.post("/doctors/{doctor_id}/spotlight", response_model=DoctorResponse)

async def toggle_doctor_spotlight(
    doctor_id: str,
    payload: SpotlightToggleRequest,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Exclusive Spotlight Access:
    Only Admin/Developer can pin or unpin a doctor at the top of the directory.
    Atomically clears the Redis directory cache.
    """
    query = select(Doctor).options(selectinload(Doctor.user)).where(Doctor.id == doctor_id)
    doc = (await db.execute(query)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    old_spotlight = doc.is_spotlight
    doc.is_spotlight = payload.is_spotlight

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="TOGGLE_SPOTLIGHT",
        entity="Doctor",
        entity_id=doc.id,
        before_value=f"is_spotlight: {old_spotlight}",
        after_value=f"is_spotlight: {doc.is_spotlight}"
    )

    await db.commit()

    # Clear Redis directory cache so public immediately reflects the new pinned doctor
    await redis_manager.clear_cache_pattern("doctors:")

    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "full_name": doc.user.full_name if doc.user else "Doctor",
        "email": doc.user.email if doc.user else None,
        "phone": doc.user.phone if doc.user else None,
        "specialty": doc.specialty,
        "sub_region": doc.sub_region,
        "clinic_address": doc.clinic_address,
        "google_maps_url": doc.google_maps_url,
        "fee_clinic": float(doc.fee_clinic),
        "shift": doc.shift,
        "is_spotlight": doc.is_spotlight,
        "verification_status": doc.verification_status,
        "created_at": doc.created_at
    }

@router.post("/doctors/{doctor_id}/verify")
async def verify_doctor_account(
    doctor_id: str,
    status_update: str = Query(..., regex="^(verified|rejected)$"),
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Admin verifies or rejects a doctor's clinic credentials."""
    doc = (await db.execute(select(Doctor).where(Doctor.id == doctor_id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    old_status = doc.verification_status
    doc.verification_status = status_update

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="VERIFY_DOCTOR",
        entity="Doctor",
        entity_id=doc.id,
        before_value=old_status,
        after_value=status_update
    )

    await db.commit()
    await redis_manager.clear_cache_pattern("doctors:")
    return {"status": "SUCCESS", "verification_status": status_update}

@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = 50,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Admin monitors system-wide mutations and financial cash entries."""
    query = select(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        {
            "id": log.id,
            "actor_id": log.actor_id,
            "action": log.action,
            "entity": log.entity,
            "entity_id": log.entity_id,
            "before_value": log.before_value,
            "after_value": log.after_value,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]

@router.get("/redis/status")
async def get_redis_status(
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    """
    Redis Cache Inspector:
    Displays active slot locks, cached doctor directory entries,
    active OTP rate-limit counters, and overall Redis connection state.
    """
    is_fallback = redis_manager._use_fallback
    store = redis_manager._fallback_store

    import time
    now = time.time()

    if is_fallback:
        # Read from in-memory dict
        slot_locks = []
        directory_cache = []
        otp_rate_limits = []
        otp_entries = []

        for key, (value, exp) in list(store.items()):
            if now >= exp:
                continue  # expired
            ttl_remaining = int(exp - now)
            if key.startswith("slot:lock:"):
                slot_locks.append({"key": key, "held_by_patient_id": value, "ttl_seconds_remaining": ttl_remaining})
            elif key.startswith("cache:doctors:"):
                directory_cache.append({"key": key, "ttl_seconds_remaining": ttl_remaining})
            elif key.startswith("otp:attempts:"):
                otp_rate_limits.append({"key": key, "attempts_count": value, "ttl_seconds_remaining": ttl_remaining})
            elif key.startswith("otp:"):
                otp_entries.append({"key": key, "ttl_seconds_remaining": ttl_remaining})
    else:
        # Read from actual Redis
        try:
            slot_lock_keys = await redis_manager.client.keys("slot:lock:*")
            slot_locks = []
            for k in slot_lock_keys:
                val = await redis_manager.client.get(k)
                ttl = await redis_manager.client.ttl(k)
                slot_locks.append({"key": k, "held_by_patient_id": val, "ttl_seconds_remaining": ttl})

            dir_keys = await redis_manager.client.keys("cache:doctors:*")
            directory_cache = []
            for k in dir_keys:
                ttl = await redis_manager.client.ttl(k)
                directory_cache.append({"key": k, "ttl_seconds_remaining": ttl})

            otp_rate_keys = await redis_manager.client.keys("otp:attempts:*")
            otp_rate_limits = []
            for k in otp_rate_keys:
                val = await redis_manager.client.get(k)
                ttl = await redis_manager.client.ttl(k)
                otp_rate_limits.append({"key": k, "attempts_count": val, "ttl_seconds_remaining": ttl})

            otp_keys = [k for k in (await redis_manager.client.keys("otp:*")) if not k.startswith("otp:attempts:")]
            otp_entries = []
            for k in otp_keys:
                ttl = await redis_manager.client.ttl(k)
                otp_entries.append({"key": k, "ttl_seconds_remaining": ttl})

        except Exception as e:
            return {"error": f"Redis query failed: {str(e)}"}

    return {
        "redis_mode": "in_memory_fallback" if is_fallback else "redis_server",
        "active_slot_locks": slot_locks,
        "active_slot_lock_count": len(slot_locks),
        "directory_cache_entries": directory_cache,
        "directory_cache_count": len(directory_cache),
        "active_otp_sessions": otp_entries,
        "otp_rate_limit_counters": otp_rate_limits,
    }
