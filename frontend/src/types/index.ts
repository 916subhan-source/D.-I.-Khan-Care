/**
 * Shared Type Definitions for D.I. Khan Doctor Appointment System
 */

export interface DoctorData {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  plain_password?: string;
  specialty: string;
  sub_region: string;
  clinic_address: string;
  google_maps_url?: string;
  fee_clinic: number;
  shift: string;
  morning_start?: string;
  morning_end?: string;
  evening_start?: string;
  evening_end?: string;
  is_spotlight: boolean;
  verification_status: string;
  qualification?: string;
  bio?: string;
  services_offered?: string;
  conditions_treated?: string;
  hospital_affiliations?: string;
  custom_sunday_enabled?: boolean;
  sunday_start?: string;
  sunday_end?: string;
  custom_special_day?: string;
  custom_day_schedule?: string;
  profile_image?: string;
  off_days?: string;
  expertise?: string;
  experience_years?: number;
  next_available_slot?: string | null;
  is_available_today?: boolean;
  today_status?: string;
  upcoming_slots_count?: number;
  loyalty_card_enabled?: boolean;
  loyalty_card_title?: string;
  loyalty_card_image_url?: string;
  loyalty_discount_percent?: number;
}

export interface SlotData {
  id: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  status: string;
  slot_date?: string;
  slot_date_fmt?: string;
  start_time_fmt?: string;
  end_time_fmt?: string;
  duration_minutes?: number;
}

export interface AppointmentItem {
  id: string;
  patient_id: string;
  doctor_id: string;
  slot_id: string;
  status: string;
  slip_number?: string;
  notes?: string;
  patient_name?: string;
  patient_phone?: string;
  patient_email?: string;
  doctor_name?: string;
  slot_start?: string;
  start_time?: string;
  slot_date?: string;
  slot_time?: string;
  payment_status?: string;
  fee_amount?: number;
  amount_paid?: number;
  amount_due?: number;
  token_number?: number;
  created_at: string;
  updated_at?: string;
  appointment_date?: string;
  time?: string;
  date?: string;
  has_loyalty_discount?: boolean;
  loyalty_discount_amount?: number;
  loyalty_applicant_name?: string;
  loyalty_guardian_name?: string;
  loyalty_dob?: string;
  loyalty_gender?: string;
  loyalty_cnic?: string;
  loyalty_mobile?: string;
  loyalty_whatsapp?: string;
  loyalty_email?: string;
  loyalty_address?: string;
  loyalty_city?: string;
  google_maps_url?: string;
  loyalty_pickup_message?: string;
  clinic_address?: string;
}

export interface DoctorCallingShiftInfo {
  shiftName: string;
  shiftStartTimeStr: string;
  callingStartTimeStr: string;
  shiftStartMins: number;
  callingStartMins: number;
  currentMins: number;
  isCallingStarted: boolean;
  minutesUntilCalling: number;
  activeShiftType: 'MORNING' | 'EVENING';
}

export interface DoctorAvailabilityInfo {
  isAvailableToday: boolean;
  todayBadgeText: string;
  todayBadgeClass: string;
  nextSlotText: string;
  nextSlotClass: string;
  shiftBadge: string;
  statusText: string;
}

export interface WeekDayOption {
  id: string;
  label: string;
}

export interface PosDayItem {
  date: string;
  label: string;
  slots: any[];
}

