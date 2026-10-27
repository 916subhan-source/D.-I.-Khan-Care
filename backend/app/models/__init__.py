"""
SQLAlchemy 2.0 ORM Models for D.I. Khan Doctor Appointment System.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    String, Boolean, Text, Numeric, Integer, DateTime, ForeignKey, 
    UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

# 1. USER MODEL
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Optional WhatsApp contact
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # None for patients
    plain_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Recoverable plain-text copy (admin/doctor-set only)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="PATIENT") # PATIENT, DOCTOR, ASSISTANT, ADMIN
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active") # active, suspended
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    doctor_profile: Mapped[Optional["Doctor"]] = relationship("Doctor", back_populates="user", uselist=False, cascade="all, delete-orphan")
    patient_appointments: Mapped[List["Appointment"]] = relationship("Appointment", foreign_keys="Appointment.patient_id", back_populates="patient")

# 2. DOCTOR MODEL
class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    specialty: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    sub_region: Mapped[str] = mapped_column(String(100), nullable=False, default="Circular Road", index=True)
    clinic_address: Mapped[str] = mapped_column(Text, nullable=False)
    google_maps_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fee_clinic: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=1000.00)
    shift: Mapped[str] = mapped_column(String(20), nullable=False, default="EVENING") # MORNING, EVENING, BOTH
    morning_start: Mapped[str] = mapped_column(String(10), nullable=False, default="09:00")
    morning_end: Mapped[str] = mapped_column(String(10), nullable=False, default="13:00")
    evening_start: Mapped[str] = mapped_column(String(10), nullable=False, default="17:00")
    evening_end: Mapped[str] = mapped_column(String(10), nullable=False, default="21:00")
    is_spotlight: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    verification_status: Mapped[str] = mapped_column(String(20), default="pending") # pending, verified, rejected
    profile_image: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    off_days: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, default="sunday") # comma-separated list of off days: e.g. "friday,sunday"
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expertise: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    experience_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=5)
    qualification: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default="MBBS, FCPS")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="doctor_profile")
    slots: Mapped[List["DoctorSlot"]] = relationship("DoctorSlot", back_populates="doctor", cascade="all, delete-orphan")
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
    assistants: Mapped[List["DoctorAssistant"]] = relationship("DoctorAssistant", back_populates="doctor", cascade="all, delete-orphan")
    reviews: Mapped[List["DoctorReview"]] = relationship("DoctorReview", back_populates="doctor", cascade="all, delete-orphan")

# 3. DOCTOR <-> ASSISTANT LINKING MODEL (Self-Service)
class DoctorAssistant(Base):
    __tablename__ = "doctor_assistants"

    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctors.id", ondelete="CASCADE"), primary_key=True)
    assistant_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), default="active") # active, revoked
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="assistants")
    assistant_user: Mapped["User"] = relationship("User")

# 4. DOCTOR SLOTS MODEL (With concurrency locking constraint)
class DoctorSlot(Base):
    __tablename__ = "doctor_slots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="available") # available, hold, booked, blocked
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        UniqueConstraint("doctor_id", "start_time", name="uq_doctor_slot_concurrency"),
    )

    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="slots")
    appointment: Mapped[Optional["Appointment"]] = relationship("Appointment", back_populates="slot", uselist=False)

# 5. APPOINTMENT MODEL
class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctors.id"), nullable=False, index=True)
    slot_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("doctor_slots.id"), nullable=True)
    assistant_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="PENDING_ASSISTANT_APPROVAL", index=True)
    # Statuses: HOLD, PENDING_ASSISTANT_APPROVAL, CONFIRMED, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED
    slip_number: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    patient_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    patient_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    patient_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reschedule_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    patient: Mapped["User"] = relationship("User", foreign_keys=[patient_id], back_populates="patient_appointments")
    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="appointments")
    slot: Mapped[Optional["DoctorSlot"]] = relationship("DoctorSlot", back_populates="appointment")
    payment: Mapped[Optional["Payment"]] = relationship("Payment", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    review: Mapped[Optional["DoctorReview"]] = relationship("DoctorReview", back_populates="appointment", uselist=False, cascade="all, delete-orphan")

# 6. PAYMENT MODEL (In-Clinic Cash Desk)
class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    appointment_id: Mapped[str] = mapped_column(String(36), ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    status: Mapped[str] = mapped_column(String(20), default="PENDING_CASH", index=True) # PENDING_CASH, PARTIAL, PAID
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    collected_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    appointment: Mapped["Appointment"] = relationship("Appointment", back_populates="payment")

# 7. AUDIT LOG MODEL
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    before_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    after_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# 8. DOCTOR REVIEW MODEL (Verified patient reviews after completed appointments)
class DoctorReview(Base):
    __tablename__ = "doctor_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id: Mapped[str] = mapped_column(String(36), ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    patient_name: Mapped[str] = mapped_column(String(120), nullable=False)
    patient_phone: Mapped[str] = mapped_column(String(30), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 to 5 stars
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Comma-separated tags
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="reviews")
    appointment: Mapped["Appointment"] = relationship("Appointment", back_populates="review")

