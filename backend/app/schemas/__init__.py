"""
Pydantic v2 schemas for request validation and response serialization.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

# --- User & Auth Schemas ---
class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)

class UserCreate(UserBase):
    password: Optional[str] = None
    role: str = "PATIENT"

class UserResponse(UserBase):
    id: str
    role: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    portal: Optional[str] = None

# --- Doctor Schemas ---
class DoctorBase(BaseModel):
    specialty: str
    sub_region: str = "Circular Road"
    clinic_address: str
    google_maps_url: Optional[str] = None
    fee_clinic: Decimal = Decimal("1000.00")
    shift: str = "EVENING"
    morning_start: str = "09:00"
    morning_end: str = "13:00"
    evening_start: str = "17:00"
    evening_end: str = "21:00"
    off_days: Optional[str] = "sunday"
    bio: Optional[str] = None
    expertise: Optional[str] = None
    experience_years: Optional[int] = 5

class DoctorCreate(DoctorBase):
    user: UserCreate

class DoctorResponse(DoctorBase):
    id: str
    user_id: str
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    plain_password: Optional[str] = None  # Recoverable password (admin-set only)
    is_spotlight: bool
    verification_status: str
    profile_image: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SpotlightToggleRequest(BaseModel):
    is_spotlight: bool

class AdminDoctorCreateSchema(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)
    password: str = Field(..., min_length=6)
    specialty: str
    sub_region: str = "Circular Road"
    clinic_address: str
    google_maps_url: Optional[str] = None
    fee_clinic: Decimal = Decimal("1000.00")
    shift: str = "EVENING"
    morning_start: str = "09:00"
    morning_end: str = "13:00"
    evening_start: str = "17:00"
    evening_end: str = "21:00"
    verification_status: str = "verified"
    is_spotlight: bool = False

class AdminDoctorUpdateSchema(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    specialty: Optional[str] = None
    sub_region: Optional[str] = None
    clinic_address: Optional[str] = None
    google_maps_url: Optional[str] = None
    fee_clinic: Optional[Decimal] = None
    shift: Optional[str] = None
    morning_start: Optional[str] = None
    morning_end: Optional[str] = None
    evening_start: Optional[str] = None
    evening_end: Optional[str] = None
    verification_status: Optional[str] = None
    is_spotlight: Optional[bool] = None


# --- Doctor-Assistant Linking Schemas ---
class AssistantCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str

class AssistantResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str
    status: str
    plain_password: Optional[str] = None  # Recoverable password (doctor-set only)

# --- Doctor Slot Schemas ---
class SlotBase(BaseModel):
    start_time: datetime
    end_time: datetime

class SlotCreate(SlotBase):
    pass

class SlotResponse(SlotBase):
    id: str
    doctor_id: str
    status: str
    slot_date: Optional[str] = None
    slot_date_fmt: Optional[str] = None
    start_time_fmt: Optional[str] = None
    end_time_fmt: Optional[str] = None

    class Config:
        from_attributes = True

# --- Booking & Verification Schemas ---
class BookingRequestSchema(BaseModel):
    doctor_id: str
    slot_id: str
    full_name: str
    phone: str
    email: EmailStr
    whatsapp_number: str  # Required — serves as primary contact for OTP & reminders
    notes: Optional[str] = None

class OTPVerifySchema(BaseModel):
    contact: str  # phone or email
    code: str = Field(..., min_length=6, max_length=6)
    slot_id: str
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None

class TrackAppointmentRequest(BaseModel):
    phone: Optional[str] = None
    slip_number: Optional[str] = None

# --- Appointment & Queue Schemas ---
class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    slot_id: Optional[str]
    status: str
    slip_number: Optional[str]
    notes: Optional[str]
    reschedule_reason: Optional[str]
    created_at: datetime
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    doctor_name: Optional[str] = None
    slot_start: Optional[datetime] = None
    slot_date: Optional[str] = None
    slot_time: Optional[str] = None
    payment_status: Optional[str] = None
    fee_amount: Optional[Decimal] = None
    specialty: Optional[str] = None
    clinic_address: Optional[str] = None
    token_number: Optional[int] = None

    class Config:
        from_attributes = True

class MultiAppointmentTrackResponse(AppointmentResponse):
    appointments: List[AppointmentResponse] = []

class RescheduleRequest(BaseModel):
    new_slot_id: str
    reason: Optional[str] = "Requested by clinic assistant"

# --- Cash Payment Schemas ---
class MarkPaidRequest(BaseModel):
    notes: Optional[str] = None

class POSBookingRequest(BaseModel):
    doctor_id: str
    slot_id: str
    patient_name: str = Field(..., min_length=2, max_length=120)
    patient_phone: str = Field(..., min_length=7, max_length=20)
    patient_email: Optional[str] = None
    notes: Optional[str] = None
    payment_status: Optional[str] = "PENDING_CASH"  # PENDING_CASH or PAID
    fee_amount: Optional[Decimal] = None
    cash_tendered: Optional[Decimal] = None

# --- Doctor Review Schemas ---
class ReviewCreateRequest(BaseModel):
    identifier: str = Field(..., min_length=3, description="Patient Phone Number or Digital Slip #")
    appointment_id: Optional[str] = None
    rating: int = Field(..., ge=1, le=5, description="Star rating from 1 to 5")
    comment: str = Field(..., min_length=3, max_length=1500, description="Review feedback text")
    tags: Optional[str] = None

class PatientCompletedAppointmentItem(BaseModel):
    id: str
    slip_number: Optional[str] = None
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    status: str
    slot_date: Optional[str] = None
    slot_time: Optional[str] = None
    already_reviewed: bool = False
    existing_rating: Optional[int] = None
    existing_comment: Optional[str] = None

class PatientEligibilityCheckResponse(BaseModel):
    can_review: bool
    message: str
    completed_appointments: List[PatientCompletedAppointmentItem] = []
    other_appointments_count: int = 0
    other_statuses: List[str] = []

class ReviewResponse(BaseModel):
    id: str
    doctor_id: str
    appointment_id: str
    patient_name: str
    patient_phone: str
    rating: int
    comment: str
    tags: Optional[str] = None
    is_verified: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

class DoctorReviewsSummaryResponse(BaseModel):
    doctor_id: str
    average_rating: float
    total_reviews: int
    rating_breakdown: dict
    reviews: List[ReviewResponse]

