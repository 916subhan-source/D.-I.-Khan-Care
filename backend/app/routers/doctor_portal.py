from pydantic import BaseModel
"""
Doctor Portal Management Router:
- Schedule & Shift Manager: create recurring daily/shift slots (Morning / Evening)
- Blackout dates: block slots on off-days or emergencies
- Self-Service Assistant Management: doctors create, link, or revoke assistant accounts
  directly without admin intervention
- Consultation Analytics: summary of patient volume, cash collections, and status counts
"""

import re
import json
import asyncio
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, case
from sqlalchemy.orm import selectinload, joinedload, contains_eager
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.security import get_password_hash
from app.core.redis import redis_manager
from app.core.cloudinary_service import upload_doctor_photo, delete_doctor_photo, upload_loyalty_card_photo
from app.models import User, Doctor, DoctorAssistant, DoctorSlot, Appointment, Payment
from app.schemas import (
    AssistantCreateRequest, AssistantResponse, 
    SlotCreate, SlotResponse
)
from app.services.audit_service import audit_service
from app.services.vision_service import analyze_loyalty_card_image
from app.core.timezone import PKT, to_pkt, format_pkt_date, format_pkt_time, format_pkt_ymd

router = APIRouter(prefix="/doctor", tags=["Doctor Portal"])

@router.get("/profile")
async def get_doctor_profile(
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves doctor's own clinic profile."""
    result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")
    
    return {
        "doctor_id": doctor.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "specialty": doctor.specialty,
        "sub_region": doctor.sub_region,
        "clinic_address": doctor.clinic_address,
        "google_maps_url": doctor.google_maps_url,
        "fee_clinic": float(doctor.fee_clinic),
        "shift": doctor.shift,
        "morning_start": doctor.morning_start or "09:00",
        "morning_end": doctor.morning_end or "13:00",
        "evening_start": doctor.evening_start or "17:00",
        "evening_end": doctor.evening_end or "21:00",
        "is_spotlight": doctor.is_spotlight,
        "verification_status": doctor.verification_status,
        "profile_image": doctor.profile_image,
        "off_days": doctor.off_days or "sunday",
        "bio": doctor.bio,
        "expertise": doctor.expertise,
        "experience_years": doctor.experience_years if doctor.experience_years is not None else 5,
        "qualification": doctor.qualification or "MBBS, FCPS",
        "loyalty_card_enabled": doctor.loyalty_card_enabled if doctor.loyalty_card_enabled is not None else False,
        "loyalty_card_title": doctor.loyalty_card_title or "RK Loyalty Card",
        "loyalty_card_image_url": doctor.loyalty_card_image_url,
        "loyalty_discount_percent": float(doctor.loyalty_discount_percent if doctor.loyalty_discount_percent is not None else 10.00)
    }

@router.post("/profile/picture")
async def upload_doctor_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Uploads or updates the doctor's portrait to Cloudinary with automatic
    face centering, auto-compression, and CDN distribution.
    """
    # 1. Validate MIME type
    allowed_content_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Please upload a JPG, PNG, or WEBP image."
        )

    # 2. Read bytes and enforce max size (5 MB)
    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size exceeds the 5 MB limit. Please choose a smaller photo."
        )

    # 3. Locate doctor record
    result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile record not found.")

    # 4. Upload to Cloudinary
    try:
        secure_url = upload_doctor_photo(file_bytes, doctor.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload photo to Cloudinary: {str(e)}"
        )

    # 5. Persist URL in Postgres
    doctor.profile_image = secure_url
    await db.commit()
    await db.refresh(doctor)

    # 6. Invalidate Redis directory cache so the home page updates immediately
    try:
        await redis_manager.clear_cache_pattern("doctors:*")
    except Exception:
        pass

    return {
        "status": "success",
        "message": "Profile picture updated successfully!",
        "profile_image": secure_url
    }

@router.delete("/profile/picture")
async def delete_doctor_profile_picture(
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Removes the custom Cloudinary profile picture and reverts to default specialist avatar.
    """
    result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile record not found.")

    delete_doctor_photo(doctor.id)
    doctor.profile_image = None
    await db.commit()
    await db.refresh(doctor)

    try:
        await redis_manager.clear_cache_pattern("doctors:*")
    except Exception:
        pass

    return {
        "status": "success",
        "message": "Profile picture removed. Reverted to default avatar.",
        "profile_image": None
    }

# --- 1. Self-Service Assistant Management ---

@router.post("/loyalty-card/upload")
async def upload_doctor_loyalty_card(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Uploads the doctor's custom VIP Loyalty Card photo to Cloudinary
    and enables the loyalty program with default 20% discount.
    """
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Please upload JPG, PNG, or WEBP."
        )

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loyalty card image exceeds 5 MB limit."
        )

    result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    try:
        url = upload_loyalty_card_photo(file_bytes, doctor.id)
        if not url:
            raise HTTPException(status_code=500, detail="Failed to upload loyalty card image.")

        # Run AI Vision Analysis to autodetect consultation discount and title
        analysis = analyze_loyalty_card_image(file_bytes)
        detected_discount = analysis.get("consultation_discount_percent")
        detected_title = analysis.get("card_title")

        doctor.loyalty_card_image_url = url
        doctor.loyalty_card_enabled = True
        if detected_title:
            doctor.loyalty_card_title = detected_title
        if detected_discount is not None:
            doctor.loyalty_discount_percent = Decimal(str(detected_discount))

        await db.commit()
        await redis_manager.clear_cache_pattern("doctors:*")

        return {
            "status": "SUCCESS",
            "message": f"VIP Loyalty Card uploaded! Autodetected {doctor.loyalty_discount_percent}% consultation fee discount.",
            "loyalty_card_image_url": doctor.loyalty_card_image_url,
            "loyalty_card_enabled": doctor.loyalty_card_enabled,
            "loyalty_card_title": doctor.loyalty_card_title,
            "loyalty_discount_percent": float(doctor.loyalty_discount_percent)
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process loyalty card: {str(e)}")

class LoyaltySettingsRequest(BaseModel):
    loyalty_card_enabled: bool
    loyalty_card_title: Optional[str] = "RK Loyalty Card"
    loyalty_discount_percent: Optional[float] = None

@router.put("/loyalty-card/settings")
async def update_doctor_loyalty_settings(
    payload: LoyaltySettingsRequest,
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """Updates doctor's loyalty card active status, title, and discount percentage."""
    result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    doctor.loyalty_card_enabled = payload.loyalty_card_enabled
    if payload.loyalty_card_title:
        doctor.loyalty_card_title = payload.loyalty_card_title.strip()
    if payload.loyalty_discount_percent is not None:
        doctor.loyalty_discount_percent = Decimal(str(payload.loyalty_discount_percent))

    await db.commit()
    await redis_manager.clear_cache_pattern("doctors:*")

    return {
        "status": "SUCCESS",
        "message": "Loyalty Card settings updated successfully.",
        "loyalty_card_enabled": doctor.loyalty_card_enabled,
        "loyalty_card_title": doctor.loyalty_card_title,
        "loyalty_discount_percent": float(doctor.loyalty_discount_percent)
    }

@router.get("/assistants", response_model=List[AssistantResponse])
async def list_doctor_assistants(
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """Doctors view all assistants appointed to their desk."""
    doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")



    query = select(DoctorAssistant, User).join(User, DoctorAssistant.assistant_user_id == User.id)\
        .where(
            and_(
                DoctorAssistant.doctor_id == doc.id,
                DoctorAssistant.status == "active"
            )
        )
    
    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "status": da.status,
            "plain_password": user.plain_password  # Recoverable password for doctor view
        }
        for da, user in rows
    ]

@router.post("/assistants", response_model=AssistantResponse)
async def create_or_link_assistant(
    payload: AssistantCreateRequest,
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Self-Service: Doctor directly adds and links a clinic assistant.
    No developer or admin intervention needed.
    """
    doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")



    # 1. Check if user already exists
    user_res = await db.execute(select(User).where(User.email == payload.email))
    assistant_user = user_res.scalar_one_or_none()

    if not assistant_user:
        assistant_user = User(
            full_name=payload.full_name,
            email=payload.email,
            phone=payload.phone,
            password_hash=get_password_hash(payload.password),
            plain_password=payload.password,  # Store recoverable copy for doctor view
            role="ASSISTANT",
            status="active"
        )
        db.add(assistant_user)
        await db.flush()
    else:
        # Existing user account: update credentials, password, and reactivate
        assistant_user.full_name = payload.full_name
        if payload.phone:
            assistant_user.phone = payload.phone
        assistant_user.password_hash = get_password_hash(payload.password)
        assistant_user.plain_password = payload.password
        assistant_user.role = "ASSISTANT"
        assistant_user.status = "active"
        await db.flush()

    # 2. Link assistant to this doctor
    link_res = await db.execute(
        select(DoctorAssistant).where(
            and_(DoctorAssistant.doctor_id == doc.id, DoctorAssistant.assistant_user_id == assistant_user.id)
        )
    )
    link = link_res.scalar_one_or_none()
    if not link:
        link = DoctorAssistant(
            doctor_id=doc.id,
            assistant_user_id=assistant_user.id,
            status="active"
        )
        db.add(link)
    else:
        link.status = "active"

    await db.commit()
    await db.refresh(assistant_user)

    return {
        "id": assistant_user.id,
        "full_name": assistant_user.full_name,
        "email": assistant_user.email,
        "phone": assistant_user.phone,
        "status": "active",
        "plain_password": assistant_user.plain_password
    }

@router.delete("/assistants/{assistant_user_id}")
async def revoke_assistant(
    assistant_user_id: str,
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """Doctor revokes and removes assistant access completely."""
    doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")



    link_res = await db.execute(
        select(DoctorAssistant).where(
            and_(DoctorAssistant.doctor_id == doc.id, DoctorAssistant.assistant_user_id == assistant_user_id)
        )
    )
    link = link_res.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Assistant link not found.")

    # Delete the link record so the assistant no longer appears in the list
    await db.delete(link)
    await db.flush()

    # Only deactivate the assistant user account if they have no other active clinic links
    remaining_link = (await db.execute(
        select(DoctorAssistant).where(
            and_(
                DoctorAssistant.assistant_user_id == assistant_user_id,
                DoctorAssistant.status == "active"
            )
        )
    )).scalars().first()

    if not remaining_link:
        asst_user_res = await db.execute(select(User).where(User.id == assistant_user_id))
        asst_user = asst_user_res.scalar_one_or_none()
        if asst_user:
            asst_user.status = "inactive"

    await db.commit()
    await redis_manager.clear_cache_pattern(f"doc_appts:{doc.id}")
    await redis_manager.clear_cache_pattern(f"doc_analytics:{doc.id}")
    return {"status": "SUCCESS", "message": "Assistant access revoked successfully."}

@router.put("/assistants/{assistant_user_id}/reset-password")
async def reset_assistant_password(
    assistant_user_id: str,
    new_password: Optional[str] = Query(None, description="New password for assistant"),
    payload: Optional[dict] = Body(None),
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """Doctor resets password for an assistant assigned to their clinic."""
    pwd = new_password
    if not pwd and payload:
        pwd = payload.get("new_password") or payload.get("password")
    
    if not pwd or len(pwd.strip()) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")
    
    pwd = pwd.strip()
    doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")



    link_res = await db.execute(
        select(DoctorAssistant).where(
            and_(DoctorAssistant.doctor_id == doc.id, DoctorAssistant.assistant_user_id == assistant_user_id)
        )
    )
    link = link_res.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Assistant link not found or does not belong to your clinic.")

    asst_user = (await db.execute(select(User).where(User.id == assistant_user_id))).scalar_one_or_none()
    if not asst_user:
        raise HTTPException(status_code=404, detail="Assistant user account not found.")

    asst_user.password_hash = get_password_hash(pwd)
    asst_user.plain_password = pwd  # Update recoverable copy
    await db.commit()
    await redis_manager.clear_cache_pattern(f"doc_appts:{doc.id}")
    await redis_manager.clear_cache_pattern(f"doc_analytics:{doc.id}")
    return {
        "status": "SUCCESS",
        "message": f"Password for assistant '{asst_user.full_name}' updated successfully.",
        "assistant_id": asst_user.id,
        "new_password": pwd
    }

async def resolve_target_doctor(current_user: User, doctor_id: Optional[str], db: AsyncSession) -> Doctor:
    """
    Resolves the target doctor record for slot and schedule operations:
    - If user is DOCTOR: retrieves their own doctor profile.
    - If user is ASSISTANT: verifies active link in DoctorAssistant for the requested doctor_id.
    - If user is ADMIN: allows any doctor_id.
    """
    if current_user.role == "DOCTOR":
        doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")
        return doc
    
    if not doctor_id:
        raise HTTPException(status_code=400, detail="doctor_id is required for assistant/admin operations.")
        
    if current_user.role == "ASSISTANT":
        link = (await db.execute(
            select(DoctorAssistant).where(
                and_(
                    DoctorAssistant.doctor_id == doctor_id,
                    DoctorAssistant.assistant_user_id == current_user.id,
                    DoctorAssistant.status == "active"
                )
            )
        )).scalar_one_or_none()
        if not link:
            raise HTTPException(status_code=403, detail="You are not authorized to manage slots or schedules for this doctor.")

    doc = (await db.execute(select(Doctor).where(Doctor.id == doctor_id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Target doctor not found.")
    return doc


# --- 2. Blackout Calendar & Slot Controls ---
@router.patch("/slots/{slot_id}/block")
async def block_slot(
    slot_id: str,
    doctor_id: Optional[str] = Query(None),
    current_user: User = Depends(require_roles(["DOCTOR", "ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Slot Controls: Doctor or their authorized Assistant marks a single slot as 'blocked'.
    Blocked slots are hidden from patients.
    """
    slot = (await db.execute(
        select(DoctorSlot).where(DoctorSlot.id == slot_id)
    )).scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")

    doc = await resolve_target_doctor(current_user, doctor_id or slot.doctor_id, db)
    if slot.doctor_id != doc.id:
        raise HTTPException(status_code=403, detail="Slot does not belong to the target doctor.")

    if slot.status == "booked":
        raise HTTPException(status_code=400, detail="Cannot block a slot that is already booked.")

    slot.status = "blocked"
    await db.commit()
    await redis_manager.clear_cache_pattern("doctors:*")
    await redis_manager.clear_cache_pattern(f"doctor_slots:{doc.id}")
    return {"status": "SUCCESS", "message": f"Slot {slot_id} blocked.", "slot_id": slot_id}

@router.patch("/slots/{slot_id}/unblock")
async def unblock_slot(
    slot_id: str,
    doctor_id: Optional[str] = Query(None),
    current_user: User = Depends(require_roles(["DOCTOR", "ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Restores a previously blocked slot back to 'available'."""
    slot = (await db.execute(
        select(DoctorSlot).where(DoctorSlot.id == slot_id)
    )).scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")

    doc = await resolve_target_doctor(current_user, doctor_id or slot.doctor_id, db)
    if slot.doctor_id != doc.id:
        raise HTTPException(status_code=403, detail="Slot does not belong to the target doctor.")

    if slot.status != "blocked":
        raise HTTPException(status_code=400, detail=f"Slot is not blocked (current status: {slot.status}).")

    slot.status = "available"
    await db.commit()
    await redis_manager.clear_cache_pattern("doctors:*")
    await redis_manager.clear_cache_pattern(f"doctor_slots:{doc.id}")
    return {"status": "SUCCESS", "message": f"Slot {slot_id} is now available again.", "slot_id": slot_id}

@router.post("/blackout")
async def blackout_date(
    date: str,  # YYYY-MM-DD
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Bulk Blackout: Blocks ALL available slots on a given date in one call.
    For emergency leaves or clinic-wide closure days.
    """
    from datetime import date as date_type
    doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")



    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Fetch all available slots for this doctor on this date
    next_day = target_date + timedelta(days=1)
    slots_result = await db.execute(
        select(DoctorSlot).where(
            and_(
                DoctorSlot.doctor_id == doc.id,
                DoctorSlot.start_time >= target_date,
                DoctorSlot.start_time < next_day,
                DoctorSlot.status == "available"
            )
        )
    )
    slots = slots_result.scalars().all()
    blocked_count = 0
    for slot in slots:
        slot.status = "blocked"
        blocked_count += 1

    await db.commit()
    await redis_manager.clear_cache_pattern("doctors:*")
    await redis_manager.clear_cache_pattern(f"doctor_slots:{doc.id}")
    return {
        "status": "SUCCESS",
        "date": date,
        "slots_blocked": blocked_count,
        "message": f"All {blocked_count} available slots on {date} have been blocked."
    }

# --- 3. Schedule & Slot Generation ---
from pydantic import BaseModel as PydanticBase

class SlotGenerateRequest(PydanticBase):
    doctor_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    slot_duration_minutes: int = 20
    interval_minutes: Optional[int] = None
    shift: Optional[str] = None
    replace_existing: bool = True
    morning_start: Optional[str] = None
    morning_end: Optional[str] = None
    evening_start: Optional[str] = None
    evening_end: Optional[str] = None
    off_days: Optional[List[str]] = None

@router.post("/slots/generate")
async def generate_slots(
    payload: SlotGenerateRequest,
    current_user: User = Depends(require_roles(["DOCTOR", "ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Generates clinic visit slots for doctor's shift across a date range."""
    doc = await resolve_target_doctor(current_user, payload.doctor_id, db)

    s_str = payload.start_date or payload.from_date
    e_str = payload.end_date or payload.to_date
    if not s_str or not e_str:
        raise HTTPException(status_code=400, detail="start_date (or from_date) and end_date (or to_date) are required.")

    dur_mins = payload.interval_minutes or payload.slot_duration_minutes or 20

    PKT = timezone(timedelta(hours=5))

    try:
        base_dt = datetime.strptime(s_str, "%Y-%m-%d").replace(tzinfo=PKT)
        end_dt  = datetime.strptime(e_str,   "%Y-%m-%d").replace(tzinfo=PKT)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    def parse_hm(t: str):
        h, m = map(int, t.split(":"))
        return h, m

    shift = (payload.shift or doc.shift or "BOTH").upper()
    if shift in ["MORNING", "EVENING", "BOTH"]:
        doc.shift = shift

    morning_start = payload.morning_start or doc.morning_start or "09:00"
    morning_end = payload.morning_end or doc.morning_end or "13:00"
    evening_start = payload.evening_start or doc.evening_start or "17:00"
    evening_end = payload.evening_end or doc.evening_end or "21:00"

    # Persist and normalize off days (e.g. ["friday", "sunday"])
    selected_off_days: List[str] = []
    if payload.off_days is not None:
        selected_off_days = [d.strip().lower() for d in payload.off_days if d and d.strip()]
        doc.off_days = ",".join(selected_off_days)
    elif doc.off_days:
        selected_off_days = [d.strip().lower() for d in doc.off_days.split(",") if d.strip()]

    # Persist customized shift hours to doctor profile
    if payload.morning_start:
        doc.morning_start = payload.morning_start
    if payload.morning_end:
        doc.morning_end = payload.morning_end
    if payload.evening_start:
        doc.evening_start = payload.evening_start
    if payload.evening_end:
        doc.evening_end = payload.evening_end

    range_start_utc = base_dt.astimezone(timezone.utc)
    range_end_utc = (end_dt + timedelta(days=1)).astimezone(timezone.utc)

    # 1. Fetch all existing slots in the date range to protect booked/hold/blocked slots
    existing_slots_res = await db.execute(
        select(DoctorSlot).options(selectinload(DoctorSlot.appointment)).where(
            and_(
                DoctorSlot.doctor_id == doc.id,
                DoctorSlot.start_time >= range_start_utc,
                DoctorSlot.start_time < range_end_utc
            )
        )
    )
    all_existing_slots = existing_slots_res.scalars().all()

    slots_to_check = [s.id for s in all_existing_slots if s.status not in ("booked", "hold", "blocked")]
    active_locked_ids = await redis_manager.get_active_slot_locks(slots_to_check)

    protected_slots = []
    for s in all_existing_slots:
        is_protected = s.status in ("booked", "hold", "blocked")
        if s.appointment and s.appointment.status not in ("CANCELLED", "REJECTED"):
            is_protected = True
        elif s.id in active_locked_ids:
            is_protected = True

        if is_protected:
            protected_slots.append(s)
        elif payload.replace_existing and s.status == "available":
            # Detach cancelled/rejected appointments so foreign key doesn't block clean slot deletion
            if s.appointment:
                s.appointment.slot_id = None
            await db.delete(s)

    if payload.replace_existing:
        await db.flush()

    def to_utc(dt: datetime) -> datetime:
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    # Protected time windows (existing booked, held, or blocked slots) to avoid double booking
    protected_intervals = [(to_utc(ps.start_time), to_utc(ps.end_time)) for ps in protected_slots]

    windows = []
    
    if shift == "MORNING":
        sh, sm = parse_hm(morning_start)
        eh, em = parse_hm(morning_end)
        windows.append((sh, sm, eh, em))
    elif shift == "EVENING":
        sh, sm = parse_hm(evening_start)
        eh, em = parse_hm(evening_end)
        windows.append((sh, sm, eh, em))
    else:
        # Default, BOTH, or custom shift string: Include both Morning and Evening shift windows
        sh1, sm1 = parse_hm(morning_start)
        eh1, em1 = parse_hm(morning_end)
        if (sh1 * 60 + sm1) < (eh1 * 60 + em1):
            windows.append((sh1, sm1, eh1, em1))

        sh2, sm2 = parse_hm(evening_start)
        eh2, em2 = parse_hm(evening_end)
        if (sh2 * 60 + sm2) < (eh2 * 60 + em2):
            windows.append((sh2, sm2, eh2, em2))

    slots_created = 0
    current_day = base_dt

    while current_day <= end_dt:
        day_name = current_day.strftime("%A").lower()
        if day_name in selected_off_days:
            # Option A: Do NOT create any slots for off days! Clean up any unbooked available slots on this off-day
            day_start_utc = current_day.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=PKT).astimezone(timezone.utc)
            day_end_utc = current_day.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=PKT).astimezone(timezone.utc)
            old_off_slots_res = await db.execute(
                select(DoctorSlot).options(selectinload(DoctorSlot.appointment)).where(
                    and_(
                        DoctorSlot.doctor_id == doc.id,
                        DoctorSlot.start_time >= day_start_utc,
                        DoctorSlot.start_time <= day_end_utc,
                        DoctorSlot.status == "available"
                    )
                )
            )
            for os in old_off_slots_res.scalars().all():
                if os.appointment:
                    os.appointment.slot_id = None
                await db.delete(os)

            current_day += timedelta(days=1)
            continue

        for (sh, sm, eh, em) in windows:
            curr_time_pkt = current_day.replace(hour=sh, minute=sm, second=0, microsecond=0, tzinfo=PKT)
            boundary_pkt  = current_day.replace(hour=eh, minute=em, second=0, microsecond=0, tzinfo=PKT)

            while curr_time_pkt < boundary_pkt:
                slot_end_pkt = curr_time_pkt + timedelta(minutes=dur_mins)
                if slot_end_pkt > boundary_pkt:
                    break

                curr_time_utc = curr_time_pkt.astimezone(timezone.utc)
                slot_end_utc  = slot_end_pkt.astimezone(timezone.utc)

                # Double-booking guard: check if candidate slot intersects ANY existing booked/held/blocked slot
                colliding = [
                    (p_start, p_end) for (p_start, p_end) in protected_intervals
                    if (curr_time_utc < p_end and slot_end_utc > p_start)
                ]

                if colliding:
                    # Do NOT create any slot overlapping with an already booked slot!
                    # Jump forward to the end of the colliding booked appointment
                    max_colliding_end_utc = max(p[1] for p in colliding)
                    max_colliding_end_pkt = max_colliding_end_utc.astimezone(PKT)
                    if max_colliding_end_pkt > curr_time_pkt:
                        curr_time_pkt = max_colliding_end_pkt
                    else:
                        curr_time_pkt = slot_end_pkt
                    continue

                exists = (await db.execute(
                    select(DoctorSlot).where(
                        and_(DoctorSlot.doctor_id == doc.id, DoctorSlot.start_time == curr_time_utc)
                    )
                )).scalar_one_or_none()

                if not exists:
                    db.add(DoctorSlot(
                        doctor_id=doc.id,
                        start_time=curr_time_utc,
                        end_time=slot_end_utc,
                        status="available"
                    ))
                    slots_created += 1

                curr_time_pkt = slot_end_pkt

        current_day += timedelta(days=1)

    await db.commit()
    await redis_manager.clear_cache_pattern("doctors:*")
    await redis_manager.clear_cache_pattern(f"doctor_slots:{doc.id}")
    off_days_summary = f" (Skipped off days: {', '.join(d.capitalize() for d in selected_off_days)})" if selected_off_days else ""
    msg = f"Generated {slots_created} new consultation slots ({dur_mins} mins each for {shift} shift){off_days_summary} with conflict protection!" if slots_created > 0 else f"Slots processed{off_days_summary}. No duplicate slots created."
    return {"status": "SUCCESS", "slots_created": slots_created, "shift": shift, "duration_minutes": dur_mins, "message": msg}


@router.get("/slots/my-slots")
async def get_my_doctor_slots(
    doctor_id: Optional[str] = Query(None, description="Doctor ID if requested by assistant or admin"),
    current_user: User = Depends(require_roles(["DOCTOR", "ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Fetches all generated slots for the logged in doctor or the assistant's selected doctor."""
    doc = await resolve_target_doctor(current_user, doctor_id, db)
    
    slots_res = await db.execute(
        select(DoctorSlot)
        .where(DoctorSlot.doctor_id == doc.id)
        .order_by(DoctorSlot.start_time.asc())
    )
    slots = slots_res.scalars().all()
    return [
        {
            "id": s.id,
            "doctor_id": s.doctor_id,
            "start_time": s.start_time.isoformat(),
            "end_time": s.end_time.isoformat(),
            "slot_date": to_pkt(s.start_time).strftime("%Y-%m-%d"),
            "slot_date_fmt": format_pkt_date(s.start_time),
            "start_time_fmt": format_pkt_time(s.start_time),
            "end_time_fmt": format_pkt_time(s.end_time),
            "status": s.status,
            "duration_minutes": int((s.end_time - s.start_time).total_seconds() // 60)
        }
        for s in slots
    ]


@router.delete("/slots/clear-unbooked")
async def clear_unbooked_slots(
    doctor_id: Optional[str] = Query(None, description="Doctor ID if requested by assistant or admin"),
    start_date: Optional[str] = Query(None, description="Optional start date (YYYY-MM-DD) to only clear slots within a date range"),
    end_date: Optional[str] = Query(None, description="Optional end date (YYYY-MM-DD) to only clear slots within a date range"),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    current_user: User = Depends(require_roles(["DOCTOR", "ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Deletes unbooked (available) slots for the doctor, safely scoped to the chosen date range."""
    doc = await resolve_target_doctor(current_user, doctor_id, db)

    s_str = start_date or from_date
    e_str = end_date or to_date
    
    query = select(DoctorSlot).where(
        and_(DoctorSlot.doctor_id == doc.id, DoctorSlot.status == "available")
    )

    PKT = timezone(timedelta(hours=5))
    if s_str:
        try:
            s_dt = datetime.strptime(s_str, "%Y-%m-%d").replace(tzinfo=PKT).astimezone(timezone.utc)
            query = query.where(DoctorSlot.start_time >= s_dt)
        except ValueError:
            pass

    if e_str:
        try:
            e_dt = (datetime.strptime(e_str, "%Y-%m-%d").replace(tzinfo=PKT) + timedelta(days=1)).astimezone(timezone.utc)
            query = query.where(DoctorSlot.start_time < e_dt)
        except ValueError:
            pass

    unbooked_res = await db.execute(query)
    unbooked_slots = unbooked_res.scalars().all()
    count = 0
    for s in unbooked_slots:
        # Check if there is an active (non-cancelled, non-rejected) appointment
        active_appt = (await db.execute(
            select(Appointment.id).where(
                and_(
                    Appointment.slot_id == s.id,
                    ~Appointment.status.in_(["CANCELLED", "REJECTED"])
                )
            )
        )).first()
        if not active_appt:
            # Detach any historical cancelled or rejected appointments so FK doesn't prevent deletion
            cancelled_appts = (await db.execute(
                select(Appointment).where(Appointment.slot_id == s.id)
            )).scalars().all()
            for ca in cancelled_appts:
                ca.slot_id = None
            await db.delete(s)
            count += 1
    
    await db.commit()
    await redis_manager.clear_cache_pattern("doctors:*")
    await redis_manager.clear_cache_pattern(f"doctor_slots:{doc.id}")
    msg = f"Successfully cleared {count} unbooked slots"
    if s_str and e_str:
        msg += f" for dates {s_str} to {e_str}."
    else:
        msg += "."
    return {
        "status": "SUCCESS",
        "deleted_count": count,
        "message": msg
    }


@router.delete("/slots/{slot_id}")
async def delete_single_slot(
    slot_id: str,
    doctor_id: Optional[str] = Query(None),
    current_user: User = Depends(require_roles(["DOCTOR", "ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Deletes a single unbooked slot."""
    slot = (await db.execute(
        select(DoctorSlot).where(DoctorSlot.id == slot_id)
    )).scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")

    doc = await resolve_target_doctor(current_user, doctor_id or slot.doctor_id, db)
    if slot.doctor_id != doc.id:
        raise HTTPException(status_code=403, detail="Slot does not belong to the target doctor.")
    
    active_appt = (await db.execute(
        select(Appointment.id).where(
            and_(
                Appointment.slot_id == slot.id,
                ~Appointment.status.in_(["CANCELLED", "REJECTED"])
            )
        )
    )).first()
    if active_appt or slot.status == "booked":
        raise HTTPException(status_code=400, detail="Cannot delete a slot that is currently booked with an active appointment.")

    # Detach any historical cancelled or rejected appointments so FK doesn't block deletion
    cancelled_appts = (await db.execute(
        select(Appointment).where(Appointment.slot_id == slot.id)
    )).scalars().all()
    for ca in cancelled_appts:
        ca.slot_id = None

    await db.delete(slot)
    await db.commit()
    await redis_manager.clear_cache_pattern("doctors:*")
    await redis_manager.clear_cache_pattern(f"doctor_slots:{doc.id}")
    return {"status": "SUCCESS", "message": "Slot deleted successfully.", "slot_id": slot_id}


class ShiftHoursUpdateRequest(PydanticBase):
    doctor_id: Optional[str] = None
    shift: Optional[str] = None
    morning_start: Optional[str] = None
    morning_end: Optional[str] = None
    evening_start: Optional[str] = None
    evening_end: Optional[str] = None

@router.put("/shift-hours")
async def update_shift_hours(
    payload: ShiftHoursUpdateRequest,
    current_user: User = Depends(require_roles(["DOCTOR", "ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Doctor or Assistant updates the operating shift hours for the doctor clinic."""
    doc = await resolve_target_doctor(current_user, payload.doctor_id, db)
    if payload.shift:
        doc.shift = payload.shift.upper()
    if payload.morning_start:
        doc.morning_start = payload.morning_start
    if payload.morning_end:
        doc.morning_end = payload.morning_end
    if payload.evening_start:
        doc.evening_start = payload.evening_start
    if payload.evening_end:
        doc.evening_end = payload.evening_end
    await db.commit()
    await db.refresh(doc)
    return {
        "status": "SUCCESS",
        "message": "Operating shift hours updated successfully.",
        "shift": doc.shift,
        "morning_start": doc.morning_start,
        "morning_end": doc.morning_end,
        "evening_start": doc.evening_start,
        "evening_end": doc.evening_end
    }


@router.post("/appointments/{appointment_id}/approve")
async def approve_appointment_by_doctor(
    appointment_id: str,
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve authority has been removed from the doctor portal.
    Approvals are managed exclusively by the reception/assistant desk.
    """
    raise HTTPException(
        status_code=403,
        detail="Doctors do not have authority to approve appointments. Approvals are managed exclusively by the reception/assistant desk."
    )


@router.post("/appointments/{appointment_id}/cancel")
async def cancel_appointment_by_doctor(
    appointment_id: str,
    reason: str = Query("Doctor unavailable / Emergency"),
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Doctor cancels an appointment:
    1. Sets appointment status to 'CANCELLED'.
    2. Stores cancellation reason in notes.
    3. Releases associated slot back to 'available'.
    4. Logs audit trail entry.
    """
    doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")



    query = select(Appointment).options(
        selectinload(Appointment.slot)
    ).where(and_(Appointment.id == appointment_id, Appointment.doctor_id == doc.id))

    result = await db.execute(query)
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found or does not belong to your clinic.")

    if appt.status in ("COMPLETED", "CANCELLED"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel appointment with status {appt.status}.")

    old_status = appt.status
    appt.status = "CANCELLED"
    appt.notes = f"Cancelled by Doctor: {reason}"

    if appt.slot:
        appt.slot.status = "available"

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="DOCTOR_CANCEL_APPOINTMENT",
        entity="Appointment",
        entity_id=appt.id,
        before_value=old_status,
        after_value=f"CANCELLED ({reason})"
    )

    await db.commit()
    await redis_manager.clear_cache_pattern(f"doc_appts:{doc.id}")
    await redis_manager.clear_cache_pattern(f"doc_analytics:{doc.id}")
    await redis_manager.clear_cache_pattern(f"doctor_slots:{doc.id}")
    return {"status": "SUCCESS", "message": "Appointment cancelled and slot released to available.", "appointment_id": appt.id}


@router.post("/appointments/{appointment_id}/mark-paid")
async def mark_appointment_paid_by_doctor(
    appointment_id: str,
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """Allows doctor to record payment as PAID directly at consultation / calling time."""
    doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")



    payment_res = await db.execute(
        select(Payment).options(selectinload(Payment.appointment)).where(Payment.appointment_id == appointment_id)
    )
    payment = payment_res.scalar_one_or_none()
    if not payment or not payment.appointment or payment.appointment.doctor_id != doc.id:
        raise HTTPException(status_code=404, detail="Payment record for this appointment not found.")

    if payment.status == "PAID":
        return {"status": "ALREADY_PAID", "message": "This consultation fee is already marked as PAID."}

    old_status = payment.status
    payment.status = "PAID"
    payment.amount_paid = payment.amount  # Bug fix: record the full amount collected
    payment.paid_at = datetime.now(timezone.utc)
    payment.collected_by = current_user.id

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="CASH_PAYMENT_COLLECTED",
        entity="Payment",
        entity_id=payment.id,
        before_value=old_status,
        after_value=f"PAID (Amount: Rs. {payment.amount}) by Doctor #{current_user.full_name}"
    )

    await db.commit()
    await redis_manager.clear_cache_pattern(f"doc_appts:{doc.id}")
    await redis_manager.clear_cache_pattern(f"doc_analytics:{doc.id}")
    return {
        "status": "SUCCESS",
        "payment_status": "PAID",
        "amount": float(payment.amount),
        "paid_at": payment.paid_at.isoformat(),
        "collected_by": current_user.full_name
    }


@router.post("/appointments/{appointment_id}/complete")
async def complete_appointment_by_doctor(
    appointment_id: str,
    consultation_notes: Optional[str] = Query(None, description="Doctor clinical remarks or prescription notes"),
    mark_paid: bool = Query(False, description="Auto-record payment as PAID if pending at calling/consultation"),
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Doctor marks consultation as completed.
    Enforces that:
    1. Appointment status is CONFIRMED (must be approved by desk first).
    2. Scheduled slot date and time has already arrived or passed.
    """
    doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")



    query = select(Appointment).options(
        selectinload(Appointment.doctor).selectinload(Doctor.user),
        selectinload(Appointment.patient),
        selectinload(Appointment.slot),
        selectinload(Appointment.payment)
    ).where(and_(Appointment.id == appointment_id, Appointment.doctor_id == doc.id))
    result = await db.execute(query)
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found or does not belong to your clinic.")

    if appt.status in ("COMPLETED", "CANCELLED"):
        raise HTTPException(status_code=400, detail=f"Appointment already has status {appt.status}.")

    if appt.status != "CONFIRMED":
        raise HTTPException(
            status_code=400, 
            detail=f"Only confirmed appointments can be marked as completed (current status: {appt.status})."
        )

    # Governance rule: Payment must be collected at reception Cash Desk before consultation can be completed
    if not appt.payment or appt.payment.status != "PAID":
        if mark_paid and appt.payment:
            old_pay_status = appt.payment.status
            appt.payment.status = "PAID"
            appt.payment.amount_paid = appt.payment.amount  # Bug fix: record the full amount collected
            appt.payment.paid_at = datetime.now(timezone.utc)
            appt.payment.collected_by = current_user.id
            await audit_service.log_action(
                db=db,
                actor_id=current_user.id,
                action="CASH_PAYMENT_COLLECTED",
                entity="Payment",
                entity_id=appt.payment.id,
                before_value=old_pay_status,
                after_value=f"PAID (Amount: Rs. {appt.payment.amount}) upon consultation completion by Doctor #{current_user.full_name}"
            )
        else:
            fee_str = f"Rs. {appt.payment.amount:,.0f}" if appt.payment else "consultation fee"
            raise HTTPException(
                status_code=400,
                detail=f"Payment Pending: Patient has not paid the {fee_str} at the reception Cash Desk yet. Fee must be collected before completing consultation."
            )


    # Restrict completion: appointment must be scheduled for today or a past date AND time has arrived
    if appt.slot and appt.slot.start_time:
        slot_time = appt.slot.start_time
        if slot_time.tzinfo is None:
            slot_time = slot_time.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        slot_pkt_date = to_pkt(slot_time).date()
        now_pkt_date = to_pkt(now_utc).date()
        if slot_pkt_date > now_pkt_date:
            f_d = format_pkt_date(slot_time)
            raise HTTPException(
                status_code=400,
                detail=f"Cannot mark consultation as completed before its scheduled calendar date ({f_d}) has arrived."
            )
        elif slot_pkt_date == now_pkt_date:
            if slot_time > (now_utc + timedelta(minutes=15)):
                f_t = format_pkt_time(slot_time)
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot mark consultation as completed before its scheduled time slot ({f_t}) has arrived."
                )

    old_status = appt.status
    appt.status = "COMPLETED"
    if consultation_notes:
        appt.notes = f"{appt.notes or ''} | Clinical note: {consultation_notes}".strip(" | ")

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="DOCTOR_COMPLETE_APPOINTMENT",
        entity="Appointment",
        entity_id=appt.id,
        before_value=old_status,
        after_value="COMPLETED"
    )

    await db.commit()
    await redis_manager.clear_cache_pattern(f"doc_appts:{doc.id}")
    await redis_manager.clear_cache_pattern(f"doc_analytics:{doc.id}")

    # Trigger Event 4: Notify assistant Gmail & patient of completion
    try:
        from app.services.notification_service import notification_service
        await notification_service.notify_appointment_completed(db, appt, clinical_notes=consultation_notes)
    except Exception as notify_err:
        import logging
        logging.getLogger("doctor_portal").warning(f"Notification error on complete: {notify_err}")

    return {"status": "SUCCESS", "message": "Consultation marked as completed.", "appointment_id": appt.id}


# --- 4. Doctor Consultation & Revenue Analytics ---
@router.get("/analytics")
async def get_doctor_analytics(
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """Returns patient breakdown, cash collections, and pending queue stats."""
    doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")



    # Performance: Consolidated Single Query for all appointment statuses instead of 5 separate roundtrips
    appt_counts_query = select(
        func.count(Appointment.id).label("total"),
        func.count(case((Appointment.status == "CONFIRMED", 1))).label("confirmed"),
        func.count(case((Appointment.status == "PENDING_ASSISTANT_APPROVAL", 1))).label("pending"),
        func.count(case((Appointment.status == "COMPLETED", 1))).label("completed"),
        func.count(case((Appointment.status == "CANCELLED", 1))).label("cancelled")
    ).where(Appointment.doctor_id == doc.id)

    # Consolidated Single Query for slot metrics
    slots_counts_query = select(
        func.count(DoctorSlot.id).label("total"),
        func.count(case((DoctorSlot.status == "available", 1))).label("available")
    ).where(DoctorSlot.doctor_id == doc.id)

    appt_counts_res, slots_counts_res = await asyncio.gather(
        db.execute(appt_counts_query),
        db.execute(slots_counts_query)
    )

    appt_row = appt_counts_res.first()
    slots_row = slots_counts_res.first()

    total_appts = appt_row.total if appt_row else 0
    confirmed_appts = appt_row.confirmed if appt_row else 0
    pending_appts = appt_row.pending if appt_row else 0
    completed_appts = appt_row.completed if appt_row else 0
    cancelled_appts = appt_row.cancelled if appt_row else 0

    avail_slots = slots_row.available if slots_row else 0
    tot_slots = slots_row.total if slots_row else 0

    # Consolidated Single Query for all financial collections
    fin_query = select(
        func.coalesce(func.sum(case((Payment.status.in_(["PAID", "PARTIAL"]), Payment.amount_paid), else_=Decimal("0.00"))), Decimal("0.00")).label("paid_sum"),
        func.coalesce(func.sum(case((Payment.status.in_(["PENDING_CASH", "PARTIAL"]), Payment.amount - Payment.amount_paid), else_=Decimal("0.00"))), Decimal("0.00")).label("pending_sum")
    ).select_from(Payment).join(Appointment, Payment.appointment_id == Appointment.id).where(Appointment.doctor_id == doc.id)

    fin_res = (await db.execute(fin_query)).first()
    paid_sum = fin_res.paid_sum if fin_res else Decimal("0.00")
    pending_cash_sum = fin_res.pending_sum if fin_res else Decimal("0.00")

    data = {
        "doctor_id": doc.id,
        "total_appointments": total_appts,
        "completed_appointments": completed_appts,
        "confirmed_count": confirmed_appts,
        "pending_approval_count": pending_appts,
        "cancelled_count": cancelled_appts,
        "available_slots": avail_slots,
        "total_slots": tot_slots,
        "total_revenue": float(paid_sum),
        "cash_collected_pkr": float(paid_sum),
        "pending_cash_pkr": float(pending_cash_sum)
    }
    try:
        await redis_manager.set_cache(cache_key, json.dumps(data), ttl=30)
    except Exception:
        pass
    return data


@router.get("/appointments")
async def list_doctor_appointments(
    include_archived: bool = Query(False, description="Whether to include closed visits older than 2 days"),
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves full patient appointment directory and payment ledger for doctor's clinic.
    By default, closed visits (COMPLETED, CANCELLED, REJECTED) older than 2 days are excluded."""
    doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    cache_key = f"doc_appts:{doc.id}:{include_archived}"
    cached_data = await redis_manager.get_cache(cache_key)
    if cached_data:
        try:
            return json.loads(cached_data)
        except Exception:
            pass



    query = select(Appointment).outerjoin(
        DoctorSlot, Appointment.slot_id == DoctorSlot.id
    ).options(
        contains_eager(Appointment.slot),
        joinedload(Appointment.patient),
        joinedload(Appointment.payment)
    ).where(Appointment.doctor_id == doc.id)

    if not include_archived:
        # Hide all past consultations before today by default in Pakistan Standard Time (UTC+5)
        now_pkt = datetime.now(timezone(timedelta(hours=5)))
        today_start_pkt = datetime(now_pkt.year, now_pkt.month, now_pkt.day, 0, 0, 0, tzinfo=timezone(timedelta(hours=5)))
        today_start_utc = today_start_pkt.astimezone(timezone.utc)
        appt_time = func.coalesce(DoctorSlot.start_time, Appointment.created_at)
        query = query.where(appt_time >= today_start_utc)


    query = query.order_by(Appointment.created_at.desc())

    result = await db.execute(query)
    appts = result.unique().scalars().all()

    res_list = []
    for appt in appts:
        slot_iso = appt.slot.start_time.isoformat() if appt.slot and appt.slot.start_time else None
        slot_date = format_pkt_date(appt.slot.start_time) if appt.slot and appt.slot.start_time else None
        slot_time = format_pkt_time(appt.slot.start_time) if appt.slot and appt.slot.start_time else None

        # Fallback if slot was detached/cleared (e.g. unbooked slots cleared after rejection or cancellation)
        if not slot_date and appt.slip_number:
            m = re.search(r"(\d{4})(\d{2})(\d{2})", appt.slip_number)
            if m:
                y, mon, d = m.groups()
                try:
                    dt = datetime(int(y), int(mon), int(d), 0, 0, tzinfo=timezone.utc)
                    slot_date = format_pkt_date(dt)
                except Exception:
                    pass
        if not slot_date and appt.created_at:
            slot_date = format_pkt_date(appt.created_at)

        if not slot_time:
            slot_time = "Slot Released" if appt.status in ("REJECTED", "CANCELLED") else None

        res_list.append({
            "id": appt.id,
            "patient_name": appt.patient_name or (appt.patient.full_name if appt.patient else "Walk-in Patient"),
            "patient_phone": appt.patient_phone or (appt.patient.phone if appt.patient else "N/A"),
            "status": appt.status,
            "slip_number": appt.slip_number,
            "start_time": slot_iso,
            "slot_start": slot_iso,
            "slot_date": slot_date,
            "slot_time": slot_time,
            "fee_pkr": float(appt.payment.amount if appt.payment and appt.payment.amount else doc.fee_clinic),
            "fee_amount": float(appt.payment.amount if appt.payment and appt.payment.amount else doc.fee_clinic),
            "notes": appt.notes or "",
            "payment_status": appt.payment.status if appt.payment else "UNPAID",
            "created_at": appt.created_at.isoformat() if appt.created_at else None,
            "has_loyalty_discount": appt.has_loyalty_discount or False,
            "loyalty_discount_amount": float(appt.loyalty_discount_amount) if appt.loyalty_discount_amount is not None else 0.0,
            "loyalty_applicant_name": appt.loyalty_applicant_name,
            "loyalty_guardian_name": appt.loyalty_guardian_name,
            "loyalty_dob": appt.loyalty_dob,
            "loyalty_gender": appt.loyalty_gender,
            "loyalty_cnic": appt.loyalty_cnic,
            "loyalty_mobile": appt.loyalty_mobile,
            "loyalty_whatsapp": appt.loyalty_whatsapp,
            "loyalty_email": appt.loyalty_email,
            "loyalty_address": appt.loyalty_address,
            "loyalty_city": appt.loyalty_city
        })

    try:
        await redis_manager.set_cache(cache_key, json.dumps(res_list), ttl=30)
    except Exception:
        pass
    return res_list


class DoctorProfileUpdateRequest(PydanticBase):
    fee_clinic: Optional[float] = None
    shift: Optional[str] = None
    clinic_address: Optional[str] = None
    sub_region: Optional[str] = None
    google_maps_url: Optional[str] = None
    morning_start: Optional[str] = None
    morning_end: Optional[str] = None
    evening_start: Optional[str] = None
    evening_end: Optional[str] = None
    off_days: Optional[str] = None
    bio: Optional[str] = None
    expertise: Optional[str] = None
    experience_years: Optional[int] = None
    qualification: Optional[str] = None

@router.put("/profile")
async def update_doctor_profile(
    payload: DoctorProfileUpdateRequest,
    current_user: User = Depends(require_roles(["DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """Allows doctor to update clinic fee, shift, address, bio, expertise, experience years, or medical qualifications."""
    doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")



    if payload.fee_clinic is not None:
        doc.fee_clinic = Decimal(str(payload.fee_clinic))
    if payload.shift is not None:
        doc.shift = payload.shift
    if payload.clinic_address is not None:
        doc.clinic_address = payload.clinic_address
    if payload.sub_region is not None:
        doc.sub_region = payload.sub_region
    if payload.google_maps_url is not None:
        doc.google_maps_url = payload.google_maps_url
    if payload.morning_start is not None:
        doc.morning_start = payload.morning_start
    if payload.morning_end is not None:
        doc.morning_end = payload.morning_end
    if payload.evening_start is not None:
        doc.evening_start = payload.evening_start
    if payload.evening_end is not None:
        doc.evening_end = payload.evening_end
    if payload.off_days is not None:
        doc.off_days = payload.off_days
    if payload.bio is not None:
        doc.bio = payload.bio.strip() if payload.bio else None
    if payload.expertise is not None:
        doc.expertise = payload.expertise.strip() if payload.expertise else None
    if payload.experience_years is not None:
        doc.experience_years = int(payload.experience_years)
    if payload.qualification is not None:
        doc.qualification = payload.qualification.strip() if payload.qualification else "MBBS, FCPS"

    await db.commit()
    await redis_manager.clear_cache_pattern("doctors:*")
    return {
        "status": "SUCCESS",
        "message": "Doctor profile updated successfully.",
        "fee_clinic": float(doc.fee_clinic),
        "shift": doc.shift,
        "clinic_address": doc.clinic_address,
        "morning_start": doc.morning_start or "09:00",
        "morning_end": doc.morning_end or "13:00",
        "evening_start": doc.evening_start or "17:00",
        "evening_end": doc.evening_end or "21:00",
        "off_days": doc.off_days or "sunday",
        "bio": doc.bio,
        "expertise": doc.expertise,
        "experience_years": doc.experience_years if doc.experience_years is not None else 5,
        "qualification": doc.qualification or "MBBS, FCPS"
    }
