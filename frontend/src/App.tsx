import React, { useState, useEffect, useMemo } from 'react';
import {
  Stethoscope,
  Printer,
  MapPin,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
  Receipt,
  AlertCircle,
  X,
  CreditCard,
  User,
  Phone,
  Mail,
  RefreshCw,
  PlusCircle,
  Eye,
  EyeOff,
  Key,
  Copy,
  Check,
  Shield,
  Trash2,
  Edit,
  UserPlus,
  Star,
  ThumbsUp,
  Award,
  GraduationCap,
  Building2,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Headphones,
  ExternalLink,
  FileText,
  Globe,
  ArrowRight,
  Plus,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  Camera,
  Archive,
  Loader2,
  Code2,
  Terminal,
  LogOut,
  Menu,
  Upload
} from 'lucide-react';
import { apiFetch } from './lib/api';
import Hero3DPass from './components/Hero3DPass';
import HealthChatbot from './components/HealthChatbot';

interface DoctorData {
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

interface SlotData {
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

interface AppointmentItem {
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

// Helper to parse sequence queue number from digital slip or token number
// Format: DIK-[SPECIALTY]-[YYYYMMDD]-[SEQ_NUM:03d]-[JITTER] (e.g., DIK-CARD-20261010-002-95 -> "02")
function parseQueueNumberFromSlip(slipNumber?: string, tokenNumber?: any): string {
  if (tokenNumber !== undefined && tokenNumber !== null && !isNaN(Number(tokenNumber)) && Number(tokenNumber) > 0 && Number(tokenNumber) <= 999) {
    return String(tokenNumber).padStart(2, '0');
  }
  if (!slipNumber || typeof slipNumber !== 'string') return '';
  const parts = slipNumber.trim().split('-');
  // Official confirmed format: DIK-[SPECIALTY]-[YYYYMMDD]-[SEQ_NUM:03d]-[JITTER] (5 parts)
  if (parts.length >= 5 && /^\d{1,3}$/.test(parts[3])) {
    const num = parseInt(parts[3], 10);
    if (!isNaN(num) && num > 0 && num <= 999) {
      return String(num).padStart(2, '0');
    }
  }
  // Fallback for 4-part slips with 2-3 digit sequence (e.g. DIK-CARD-20260930-014)
  if (parts.length === 4 && /^\d{1,3}$/.test(parts[3])) {
    const num = parseInt(parts[3], 10);
    if (!isNaN(num) && num > 0 && num <= 999) {
      return String(num).padStart(2, '0');
    }
  }
  return '';
}

// Helper to format currency values cleanly without awkward trailing decimals (e.g. 1200.0 -> Rs. 1,200)
export function formatCurrency(val: any, prefix = 'Rs.\u00A0'): string {
  if (val === null || val === undefined || val === '') return `${prefix}1,000`;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  if (isNaN(n)) return `${prefix}1,000`;
  return `${prefix}${Math.round(n).toLocaleString('en-US')}`;
}

// Helper to format slot date and time across assistant & doctor portals
function formatSlotDateTime(dateVal?: string, slipNumber?: string, createdAt?: string): { date: string; time: string } {
  if (!dateVal) {
    if (slipNumber) {
      const match = slipNumber.match(/(\d{4})(\d{2})(\d{2})/);
      if (match) {
        const [, y, m, d] = match;
        const dt = new Date(Number(y), Number(m) - 1, Number(d));
        if (!isNaN(dt.getTime())) {
          const date = dt.toLocaleDateString('en-US', {
            timeZone: 'Asia/Karachi',
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
          return { date, time: 'Slot Released' };
        }
      }
    }
    if (createdAt) {
      try {
        const d = new Date(createdAt);
        if (!isNaN(d.getTime())) {
          const date = d.toLocaleDateString('en-US', {
            timeZone: 'Asia/Karachi',
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
          return { date, time: 'Slot Released' };
        }
      } catch { }
    }
    return { date: 'Date Pending', time: 'Time Scheduled' };
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return { date: dateVal, time: '' };
    const date = d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Karachi',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const time = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Karachi',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return { date, time };
  } catch {
    return { date: dateVal, time: '' };
  }
}

// ── Calling Sequence Helpers (Time & Token Order) ──────────────────────────
function getApptDateStrGlobal(a: AppointmentItem): string {
  // 1. Slip number is generated with the exact PKT local calendar date (e.g. DIK-CARD-20261017-009-15 -> 2026-10-17)
  if (a.slip_number) {
    const m = a.slip_number.match(/-(\d{4})(\d{2})(\d{2})-/);
    if (m) {
      return `${m[1]}-${m[2]}-${m[3]}`;
    }
  }
  // 2. Format raw slot start time in Asia/Karachi
  const raw = a.slot_start || (a as any).start_time;
  if (raw) {
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(d);
      }
    } catch { }
  }
  // 3. Fallback on slot_date
  if (a.slot_date) {
    try {
      const d = new Date(a.slot_date);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(d);
      }
    } catch { }
  }
  // 4. Fallback on created_at in Asia/Karachi
  if (a.created_at) {
    try {
      const d = new Date(a.created_at);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(d);
      }
    } catch { }
  }
  return '';
}

function getApptMinutesFromMidnight(a: AppointmentItem): number {
  // 1. Parse slot_time directly (e.g. '6:20 PM', '10:50 AM')
  if (a.slot_time) {
    const match = a.slot_time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ap = match[3]?.toUpperCase();
      if (ap === 'PM' && h < 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    }
  }
  // 2. Parse ISO time in Asia/Karachi
  const rawIso = a.slot_start || (a as any).start_time;
  if (rawIso) {
    try {
      const d = new Date(rawIso);
      if (!isNaN(d.getTime())) {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Karachi',
          hour: 'numeric',
          minute: 'numeric',
          hourCycle: 'h23'
        }).formatToParts(d);
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        return hour * 60 + minute;
      }
    } catch { }
  }
  return 9999;
}

function getApptTokenSeq(slip?: string): number {
  if (!slip) return 9999;
  const match = slip.match(/-(\d{3,4})-/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 9999;
}

function isApptTimePassedGlobal(a: AppointmentItem, todayYmd: string): boolean {
  const apptDate = getApptDateStrGlobal(a);
  if (!apptDate) return false;
  if (apptDate < todayYmd) return true;
  if (apptDate > todayYmd) return false;

  // It is today! Check current time in Pakistan (Asia/Karachi)
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Karachi',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23'
    }).formatToParts(now);
    const curHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const curMin = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const currentMins = curHour * 60 + curMin;

    const apptMins = getApptMinutesFromMidnight(a);
    if (apptMins === 9999) return true; // If no slot time, don't block
    return currentMins >= apptMins;
  } catch {
    return true;
  }
}

interface DoctorCallingShiftInfo {
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

function getCurrentMinutesInPkt(): number {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Karachi',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23'
    }).formatToParts(now);
    const curHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const curMin = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    return curHour * 60 + curMin;
  } catch {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

function parseTimeToMinutes(str?: string, defaultMins: number = 540): number {
  if (!str) return defaultMins;
  const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return defaultMins;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ap = match[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function isPosSlotPassed(s: any, isToday: boolean): boolean {
  if (!isToday || !s) return false;
  if (s.is_emergency) return false;
  try {
    const currentMins = getCurrentMinutesInPkt();
    let slotMins = 9999;
    if (s.start_time) {
      const dt = new Date(s.start_time);
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Karachi',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23'
      }).formatToParts(dt);
      const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      slotMins = h * 60 + m;
    } else if (s.start_time_fmt) {
      slotMins = parseTimeToMinutes(s.start_time_fmt);
    }
    return currentMins >= slotMins;
  } catch {
    return false;
  }
}

function formatMinutesTo12h(mins: number): string {
  let normalized = mins % 1440;
  if (normalized < 0) normalized += 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDoctorName(name?: string): string {
  if (!name) return 'Doctor';
  const clean = name.trim();
  const titled = clean.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  if (/^dr\.?\s+/i.test(titled)) {
    return titled;
  }
  return `Dr. ${titled}`;
}

function getDoctorCallingShiftInfo(
  doc?: any,
  todayYmd?: string,
  appointments?: AppointmentItem[]
): DoctorCallingShiftInfo {
  const currentMins = getCurrentMinutesInPkt();
  const shiftType = (doc?.shift || 'BOTH').toUpperCase();

  let morningStartMins = parseTimeToMinutes(doc?.morning_start, 540); // 09:00 AM (540 mins)
  let eveningStartMins = parseTimeToMinutes(doc?.evening_start, 1020); // 05:00 PM (1020 mins)

  const todayAppts = (appointments || []).filter(a => {
    const d = getApptDateStrGlobal(a);
    const isToday = todayYmd ? d === todayYmd : true;
    const st = (a.status || '').toUpperCase();
    return isToday && st !== 'CANCELLED' && st !== 'REJECTED';
  });

  const morningAppts = todayAppts.filter(a => getApptMinutesFromMidnight(a) < 840);
  const eveningAppts = todayAppts.filter(a => getApptMinutesFromMidnight(a) >= 840);

  // If earliest appointment in shift is earlier than default time, respect earliest scheduled slot
  if (morningAppts.length > 0) {
    const earliestMorning = Math.min(...morningAppts.map(a => getApptMinutesFromMidnight(a)));
    if (earliestMorning > 0 && earliestMorning < morningStartMins) {
      morningStartMins = earliestMorning;
    }
  }
  if (eveningAppts.length > 0) {
    const earliestEvening = Math.min(...eveningAppts.map(a => getApptMinutesFromMidnight(a)));
    if (earliestEvening > 0 && earliestEvening < eveningStartMins) {
      eveningStartMins = earliestEvening;
    }
  }

  let activeShiftType: 'MORNING' | 'EVENING' = 'MORNING';

  if (shiftType === 'EVENING') {
    activeShiftType = 'EVENING';
  } else if (shiftType === 'MORNING') {
    activeShiftType = 'MORNING';
  } else {
    // Doctor works BOTH shifts
    const hasIncompleteMorning = morningAppts.some(a => {
      const st = (a.status || '').toUpperCase();
      return st !== 'COMPLETED';
    });
    const hasAnyMorning = morningAppts.length > 0;
    const hasAnyEvening = eveningAppts.length > 0;

    // Switch to evening if past 2:00 PM (840), or if all morning appointments are finished,
    // or if NO morning appointments exist today but evening appointments do exist
    if (currentMins >= 840 || (!hasIncompleteMorning && currentMins >= 720) || (!hasAnyMorning && hasAnyEvening)) {
      activeShiftType = 'EVENING';
    } else {
      activeShiftType = 'MORNING';
    }
  }

  const shiftStartMins = activeShiftType === 'MORNING' ? morningStartMins : eveningStartMins;
  // Calling starts precisely 10 minutes before shift starting timing
  const callingStartMins = shiftStartMins - 10;
  const isCallingStarted = currentMins >= callingStartMins;
  const minutesUntilCalling = Math.max(0, callingStartMins - currentMins);

  const shiftName = activeShiftType === 'MORNING' ? 'Morning Shift' : 'Evening Shift';
  const shiftStartTimeStr = formatMinutesTo12h(shiftStartMins);
  const callingStartTimeStr = formatMinutesTo12h(callingStartMins);

  return {
    shiftName,
    shiftStartTimeStr,
    callingStartTimeStr,
    shiftStartMins,
    callingStartMins,
    currentMins,
    isCallingStarted,
    minutesUntilCalling,
    activeShiftType
  };
}

function sortCallingSequence(
  appts: AppointmentItem[],
  todayYmd: string,
  callingShift?: DoctorCallingShiftInfo | null
): AppointmentItem[] {
  return [...appts].sort((a, b) => {
    const dateA = getApptDateStrGlobal(a);
    const dateB = getApptDateStrGlobal(b);
    const isTodayA = dateA === todayYmd;
    const isTodayB = dateB === todayYmd;

    const stA = (a.status || '').toUpperCase();
    const stB = (b.status || '').toUpperCase();

    const isCompletedA = stA === 'COMPLETED';
    const isCompletedB = stB === 'COMPLETED';
    const isCancelledA = stA === 'CANCELLED' || stA === 'REJECTED';
    const isCancelledB = stB === 'CANCELLED' || stB === 'REJECTED';
    const isConfirmedA = stA === 'CONFIRMED' || stA === 'IN_PROGRESS';
    const isConfirmedB = stB === 'CONFIRMED' || stB === 'IN_PROGRESS';
    const isPendingA = stA.includes('PENDING');
    const isPendingB = stB.includes('PENDING');

    // Priority ranking:
    // Rank 1: Confirmed today during current/active shift (calling starts 10m before shift)
    // Rank 2: Confirmed today during subsequent shift
    // Rank 3: Pending approval today
    // Rank 4: Confirmed future dates
    // Rank 5: Pending future dates
    // Rank 6: Completed visits (moved down)
    // Rank 7: Cancelled / Rejected visits (at bottom)
    const getRank = (
      isToday: boolean,
      isConf: boolean,
      isPend: boolean,
      isComp: boolean,
      isCanc: boolean,
      item: AppointmentItem
    ) => {
      if (isToday && isConf && !isComp && !isCanc) {
        if (callingShift) {
          const itemMins = getApptMinutesFromMidnight(item);
          const isMorningAppt = itemMins < 840;
          const isSameAsActive =
            (callingShift.activeShiftType === 'MORNING' && isMorningAppt) ||
            (callingShift.activeShiftType === 'EVENING' && !isMorningAppt);
          return isSameAsActive ? 1 : 2;
        }
        return 1;
      }
      if (isToday && isPend && !isComp && !isCanc) return 3;
      if (!isToday && isConf && !isComp && !isCanc) return 4;
      if (!isToday && isPend && !isComp && !isCanc) return 5;
      if (isComp) return 6;
      return 7;
    };

    const rankA = getRank(isTodayA, isConfirmedA, isPendingA, isCompletedA, isCancelledA, a);
    const rankB = getRank(isTodayB, isConfirmedB, isPendingB, isCompletedB, isCancelledB, b);

    if (rankA !== rankB) return rankA - rankB;

    // Inside Rank 1 & 2 (Active Calling Queue today):
    // Chronological slot time ascending! (09:00 AM < 09:20 AM < 09:40 AM ...)
    if (rankA === 1 || rankA === 2) {
      const minA = getApptMinutesFromMidnight(a);
      const minB = getApptMinutesFromMidnight(b);
      if (minA !== minB) return minA - minB;
      const tokA = getApptTokenSeq(a.slip_number);
      const tokB = getApptTokenSeq(b.slip_number);
      if (tokA !== tokB) return tokA - tokB;
    }

    // Inside Rank 3 (Pending today):
    if (rankA === 3) {
      const minA = getApptMinutesFromMidnight(a);
      const minB = getApptMinutesFromMidnight(b);
      if (minA !== minB) return minA - minB;
    }

    // Inside Rank 6 (Completed visits):
    // Most recently completed at top of completed block
    if (rankA === 6) {
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
    }

    // Fallback: created_at descending
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tB - tA;
  });
}

function getSlotDateKeyGlobal(s: any): string {
  if (s.slot_date && /^\d{4}-\d{2}-\d{2}$/.test(s.slot_date)) {
    return s.slot_date;
  }
  try {
    const raw = s.start_time || s.slot_start;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(d);
      }
    }
  } catch { }
  return '';
}

/**
 * Smart Rescheduling Rule: On today's date, only slots starting at least 45 minutes in the future
 * from the current time are arranged/offered to give the patient adequate notice and travel time.
 */
const RESCHEDULE_MIN_TRAVEL_BUFFER_MINUTES = 45;

function getSlotMinutesFromMidnightInPkt(slot: any): number {

  if (!slot) return 9999;
  // 1. If start_time_fmt or slot_time (e.g. "5:00 PM", "05:20 PM")
  const str = slot.start_time_fmt || slot.slot_time;
  if (str) {
    const m = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const ap = m[3]?.toUpperCase();
      if (ap === 'PM' && h < 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      return h * 60 + min;
    }
  }
  // 2. Parse from start_time with Asia/Karachi timezone
  const raw = slot.start_time || slot.slot_start;
  if (raw) {
    try {
      const iso = (typeof raw === 'string' && !raw.endsWith('Z') && !raw.includes('+')) ? raw + 'Z' : raw;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Karachi',
          hour: 'numeric',
          minute: 'numeric',
          hourCycle: 'h23'
        }).formatToParts(d);
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        return hour * 60 + minute;
      }
    } catch { }
  }
  return 9999;
}

function isSlotEligibleForReschedule(
  slot: any,
  todayYmd: string,
  minBufferMinutes: number = RESCHEDULE_MIN_TRAVEL_BUFFER_MINUTES
): boolean {
  if (!slot) return false;
  const slotDateKey = getSlotDateKeyGlobal(slot);
  if (!slotDateKey || slotDateKey < todayYmd) {
    return false; // Past date
  }

  // Future dates (tomorrow, next week, etc.) are always valid (> 45 mins)
  if (slotDateKey > todayYmd) {
    return true;
  }

  // Today's date: Must start at least minBufferMinutes from current Pakistan time
  const currentMinsPkt = getCurrentMinutesInPkt();
  const minEligibleMins = currentMinsPkt + minBufferMinutes;
  const slotMins = getSlotMinutesFromMidnightInPkt(slot);

  if (slotMins === 9999) return false;
  return slotMins >= minEligibleMins;
}




// Helper to transform any Cloudinary URL for blazing fast CDN delivery (<50ms)
function optimizeCloudinaryUrl(url?: string | null, width: number = 400): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;
  const prefix = url.substring(0, uploadIndex + 8);
  let suffix = url.substring(uploadIndex + 8);
  if (['f_auto', 'w_', 'q_', 'c_'].some((k) => suffix.startsWith(k))) {
    const slashIdx = suffix.indexOf('/');
    if (slashIdx !== -1) {
      suffix = suffix.substring(slashIdx + 1);
    }
  }
  return `${prefix}f_auto,q_auto:eco,w_${width},c_fill,g_face,dpr_auto/${suffix}`;
}

// Helper to get doctor profile image with reliable matching for D.I. Khan specialists
function getDoctorProfileImage(
  doc?: Partial<DoctorData> | { full_name?: string; specialty?: string; profile_image?: string } | null,
  targetWidth: number = 400
): string {
  if (!doc) return '/dr_ayesha_khan.webp';
  if (doc.profile_image) return optimizeCloudinaryUrl(doc.profile_image, targetWidth);
  const name = (doc.full_name || '').toLowerCase();
  const spec = (doc.specialty || '').toLowerCase();

  if (name.includes('sadia') || spec.includes('gynecol') || spec.includes('obstetric')) {
    return '/doctors/dr_sadia_rehman.webp';
  }
  if (name.includes('tariq') || name.includes('babar')) {
    return '/doctors/dr_tariq_babar.webp';
  }
  if (name.includes('sahil') || spec.includes('dermatol')) {
    return '/doctors/dr_sahil_mehsood.webp';
  }
  if (name.includes('haris')) {
    return '/doctors/dr_haris_rehman.webp';
  }
  if (name.includes('asif') || name.includes('gandapur')) {
    return '/doctors/dr_asif_gandapur.webp';
  }
  if (name.includes('moiz')) {
    return '/doctors/dr_moiz_ahmad.webp';
  }
  if (name.includes('subhan')) {
    return '/doctors/dr_subhan_sultan.webp';
  }
  if (spec.includes('cardio')) {
    return '/doctors/dr_tariq_babar.webp';
  }
  if (spec.includes('pediat') || spec.includes('child')) {
    return '/doctors/dr_asif_gandapur.webp';
  }
  return '/dr_ayesha_khan.webp';
}

// ── Shared: Doctor Real Shift, Today Availability & Next Slot Calculator ─────────────
export interface DoctorAvailabilityInfo {
  isAvailableToday: boolean;
  todayBadgeText: string;
  todayBadgeClass: string;
  nextSlotText: string;
  nextSlotClass: string;
  shiftBadge: string;
  statusText: string;
}

export function getDoctorAvailability(doc?: Partial<DoctorData> | null): DoctorAvailabilityInfo {
  if (!doc) {
    return {
      isAvailableToday: false,
      todayBadgeText: 'Checking Schedule',
      todayBadgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      nextSlotText: 'Schedule Loading',
      nextSlotClass: 'bg-slate-400',
      shiftBadge: 'Clinic Shift',
      statusText: 'OPD Timing'
    };
  }

  try {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { timeZone: 'Asia/Karachi', weekday: 'long' }).toLowerCase();
    const hr = parseInt(now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', hour12: false }), 10);
    const min = parseInt(now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi', minute: '2-digit', hour12: false }), 10);
    const nowMins = hr * 60 + min;

    const offDays = (doc.off_days || 'sunday').split(',').map((d: string) => d.trim().toLowerCase());
    const isTodayOff = offDays.includes(dayName);

    // Shift boundaries
    const [mSh, mSm] = (doc.morning_start || '09:00').split(':').map(Number);
    const [mEh, mEm] = (doc.morning_end || '13:00').split(':').map(Number);
    const mStartMin = mSh * 60 + mSm;
    const mEndMin = mEh * 60 + mEm;

    const [eSh, eSm] = (doc.evening_start || '17:00').split(':').map(Number);
    const [eEh, eEm] = (doc.evening_end || '21:00').split(':').map(Number);
    const eStartMin = eSh * 60 + eSm;
    const eEndMin = eEh * 60 + eEm;

    const fmt12 = (h: number, m: number) => {
      const ampm = h < 12 ? 'AM' : 'PM';
      const h12 = h % 12 || 12;
      return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    const morningLabel = `${fmt12(mSh, mSm)} - ${fmt12(mEh, mEm)}`;
    const eveningLabel = `${fmt12(eSh, eSm)} - ${fmt12(eEh, eEm)}`;

    let shiftBadge = '';
    const shift = (doc.shift || 'EVENING').toUpperCase();
    if (shift === 'MORNING') {
      shiftBadge = `Morning · ${morningLabel}`;
    } else if (shift === 'EVENING') {
      shiftBadge = `Evening · ${eveningLabel}`;
    } else {
      shiftBadge = `Both Shifts · ${fmt12(mSh, mSm)} & ${fmt12(eSh, eSm)}`;
    }

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayIdx = daysOfWeek.indexOf(dayName);
    let nextOpenDay = 'Tomorrow';
    const tomorrowDayName = daysOfWeek[(currentDayIdx + 1) % 7];
    if (offDays.includes(tomorrowDayName)) {
      const dayAfterTomorrow = daysOfWeek[(currentDayIdx + 2) % 7];
      nextOpenDay = dayAfterTomorrow.charAt(0).toUpperCase() + dayAfterTomorrow.slice(1);
    }

    // ── Real DB Slot Awareness: If doctor has live backend slot status or next_available_slot ──
    const hasLiveSlotData = Boolean(doc.next_available_slot || doc.today_status !== undefined || doc.is_available_today !== undefined);

    if (hasLiveSlotData) {
      if (doc.today_status === 'OFF_TODAY' || isTodayOff) {
        return {
          isAvailableToday: false,
          todayBadgeText: 'Off Today (Weekly Off)',
          todayBadgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
          nextSlotText: doc.next_available_slot || `${nextOpenDay} · Next Shift`,
          nextSlotClass: 'bg-rose-500',
          shiftBadge,
          statusText: 'Weekly Off Day'
        };
      }

      const isTodaySlot = (doc.next_available_slot && doc.next_available_slot.toLowerCase().startsWith('today')) || doc.is_available_today === true || doc.today_status === 'AVAILABLE_TODAY';

      if (isTodaySlot) {
        let todayBadge = 'Available Today';
        let status = doc.upcoming_slots_count ? `${doc.upcoming_slots_count} slots open` : 'Open for booking';

        // For doctors with BOTH shifts, distinguish Morning vs Evening based on actual next slot
        if (shift === 'BOTH') {
          const isMorningSlot = doc.next_available_slot ? doc.next_available_slot.toLowerCase().includes('am') : (nowMins < mEndMin - 20);
          if (isMorningSlot) {
            todayBadge = 'Available Today (Morning)';
            status = `Morning shift until ${fmt12(mEh, mEm)}`;
          } else {
            todayBadge = 'Available Today (Evening)';
            status = `Evening shift until ${fmt12(eEh, eEm)}`;
          }
        } else if (shift === 'MORNING') {
          todayBadge = 'Available Today (Morning)';
          status = `Morning shift until ${fmt12(mEh, mEm)}`;
        } else if (shift === 'EVENING') {
          todayBadge = 'Available Today (Evening)';
          status = `Evening shift until ${fmt12(eEh, eEm)}`;
        }

        return {
          isAvailableToday: true,
          todayBadgeText: todayBadge,
          todayBadgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          nextSlotText: doc.next_available_slot || 'Today · Available',
          nextSlotClass: 'bg-emerald-500 animate-pulse',
          shiftBadge,
          statusText: status
        };
      }

      if (doc.today_status === 'NO_UPCOMING_SLOTS') {
        return {
          isAvailableToday: false,
          todayBadgeText: 'No Upcoming Slots',
          todayBadgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          nextSlotText: 'No Slots Scheduled',
          nextSlotClass: 'bg-slate-400',
          shiftBadge,
          statusText: 'Contact clinic'
        };
      }

      // No slots left today (either passed or cleared)
      return {
        isAvailableToday: false,
        todayBadgeText: 'No Slots Left Today',
        todayBadgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        nextSlotText: doc.next_available_slot || `${nextOpenDay} · Next Shift`,
        nextSlotClass: 'bg-amber-500',
        shiftBadge,
        statusText: doc.next_available_slot ? 'Next available below' : 'Shift ended today'
      };
    }

    if (isTodayOff) {
      const startSlot = shift === 'EVENING' ? fmt12(eSh, eSm) : fmt12(mSh, mSm);
      return {
        isAvailableToday: false,
        todayBadgeText: 'Off Today (Weekly Off)',
        todayBadgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        nextSlotText: doc.next_available_slot || `${nextOpenDay} · ${startSlot}`,
        nextSlotClass: 'bg-rose-500',
        shiftBadge,
        statusText: 'Weekly Off Day'
      };
    }

    if (shift === 'MORNING') {
      if (nowMins < mEndMin - 20) {
        const nextMin = Math.max(nowMins + 15, mStartMin);
        const nextRoundedMin = Math.ceil(nextMin / 20) * 20;
        const nextSlotH = Math.floor(nextRoundedMin / 60);
        const nextSlotM = nextRoundedMin % 60;
        return {
          isAvailableToday: true,
          todayBadgeText: 'Available Today (Morning)',
          todayBadgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          nextSlotText: doc.next_available_slot || `Today · ${fmt12(nextSlotH, nextSlotM)}`,
          nextSlotClass: 'bg-emerald-500 animate-pulse',
          shiftBadge,
          statusText: `Open until ${fmt12(mEh, mEm)}`
        };
      } else {
        return {
          isAvailableToday: false,
          todayBadgeText: 'Morning Shift Ended',
          todayBadgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          nextSlotText: doc.next_available_slot || `${nextOpenDay} · ${fmt12(mSh, mSm)}`,
          nextSlotClass: 'bg-amber-500',
          shiftBadge,
          statusText: 'Shift ended today'
        };
      }
    }

    if (shift === 'EVENING') {
      if (nowMins < eEndMin - 20) {
        const nextMin = Math.max(nowMins + 15, eStartMin);
        const nextRoundedMin = Math.ceil(nextMin / 20) * 20;
        const nextSlotH = Math.floor(nextRoundedMin / 60);
        const nextSlotM = nextRoundedMin % 60;
        return {
          isAvailableToday: true,
          todayBadgeText: 'Available Today (Evening)',
          todayBadgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          nextSlotText: doc.next_available_slot || `Today · ${fmt12(nextSlotH, nextSlotM)}`,
          nextSlotClass: 'bg-emerald-500 animate-pulse',
          shiftBadge,
          statusText: `Open until ${fmt12(eEh, eEm)}`
        };
      } else {
        return {
          isAvailableToday: false,
          todayBadgeText: 'Evening Shift Ended',
          todayBadgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          nextSlotText: doc.next_available_slot || `${nextOpenDay} · ${fmt12(eSh, eSm)}`,
          nextSlotClass: 'bg-amber-500',
          shiftBadge,
          statusText: 'Shift ended today'
        };
      }
    }

    // BOTH SHIFTS
    if (nowMins < mEndMin - 20) {
      const nextMin = Math.max(nowMins + 15, mStartMin);
      const nextRoundedMin = Math.ceil(nextMin / 20) * 20;
      const nextSlotH = Math.floor(nextRoundedMin / 60);
      const nextSlotM = nextRoundedMin % 60;
      return {
        isAvailableToday: true,
        todayBadgeText: 'Available Today (Morning)',
        todayBadgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        nextSlotText: doc.next_available_slot || `Today · ${fmt12(nextSlotH, nextSlotM)}`,
        nextSlotClass: 'bg-emerald-500 animate-pulse',
        shiftBadge,
        statusText: `Morning shift until ${fmt12(mEh, mEm)}`
      };
    } else if (nowMins < eEndMin - 20) {
      const nextMin = Math.max(nowMins + 15, eStartMin);
      const nextRoundedMin = Math.ceil(nextMin / 20) * 20;
      const nextSlotH = Math.floor(nextRoundedMin / 60);
      const nextSlotM = nextRoundedMin % 60;
      return {
        isAvailableToday: true,
        todayBadgeText: 'Available Today (Evening)',
        todayBadgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        nextSlotText: doc.next_available_slot || `Today · ${fmt12(nextSlotH, nextSlotM)}`,
        nextSlotClass: 'bg-emerald-500 animate-pulse',
        shiftBadge,
        statusText: `Evening shift until ${fmt12(eEh, eEm)}`
      };
    } else {
      return {
        isAvailableToday: false,
        todayBadgeText: 'Both Shifts Ended',
        todayBadgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        nextSlotText: doc.next_available_slot || `${nextOpenDay} · ${fmt12(mSh, mSm)}`,
        nextSlotClass: 'bg-amber-500',
        shiftBadge,
        statusText: 'Both shifts ended today'
      };
    }
  } catch {
    return {
      isAvailableToday: true,
      todayBadgeText: 'Available',
      todayBadgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      nextSlotText: 'Upcoming Slots Available',
      nextSlotClass: 'bg-emerald-500',
      shiftBadge: (doc.shift || 'EVENING'),
      statusText: 'Consultation'
    };
  }
}

// ── Shared: Initials Avatar ──────────────────────────────────────────────────
function InitialsAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const classes = size === 'lg'
    ? 'w-14 h-14 rounded-full bg-clinic-100 text-clinic-800 flex items-center justify-center font-bold text-lg uppercase flex-shrink-0'
    : size === 'sm'
      ? 'w-8 h-8 rounded-full bg-clinic-100 text-clinic-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0'
      : 'w-10 h-10 rounded-full bg-clinic-100 text-clinic-700 flex items-center justify-center font-bold text-sm uppercase flex-shrink-0';
  return <div className={classes}>{initials}</div>;
}

// ── Shared: Realtime Live Badge ──────────────────────────────────────────────
function RealtimeLive() {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Realtime Live
    </span>
  );
}

// ── Shared: Status Pill ──────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    verified: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    active: 'bg-emerald-50 text-emerald-700',
    confirmed: 'bg-teal-50 text-teal-700',
    'in progress': 'bg-clinic-700 text-white',
    pending: 'bg-amber-50 text-amber-700',
    'pending assistant approval': 'bg-amber-50 text-amber-700',
    paid: 'bg-emerald-50 text-emerald-700',
    'pending cash': 'bg-amber-50 text-amber-700',
    rejected: 'bg-rose-50 text-rose-600',
    revoked: 'bg-rose-50 text-rose-600',
    spotlight: 'bg-amber-100 text-amber-700',
    hold: 'bg-amber-50 text-amber-700 border border-amber-200',
    blocked: 'bg-slate-100 text-slate-500',
    booked: 'bg-slate-100 text-slate-500',
  };
  const key = status.toLowerCase();
  const cls = map[key] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}


// ── Global Floating Theme Toggle Component ──────────────────────────────────────────
function FloatingThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <div className="hidden md:block fixed bottom-5 left-5 z-40">
      <button
        type="button"
        onClick={onToggle}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-xl border backdrop-blur-md transition-all duration-300 cursor-pointer select-none group hover:scale-105 active:scale-95 ${isDark
          ? 'bg-slate-900/90 hover:bg-slate-800 text-amber-300 border-slate-700/80 shadow-black/40 ring-1 ring-amber-400/20'
          : 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-slate-900/10'
          }`}
        aria-label="Toggle Light and Dark Mode"
      >
        <span className="p-0.5 rounded-full transition-transform group-hover:rotate-12">
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-clinic-700" />
          )}
        </span>
        <span className="text-[11px] font-bold tracking-wide pr-1 hidden sm:inline">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      </button>
    </div>
  );
}

// ── Shared: Portal Sidebar Layout ────────────────────────────────────────────────────
function PortalSidebar({
  workspaceLabel,
  clinicName,
  clinicSub,
  navItems,
  activeNav,
  onNavChange,
  onSignOut,
  bottomNote,
  isOpen,
  onClose,
}: {
  workspaceLabel: string;
  clinicName: string;
  clinicSub: string;
  navItems: { id: string; label: string }[];
  activeNav: string;
  onNavChange: (id: string) => void;
  onSignOut: () => void;
  bottomNote?: string;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}
      <div className={`portal-sidebar px-[18px] pt-[24px] pb-[20px] justify-between ${isOpen ? 'portal-sidebar-open' : ''}`} style={{ background: '#0D1927' }}>
        <div>
          {/* Logo & Mobile Close */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[#20b29a] flex items-center justify-center flex-shrink-0 shadow-sm text-[#0D1927]">
                <Stethoscope className="w-5 h-5 text-[#0D1927]" />
              </div>
              <div>
                <div className="text-white font-extrabold text-sm leading-tight tracking-wide" style={{ fontFamily: 'Outfit,sans-serif' }}>
                  D.I. Khan Care
                </div>
                <div className="text-slate-400 text-[8px] uppercase tracking-widest font-semibold mt-0.5">
                  DOCTOR APPOINTMENT SYSTEM
                </div>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Workspace label */}
          <div className="mb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              {workspaceLabel}
            </span>
          </div>

          {/* Nav items */}
          <nav className="space-y-1.5">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  onNavChange(item.id);
                  if (onClose) onClose();
                }}
                className={activeNav === item.id ? 'sidebar-link-active w-full text-left cursor-pointer' : 'sidebar-link w-full text-left cursor-pointer'}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Clinic info card at bottom */}
        <div className="mt-auto pt-4 space-y-2.5">
          <div className="p-3.5 rounded-lg bg-[#132235] border border-slate-800/80 shadow-xs">
            <div className="text-xs font-medium text-slate-200 leading-snug">
              {clinicName}{clinicSub ? ` · ${clinicSub}` : ''}
            </div>
          </div>

          {bottomNote && (
            <div className="text-[10px] text-slate-400 leading-snug px-0.5">
              {bottomNote}
            </div>
          )}

          {/* Theme switcher inside sidebar */}
          <button
            type="button"
            onClick={() => {
              const html = document.documentElement;
              const willBeDark = !html.classList.contains('dark');
              if (willBeDark) {
                html.classList.add('dark');
                localStorage.setItem('dikhan_theme', 'dark');
              } else {
                html.classList.remove('dark');
                localStorage.setItem('dikhan_theme', 'light');
              }
              window.dispatchEvent(new Event('theme-change'));
            }}
            className="flex items-center justify-between w-full py-2 px-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#132235] hover:bg-slate-800/90 border border-slate-800/80 rounded-lg transition-all cursor-pointer"
            title="Toggle Light / Dark mode"
          >
            <span className="flex items-center gap-2">
              <span className="text-sm">🌓</span>
              <span>Theme Mode</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-clinic-400 font-mono">
              Toggle
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSignOut();
            }}
            className="flex items-center gap-2 w-full py-2 px-1 text-xs font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ── Staff Login Split View (Figma Design Spec) ─────────────────────────────
function StaffLoginSplitView({
  currentRole,
  onSwitchRole,
  onLogin,
  loginLoading,
  loginError
}: {
  currentRole: 'doctor' | 'assistant' | 'admin';
  onSwitchRole?: (r: 'patient' | 'assistant' | 'doctor' | 'admin') => void;
  onLogin: (email: string, pass: string) => Promise<void>;
  loginLoading: boolean;
  loginError?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  const usernameLabel = currentRole === 'assistant'
    ? 'Staff username'
    : currentRole === 'doctor'
      ? 'Doctor email'
      : 'Admin email';

  const usernamePlaceholder = currentRole === 'assistant'
    ? 'nida.reception'
    : currentRole === 'doctor'
      ? 'doctor@dikhanhealth.pk'
      : 'admin@dikhan.care';

  const submitButtonLabel = currentRole === 'assistant'
    ? 'Sign in to assistant desk'
    : currentRole === 'doctor'
      ? 'Sign in to doctor portal'
      : 'Sign in to platform console';

  const noticeTitle = currentRole === 'assistant'
    ? 'Assistant access is scoped to linked doctors'
    : currentRole === 'doctor'
      ? 'Doctor portal is restricted to PMDC-verified practitioners'
      : 'Platform governance & developer console';

  const noticeSub = currentRole === 'assistant'
    ? 'Your clinic doctor creates or links your staff account. Contact the clinic owner for credential assistance.'
    : currentRole === 'doctor'
      ? 'Access your live patient queue, manage consultation slots, and track revenue reconciliation.'
      : 'Restricted to system administrators for credential resets, clinic verifications, and audit logging.';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const roleVisuals = {
    doctor: {
      sidebarBg: 'bg-[#0c2823]',
      badgeBorder: 'border-emerald-500/40 text-emerald-300',
      badgeText: 'DOCTOR WORKSPACE • PMDC VERIFIED',
      heading: (
        <>
          Verified PMDC Specialists.<br />Precision clinical care.
        </>
      ),
      subheading: 'Access your live patient queue, consultation records, and daily counter fee reconciliations across Dera Ismail Khan.',
      image: '/dr_ayesha_khan.jpg',
      alt: 'D.I. Khan PMDC Doctor Consultation Suite',
      captionTitle: 'Dr. Ayesha Khan Consultation Room',
      captionBadge: 'PMDC Specialist',
      gradientOverlay: 'from-[#0c2823]/85',
      bullets: [
        { title: 'Live Token Consultation Queue', desc: 'Call patients in order, review check-in timestamps, and sync room status.' },
        { title: 'Clinical Notes & Counter Slips', desc: 'Maintain digital visit history and print official medical verification slips.' },
        { title: 'Direct Fee Reconciliation', desc: 'Live visibility into verified reception cash collection and clinic earnings.' },
      ],
      portalTitle: 'Doctor Portal Login',
      portalSub: 'Verified PMDC Medical Practitioners',
      tag: 'PMDC Verified',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Stethoscope,
      accentColor: '#143d38'
    },
    assistant: {
      sidebarBg: 'bg-[#082928]',
      badgeBorder: 'border-teal-500/40 text-teal-300',
      badgeText: 'ASSISTANT WORKSPACE • RECEPTION DESK',
      heading: (
        <>
          Front Desk & Reception.<br />Zero-wait counter queues.
        </>
      ),
      subheading: 'A unified workstation for clinic reception teams across D.I. Khan to issue walk-in tokens, collect cash fees, and triage waiting patients.',
      image: '/assistant_reception_desk.jpg',
      alt: 'D.I. Khan Clinic Reception & Token Counter Desk',
      captionTitle: 'Al-Shifa Clinic Front Desk',
      captionBadge: 'Counter Token Desk',
      gradientOverlay: 'from-[#082928]/80',
      bullets: [
        { title: '1-Click Walk-in Counter Tokens', desc: 'Generate digital slips with automated sequential queue numbering.' },
        { title: 'Cash Collection & Immediate Slips', desc: 'Verify physical cash collected at the desk with instant digital receipts.' },
        { title: 'Live Doctor Room Status Sync', desc: 'See which doctor is consulting, who is next, and communicate queue delays.' },
      ],
      portalTitle: 'Assistant Reception Desk',
      portalSub: 'Clinic Front-Desk & Cash Queue Management',
      tag: 'Front Desk',
      tagColor: 'bg-teal-50 text-teal-700 border-teal-200',
      icon: Receipt,
      accentColor: '#0a3834'
    },
    admin: {
      sidebarBg: 'bg-[#0a1120]',
      badgeBorder: 'border-cyan-500/40 text-cyan-300',
      badgeText: 'ADMIN PLATFORM CONSOLE • ROOT AUDIT',
      heading: (
        <>
          Platform Governance.<br />Audit & System Security.
        </>
      ),
      subheading: 'Enterprise administration for clinic licensing, PMDC doctor onboarding, staff access control, and immutable audit logs.',
      image: '/developer_studio_coding.jpg',
      alt: 'Core Operations Center & Admin Governance',
      captionTitle: 'Operations & Security Console',
      captionBadge: 'Root Operations',
      gradientOverlay: 'from-[#0a1120]/80',
      bullets: [
        { title: 'Doctor & Clinic Verification', desc: 'Review PMDC certificates, approve specialist accounts, and oversee clinics.' },
        { title: 'System Telemetry & Database Health', desc: 'Monitor real-time PostgreSQL connection pools, latency, and background workers.' },
        { title: 'Immutable RBAC & Audit Trail', desc: 'Full activity logging, staff credential oversight, and emergency security locks.' },
      ],
      portalTitle: 'Platform Security Console',
      portalSub: 'Root Administration & Audit Governance',
      tag: 'Root Access',
      tagColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      icon: Terminal,
      accentColor: '#0e1f38'
    }
  };

  const visual = roleVisuals[currentRole];
  const IconComponent = visual.icon;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white overflow-hidden animate-fade-in">
      {/* ── Left Sidebar / Role-Themed Panel ─────────────────────── */}
      <div className={`w-full lg:w-[480px] xl:w-[530px] ${visual.sidebarBg} flex flex-col justify-between p-5 sm:p-10 lg:p-12 relative overflow-hidden text-white flex-shrink-0 transition-colors duration-500`}>
        <div>
          {/* Brand header */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 rounded-md bg-teal-400 flex items-center justify-center text-[#0c2823] shadow-md flex-shrink-0 font-bold">
              <IconComponent className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-white font-extrabold text-sm tracking-wide" style={{ fontFamily: 'Outfit, sans-serif' }}>
                D.I. Khan Care
              </div>
              <div className="text-teal-300 text-[8px] uppercase tracking-widest font-semibold">
                DOCTOR APPOINTMENT SYSTEM
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="mb-3 sm:mb-5">
            <span className={`inline-block px-3 py-1 rounded-full border ${visual.badgeBorder} text-[10px] font-bold tracking-widest uppercase`}>
              {visual.badgeText}
            </span>
          </div>

          {/* Large Heading */}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {visual.heading}
          </h1>
          <p className="text-teal-100/70 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6 font-normal">
            {visual.subheading}
          </p>

          {/* Role-Specific Image Box (Desktop & Tablet) */}
          <div className="relative rounded-lg overflow-hidden border border-white/15 shadow-xl mb-7 bg-black/30 aspect-[16/10] group hidden sm:block">
            <img
              src={visual.image}
              alt={visual.alt}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${visual.gradientOverlay} via-transparent to-transparent pointer-events-none`} />
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/95">
              <span className="font-semibold drop-shadow-sm flex items-center gap-1.5 truncate pr-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="truncate">{visual.captionTitle}</span>
              </span>
              <span className="text-[10px] text-white/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs flex-shrink-0 border border-white/10 font-medium">
                {visual.captionBadge}
              </span>
            </div>
          </div>

          {/* 3 Role-Specific Value Propositions (Desktop) */}
          <div className="space-y-4 hidden lg:block">
            {visual.bullets.map((b, idx) => (
              <div key={idx}>
                <p className="text-white font-bold text-xs">{b.title}</p>
                <p className="text-teal-100/70 text-[11px] leading-relaxed mt-0.5">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footnote */}
        <div className="mt-4 sm:mt-8 pt-3 sm:pt-4 border-t border-white/10 text-[10px] text-teal-300/60 font-medium hidden sm:block">
          D.I. Khan Care Official Healthcare Network &middot; Verified Staff Workspace.
        </div>
      </div>

      {/* ── Right Panel (White / Clean Canvas) ──────────────── */}
      <div className="flex-1 flex flex-col justify-between p-5 sm:p-10 lg:p-14 bg-white overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-8 pb-3 border-b border-slate-100">
          <span>D.I. Khan Doctor Appointment System</span>
          <button
            type="button"
            onClick={() => onSwitchRole?.('patient')}
            className="text-xs font-semibold text-slate-600 hover:text-clinic-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Back to directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main form area */}
        <div className="max-w-md w-full mx-auto my-auto py-4">
          {/* Role icon badge */}
          <div className="w-10 h-10 rounded-md bg-[#e6f7f3] border border-[#b2e7db] flex items-center justify-center text-clinic-700 mb-5 shadow-2xs">
            <IconComponent className="w-5 h-5 text-clinic-700" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Welcome back.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5 leading-relaxed">
            Sign in with your staff credentials. Patients use passwordless booking and tracking instead.
          </p>

          {/* Role Identity Preview Card with Avatar Image */}
          <div className="mb-5 p-3 rounded-lg border border-slate-200/90 bg-slate-50/80 flex items-center gap-3.5 shadow-2xs">
            <div className="relative flex-shrink-0">
              <img
                src={visual.image}
                alt={visual.portalTitle}
                className="w-12 h-12 rounded-lg object-cover border border-slate-300/80 shadow-xs"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400/40" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 truncate">
                  {visual.portalTitle}
                </h3>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${visual.tagColor}`}>
                  {visual.tag}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {visual.portalSub}
              </p>
            </div>
          </div>

          {/* Role Selector: Doctor vs Assistant ONLY (Admin is separated strictly to /admin) */}
          {currentRole !== 'admin' ? (
            <div className="mb-5">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Select your role
              </label>
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg border border-slate-200/80 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => onSwitchRole?.('doctor')}
                  className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-md font-semibold transition-all cursor-pointer ${currentRole === 'doctor'
                    ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/70'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <img
                    src="/dr_ayesha_khan.jpg"
                    alt="Doctor"
                    className="w-5 h-5 rounded-full object-cover border border-emerald-400 flex-shrink-0"
                  />
                  <span>Doctor</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchRole?.('assistant')}
                  className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-md font-semibold transition-all cursor-pointer ${currentRole === 'assistant'
                    ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/70'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <img
                    src="/assistant_reception_desk.jpg"
                    alt="Assistant"
                    className="w-5 h-5 rounded-full object-cover border border-teal-400 flex-shrink-0"
                  />
                  <span>Assistant Desk</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-5 p-3 bg-slate-900 text-white rounded-lg flex items-center justify-between text-xs shadow-xs border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-bold">System Administrator Access</span>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-cyan-300 border border-slate-700">
                /admin
              </span>
            </div>
          )}


          {/* Credential Help Drawer (Demo Quick Fills) */}
          {showHelp && (
            <div className="mb-4 p-3 bg-clinic-50 border border-clinic-200 rounded-md text-xs space-y-2 animate-fade-in">
              <div className="flex items-center justify-between font-bold text-clinic-900 border-b border-clinic-100 pb-1">
                <span>1-Click Test Credentials ({currentRole})</span>
                <button type="button" onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {currentRole === 'assistant' && (
                <>
                  <div className="flex items-center justify-between text-[11px]">
                    <div>
                      <p className="font-semibold text-slate-800">Moez Ahmad (Reception Desk 1)</p>
                      <p className="text-slate-500 font-mono">915subhan@gmail.com</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEmail('915subhan@gmail.com'); setPassword('ncpa.cpl'); }}
                      className="px-2 py-1 bg-clinic-700 text-white rounded font-bold hover:bg-clinic-800 cursor-pointer"
                    >
                      Fill
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-clinic-100">
                    <div>
                      <p className="font-semibold text-slate-800">Zeeshan (Reception Desk 2)</p>
                      <p className="text-slate-500 font-mono">zeeshan.reception@dikhanhealth.pk</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEmail('zeeshan.reception@dikhanhealth.pk'); setPassword('AssistantPass123!'); }}
                      className="px-2 py-1 bg-clinic-700 text-white rounded font-bold hover:bg-clinic-800 cursor-pointer"
                    >
                      Fill
                    </button>
                  </div>
                </>
              )}
              {currentRole === 'doctor' && (
                <>
                  <div className="flex items-center justify-between text-[11px]">
                    <div>
                      <p className="font-semibold text-slate-800">Dr. Tariq (Cardiologist)</p>
                      <p className="text-slate-500 font-mono">dr.tariq@dikhanhealth.pk</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEmail('dr.tariq@dikhanhealth.pk'); setPassword('DoctorPass123!'); }}
                      className="px-2 py-1 bg-clinic-700 text-white rounded font-bold hover:bg-clinic-800 cursor-pointer"
                    >
                      Fill
                    </button>
                  </div>
                </>
              )}
              {currentRole === 'admin' && (
                <div className="flex items-center justify-between text-[11px]">
                  <div>
                    <p className="font-semibold text-slate-800">System Administrator</p>
                    <p className="text-slate-500 font-mono">admin@dikhan.care</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEmail('admin@dikhan.care'); setPassword('AdminPass123!'); }}
                    className="px-2 py-1 bg-clinic-700 text-white rounded font-bold hover:bg-clinic-800 cursor-pointer"
                  >
                    Fill
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {usernameLabel}
              </label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={usernamePlaceholder}
                required
                className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-clinic-400 focus:border-clinic-400 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-clinic-400 focus:border-clinic-400 shadow-2xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Helper row: Remember me & Credential help */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-clinic-700 focus:ring-clinic-500"
                />
                <span>Remember this device</span>
              </label>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-clinic-700 hover:underline font-semibold cursor-pointer"
              >
                Credential help
              </button>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 px-5 text-white font-bold text-sm rounded-md shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: visual.accentColor }}
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>{submitButtonLabel}</span>
              )}
            </button>
          </form>

          {/* Scoped Notice Box */}
          <div className="mt-5 p-3.5 rounded-md bg-[#f0faf8] border border-[#d2efe9] text-xs space-y-0.5">
            <p className="font-bold text-[#143d38]">{noticeTitle}</p>
            <p className="text-slate-600 text-[11px] leading-relaxed">{noticeSub}</p>
          </div>

          {/* Looking for your appointment? */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-800">Looking for your appointment?</p>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-3 leading-relaxed">
              No patient password needed. Book with a 6-digit code or look up an approved visit using your phone and digital slip number.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => onSwitchRole?.('patient')}
                className="px-3.5 py-2 rounded-md border border-slate-200 hover:border-clinic-400 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              >
                Find a doctor
              </button>
              <button
                type="button"
                onClick={() => onSwitchRole?.('patient')}
                className="px-3.5 py-2 rounded-md border border-slate-200 hover:border-clinic-400 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              >
                Track appointment
              </button>
            </div>
          </div>
        </div>

        {/* Footer disclaimer */}
        <div className="text-[10px] text-slate-400 text-center pt-4">
          Conceptual account shown. Passwords stay masked; no real credentials are displayed. All clinic payments are cash only.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const getTabFromUrl = (): 'patient' | 'track' | 'assistant' | 'doctor' | 'admin' => {
    try {
      const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
      if (pathname === '/doctor' || pathname.startsWith('/doctor/')) return 'doctor';
      if (pathname === '/assistant' || pathname.startsWith('/assistant/')) return 'assistant';
      if (pathname === '/track' || pathname.startsWith('/track/')) return 'track';

      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'admin' || tabParam === 'doctor' || tabParam === 'assistant' || tabParam === 'track') {
        return tabParam;
      }
      const hash = window.location.hash.replace('#', '').replace(/^\/+/, '').toLowerCase();
      if (hash === 'admin' || hash === 'doctor' || hash === 'assistant' || hash === 'track') {
        return hash as any;
      }
    } catch (_) { }
    return 'patient';
  };

  const [activeTab, setActiveTab] = useState<'patient' | 'track' | 'assistant' | 'doctor' | 'admin'>(getTabFromUrl);
  const [openTrackTrigger, setOpenTrackTrigger] = useState(0);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Global Theme Mode: Light or Dark
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dikhan_theme');
      if (saved) return saved === 'dark';
      return (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('dikhan_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('dikhan_theme', 'light');
    }
  }, [isDarkMode]);

  // Sync with external theme-change events (e.g. from PortalSidebar)
  useEffect(() => {
    const handleThemeChange = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Sync tab with browser URL history
  const handleSwitchRole = (newRole: 'patient' | 'assistant' | 'doctor' | 'admin' | 'track') => {
    setActiveTab(newRole as any);
    try {
      const targetPath = newRole === 'admin' ? '/admin'
        : newRole === 'doctor' ? '/doctor'
          : newRole === 'assistant' ? '/assistant'
            : newRole === 'track' ? '/track'
              : '/';
      if (window.location.pathname.toLowerCase().replace(/\/+$/, '') !== targetPath.replace(/\/+$/, '')) {
        window.history.pushState(null, '', targetPath);
      }
    } catch (_) { }
  };

  // Listen to browser navigation (back/forward and URL changes)
  useEffect(() => {
    const handleUrlChange = () => {
      setActiveTab(getTabFromUrl());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Staff portals render full-screen with sidebar layout
  if (activeTab === 'assistant') {
    return (
      <>
        <AssistantSection onSwitchRole={handleSwitchRole} />
        <FloatingThemeToggle isDark={isDarkMode} onToggle={toggleDarkMode} />
      </>
    );
  }
  if (activeTab === 'doctor') {
    return (
      <>
        <DoctorSection onSwitchRole={handleSwitchRole} />
        <FloatingThemeToggle isDark={isDarkMode} onToggle={toggleDarkMode} />
      </>
    );
  }
  if (activeTab === 'admin') {
    return (
      <>
        <AdminSection onSwitchRole={handleSwitchRole} />
        <FloatingThemeToggle isDark={isDarkMode} onToggle={toggleDarkMode} />
      </>
    );
  }

  // ── Public Patient-Facing Page ──
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* ── Public Top Navbar — Responsive & Desktop-Preserved ── */}
      <header className="sticky top-0 z-50 bg-white/95 border-b border-slate-100" style={{ backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => handleSwitchRole('patient')} className="flex items-center gap-2.5 sm:gap-3 text-left group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-glow-clinic transition-all" style={{ background: 'linear-gradient(135deg, #1a6359, #2a9488)' }}>
              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>D.I. Khan Care</div>
              <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-[0.12em] sm:tracking-[0.15em]">Doctor Appointment System</div>
            </div>
          </button>

          {/* Desktop Nav Links (Completely Unaltered) */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => handleSwitchRole('patient')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${activeTab === 'patient'
                ? 'text-clinic-700 font-semibold bg-clinic-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              Find a doctor
            </button>
            <button
              onClick={() => handleSwitchRole('track')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${activeTab === 'track'
                ? 'text-clinic-700 font-semibold bg-clinic-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              Track appointment
            </button>
            <button
              onClick={() => setShowStaffModal(true)}
              className="ml-2 text-sm font-bold px-5 py-2 rounded-xl text-white transition-all shadow-btn hover:shadow-btn-hover hover:-translate-y-0.5 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1a6359, #143d38)' }}
            >
              Staff sign in
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="ml-2 p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center justify-center cursor-pointer border border-transparent hover:border-slate-200"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </nav>

          {/* Mobile Right Action Bar (< 768px) */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
              aria-label="Toggle theme mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
            <button
              onClick={() => handleSwitchRole('track')}
              className="px-2.5 py-1.5 text-xs font-semibold text-clinic-800 bg-clinic-50 hover:bg-clinic-100 rounded-lg transition-all"
            >
              Track
            </button>
            <button
              onClick={() => setShowMobileNav(true)}
              className="p-2 text-slate-700 hover:text-clinic-800 hover:bg-slate-100 rounded-lg transition-all"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Public Mobile Slide-over Drawer ── */}
      {showMobileNav && (
        <div onClick={() => setShowMobileNav(false)} className="fixed inset-0 z-50 md:hidden bg-slate-950/70 backdrop-blur-xs flex justify-end animate-fade-in">
          <div onClick={(e) => e.stopPropagation()} className="w-[280px] max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl p-6 flex flex-col justify-between animate-slide-right border-l border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #1a6359, #2a9488)' }}>
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                  </div>
                  <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Outfit,sans-serif' }}>D.I. Khan Care</span>
                </div>
                <button onClick={() => setShowMobileNav(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={() => { handleSwitchRole('patient'); setShowMobileNav(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${activeTab === 'patient' ? 'bg-clinic-50 text-clinic-800 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <Search className="w-4 h-4 text-clinic-700" />
                  <span>Find a doctor</span>
                </button>
                <button
                  onClick={() => { handleSwitchRole('track'); setShowMobileNav(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${activeTab === 'track' ? 'bg-clinic-50 text-clinic-800 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <Clock className="w-4 h-4 text-clinic-700" />
                  <span>Track appointment</span>
                </button>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">Portals</p>
                <button
                  onClick={() => { setShowMobileNav(false); handleSwitchRole('doctor'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 text-left"
                >
                  <Stethoscope className="w-4 h-4 text-clinic-700" />
                  <span>Doctor Portal</span>
                </button>
                <button
                  onClick={() => { setShowMobileNav(false); handleSwitchRole('assistant'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 text-left"
                >
                  <Headphones className="w-4 h-4 text-amber-600" />
                  <span>Assistant Desk</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => { setShowMobileNav(false); setShowStaffModal(true); }}
                className="w-full py-2.5 bg-gradient-to-r from-clinic-800 to-clinic-900 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-2"
              >
                <span>Staff Sign In</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Sign In Modal (Doctor & Assistant only - Admin hidden) */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-7 shadow-modal border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>Staff Portal</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Select your workspace to sign in</p>
              </div>
              <button onClick={() => setShowStaffModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { setShowStaffModal(false); handleSwitchRole('doctor'); }}
                className="w-full p-4 rounded-2xl border border-slate-200 hover:border-clinic-400 hover:bg-clinic-50 text-left transition-all group flex items-center gap-4 shadow-xs hover:shadow-card-hover"
              >
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0faf8, #d9f2ed)' }}>
                  <Stethoscope className="w-5 h-5 text-clinic-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-clinic-800">Doctor Portal</p>
                  <p className="text-[11px] text-slate-500">Schedule, slots & patient queue</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-clinic-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
              <button
                onClick={() => { setShowStaffModal(false); handleSwitchRole('assistant'); }}
                className="w-full p-4 rounded-2xl border border-slate-200 hover:border-clinic-400 hover:bg-clinic-50 text-left transition-all group flex items-center gap-4 shadow-xs hover:shadow-card-hover"
              >
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
                  <Headphones className="w-5 h-5 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-clinic-800">Assistant Desk</p>
                  <p className="text-[11px] text-slate-500">Reception queue & approvals</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-clinic-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <main className="flex-1 pb-20 md:pb-0">
        {activeTab === 'track' ? (
          <TrackAppointmentSection onBackToDirectory={() => handleSwitchRole('patient')} />
        ) : (
          <PatientSection
            openTrackTrigger={openTrackTrigger}
            onSwitchRole={handleSwitchRole}
          />
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 bg-white py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a6359, #2a9488)' }}>
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            </div>
            <span className="text-xs font-bold text-slate-600" style={{ fontFamily: 'Outfit, sans-serif' }}>D.I. Khan Care</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Concept preview · Illustrative data</span>
            <span className="text-slate-200">|</span>
            <span>Dera Ismail Khan · Cash at clinic only</span>
          </div>
        </div>
      </footer>
      {/* ── Modern Mobile Bottom Sticky Navigation Bar (< 768px) ── */}
      <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 transition-all">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {/* Tab 1: Find Doctor (Home/Directory) */}
          <button
            type="button"
            onClick={() => handleSwitchRole('patient')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all ${
              activeTab === 'patient'
                ? 'text-clinic-700 dark:text-emerald-400 font-bold bg-clinic-50/80 dark:bg-emerald-950/40'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Search className={`w-5 h-5 mb-0.5 ${activeTab === 'patient' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] leading-tight tracking-tight">Doctors</span>
          </button>

          {/* Tab 2: Track Appointment */}
          <button
            type="button"
            onClick={() => handleSwitchRole('track')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all ${
              activeTab === 'track'
                ? 'text-clinic-700 dark:text-emerald-400 font-bold bg-clinic-50/80 dark:bg-emerald-950/40'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className={`w-5 h-5 mb-0.5 ${activeTab === 'track' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] leading-tight tracking-tight">Track Slip</span>
          </button>

          {/* Tab 3: Staff Portal Access */}
          <button
            type="button"
            onClick={() => setShowStaffModal(true)}
            className="flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <Stethoscope className="w-5 h-5 mb-0.5 stroke-2" />
            <span className="text-[10px] leading-tight tracking-tight">Staff Portal</span>
          </button>

          {/* Tab 4: More / Quick Menu Drawer */}
          <button
            type="button"
            onClick={() => setShowMobileNav(true)}
            className="flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <Menu className="w-5 h-5 mb-0.5 stroke-2" />
            <span className="text-[10px] leading-tight tracking-tight">Menu</span>
          </button>
        </div>
      </nav>

      {/* ── Global Floating Theme Toggle (Light / Dark) ── */}
      <FloatingThemeToggle isDark={isDarkMode} onToggle={toggleDarkMode} />
    </div>
  );
}


// ── Dedicated Track Appointment Section (matching media_1791569482932.png) ───────────
function TrackAppointmentSection({ onBackToDirectory }: { onBackToDirectory: () => void }) {
  const [phone, setPhone] = useState('');
  const [slip, setSlip] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointmentList, setAppointmentList] = useState<any[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [trackError, setTrackError] = useState<string>('');

  const appointment = useMemo(() => {
    return appointmentList.find(a => a.id === selectedAppointmentId) || appointmentList[0] || null;
  }, [appointmentList, selectedAppointmentId]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlSlip = params.get('slip')?.trim() || '';
      const urlPhone = params.get('phone')?.trim() || '';
      if (urlSlip || urlPhone) {
        if (urlSlip) setSlip(urlSlip);
        if (urlPhone) setPhone(urlPhone);
        (async () => {
          setLoading(true);
          setTrackError('');
          try {
            const bodyPayload: any = {};
            if (urlPhone) bodyPayload.phone = urlPhone;
            if (urlSlip) bodyPayload.slip_number = urlSlip;
            const res: any = await apiFetch('/booking/track', {
              method: 'POST',
              body: JSON.stringify(bodyPayload)
            });
            if (res && res.id) {
              const list = Array.isArray(res.appointments) && res.appointments.length > 0 ? res.appointments : [res];
              setAppointmentList(list);
              setSelectedAppointmentId(res.id || list[0].id);
            } else {
              setTrackError('Slip number or mobile number does not match any appointment.');
            }
          } catch (err: any) {
            setTrackError(err.message || 'Slip number or mobile number does not match any appointment.');
          } finally {
            setLoading(false);
          }
        })();
      }
    } catch (_) { }
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError('');
    setAppointmentList([]);
    setSelectedAppointmentId('');

    const cleanPhone = phone.trim();
    const cleanSlip = slip.trim();
    const digitsOnly = cleanPhone.replace(/\D/g, '');

    if (!cleanPhone && !cleanSlip) {
      setTrackError('Please enter your mobile number or digital slip number.');
      return;
    }

    if (cleanPhone && digitsOnly.length < 7 && !cleanSlip) {
      setTrackError('Please enter a valid mobile number (at least 7 to 11 digits, e.g. 03001234567) or your full digital slip number.');
      return;
    }

    setLoading(true);
    try {
      const bodyPayload: any = {};
      if (cleanPhone) bodyPayload.phone = cleanPhone;
      if (cleanSlip) bodyPayload.slip_number = cleanSlip;
      const res: any = await apiFetch('/booking/track', {
        method: 'POST',
        body: JSON.stringify(bodyPayload)
      });
      if (res && res.id) {
        const list = Array.isArray(res.appointments) && res.appointments.length > 0 ? res.appointments : [res];
        setAppointmentList(list);
        setSelectedAppointmentId(res.id || list[0].id);
        setTrackError('');
      } else {
        setAppointmentList([]);
        setSelectedAppointmentId('');
        setTrackError('Slip number or mobile number does not match any appointment.');
      }
    } catch (err: any) {
      setAppointmentList([]);
      setSelectedAppointmentId('');
      setTrackError(err.message || 'Slip number or mobile number does not match any appointment.');
    } finally {
      setLoading(false);
    }
  };

  const formatVisitDate = (dateVal?: string) => {
    if (!dateVal) return 'Upcoming date';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleDateString('en-US', {
        timeZone: 'Asia/Karachi',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateVal;
    }
  };

  const formatVisitTime = (dateVal?: string) => {
    if (!dateVal) return 'Scheduled time';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Karachi',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateVal;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-md mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Your visit, at a glance.
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Track your appointment without a password. Look up by mobile number or digital slip.
          </p>
        </div>

        {/* Find your appointment card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Find your appointment
          </h2>

          {trackError && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Appointment Not Found</p>
                <p className="mt-0.5 text-rose-700 leading-relaxed">{trackError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 block">Mobile / WhatsApp number</label>
                <span className="text-[10px] text-slate-400 font-medium">Optional if Slip # entered</span>
              </div>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0300 1234567 or +92 300 1234567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-clinic-400 bg-white"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 block">Digital slip number</label>
                <span className="text-[10px] text-slate-400 font-medium">Optional if phone entered</span>
              </div>
              <input
                type="text"
                value={slip}
                onChange={e => setSlip(e.target.value)}
                placeholder="e.g. SLIP #DIK-... or DIK-..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-clinic-400 font-mono bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-clinic-700 hover:bg-clinic-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Searching appointment...</span>
                </>
              ) : (
                'Track appointment'
              )}
            </button>
            <p className="text-[11px] text-slate-400 leading-normal">
              Enter your mobile number and digital slip number to view your queue position, visit slip, and real-time approval status.
            </p>
          </form>
        </div>

        {/* Multi-Appointment Switcher when multiple bookings exist */}
        {appointmentList.length > 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Multiple Appointments Found ({appointmentList.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select an appointment to view its live status and digital slip:
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {appointmentList.map((appt, idx) => {
                const isSelected = appt.id === (appointment?.id || selectedAppointmentId);
                return (
                  <button
                    key={appt.id || idx}
                    type="button"
                    onClick={() => setSelectedAppointmentId(appt.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${isSelected
                      ? 'border-[#0f766e] bg-teal-50/50 ring-2 ring-[#0f766e]/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50/80'
                      }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {appt.doctor_name || 'Specialist Doctor'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${appt.status === 'COMPLETED'
                          ? 'bg-teal-100 text-teal-800'
                          : appt.status === 'CANCELLED' || appt.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : appt.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : appt.status === 'PENDING_ASSISTANT_APPROVAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                          {appt.status === 'COMPLETED'
                            ? 'Completed'
                            : appt.status === 'CANCELLED'
                              ? 'Cancelled'
                              : appt.status === 'REJECTED'
                                ? 'Rejected'
                                : appt.status === 'CONFIRMED'
                                  ? 'Confirmed'
                                  : appt.status === 'PENDING_ASSISTANT_APPROVAL'
                                    ? 'Pending Approval'
                                    : appt.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        {appt.specialty || 'General OPD'} &middot; {formatVisitDate(appt.slot_start || appt.created_at)}
                      </p>
                      <span className="text-[10px] font-mono font-semibold text-slate-400 block mt-0.5">
                        Slip: #{appt.slip_number} &middot; Queue #{parseQueueNumberFromSlip(appt.slip_number, appt.token_number)}
                      </span>
                    </div>
                    {isSelected ? (
                      <span className="w-6 h-6 rounded-full bg-[#0f766e] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-xs">
                        ✓
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center">
                        View <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Appointment status card & timeline — only shown when appointment matches! */}
        {appointment && (() => {
          const isCompleted = appointment.status?.toUpperCase() === 'COMPLETED';
          const isCancelledOrRejected = appointment.status?.toUpperCase() === 'CANCELLED' || appointment.status?.toUpperCase() === 'REJECTED';
          const isPending = appointment.status?.toUpperCase() === 'PENDING_ASSISTANT_APPROVAL' || appointment.status?.toUpperCase() === 'PENDING';
          const displayDoctor = appointment.doctor_name
            ? (appointment.doctor_name.toLowerCase().startsWith('dr') ? appointment.doctor_name : `Dr. ${appointment.doctor_name}`)
            : 'your doctor';
          const displayDate = appointment.slot_date || formatVisitDate(appointment.slot_start || appointment.created_at);
          const displayTime = appointment.slot_time || formatVisitTime(appointment.slot_start || appointment.created_at);

          return (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Appointment status</h3>
                <RealtimeLive />
              </div>

              {/* Status banner: Shows completed message if status is COMPLETED, else shows queue position banner */}
              {isCompleted ? (
                <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-emerald-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Consultation Completed
                    </span>
                    <span className="text-xs text-emerald-300 font-medium">Archived Visit</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <h4 className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      You have completed your appointment
                    </h4>
                    <p className="text-sm text-emerald-100/90 leading-relaxed font-medium">
                      You have completed your appointment with <span className="font-bold text-white">{displayDoctor}</span> on <span className="font-bold text-white">{displayDate}</span> at <span className="font-bold text-white">{displayTime}</span>.
                    </p>
                  </div>
                  <p className="text-xs text-emerald-200/80 leading-relaxed border-t border-white/10 pt-3 flex items-center justify-between">
                    <span>Clinic: {appointment.clinic_address || 'D.I. Khan Care Clinic'}</span>
                    <span className="font-mono text-emerald-300 font-semibold">Slip #{appointment.slip_number}</span>
                  </p>
                </div>
              ) : isCancelledOrRejected ? (
                <div className="bg-gradient-to-br from-rose-950 via-slate-900 to-red-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden border border-rose-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 flex items-center gap-1.5 shadow-sm">
                      <XCircle className="w-3.5 h-3.5 text-rose-700" /> {appointment.status === 'REJECTED' ? 'Appointment Rejected' : 'Appointment Cancelled'}
                    </span>
                    <span className="text-xs text-rose-300 font-medium">Status Notice</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <h4 className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {appointment.status === 'REJECTED'
                        ? 'Your appointment has been rejected'
                        : 'Your appointment has been cancelled'}
                    </h4>
                    <p className="text-sm text-rose-100/90 leading-relaxed font-medium">
                      Your appointment with <span className="font-bold text-white">{displayDoctor}</span> {appointment.status === 'REJECTED' ? 'has been rejected' : 'has been cancelled'}{appointment.slot_start ? ` for ${displayDate} at ${displayTime}` : ''}.
                    </p>
                    {appointment.notes && (
                      <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-rose-200/90 leading-relaxed">
                        <strong className="text-white">Reason from clinic: </strong>
                        {appointment.notes}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-rose-200/80 leading-relaxed border-t border-white/10 pt-3 flex items-center justify-between">
                    <span>Clinic: {appointment.clinic_address || 'D.I. Khan Care Clinic'}</span>
                    <span className="font-mono text-rose-300 font-semibold">Slip #{appointment.slip_number}</span>
                  </p>
                </div>
              ) : isPending ? (
                <div className="bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden border border-amber-500/40">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 flex items-center gap-1.5 shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-amber-800 animate-spin" /> Pending Assistant Approval
                    </span>
                    <span className="text-xs text-amber-300 font-medium">Under Review</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <h4 className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Assistant has not checked your request yet
                    </h4>
                    <p className="text-sm text-amber-100/95 leading-relaxed font-medium">
                      Try again later. The clinic assistant has not checked your request yet. Please try after some time, or when the assistant approves your request, you will receive a message on your number{appointment.patient_phone ? ` (${appointment.patient_phone})` : ''}.
                    </p>
                  </div>
                  <p className="text-xs text-amber-200/80 leading-relaxed border-t border-white/10 pt-3 flex items-center justify-between">
                    <span>Doctor: {displayDoctor} &middot; {displayDate} at {displayTime}</span>
                    <span className="font-mono text-amber-300 font-semibold">Slip #{appointment.slip_number}</span>
                  </p>
                </div>
              ) : (
                <div className="bg-[#0c3b37] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900">
                      Confirmed
                    </span>
                    <span className="text-xs text-emerald-200/80">Live Status</span>
                  </div>
                  <div className="flex items-baseline gap-4 mb-4">
                    <span className="text-5xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {parseQueueNumberFromSlip(appointment.slip_number, appointment.token_number)}
                    </span>
                    <div>
                      <p className="font-bold text-white text-base">Your queue position</p>
                      <p className="text-xs text-emerald-200/80">
                        Confirmed visit &middot; Please arrive 15 mins before time
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-100/90 leading-relaxed border-t border-white/10 pt-3">
                    Please arrive at the clinic desk before your time slot. Show your slip to receptionist.
                  </p>
                </div>
              )}

              {/* Digital Slip white card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                      DIGITAL APPOINTMENT SLIP
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {appointment.slip_number}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 border rounded-full text-[11px] font-semibold ${isCompleted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : isCancelledOrRejected
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : isPending
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                    {isCompleted
                      ? 'Completed'
                      : appointment.status === 'CANCELLED'
                        ? 'Cancelled'
                        : appointment.status === 'REJECTED'
                          ? 'Rejected'
                          : isPending
                            ? 'Pending Desk Approval'
                            : 'Approved & Issued'}
                  </span>
                </div>

                <div>
                  <h4 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {appointment.patient_name || 'Patient'}
                  </h4>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{displayDoctor}</p>
                  <p className="text-xs text-slate-500">{appointment.specialty || 'General OPD'} &middot; {appointment.clinic_address || 'D.I. Khan Care Clinic'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-slate-400 text-[11px]">Visit date</p>
                    <p className="font-semibold text-slate-800">
                      {displayDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Time &middot; PKT</p>
                    <p className="font-semibold text-slate-800">
                      {displayTime}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 text-[11px]">{appointment.clinic_address || 'Clinic 4, Circular Road, D.I. Khan'}</p>
                  </div>
                </div>

                {appointment.has_loyalty_discount && (
                  <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border-2 border-amber-400/80 rounded-2xl p-4 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💳</span>
                      <h5 className="font-extrabold text-amber-950 text-sm">
                        {appointment.status === 'CONFIRMED' || appointment.status === 'COMPLETED'
                          ? 'VIP Golden Loyalty Card &bull; Approved!'
                          : 'VIP Golden Loyalty Card &bull; Application Pending Assistant Approval'}
                      </h5>
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed font-medium">
                      {appointment.status === 'CONFIRMED' || appointment.status === 'COMPLETED'
                        ? 'Your Golden VIP Loyalty Card has been verified and approved! Please collect your physical Golden VIP Loyalty Card directly from the clinic reception counter upon arrival.'
                        : 'Your loyalty application details have been submitted. The assistant desk will review and verify your details upon appointment confirmation.'}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-amber-300/40 text-xs">
                      <span className="text-amber-950 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                        <strong>Pickup:</strong> {appointment.clinic_address || 'Clinic Reception, D.I. Khan'}
                      </span>
                      {appointment.google_maps_url && (
                        <a
                          href={appointment.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 hover:text-amber-950 underline"
                        >
                          Open in Google Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {formatCurrency(appointment.fee_amount || 1000)}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${appointment.payment_status === 'PAID'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                    {appointment.payment_status === 'PAID' ? 'Paid' : 'Pending cash'}
                  </span>
                </div>

                {isCompleted ? (
                  <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-900 leading-relaxed">
                    <strong className="block mb-1">✓ Consultation Concluded</strong>
                    You have completed your appointment with {displayDoctor} on {displayDate} at {displayTime}.
                  </div>
                ) : isCancelledOrRejected ? (
                  <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 leading-relaxed">
                    <strong className="block mb-1 flex items-center gap-1.5 font-bold">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" /> Appointment {appointment.status === 'REJECTED' ? 'Rejected' : 'Cancelled'}
                    </strong>
                    Your appointment with {displayDoctor} has been {appointment.status === 'REJECTED' ? 'rejected' : 'cancelled'}.
                    {appointment.notes && (
                      <span className="block mt-1 text-rose-700 font-medium">Reason: {appointment.notes}</span>
                    )}
                    <span className="block mt-1 text-slate-500">Please book a new appointment if you still require medical consultation.</span>
                  </div>
                ) : isPending ? (
                  <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed space-y-1">
                    <strong className="block mb-1 flex items-center gap-1.5 font-bold text-amber-950">
                      <Clock className="w-3.5 h-3.5 text-amber-700" /> Pending Assistant Approval
                    </strong>
                    <p>
                      Try again later. The clinic assistant has not checked your request yet. Please try after some time, or when the assistant approves your request, you will receive a message on your number.
                    </p>
                  </div>
                ) : (
                  <div className="bg-clinic-50/80 border border-clinic-100 rounded-xl p-3.5 text-xs text-clinic-900 leading-relaxed">
                    <strong className="block mb-1">Pay cash at clinic reception</strong>
                    Show this slip on arrival. The receptionist will mark it Paid after collecting your consultation fee.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-3.5 h-3.5" /> Save / print digital slip
                </button>
              </div>

              {/* Visit timeline */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Visit timeline
                </h4>
                <div className="space-y-4">
                  {(appointment.status === 'CANCELLED' || appointment.status === 'REJECTED') ? (
                    [
                      {
                        title: 'Slot requested',
                        sub: 'Reservation submitted by patient',
                        done: true,
                        isError: false
                      },
                      {
                        title: appointment.status === 'REJECTED' ? 'Assistant Review: Rejected' : 'Appointment Cancelled',
                        sub: appointment.notes || (appointment.status === 'REJECTED' ? 'Rejected by clinic receptionist' : 'Appointment cancelled by assistant'),
                        done: true,
                        isError: true
                      }
                    ].map((step, idx) => (
                      <div key={step.title} className="flex items-start gap-3 relative">
                        {idx < 1 && <div className="absolute left-2.5 top-5 w-0.5 h-6 bg-rose-200" />}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${step.isError
                          ? 'border-2 border-rose-500 bg-rose-50 text-rose-600'
                          : 'border-2 border-clinic-600 bg-white text-clinic-700'
                          }`}>
                          {step.isError ? <span className="w-2 h-2 rounded-full bg-rose-600" /> : <span className="w-2 h-2 rounded-full bg-clinic-600" />}
                        </div>
                        <div>
                          <p className={`text-xs font-bold leading-none ${step.isError ? 'text-rose-700' : 'text-slate-800'}`}>
                            {step.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">{step.sub}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    [
                      {
                        title: 'Slot held',
                        sub: 'Temporary reservation complete',
                        done: true,
                        active: false
                      },
                      {
                        title: 'Pending assistant approval',
                        sub: isPending
                          ? 'Try again later · Assistant has not checked request yet'
                          : 'Assistant review verified',
                        done: !isPending,
                        active: isPending
                      },
                      {
                        title: 'Confirmed',
                        sub: appointment.status === 'CONFIRMED' || isCompleted
                          ? 'Digital slip issued'
                          : 'Awaiting assistant approval',
                        done: appointment.status === 'CONFIRMED' || isCompleted,
                        active: false
                      },
                      {
                        title: 'In progress',
                        sub: 'Doctor consultation',
                        done: isCompleted,
                        active: appointment.status === 'IN_CONSULTATION'
                      },
                      {
                        title: 'Completed',
                        sub: 'Consultation concluded',
                        done: isCompleted,
                        active: false
                      },
                    ].map((step, idx) => (
                      <div key={step.title} className="flex items-start gap-3 relative">
                        {idx < 4 && <div className={`absolute left-2.5 top-5 w-0.5 h-6 ${step.done ? 'bg-clinic-600' : 'bg-slate-200'}`} />}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${step.done ? 'border-2 border-clinic-600 bg-white text-clinic-700' :
                          step.active ? 'border-2 border-amber-500 bg-white text-amber-600' :
                            'border-2 border-slate-200 bg-white text-slate-200'
                          }`}>
                          {step.done ? <span className="w-2 h-2 rounded-full bg-clinic-600" /> : step.active ? <span className="w-2 h-2 rounded-full bg-amber-500" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                        </div>
                        <div>
                          <p className={`text-xs font-bold leading-none ${step.done ? 'text-slate-800' : step.active ? 'text-amber-800' : 'text-slate-400'}`}>
                            {step.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1" dangerouslySetInnerHTML={{ __html: step.sub }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Clinic directions button */}
              <button
                type="button"
                onClick={() => window.open('https://maps.google.com/?q=Dera+Ismail+Khan+Circular+Road', '_blank')}
                className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-300 text-clinic-700 font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <MapPin className="w-3.5 h-3.5" /> Clinic directions
              </button>

              <button
                type="button"
                onClick={onBackToDirectory}
                className="w-full py-2.5 text-slate-500 hover:text-slate-700 text-xs font-medium"
              >
                &larr; Back to find a doctor
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}


function DoctorProfileModal({
  doctor,
  onClose,
  onBook,
  allDoctors,
  onSelectDoctor
}: {
  doctor: DoctorData;
  onClose: () => void;
  onBook: () => void;
  allDoctors: DoctorData[];
  onSelectDoctor: (doc: DoctorData) => void;
}) {
  const [activeTab, setActiveTab] = useState<'reviews' | 'services' | 'education' | 'timings' | 'faqs'>('reviews');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const getSpecialtyServices = (spec: string) => {
    const s = spec.toLowerCase();
    if (s.includes('cardio')) {
      return {
        services: ['ECG & Echocardiography', 'Hypertension & BP Control', 'Chest Pain Evaluation', 'Heart Failure Management', 'Preventive Cardiology', 'Lipid & Cholesterol Management'],
        conditions: ['High Blood Pressure (Hypertension)', 'Coronary Artery Disease', 'Heart Palpitations', 'High Cholesterol', 'Shortness of Breath', 'Angina Pectoris']
      };
    } else if (s.includes('derma') || s.includes('skin')) {
      return {
        services: ['Acne & Scar Treatment', 'Hair Loss & PRP Therapy', 'Laser Skin Resurfacing', 'Eczema & Psoriasis Care', 'Anti-Aging & Skin Rejuvenation', 'Pigmentation & Melasma Therapy'],
        conditions: ['Acne Vulgaris', 'Alopecia & Hair Thinning', 'Eczema & Dermatitis', 'Fungal Skin Infections', 'Psoriasis', 'Skin Allergies']
      };
    } else if (s.includes('dent') || s.includes('teeth')) {
      return {
        services: ['Teeth Cleaning & Polishing', 'Root Canal Treatment (RCT)', 'Dental Crowns & Bridges', 'Tooth Extractions', 'Teeth Whitening', 'Dental Implants Consultation'],
        conditions: ['Tooth Decay & Cavities', 'Gum Disease & Bleeding', 'Toothache & Sensitivity', 'Misaligned Teeth', 'Impacted Wisdom Teeth', 'Oral Infections']
      };
    } else if (s.includes('gynaec') || s.includes('obstet') || s.includes('women')) {
      return {
        services: ['Antenatal & Postnatal Care', 'High-Risk Pregnancy Management', 'PCOS / PCOD Treatment', 'Infertility Evaluation', 'Gynecological Ultrasound', 'Menstrual Disorder Care'],
        conditions: ['PCOS / PCOD', 'High-Risk Pregnancy', 'Infertility', 'Menstrual Irregularities', 'Pelvic Infections', 'Uterine Fibroids']
      };
    } else if (s.includes('laparo') || s.includes('lapro')) {
      return {
        services: ['Diagnostic Laparoscopy', 'Laparoscopic Cholecystectomy (Gallbladder)', 'Laparoscopic Appendectomy', 'Minimally Invasive Hernia Repair', 'Laparoscopic Cyst Removal', 'Post-Op Laparoscopic Follow-up'],
        conditions: ['Gallstones & Cholecystitis', 'Appendicitis', 'Abdominal & Inguinal Hernia', 'Abdominal Adhesions', 'Ovarian & Pelvic Cysts', 'Acute Abdominal Pain']
      };
    } else if (s.includes('aesthet') || s.includes('asthet') || s.includes('face')) {
      return {
        services: ['Facial Contouring & Reshaping', 'Rhinoplasty (Nose Reshaping)', 'Blepharoplasty (Eyelid Surgery)', 'Facelift & Neck Lift Consultation', 'Scar Revision & Facial Reconstruction', 'Botox, Fillers & Facial Rejuvenation'],
        conditions: ['Facial Trauma & Scarring', 'Nasal Deformities & Deviations', 'Sagging Facial Skin & Wrinkles', 'Ptosis & Drooping Eyelids', 'Facial Asymmetry', 'Post-Burn & Post-Excision Reconstruction']
      };
    } else if (s.includes('surgeon') || s.includes('surgery')) {
      return {
        services: ['Minor & Major General Surgery', 'Hernia Repair (Open/Mesh)', 'Appendectomy & Bowel Surgery', 'Wound Debridement & Abscess Drainage', 'Lipoma & Cyst Excision', 'Surgical OPD & Post-Operative Care'],
        conditions: ['Inguinal & Ventral Hernia', 'Acute Appendicitis', 'Skin Cysts, Lipomas & Tumors', 'Soft Tissue Infections & Abscesses', 'Gallbladder & Biliary Conditions', 'Surgical Wound Complications']
      };
    } else {
      return {
        services: ['General Health Checkup', 'Diabetes & Sugar Management', 'Fever & Infection Care', 'Blood Pressure Monitoring', 'Gastric & Acidity Treatment', 'Routine Physical Examination'],
        conditions: ['Type 2 Diabetes', 'Hypertension', 'Seasonal Typhoid & Dengue', 'Digestive & Gastric Issues', 'Respiratory Infections', 'General Weakness & Deficiency']
      };
    }
  };

  const dynamicInfo = getSpecialtyServices(doctor.specialty);

  const googleMapsUrl = doctor.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.full_name + ' ' + doctor.clinic_address + ' ' + doctor.sub_region + ' D.I. Khan')}`;

  const reviewsList = [
    {
      author: "Hira M.",
      timeAgo: "8 days ago",
      comment: "Doc was so nice and humble. It was great experience. Diagnosed the exact issue in first visit!"
    },
    {
      author: "Esha K.",
      timeAgo: "8 days ago",
      comment: "Good experience overall. Clinic staff was well mannered and the doctor listened very attentively."
    },
    {
      author: "Muhammad Usman",
      timeAgo: "12 days ago",
      comment: "Highly recommended specialist in D.I. Khan! Proper time given and clear medicine instructions."
    },
    {
      author: "Dr. Farhan Ali (Patient relative)",
      timeAgo: "2 weeks ago",
      comment: "Very impressive clinical diagnosis. Fee structure is reasonable compared to high quality care."
    }
  ];

  const faqs = [
    {
      q: `What is the fee of ${doctor.full_name} & how do I pay?`,
      a: `The consultation fee for ${doctor.full_name} is Rs. ${doctor.fee_clinic}. You pay directly in cash at the clinic assistant desk upon your arrival.`
    },
    {
      q: `Where does ${doctor.full_name} practice & what are the clinic timings?`,
      a: `${doctor.full_name} practices at ${doctor.clinic_address}, ${doctor.sub_region}, D.I. Khan. OPD shift is ${doctor.shift} (Monday through Saturday).`
    },
    {
      q: `How do I book an appointment with ${doctor.full_name}?`,
      a: `Click "Book Clinic Visit", select any available time slot on D.I. Khan Health Desk, enter your phone number, and confirm via instant SMS/Dev OTP code.`
    },
    {
      q: `Is ${doctor.full_name} verified by PMDC?`,
      a: `Yes! ${doctor.full_name} is verified by PMDC (Pakistan Medical & Dental Council) and registered with the D.I. Khan Health Authority.`
    }
  ];

  const similarDocs = allDoctors.filter(d => d.id !== doctor.id).slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Bar */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-400">
            <Stethoscope className="w-4 h-4" /> D.I. Khan Verified Doctor Profile
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6 sm:space-y-8">

          {/* Main Hero Doctor Info Header */}
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-lg border-2 border-teal-400/40 flex-shrink-0 bg-slate-800">
                  <img
                    src={getDoctorProfileImage(doctor, 200)}
                    alt={doctor.full_name}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                      const fallback = (e.target as HTMLElement).nextElementSibling;
                      if (fallback) (fallback as HTMLElement).style.display = 'flex';
                    }}
                  />
                  <div
                    style={{ display: 'none' }}
                    className="w-full h-full bg-gradient-to-tr from-teal-500 to-teal-300 text-slate-950 font-black text-2xl flex items-center justify-center"
                  >
                    {doctor.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{doctor.full_name}</h2>
                    {doctor.verification_status === 'verified' && (
                      <span className="bg-teal-500/20 border border-teal-400/40 text-teal-300 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-400" /> PMDC Verified
                      </span>
                    )}
                  </div>
                  <p className="text-teal-300 font-semibold text-xs sm:text-sm mb-2">{doctor.specialty} Specialist</p>

                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs text-slate-300 mb-3">
                    <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px] sm:text-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> 4.9 (128 Reviews)
                    </span>
                    <span className="flex items-center gap-1 text-[11px] sm:text-xs">
                      <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400" /> M.B.B.S, F.C.P.S ({doctor.specialty})
                    </span>
                    <span className="flex items-center gap-1 text-[11px] sm:text-xs">
                      <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400" /> 10+ Years Experience
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                    <span>{doctor.clinic_address} ({doctor.sub_region}, D.I. Khan)</span>
                  </div>

                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-teal-200 hover:text-white font-semibold bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 px-3 py-1.5 rounded-xl transition-all w-fit"
                  >
                    <MapPin className="w-3.5 h-3.5 text-teal-300" />
                    Open Location on Google Maps
                    <ExternalLink className="w-3 h-3 text-teal-300 ml-0.5" />
                  </a>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-xl flex flex-col gap-2 min-w-[200px]">
                {Boolean(doctor.loyalty_card_enabled) && doctor.loyalty_card_image_url && (
                  <div className="mb-2 p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-400/10 border border-amber-400/40 flex items-center gap-2">
                    <img src={doctor.loyalty_card_image_url} alt="Loyalty Card" className="w-10 h-7 object-cover rounded-md border border-amber-400/60" />
                    <div>
                      <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">{doctor.loyalty_card_title || 'VIP Loyalty Card'}</div>
                      <div className="text-[11px] font-extrabold text-white">{Number(doctor.loyalty_discount_percent ?? 20)}% Fee Discount</div>
                    </div>
                  </div>
                )}
                <div className="text-xs text-slate-400">Consultation Fee</div>
                <div className="text-2xl font-extrabold text-teal-300">{formatCurrency(doctor.fee_clinic)}</div>
                <button
                  onClick={onBook}
                  className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" /> Book Clinic Visit
                </button>
              </div>
            </div>
          </div>

          {/* Oladoc Sub-Navigation Tabs — Horizontal Swipeable on Mobile */}
          <div className="border-b border-slate-200 flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pb-1 flex-nowrap touch-scroll text-xs sm:text-sm font-semibold -mx-1 px-1 sm:mx-0 sm:px-0">
            {[
              { id: 'reviews', label: 'Reviews (128)', icon: Star },
              { id: 'services', label: 'Services & Conditions', icon: Stethoscope },
              { id: 'education', label: 'Education & Credentials', icon: GraduationCap },
              { id: 'timings', label: 'Clinic Timings', icon: Clock },
              { id: 'faqs', label: 'FAQs', icon: HelpCircle }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-2.5 px-3 sm:px-4 flex items-center gap-1.5 sm:gap-2 border-b-2 whitespace-nowrap flex-shrink-0 transition-all cursor-pointer ${isActive
                    ? 'border-teal-700 text-teal-800 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Content Grid: Left Content + Sticky Right Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left 2 Columns: Dynamic Tab Content */}
            <div className="lg:col-span-2 space-y-6">

              {/* TAB 1: REVIEWS */}
              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Satisfaction Banner */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                      98%
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">98% Satisfied Patients</h4>
                      <p className="text-xs text-slate-600">Based on 128 verified patient consultations in D.I. Khan</p>
                    </div>
                  </div>

                  {/* Patient Review Cards */}
                  <div className="space-y-4">
                    {reviewsList.map((rev, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg w-fit">
                          <ThumbsUp className="w-3.5 h-3.5 text-emerald-700" /> I recommend the doctor
                        </div>
                        <p className="text-slate-800 text-sm italic font-medium">"{rev.comment}"</p>
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Verified Patient {rev.author}
                          </span>
                          <span>{rev.timeAgo}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 rounded-xl text-xs transition-colors shadow-2xs">
                    Load More Patient Reviews
                  </button>
                </div>
              )}

              {/* TAB 2: SERVICES & CONDITIONS */}
              {activeTab === 'services' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-teal-700" /> Services Offered
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {dynamicInfo.services.map((srv, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800">
                          <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                          <span>{srv}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-teal-700" /> Conditions Treated
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {dynamicInfo.conditions.map((cond, i) => (
                        <div key={i} className="flex items-center gap-2 bg-teal-50/60 border border-teal-100 p-3 rounded-xl text-xs font-semibold text-teal-950">
                          <span className="w-2 h-2 rounded-full bg-teal-600 flex-shrink-0"></span>
                          <span>{cond}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: EDUCATION & EXPERIENCE */}
              {activeTab === 'education' && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-teal-700" /> Degrees & Qualifications
                    </h3>
                    <ul className="space-y-3 text-xs text-slate-700">
                      {(doctor.qualification || 'MBBS, FCPS').split(',').map((deg: string, dIdx: number) => {
                        const trimmed = deg.trim();
                        if (!trimmed) return null;
                        const isFcps = trimmed.toUpperCase().includes('FCPS');
                        const isMbbs = trimmed.toUpperCase().includes('MBBS');
                        const isMcps = trimmed.toUpperCase().includes('MCPS');
                        const title = isMbbs
                          ? 'Bachelor of Medicine, Bachelor of Surgery (M.B.B.S)'
                          : isFcps
                            ? 'Fellowship of College of Physicians & Surgeons (F.C.P.S)'
                            : isMcps
                              ? 'Membership of College of Physicians & Surgeons (M.C.P.S)'
                              : `${trimmed} Degree / Qualification`;
                        const institute = isMbbs
                          ? 'Khyber Medical University — PMDC Verified'
                          : isFcps || isMcps
                            ? `Specialized in ${doctor.specialty} — CPSP Pakistan`
                            : 'PMDC & Health Commission Verified Medical Qualification';
                        return (
                          <li key={dIdx} className="flex items-start gap-3">
                            <div className="px-2.5 h-8 rounded-lg bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs flex-shrink-0 font-mono">
                              {trimmed}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{title}</div>
                              <div className="text-slate-500">{institute}</div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-teal-700" /> Hospital Affiliations & Experience
                    </h3>
                    <div className="space-y-2 text-xs text-slate-700">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="font-bold text-slate-900">Senior Specialist & OPD Consultant</div>
                        <div className="text-slate-500">DHQ Hospital D.I. Khan & Private Clinic Desk</div>
                        <div className="text-teal-700 font-semibold mt-1">10+ Years Active Practice</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CLINIC TIMINGS & SCHEDULE TABLE (OLADOC FORMAT) */}
              {activeTab === 'timings' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-teal-700" /> Clinic OPD Schedule
                  </h3>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3.5">Day</th>
                          <th className="p-3.5">Shift Timings</th>
                          <th className="p-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, idx) => {
                          const isEvening = doctor.shift === 'EVENING';
                          const timeText = day === 'Sunday'
                            ? '11:00 AM - 02:00 PM (Emergency)'
                            : isEvening
                              ? '05:00 PM - 09:00 PM'
                              : '09:00 AM - 01:00 PM';
                          return (
                            <tr key={idx} className={day === 'Sunday' ? 'bg-amber-50/40' : 'bg-white hover:bg-slate-50'}>
                              <td className="p-3.5 font-bold text-slate-900">{day}</td>
                              <td className="p-3.5 font-semibold text-teal-800">{timeText}</td>
                              <td className="p-3.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${day === 'Sunday' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                  {day === 'Sunday' ? 'On-Call' : 'Available'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: FAQS */}
              {activeTab === 'faqs' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-teal-700" /> Frequently Asked Questions
                  </h3>

                  <div className="space-y-3">
                    {faqs.map((faq, i) => (
                      <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        <button
                          onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                          className="w-full p-4 text-left font-bold text-xs text-slate-900 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <span>{faq.q}</span>
                          {openFaqIndex === i ? (
                            <ChevronUp className="w-4 h-4 text-teal-700 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                        </button>
                        {openFaqIndex === i && (
                          <div className="px-4 pb-4 text-xs text-slate-600 border-t border-slate-100 pt-2 leading-relaxed bg-slate-50/50">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Sticky Oladoc Booking Card */}
            <div className="space-y-6">
              <div className="bg-white border-2 border-teal-600 rounded-2xl p-6 shadow-xl sticky top-4 space-y-5">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200">
                  <Building2 className="w-4 h-4 text-teal-700" /> Direct Clinic Consultation
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-slate-500 font-medium">Consultation Fee</div>
                  <div className="text-3xl font-black text-slate-900">
                    {formatCurrency(doctor.fee_clinic)}
                  </div>
                </div>

                <div className="space-y-2 text-xs border-t border-b border-slate-100 py-3">
                  <div className="flex items-start gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="block text-slate-900">{doctor.clinic_address}</strong>
                      <span className="text-slate-500">{doctor.sub_region}, D.I. Khan</span>
                    </div>
                  </div>

                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-teal-50 text-teal-800 font-semibold border border-slate-200 hover:border-teal-300 rounded-xl text-xs transition-colors w-full mt-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    Open Location on Google Maps
                    <ExternalLink className="w-3 h-3 text-teal-600" />
                  </a>

                  {(() => {
                    const modalAvail = getDoctorAvailability(doctor);
                    return (
                      <div className={`flex items-center justify-between font-semibold p-2.5 rounded-xl mt-2 border text-xs ${modalAvail.todayBadgeClass}`}>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${modalAvail.isAvailableToday ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                          <span>{modalAvail.todayBadgeText}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 ml-2 whitespace-nowrap">{modalAvail.nextSlotText}</span>
                      </div>
                    );
                  })()}
                </div>

                <button
                  onClick={onBook}
                  className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Book Clinic Appointment
                </button>

                <div className="space-y-2 pt-2 text-[11px] text-slate-500 font-medium">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-3.5 h-3.5 text-teal-600" /> Priority customer & clinic support
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-teal-600" /> 100% verified & secure queue booking
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-teal-600" /> Instant SMS / Dev OTP verification
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Similar Doctors & Top Specialties Section */}
          <div className="pt-8 border-t border-slate-200 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-teal-700" /> Similar Doctors in D.I. Khan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {similarDocs.map(simDoc => (
                  <div
                    key={simDoc.id}
                    onClick={() => onSelectDoctor(simDoc)}
                    className="p-4 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-2xl cursor-pointer transition-all shadow-2xs group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs mb-2">
                      {simDoc.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="font-bold text-xs text-slate-900 group-hover:text-teal-800 transition-colors">
                      {simDoc.full_name}
                    </div>
                    <div className="text-[11px] text-teal-700 font-medium mb-1">
                      {simDoc.specialty}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatCurrency(simDoc.fee_clinic)} • {simDoc.sub_region}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 mb-3">Top Specialties in D.I. Khan</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {['General Physician', 'General Surgeon', 'Laparoscopic Surgeon', 'Face Aesthetic Surgeon', 'Cardiologist', 'Dermatologist', 'Gynecologist', 'Pediatrician', 'ENT Specialist', 'Orthopedic Surgeon', 'Eye Specialist', 'Dentist'].map((spec, i) => (
                  <span key={i} className="px-3 py-1.5 bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-900 rounded-xl border border-slate-200 font-medium cursor-pointer transition-colors">
                    {spec} in D.I. Khan
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Sticky Mobile Book CTA Bar */}
        <div className="md:hidden sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shadow-lg z-20">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Fee</span>
            <span className="text-base font-extrabold text-teal-800 font-mono">{formatCurrency(doctor.fee_clinic)}</span>
          </div>
          <button
            onClick={onBook}
            className="flex-1 py-2.5 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-white" />
            <span>Book Clinic Visit &rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════════════
// ── Dedicated Full-Page View Doctor Profile & Book Appointment View ──
// ══════════════════════════════════════════════════════════════════════════════════════
// Client-side transient slot cache (2 minutes TTL) to make profile switching instant
const clientSlotCache: Record<string, { timestamp: number; slots: SlotData[] }> = {};
function DoctorProfileAndBookingView({
  doctor,
  onBack,
  onTrackNav,
  onSwitchRole
}: {
  doctor: DoctorData;
  onBack: () => void;
  onTrackNav: () => void;
  onSwitchRole?: (r: 'patient' | 'assistant' | 'doctor' | 'admin') => void;
}) {
  const [selectedDayDate, setSelectedDayDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('10:30 AM');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [bookingFor, setBookingFor] = useState<'myself' | 'someone_else'>('myself');
  const [patientName, setPatientName] = useState('Ahmed Khan');
  const [patientPhone, setPatientPhone] = useState('+92 300 123 4567');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientAge, setPatientAge] = useState('34 years');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientReason, setPatientReason] = useState('Follow-up for blood pressure and a review of my current medication.');
  const [sendSmsReminder, setSendSmsReminder] = useState(true);

  // VIP Loyalty Card states
  const [applyLoyaltyCard, setApplyLoyaltyCard] = useState<boolean>(false);
  // Mobile tab navigation state ('booking' | 'profile')
  const [mobileActiveTab, setMobileActiveTab] = useState<'booking' | 'profile'>('booking');
  const [loyaltyGuardianName, setLoyaltyGuardianName] = useState<string>('');
  const [loyaltyDob, setLoyaltyDob] = useState<string>('1992-05-15');
  const [loyaltyGender, setLoyaltyGender] = useState<string>('Male');
  const [loyaltyCnic, setLoyaltyCnic] = useState<string>('');
  const [loyaltyMobile, setLoyaltyMobile] = useState<string>('');
  const [loyaltyWhatsapp, setLoyaltyWhatsapp] = useState<string>('');
  const [loyaltyEmail, setLoyaltyEmail] = useState<string>('');
  const [loyaltyAddress, setLoyaltyAddress] = useState<string>('Circular Road, Cantt');
  const [loyaltyCity, setLoyaltyCity] = useState<string>('Dera Ismail Khan');

  // ── Doctor Verified Reviews State ──
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviewModalView, setReviewModalView] = useState<'list' | 'write'>('list');
  const [reviewsSummary, setReviewsSummary] = useState<{
    average_rating: number;
    total_reviews: number;
    rating_breakdown?: Record<string, number>;
    reviews: Array<{
      id: string;
      patient_name: string;
      patient_phone: string;
      rating: number;
      comment: string;
      tags?: string;
      is_verified: boolean;
      created_at: string;
    }>;
  } | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Form State for Writing Review
  const [reviewIdentifier, setReviewIdentifier] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSelectedTags, setReviewSelectedTags] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');

  const fetchDoctorReviews = async () => {
    if (!doctor?.id) return;
    try {
      setLoadingReviews(true);
      const data = await apiFetch<any>(`/doctors/${doctor.id}/reviews`);
      setReviewsSummary(data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Eligibility check state
  const [eligibilityData, setEligibilityData] = useState<{
    can_review: boolean;
    message: string;
    completed_appointments: Array<{
      id: string;
      slip_number: string;
      patient_name: string;
      status: string;
      slot_date?: string;
      slot_time?: string;
      already_reviewed: boolean;
      existing_rating?: number;
      existing_comment?: string;
    }>;
    other_appointments_count: number;
    other_statuses: string[];
  } | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');

  const handleCheckEligibility = async (identToUse?: string) => {
    const ident = (identToUse || reviewIdentifier || patientPhone).trim();
    if (!ident) {
      setReviewError('Please enter your mobile number or digital slip # to verify bookings.');
      return;
    }
    setReviewError('');
    setIsCheckingEligibility(true);
    try {
      const data = await apiFetch<any>(`/doctors/${doctor.id}/check-eligibility?identifier=${encodeURIComponent(ident)}`);
      setEligibilityData(data);

      if (data.can_review && data.completed_appointments.length > 0) {
        // Auto-select the first completed appointment if none selected
        setSelectedAppointmentId(data.completed_appointments[0].id);
        if (data.completed_appointments[0].existing_rating) {
          setReviewRating(data.completed_appointments[0].existing_rating);
        }
        if (data.completed_appointments[0].existing_comment) {
          setReviewComment(data.completed_appointments[0].existing_comment);
        }
      } else {
        setSelectedAppointmentId('');
        if (!data.can_review) {
          setReviewError(data.message);
        }
      }
    } catch (err: any) {
      setReviewError(err.message || 'Could not verify appointment records.');
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  useEffect(() => {
    fetchDoctorReviews();

    // Auto-open review modal if ?review=1 or ?review=true is present in the URL
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isReviewPrompt = urlParams.get('review') === '1' || urlParams.get('review') === 'true';
      const slipParam = urlParams.get('slip') || urlParams.get('slip_number');
      const phoneParam = urlParams.get('phone');

      if (isReviewPrompt) {
        setShowReviewsModal(true);
        setReviewModalView('write');
        const identToFill = (slipParam || phoneParam || '').trim();
        if (identToFill) {
          setReviewIdentifier(identToFill);
          handleCheckEligibility(identToFill);
        }
      }
    } catch (_) { }
  }, [doctor?.id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccessMsg('');

    const cleanIdent = (reviewIdentifier || patientPhone).trim();
    if (!cleanIdent) {
      setReviewError('Please enter your mobile phone number or digital slip # to verify your completed appointment.');
      return;
    }
    if (!reviewComment.trim()) {
      setReviewError('Please write a brief feedback comment about your consultation.');
      return;
    }

    try {
      setIsSubmittingReview(true);
      await apiFetch<any>(`/doctors/${doctor.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          identifier: cleanIdent,
          appointment_id: selectedAppointmentId || undefined,
          rating: reviewRating,
          comment: reviewComment.trim(),
          tags: reviewSelectedTags.join(','),
        }),
      });

      setReviewSuccessMsg('Your verified patient review has been published successfully!');
      await fetchDoctorReviews();
      setTimeout(() => {
        setReviewModalView('list');
        setReviewSuccessMsg('');
        setReviewComment('');
        setReviewSelectedTags([]);
        setEligibilityData(null);
        setSelectedAppointmentId('');
      }, 1600);
    } catch (err: any) {
      setReviewError(err.message || 'Verification failed. Only patients with a completed consultation can mark a review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const [bookingState, setBookingState] = useState<'form' | 'otp' | 'confirmed'>('form');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedSlip, setConfirmedSlip] = useState<any>(null);

  const [availableSlots, setAvailableSlots] = useState<SlotData[]>([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(true);
  const [activeSlotId, setActiveSlotId] = useState<string>('');

  const normalizeIsoUtc = (iso?: string | null): string => {
    if (!iso) return '';
    if (iso.endsWith('Z') || iso.includes('+') || (iso.length > 10 && iso.slice(10).includes('-'))) {
      return iso;
    }
    return iso + 'Z';
  };

  const fmtTime = (iso: string, rawSlot?: SlotData | null) => {
    if (rawSlot?.start_time_fmt) return rawSlot.start_time_fmt;
    try {
      const d = new Date(normalizeIsoUtc(iso));
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return iso;
    }
  };

  // Current date string YYYY-MM-DD in Asia/Karachi (clinic local time)
  const todayPKT = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  // Group available slots by date string YYYY-MM-DD in Asia/Karachi (strictly FUTURE slots after 45 minutes of current time)
  const slotsByDate = useMemo(() => {
    const map: Record<string, SlotData[]> = {};
    const nowMs = Date.now();
    const fortyFiveMinsAheadMs = nowMs + 45 * 60 * 1000;
    const doctorOffDays = (doctor.off_days || 'sunday').split(',').map((s: string) => s.trim().toLowerCase());

    availableSlots.forEach(s => {
      if (!s.start_time) return;
      const d = new Date(normalizeIsoUtc(s.start_time));
      if (isNaN(d.getTime())) return;
      // Filter out slots starting within 45 minutes of the current time
      if (d.getTime() < fortyFiveMinsAheadMs) return;

      const dStr = s.slot_date || d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
      // Never include dates prior to today
      if (dStr < todayPKT) return;

      // Filter out doctor off days
      try {
        const [y, m, dayNum] = dStr.split('-').map(Number);
        const dayDt = new Date(y, m - 1, dayNum);
        const weekdayName = dayDt.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (doctorOffDays.includes(weekdayName)) {
          return;
        }
      } catch { }

      if (!map[dStr]) map[dStr] = [];
      map[dStr].push(s);
    });
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => new Date(normalizeIsoUtc(a.start_time)).getTime() - new Date(normalizeIsoUtc(b.start_time)).getTime());
    });
    return map;
  }, [availableSlots, todayPKT, doctor.off_days]);

  // Dynamic day options derived from doctor's actual slots (strictly TODAY & FUTURE days only)
  const dayOptions = useMemo(() => {
    const datesSet = new Set<string>();
    const slotDates = Object.keys(slotsByDate).sort();

    // The consecutive 7-day strip begins strictly from TODAY in PKT, never past dates
    const [ty, tm, td] = todayPKT.split('-').map(Number);
    const baseDate = new Date(ty, tm - 1, td);

    // Consecutive 7-day strip starting from today
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      if (dateStr >= todayPKT) {
        datesSet.add(dateStr);
      }
    }

    // Include any additional future dates that have generated slots
    slotDates.forEach(d => {
      if (d >= todayPKT) {
        datesSet.add(d);
      }
    });

    // Ensure all days are strictly >= todayPKT (never show days that have passed)
    const sortedDates = Array.from(datesSet).filter(d => d >= todayPKT).sort();
    const doctorOffDays = (doctor.off_days || 'sunday').split(',').map((s: string) => s.trim().toLowerCase());
    return sortedDates.map(dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const fullWeekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const label = dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
      const isOffDay = doctorOffDays.includes(fullWeekdayName);
      const count = isOffDay ? 0 : (slotsByDate[dateStr] || []).length;
      return {
        weekday,
        dayNum: d,
        fullDate: dateStr,
        monthName,
        label,
        slotCount: count,
        isOffDay
      };
    });
  }, [slotsByDate, todayPKT, doctor.off_days]);

  // Week offset state for multi-week calendar navigation
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedShiftTab, setSelectedShiftTab] = useState<'all' | 'morning' | 'evening'>(
    doctor.shift === 'MORNING' ? 'morning' : doctor.shift === 'EVENING' ? 'evening' : 'all'
  );

  // Synchronize selected day (auto-select first day with available future slots)
  useEffect(() => {
    if (dayOptions.length > 0) {
      const existing = dayOptions.find(d => d.fullDate === selectedDayDate);
      if (!existing || existing.fullDate < todayPKT || existing.slotCount === 0) {
        const firstWithSlots = dayOptions.find(d => d.slotCount > 0);
        setSelectedDayDate(firstWithSlots ? firstWithSlots.fullDate : (dayOptions[0] ? dayOptions[0].fullDate : ''));
      }
    }
  }, [dayOptions, todayPKT]);

  // Synchronize weekOffset when selectedDayDate changes
  useEffect(() => {
    if (!selectedDayDate || dayOptions.length === 0) return;
    const idx = dayOptions.findIndex(d => d.fullDate === selectedDayDate);
    if (idx !== -1) {
      const targetWeek = Math.floor(idx / 7);
      if (targetWeek !== weekOffset) {
        setWeekOffset(targetWeek);
      }
    }
  }, [selectedDayDate, dayOptions]);

  const totalWeeks = Math.max(1, Math.ceil(dayOptions.length / 7));
  const visibleDayOptions = useMemo(() => {
    const start = weekOffset * 7;
    return dayOptions.slice(start, start + 7);
  }, [dayOptions, weekOffset]);

  const selectedDayObj = useMemo(() => {
    return dayOptions.find(d => d.fullDate === selectedDayDate) || dayOptions[0] || {
      weekday: 'Mon',
      dayNum: 12,
      fullDate: '2026-10-12',
      monthName: 'October 2026',
      label: 'Monday, 12 Oct',
      slotCount: 0
    };
  }, [dayOptions, selectedDayDate]);

  // Dynamic consultation duration calculated from slots
  const consultationDurationMinutes = useMemo(() => {
    const currentSlots = slotsByDate[selectedDayDate] || [];
    if (currentSlots.length > 0) {
      const s = currentSlots[0];
      if (s.start_time && s.end_time) {
        const diffM = Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000);
        if (diffM > 0 && diffM <= 180) return diffM;
      }
    }
    return 20;
  }, [slotsByDate, selectedDayDate]);

  // Time slots for the currently selected day (ONLY REAL SLOTS from DB, no fake preview slots)
  const displaySlots = useMemo(() => {
    if (selectedDayObj?.isOffDay) {
      return [];
    }
    const currentSlots = slotsByDate[selectedDayDate] || [];
    return currentSlots.map(s => {
      let endTimeStr = s.end_time_fmt || '';
      if (!endTimeStr && s.end_time) {
        endTimeStr = fmtTime(s.end_time);
      }
      return {
        id: s.id,
        timeLabel: s.start_time_fmt || fmtTime(s.start_time, s),
        endTimeLabel: endTimeStr,
        isReal: true,
        rawSlot: s
      };
    });
  }, [selectedDayDate, slotsByDate, selectedDayObj]);

  // Morning vs Evening slot detector
  const isMorningSlot = (rawSlot: SlotData | null, timeLabel: string) => {
    if (rawSlot?.start_time_fmt) {
      const match = rawSlot.start_time_fmt.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const ap = match[3]?.toUpperCase();
        if (ap === 'PM' && h < 12) h += 12;
        if (ap === 'AM' && h === 12) h = 0;
        return h < 15;
      }
    }
    if (rawSlot && rawSlot.start_time) {
      try {
        const d = new Date(normalizeIsoUtc(rawSlot.start_time));
        const pktHourStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', hour12: false });
        const hr = parseInt(pktHourStr, 10);
        return hr < 15;
      } catch {
        // fallback
      }
    }
    return timeLabel.includes('AM');
  };

  const morningSlots = useMemo(() => {
    return displaySlots.filter(s => isMorningSlot(s.rawSlot, s.timeLabel));
  }, [displaySlots]);

  const eveningSlots = useMemo(() => {
    return displaySlots.filter(s => !isMorningSlot(s.rawSlot, s.timeLabel));
  }, [displaySlots]);

  const activeSlotsToDisplay = useMemo(() => {
    if (selectedShiftTab === 'morning') return morningSlots;
    if (selectedShiftTab === 'evening') return eveningSlots;
    return displaySlots;
  }, [selectedShiftTab, displaySlots, morningSlots, eveningSlots]);

  // Keep selected shift aligned with doctor shift and available slot times
  useEffect(() => {
    if (doctor.shift === 'MORNING' && morningSlots.length > 0) {
      setSelectedShiftTab('morning');
    } else if (doctor.shift === 'EVENING' && eveningSlots.length > 0) {
      setSelectedShiftTab('evening');
    } else if (morningSlots.length > 0 && eveningSlots.length === 0) {
      setSelectedShiftTab('morning');
    } else if (eveningSlots.length > 0 && morningSlots.length === 0) {
      setSelectedShiftTab('evening');
    }
  }, [selectedDayDate, morningSlots.length, eveningSlots.length, doctor.shift]);

  useEffect(() => {
    if (activeSlotsToDisplay.length > 0) {
      const match = activeSlotsToDisplay.find(s => s.id === selectedSlotId);
      if (!match) {
        setSelectedSlotId(activeSlotsToDisplay[0].id);
        setSelectedTimeSlot(activeSlotsToDisplay[0].timeLabel);
      }
    }
  }, [activeSlotsToDisplay]);

  useEffect(() => {
    let isCancelled = false;
    const loadSlots = async () => {
      try {
        const cached = clientSlotCache[doctor.id];
        if (cached && (Date.now() - cached.timestamp < 120000)) {
          const nowMs = Date.now();
          const fortyFiveMinsAheadMs = nowMs + 45 * 60 * 1000;
          const validSlots = cached.slots.filter(s => {
            if (!s.start_time) return false;
            const t = new Date(s.start_time).getTime();
            return !isNaN(t) && t >= fortyFiveMinsAheadMs;
          });
          setAvailableSlots(validSlots);
          setIsSlotsLoading(false);
          return;
        }

        setIsSlotsLoading(true);
        const slots = await apiFetch<SlotData[]>(`/doctors/${doctor.id}/slots`);
        if (Array.isArray(slots) && !isCancelled) {
          const nowMs = Date.now();
          const fortyFiveMinsAheadMs = nowMs + 45 * 60 * 1000;
          const validSlots = slots.filter(s => {
            if (!s.start_time) return false;
            const t = new Date(s.start_time).getTime();
            return !isNaN(t) && t >= fortyFiveMinsAheadMs;
          });
          clientSlotCache[doctor.id] = { timestamp: Date.now(), slots };
          setAvailableSlots(validSlots);
        }
      } catch (err) {
        console.warn('Slot load note:', err);
      } finally {
        if (!isCancelled) setIsSlotsLoading(false);
      }
    };
    loadSlots();
    return () => { isCancelled = true; };
  }, [doctor.id]);

  const handleStartBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const chosen = displaySlots.find(s => s.id === selectedSlotId) || activeSlotsToDisplay[0] || displaySlots[0];
      if (!chosen || !chosen.isReal || !chosen.rawSlot) {
        setErrorMessage('No consultation slot is available for this date. Please select a date with available slots.');
        setIsSubmitting(false);
        return;
      }
      const slotCodeToSubmit = chosen.id;

      if (!patientEmail.trim() || !patientEmail.includes('@')) {
        setErrorMessage('Please enter a valid email address to receive your digital appointment slip and notifications.');
        setIsSubmitting(false);
        return;
      }

      const isLoyaltyActiveForDoc = Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard;

      if (isLoyaltyActiveForDoc) {
        if (!loyaltyDob.trim()) {
          setErrorMessage('Date of Birth is required for VIP Loyalty Card verification.');
          setIsSubmitting(false);
          return;
        }
        if (!loyaltyAddress.trim()) {
          setErrorMessage('Residential Address is required for VIP Loyalty Card verification.');
          setIsSubmitting(false);
          return;
        }
      }

      const res: any = await apiFetch('/booking/request', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: doctor.id,
          slot_id: slotCodeToSubmit,
          full_name: patientName.trim() || 'Ahmed Khan',
          phone: patientPhone.trim() || '+92 300 123 4567',
          email: patientEmail.trim().toLowerCase(),
          whatsapp_number: (isLoyaltyActiveForDoc && loyaltyWhatsapp.trim()) ? loyaltyWhatsapp.trim() : (patientPhone.trim() || '+92 300 123 4567'),
          notes: patientReason,
          has_loyalty_discount: isLoyaltyActiveForDoc,
          loyalty_applicant_name: isLoyaltyActiveForDoc ? (patientName.trim() || 'Ahmed Khan') : undefined,
          loyalty_guardian_name: isLoyaltyActiveForDoc ? (loyaltyGuardianName.trim() || undefined) : undefined,
          loyalty_dob: isLoyaltyActiveForDoc ? (loyaltyDob.trim() || undefined) : undefined,
          loyalty_gender: isLoyaltyActiveForDoc ? (loyaltyGender || patientGender) : undefined,
          loyalty_cnic: isLoyaltyActiveForDoc ? (loyaltyCnic.trim() || undefined) : undefined,
          loyalty_mobile: isLoyaltyActiveForDoc ? (loyaltyMobile.trim() || patientPhone.trim()) : undefined,
          loyalty_whatsapp: isLoyaltyActiveForDoc ? (loyaltyWhatsapp.trim() || undefined) : undefined,
          loyalty_email: isLoyaltyActiveForDoc ? (loyaltyEmail.trim() || (patientEmail.trim().toLowerCase() || undefined)) : undefined,
          loyalty_address: isLoyaltyActiveForDoc ? (loyaltyAddress.trim() || undefined) : undefined,
          loyalty_city: isLoyaltyActiveForDoc ? (loyaltyCity.trim() || 'Dera Ismail Khan') : undefined
        })
      });

      const effectiveSlot = res.slot_id || slotCodeToSubmit;
      setActiveSlotId(effectiveSlot);

      if (res.dev_code) {
        setDevCode(res.dev_code);
      } else {
        setDevCode('849201');
      }
      setBookingState('otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillCode = (code: string) => {
    const digits = code.split('').slice(0, 6);
    while (digits.length < 6) digits.push('');
    setOtpDigits(digits);
  };

  const handleOtpDigitChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpDigits];
    next[idx] = val.slice(-1);
    setOtpDigits(next);
    if (val && idx < 5) {
      const nextInput = document.getElementById(`profile-otp-${idx + 1}`);
      if (nextInput) (nextInput as HTMLInputElement).focus();
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otpDigits.join('');
    if (enteredCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const slotIdToVerify = activeSlotId || selectedSlotId || `slot-${doctor.id}-${selectedDayDate || '2026-10-12'}-10-30`;
      const verifyRes: any = await apiFetch('/booking/verify', {
        method: 'POST',
        body: JSON.stringify({
          contact: patientPhone.trim() || '+92 300 123 4567',
          code: enteredCode,
          slot_id: slotIdToVerify,
          patient_name: patientName.trim(),
          patient_phone: patientPhone.trim(),
          patient_email: patientEmail.trim(),
          has_loyalty_discount: Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard,
          loyalty_applicant_name: (Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard) ? (patientName.trim() || 'Ahmed Khan') : undefined,
          loyalty_guardian_name: (Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard) ? (loyaltyGuardianName.trim() || undefined) : undefined,
          loyalty_dob: (Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard) ? (loyaltyDob.trim() || undefined) : undefined,
          loyalty_gender: (Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard) ? (loyaltyGender || patientGender) : undefined,
          loyalty_cnic: (Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard) ? (loyaltyCnic.trim() || undefined) : undefined,
          loyalty_mobile: (Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard) ? (loyaltyMobile.trim() || patientPhone.trim()) : undefined,
          loyalty_whatsapp: (Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard) ? (loyaltyWhatsapp.trim() || undefined) : undefined,
          loyalty_email: (Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard) ? (loyaltyEmail.trim() || (patientEmail.trim().toLowerCase() || undefined)) : undefined,
          loyalty_address: (Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard) ? (loyaltyAddress.trim() || undefined) : undefined,
          loyalty_city: (Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard) ? (loyaltyCity.trim() || 'Dera Ismail Khan') : undefined
        })
      });

      // Set confirmed slip details with real slip from backend
      const slipNum = verifyRes.slip_number || `DIK-${doctor.specialty.slice(0, 4).toUpperCase()}-20261012-004-18`;
      const discPct = Number(doctor.loyalty_discount_percent ?? 20);
      const isLoyaltyValid = Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard;
      const finalCalculatedFee = isLoyaltyValid
        ? Math.round(Number(doctor.fee_clinic || 1000) * (1 - discPct / 100))
        : Number(doctor.fee_clinic || 1000);

      setConfirmedSlip({
        slipNumber: slipNum,
        doctorName: doctor.full_name,
        specialty: doctor.specialty,
        date: selectedDayObj?.label || 'Scheduled Date',
        time: selectedTimeSlot,
        fee: finalCalculatedFee,
        originalFee: doctor.fee_clinic || 1000,
        hasLoyaltyDiscount: isLoyaltyValid,
        discountAmount: isLoyaltyValid ? Math.round(Number(doctor.fee_clinic || 1000) * (discPct / 100)) : 0,
        patientName: patientName || 'Ahmed Khan',
        patientPhone: patientPhone || '+92 300 123 4567',
        patientEmail: patientEmail.trim(),
        clinic: doctor.clinic_address || 'D.I. Khan Care Clinic'
      });
      setBookingState('confirmed');
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-800 font-sans pb-16 selection:bg-[#0f766e]/20 selection:text-[#0f766e]">
      {/* ── Top Header Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 sm:py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer" onClick={onBack}>
            <div className="w-8 h-8 rounded-xl bg-[#0f766e] flex items-center justify-center text-white font-bold shadow-xs">
              <Plus className="w-5 h-5 stroke-[2.8]" />
            </div>
            <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              D.I. Khan Care
            </span>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button
              type="button"
              onClick={onBack}
              className="text-[#0f766e] font-bold hover:opacity-80 transition"
            >
              Find a doctor
            </button>
            <button
              type="button"
              onClick={onBack}
              className="hover:text-slate-900 transition-colors"
            >
              Clinics
            </button>
            <button
              type="button"
              onClick={onTrackNav}
              className="hover:text-slate-900 transition-colors"
            >
              My appointments
            </button>
          </nav>

          {/* Mobile Back & User Profile Pill */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="md:hidden px-3 py-1.5 text-xs font-semibold text-[#0f766e] bg-teal-50 border border-teal-200/80 rounded-xl"
            >
              &larr; Back
            </button>
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 border border-slate-200/90 rounded-full py-1.5 px-3 shadow-2xs">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                AK
              </div>
              <span className="text-xs font-bold text-slate-800">Ahmed Khan</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 sm:mb-6 font-medium flex-wrap">
          <button onClick={onBack} className="hover:text-[#0f766e] transition-colors">Home</button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <button onClick={onBack} className="hover:text-[#0f766e] transition-colors">Find a doctor</button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-800 font-semibold truncate max-w-[150px] sm:max-w-none">{doctor.full_name}</span>
        </div>

        {/* Page Title & Trust Badge */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Good care starts with a visit.
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
              Get to know your doctor and choose a time that works for you.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f766e] bg-teal-50/80 border border-teal-200/70 rounded-full px-3.5 py-1.5 shadow-2xs self-start md:self-auto">
            <ShieldCheck className="w-4 h-4 text-[#0f766e]" />
            Secure, confidential booking
          </div>
        </div>

        {/* ── Mobile Navigation Tabs (visible only on mobile/tablet < lg) ── */}
        <div className="lg:hidden flex items-center p-1 bg-slate-100 rounded-2xl mb-4 sm:mb-5 border border-slate-200/90 shadow-2xs">
          <button
            type="button"
            onClick={() => setMobileActiveTab('booking')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileActiveTab === 'booking'
                ? 'bg-[#0f766e] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. Pick Time &amp; Book</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileActiveTab('profile')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileActiveTab === 'profile'
                ? 'bg-[#0f766e] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>2. Doctor &amp; Loyalty Info</span>
            {Boolean(doctor.loyalty_card_enabled) && (
              <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                VIP
              </span>
            )}
          </button>
        </div>

        {/* ── 2-Column Responsive Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* ── Left Column: Doctor Profile & Clinic Visit ── */}
          <div className={`lg:col-span-4 space-y-5 sm:space-y-6 ${mobileActiveTab === 'profile' ? 'block' : 'hidden lg:block'}`}>
            {/* Card 1: Doctor Profile */}
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
              <div className="relative w-full h-56 bg-slate-900 overflow-hidden">
                <img
                  src={getDoctorProfileImage(doctor, 500)}
                  alt={doctor.full_name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const fallback = (e.target as HTMLElement).nextElementSibling;
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }}
                />
                <div
                  style={{ display: 'none' }}
                  className="w-full h-full bg-gradient-to-br from-clinic-800 via-clinic-900 to-slate-950 text-white flex items-center justify-center font-extrabold text-3xl"
                >
                  {doctor.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="absolute top-3.5 right-3.5">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 backdrop-blur-md border border-emerald-500/40 text-xs font-bold shadow-md">
                    <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400" /> PMDC verified
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
              </div>
              <div className="p-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-snug" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {doctor.full_name}
                  </h2>
                  <p className="text-xs font-bold text-[#0f766e] mt-1 uppercase tracking-wider">{doctor.specialty} Specialist</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{doctor.qualification || 'MBBS, FCPS (Medicine)'}</p>
                </div>

                {/* Reviews Star Row */}
                <button
                  type="button"
                  onClick={() => {
                    setReviewModalView('list');
                    setShowReviewsModal(true);
                  }}
                  className="flex items-center gap-2 mt-4 text-xs group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg shadow-2xs">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="font-black text-amber-900">
                      {reviewsSummary ? reviewsSummary.average_rating.toFixed(1) : '5.0'}
                    </span>
                  </div>
                  <span className="text-slate-500 font-medium group-hover:text-[#0f766e] group-hover:underline transition-colors">
                    ({reviewsSummary?.total_reviews || 0} verified patient {reviewsSummary?.total_reviews === 1 ? 'review' : 'reviews'})
                  </span>
                </button>

                {/* Experience & Satisfaction Grid */}
                <div className="bg-slate-50/90 rounded-2xl border border-slate-100 p-4 grid grid-cols-2 divide-x divide-slate-200 my-5">
                  <div>
                    <div className="text-base font-black text-slate-900 font-mono">
                      {(doctor.experience_years !== undefined && doctor.experience_years !== null) ? `${doctor.experience_years} years` : '12 years'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">Clinical experience</div>
                  </div>
                  <div className="pl-4">
                    <div className="text-base font-black text-slate-900 font-mono">98%</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">Patient satisfaction</div>
                  </div>
                </div>

                {/* About your doctor */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900">About your doctor</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-line">
                    {doctor.bio || `${doctor.full_name} provides thoughtful, evidence-based care for adults, with a focus on comprehensive health, treated conditions and long-term wellbeing.`}
                  </p>

                  {/* Treatment Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {((doctor.expertise && doctor.expertise.trim())
                      ? doctor.expertise.split(',').map((tag: string) => tag.trim()).filter(Boolean)
                      : ['Diabetes care', 'Hypertension', 'General medicine']
                    ).map((tag: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-medium bg-slate-50">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Reviews Action Links */}
                  <div className="flex items-center gap-3 mt-3 pt-1 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewModalView('list');
                        setShowReviewsModal(true);
                      }}
                      className="text-[#0f766e] hover:text-[#0b544e] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      Read reviews ({reviewsSummary?.total_reviews || 0}) <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-slate-300">&middot;</span>
                    <button
                      type="button"
                      onClick={() => {
                        setReviewModalView('write');
                        setShowReviewsModal(true);
                      }}
                      className="text-amber-700 hover:text-amber-800 font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      Write a review
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Your Clinic Visit */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Your clinic visit</h3>

              <div className="space-y-4 text-xs">
                {/* Location */}
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#0f766e] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">{doctor.clinic_address || 'D.I. Khan Care Clinic'}</p>
                    <p className="text-slate-500 mt-0.5">Circular Road, near District Hospital, Dera Ismail Khan</p>
                    <a
                      href={doctor.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(doctor.clinic_address + ' D.I. Khan')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#0f766e] hover:underline font-bold mt-1 inline-flex items-center gap-1 text-[11px]"
                    >
                      View map &amp; directions <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#0f766e] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">{consultationDurationMinutes}-minute consultation</p>
                    <p className="text-slate-500 mt-0.5">In-person visit &middot; Please arrive 10 minutes early.</p>
                  </div>
                </div>

                {/* Languages */}
                <div className="flex items-start gap-3">
                  <Globe className="w-4 h-4 text-[#0f766e] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">We speak your language</p>
                    <p className="text-slate-500 mt-0.5">Urdu, English and Pashto</p>
                  </div>
                </div>

                {/* Bring Along */}
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-[#0f766e] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Bring along</p>
                    <p className="text-slate-500 mt-0.5">Your CNIC, current medicines and any recent test reports.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* VIP Loyalty Card Showcase on Doctor Profile Page (Only visible when doctor has enabled it) */}
            {Boolean(doctor.loyalty_card_enabled) && (
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-400/20 to-amber-600/10 border-2 border-amber-400/70 rounded-3xl p-5 shadow-sm space-y-3.5 relative overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-bold text-sm shadow-xs">
                    💳
                  </span>
                  <div>
                    <h4 className="font-extrabold text-amber-950 text-sm">
                      {doctor.loyalty_card_title || 'RK Loyalty Card'}
                    </h4>
                    <p className="text-[11px] text-amber-800 font-medium">VIP Clinic Privilege Card</p>
                  </div>
                </div>
                <span className="bg-gradient-to-r from-amber-600 to-amber-500 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-xs">
                  {doctor.loyalty_discount_percent ? `${doctor.loyalty_discount_percent}% OFF` : '20% OFF'}
                </span>
              </div>

              {/* Loyalty Card Photo Uploaded by Doctor */}
              <div className="rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-md bg-slate-950 relative group aspect-[16/10] sm:aspect-[1.586/1]">
                <img
                  src={doctor.loyalty_card_image_url || '/rk-loyalty-card.png'}
                  alt={doctor.loyalty_card_title || 'VIP Loyalty Card'}
                  className="w-full h-full object-contain bg-slate-950 group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const fb = (e.target as HTMLElement).nextElementSibling;
                    if (fb) (fb as HTMLElement).style.display = 'flex';
                  }}
                />
                <div
                  style={{ display: doctor.loyalty_card_image_url ? 'none' : 'flex' }}
                  className="w-full h-44 bg-gradient-to-br from-amber-700 via-amber-500 to-yellow-400 text-slate-950 p-4 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black tracking-widest uppercase bg-slate-950 text-amber-300 px-2 py-0.5 rounded">
                        VIP GOLDEN CARD
                      </span>
                      <h5 className="text-base font-black tracking-tight mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {doctor.loyalty_card_title || 'RK Loyalty Card'}
                      </h5>
                    </div>
                    <span className="text-sm font-black text-amber-950 bg-white/70 px-2 py-0.5 rounded">
                      {Number(doctor.loyalty_discount_percent ?? 20)}% OFF
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-amber-950">
                      Dr. {doctor.full_name} &bull; {doctor.specialty}
                    </p>
                    <p className="text-[10px] text-amber-900/90 font-mono">
                      Physical Card Issued at Reception &bull; {doctor.clinic_address}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-100/70 border border-amber-300/80 rounded-xl p-3 text-xs text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <span>✨</span> Save {Number(doctor.loyalty_discount_percent ?? 20)}% on Every Consultation
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed font-normal">
                  Select <strong>"Apply for VIP Loyalty Card"</strong> in the booking form. When the assistant desk confirms your appointment, collect your physical Golden VIP card at reception!
                </p>
              </div>
            </div>
            )}

            {/* Helpline Card */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-teal-50/60 border border-teal-100/90 shadow-2xs">
              <Headphones className="w-5 h-5 text-[#0f766e] flex-shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Need help with your appointment?</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5 font-mono">0966 123 456 &middot; Mon&ndash;Sat, 9am&ndash;8pm</p>
              </div>
            </div>

            {/* Mobile Return to Booking CTA */}
            <div className="lg:hidden pt-1">
              <button
                type="button"
                onClick={() => {
                  setMobileActiveTab('booking');
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className="w-full py-3.5 bg-[#0f766e] hover:bg-[#0b5c56] text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Continue to Choose Appointment Time &rarr;</span>
              </button>
            </div>
          </div>

          {/* ── Right Column: Choose Your Appointment Form ── */}
          <div className={`lg:col-span-8 ${mobileActiveTab === 'booking' ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 lg:p-8 shadow-xs">
              {/* Mobile Doctor Quick Summary Banner */}
              <div className="lg:hidden mb-5 p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50/70 border border-teal-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-teal-200 shadow-2xs">
                    <img
                      src={getDoctorProfileImage(doctor, 200)}
                      alt={doctor.full_name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-xs text-slate-900 leading-snug truncate">{doctor.full_name}</h3>
                    <p className="text-[11px] text-[#0f766e] font-bold uppercase truncate">{doctor.specialty} Specialist</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                        {reviewsSummary ? reviewsSummary.average_rating.toFixed(1) : '5.0'}
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/80 px-1.5 py-0.2 rounded font-mono">
                        Fee: {formatCurrency(doctor.fee_clinic)}
                      </span>
                      {Boolean(doctor.loyalty_card_enabled) && (
                        <span className="text-[10px] text-amber-950 font-black bg-amber-300 px-1.5 py-0.2 rounded">
                          {Number(doctor.loyalty_discount_percent ?? 20)}% OFF VIP
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileActiveTab('profile')}
                  className="text-[11px] font-bold text-[#0f766e] bg-white px-2.5 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-50 transition shadow-2xs flex-shrink-0 cursor-pointer"
                >
                  Info &rarr;
                </button>
              </div>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Choose your appointment
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-normal">
                    A few simple details, and we'll take care of the rest.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-xs font-bold flex-shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Accepting new patients
                </span>
              </div>

              {/* ── Step 1: Select a date & time ── */}
              <div className="py-6 border-b border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-[#0f766e] font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">Select a date &amp; time</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Pakistan time (PKT)</span>
                </div>

                {/* In-person Consultation Card */}
                <div className="bg-[#f0f9f6] border border-[#a7d9c9] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-[#0f766e] flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#0f766e]" />
                    </div>
                    <Building2 className="w-4 h-4 text-[#0f766e]" />
                    <div>
                      <p className="font-bold text-xs text-slate-900">In-person consultation</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{doctor.clinic_address || 'D.I. Khan Care Clinic'} &middot; {consultationDurationMinutes} minutes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-slate-900 font-mono">
                      {formatCurrency(doctor.fee_clinic)}
                    </span>
                  </div>
                </div>

                {/* Month Title & Week Navigation */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {selectedDayObj?.monthName || 'October 2026'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Week {weekOffset + 1} of {totalWeeks} &middot; {visibleDayOptions[0]?.dayNum}&ndash;{visibleDayOptions[visibleDayOptions.length - 1]?.dayNum} {visibleDayOptions[0]?.monthName.split(' ')[0]}
                    </span>
                  </div>

                  {/* Week Prev / Next controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={weekOffset === 0}
                      onClick={() => {
                        const newWeek = Math.max(0, weekOffset - 1);
                        setWeekOffset(newWeek);
                        const firstDayOfNewWeek = dayOptions[newWeek * 7];
                        if (firstDayOfNewWeek) {
                          setSelectedDayDate(firstDayOfNewWeek.fullDate);
                        }
                      }}
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Previous week"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-[#0f766e] px-2 py-1 bg-teal-50 border border-teal-200/70 rounded-lg font-mono">
                      {visibleDayOptions[0]?.weekday} {visibleDayOptions[0]?.dayNum} &rarr; {visibleDayOptions[visibleDayOptions.length - 1]?.weekday} {visibleDayOptions[visibleDayOptions.length - 1]?.dayNum}
                    </span>
                    <button
                      type="button"
                      disabled={weekOffset >= totalWeeks - 1}
                      onClick={() => {
                        const newWeek = Math.min(totalWeeks - 1, weekOffset + 1);
                        setWeekOffset(newWeek);
                        const firstDayOfNewWeek = dayOptions[newWeek * 7];
                        if (firstDayOfNewWeek) {
                          setSelectedDayDate(firstDayOfNewWeek.fullDate);
                        }
                      }}
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Next week"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Jump Pills for all dates with slots */}
                {dayOptions.filter(d => d.slotCount > 0 && !d.isOffDay).length > 7 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Dates with open slots:</span>
                      <span className="text-teal-700 font-bold">{dayOptions.filter(d => d.slotCount > 0 && !d.isOffDay).length} available dates</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {dayOptions.filter(d => d.slotCount > 0 && !d.isOffDay).map((d) => (
                        <button
                          key={d.fullDate}
                          type="button"
                          onClick={() => setSelectedDayDate(d.fullDate)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${selectedDayDate === d.fullDate
                            ? 'bg-[#0f766e] text-white shadow-2xs font-bold'
                            : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800'
                            }`}
                        >
                          <span>{d.weekday} {d.dayNum}</span>
                          <span className={`text-[10px] px-1 rounded-full ${selectedDayDate === d.fullDate ? 'bg-amber-300 text-slate-900' : 'bg-teal-100 text-teal-800'}`}>
                            {d.slotCount}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7-Day Horizontal Selector (Responsive: swipeable on mobile, 7-col grid on desktop) */}
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none touch-scroll md:grid md:grid-cols-7">
                  {visibleDayOptions.map((day) => {
                    const isSelected = selectedDayDate === day.fullDate;
                    const hasSlots = day.slotCount > 0;
                    return (
                      <button
                        key={day.fullDate}
                        type="button"
                        onClick={() => setSelectedDayDate(day.fullDate)}
                        className={`min-w-[62px] flex-shrink-0 md:min-w-0 md:flex-shrink py-2.5 sm:py-3 px-1 rounded-2xl text-center transition-all relative ${isSelected
                          ? 'bg-[#0f766e] text-white shadow-md ring-2 ring-[#0f766e]/30'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50/20'
                          }`}
                      >
                        <span className={`block text-[11px] font-medium ${isSelected ? 'text-teal-100' : 'text-slate-500'}`}>
                          {day.weekday}
                        </span>
                        <span className="block text-base font-black mt-0.5 font-mono">
                          {day.dayNum}
                        </span>
                        {day.isOffDay ? (
                          <span className="block text-[9px] text-rose-500 font-bold mt-0.5">Off Day</span>
                        ) : hasSlots ? (
                          <span className={`inline-block text-[10px] font-bold px-1 rounded-full mt-0.5 ${isSelected ? 'bg-amber-300 text-slate-900' : 'bg-teal-100 text-teal-800'}`}>
                            {day.slotCount}
                          </span>
                        ) : isSlotsLoading ? (
                          <span className="block text-[9px] text-teal-600 font-bold animate-pulse mt-0.5">...</span>
                        ) : (
                          <span className="block text-[9px] text-slate-300 mt-0.5 font-medium">Off</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Shift Selection & Available Times Header */}
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Available times &middot; {selectedDayObj?.label}
                    </span>
                    <span className={`text-xs font-medium ${selectedDayObj?.isOffDay ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                      {selectedDayObj?.isOffDay
                        ? 'Clinic Closed (Weekly Off Day)'
                        : displaySlots.length > 0
                          ? `${displaySlots.length} slots available`
                          : '0 slots available'}
                    </span>
                  </div>

                  {/* Shift Tabs - only visible on working days */}
                  {!selectedDayObj?.isOffDay && (
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/90 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSelectedShiftTab('all')}
                        className={`py-1.5 px-1 text-[11px] sm:text-xs font-bold rounded-lg transition text-center truncate cursor-pointer ${selectedShiftTab === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        <span className="hidden sm:inline">All Shifts</span>
                        <span className="sm:hidden">All</span> ({displaySlots.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedShiftTab('morning')}
                        className={`py-1.5 px-1 text-[11px] sm:text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition text-center truncate cursor-pointer ${selectedShiftTab === 'morning'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-amber-800'
                          }`}
                      >
                        <Sun className="w-3 h-3 flex-shrink-0" />
                        <span className="hidden sm:inline">Morning</span>
                        <span className="sm:hidden">Morn</span> ({morningSlots.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedShiftTab('evening')}
                        className={`py-1.5 px-1 text-[11px] sm:text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition text-center truncate cursor-pointer ${selectedShiftTab === 'evening'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-indigo-800'
                          }`}
                      >
                        <Moon className="w-3 h-3 flex-shrink-0" />
                        <span className="hidden sm:inline">Evening</span>
                        <span className="sm:hidden">Eve</span> ({eveningSlots.length})
                      </button>
                    </div>
                  )}
                </div>

                {/* Doctor Shift Schedule Info Banner derived dynamically from generated slots */}
                {isSlotsLoading ? (
                  <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-100 flex items-center justify-between text-[11px] text-teal-800 animate-pulse font-medium">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-700 flex-shrink-0" />
                      <span>Loading real-time available consultation slots from clinic...</span>
                    </div>
                  </div>
                ) : selectedDayObj?.isOffDay ? null : displaySlots.length > 0 ? (
                  <div className="p-2.5 rounded-xl bg-teal-50/50 border border-teal-100 flex items-center justify-between text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Clock className="w-3.5 h-3.5 text-teal-700 flex-shrink-0" />
                      <span className="font-medium text-slate-600">Generated Slot Times:</span>
                      {morningSlots.length > 0 ? (
                        <span className="font-semibold text-slate-900 inline-flex items-center gap-1">
                          <Sun className="w-3 h-3 text-amber-500" /> Morning: {morningSlots[0].timeLabel} &ndash; {morningSlots[morningSlots.length - 1].endTimeLabel || morningSlots[morningSlots.length - 1].timeLabel} ({morningSlots.length} slots)
                        </span>
                      ) : (
                        <span className="text-slate-400 inline-flex items-center gap-1">
                          <Sun className="w-3 h-3 text-slate-300" /> No morning slots
                        </span>
                      )}
                      <span className="text-slate-300">&bull;</span>
                      {eveningSlots.length > 0 ? (
                        <span className="font-semibold text-slate-900 inline-flex items-center gap-1">
                          <Moon className="w-3 h-3 text-indigo-500" /> Evening: {eveningSlots[0].timeLabel} &ndash; {eveningSlots[eveningSlots.length - 1].endTimeLabel || eveningSlots[eveningSlots.length - 1].timeLabel} ({eveningSlots.length} slots)
                        </span>
                      ) : (
                        <span className="text-slate-400 inline-flex items-center gap-1">
                          <Moon className="w-3 h-3 text-slate-300" /> No evening slots
                        </span>
                      )}
                    </div>
                    <span className="text-teal-800 font-bold bg-teal-100/70 px-2 py-0.5 rounded-md flex-shrink-0">
                      {consultationDurationMinutes} min / slot
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Doctor has no available consultation slots on this date.</span>
                  </div>
                )}

                {/* Time Slots (dynamic slots buttons) */}
                {isSlotsLoading ? (
                  <div className="py-12 text-center bg-slate-50/70 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
                    <p className="text-xs font-bold text-slate-800">Checking consultation slots...</p>
                    <p className="text-[11px] text-slate-400">Loading live appointment schedule for {doctor.full_name}</p>
                  </div>
                ) : activeSlotsToDisplay.length === 0 ? (
                  <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                    {selectedDayObj?.isOffDay ? (
                      <>
                        <p className="text-xs font-bold text-rose-700">Clinic Closed on {selectedDayObj?.label} (Weekly Off Day)</p>
                        <p className="text-[11px] text-slate-500">
                          {doctor.full_name} does not take patient consultations on this day. Please pick another active day above.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-slate-700">No consultation slots available for {selectedDayObj?.label}</p>
                        <p className="text-[11px] text-slate-400">
                          {selectedShiftTab !== 'all'
                            ? `No slots found for the ${selectedShiftTab} shift. Check other shifts or dates.`
                            : 'Doctor has not scheduled slots for this date or all slots have been cleared.'}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {activeSlotsToDisplay.map((slot) => {
                      const isSelected = selectedSlotId === slot.id || selectedTimeSlot === slot.timeLabel;
                      const isMorning = isMorningSlot(slot.rawSlot, slot.timeLabel);
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => {
                            setSelectedSlotId(slot.id);
                            setSelectedTimeSlot(slot.timeLabel);
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${isSelected
                            ? 'bg-[#0f766e] text-white shadow-sm ring-2 ring-[#0f766e]/30'
                            : isMorning
                              ? 'bg-amber-50/50 border border-amber-200/90 text-amber-950 hover:border-amber-400 hover:bg-amber-50'
                              : 'bg-indigo-50/50 border border-indigo-200/90 text-indigo-950 hover:border-indigo-400 hover:bg-indigo-50'
                            }`}
                        >
                          {isMorning ? (
                            <Sun className={`w-3 h-3 ${isSelected ? 'text-amber-200' : 'text-amber-500'}`} />
                          ) : (
                            <Moon className={`w-3 h-3 ${isSelected ? 'text-indigo-200' : 'text-indigo-500'}`} />
                          )}
                          {slot.timeLabel}
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Step 2: Patient details ── */}
              <div className="py-6 border-b border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-[#0f766e] font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">Appointment Type &amp; Patient Details</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">* Required fields</span>
                </div>

                {/* Option to Choose Standard Appointment vs VIP Loyalty Card (Only if doctor enabled) */}
                {Boolean(doctor.loyalty_card_enabled) && (
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-slate-700">Choose Consultation Plan</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Plan A: Standard Appointment */}
                    <div
                      onClick={() => setApplyLoyaltyCard(false)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        !applyLoyaltyCard
                          ? 'border-[#0f766e] bg-teal-50/70 ring-2 ring-[#0f766e]/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#0f766e]" /> Standard Appointment
                        </span>
                        <span className="font-extrabold text-xs text-slate-900 font-mono">
                          {formatCurrency(doctor.fee_clinic)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        Standard clinic fee &bull; Fast 10-second booking with simple details
                      </p>
                    </div>

                    {/* Plan B: VIP Loyalty Card */}
                    <div
                      onClick={() => setApplyLoyaltyCard(true)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        applyLoyaltyCard
                          ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/70 ring-2 ring-amber-500/30 shadow-xs'
                          : 'border-amber-300/80 bg-amber-50/30 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">💳</span>
                          <span className="font-extrabold text-xs text-amber-950">VIP Loyalty Card</span>
                        </div>
                        <span className="font-extrabold text-xs text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-mono">
                          {Number(doctor.loyalty_discount_percent ?? 20)}% OFF &bull; {formatCurrency(Math.round(doctor.fee_clinic * (1 - Number(doctor.loyalty_discount_percent ?? 20) / 100)))}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900/80 mt-1.5 font-medium">
                        Save {Number(doctor.loyalty_discount_percent ?? 20)}% &bull; Complete verification details to receive Golden Card at clinic
                      </p>
                    </div>
                  </div>

                  {/* In-Form VIP Loyalty Card Visual Preview on Mobile */}
                  {Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard && (
                    <div className="mt-3 bg-gradient-to-br from-amber-500/10 via-amber-400/20 to-amber-600/10 border-2 border-amber-400/70 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3 animate-fade-in shadow-2xs">
                      <div className="w-full sm:w-36 aspect-[16/10] sm:aspect-[1.586/1] rounded-xl overflow-hidden bg-slate-950 border border-amber-400 shadow-xs flex-shrink-0">
                        <img
                          src={doctor.loyalty_card_image_url || '/rk-loyalty-card.png'}
                          alt={doctor.loyalty_card_title || 'VIP Loyalty Card'}
                          className="w-full h-full object-contain bg-slate-950"
                        />
                      </div>
                      <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-amber-950">{doctor.loyalty_card_title || 'RK Loyalty Card'}</span>
                          <span className="bg-gradient-to-r from-amber-600 to-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                            {Number(doctor.loyalty_discount_percent ?? 20)}% OFF CONSULTATION
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-900 leading-snug">
                          Fill the 10 verified fields below. Once approved by the assistant desk, collect your physical Golden VIP Loyalty Card directly at the clinic reception!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                )}

                {/* Booking for Toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600">Booking for</span>
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setBookingFor('myself')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${bookingFor === 'myself'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                      <User className="w-3 h-3 text-[#0f766e]" /> Myself
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingFor('someone_else')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${bookingFor === 'someone_else'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                      Someone else
                    </button>
                  </div>
                </div>

                {/* 2x2 Input Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full name *</label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Ahmed Khan"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f766e]/30 focus:border-[#0f766e] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile number *</label>
                    <input
                      type="text"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="+92 300 123 4567"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f766e]/30 focus:border-[#0f766e] transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Age *</label>
                    <input
                      type="text"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="34 years"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f766e]/30 focus:border-[#0f766e] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f766e]/30 focus:border-[#0f766e] transition bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Email address field for patient notifications */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Email address (for slip receipt, reminders &amp; doctor review link) *
                    </label>
                    <span className="text-[10px] font-semibold text-[#0f766e] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-[#0f766e]" /> Email Alerts
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f766e]/30 focus:border-[#0f766e] transition"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Your digital slip, appointment confirmation, 1-hour pre-visit reminder, and doctor review link will be sent to this email.
                  </p>
                </div>

                {/* 10-Field Form for VIP Loyalty Card Applicants */}
                {Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard && (
                  <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 pb-2 border-b border-amber-200/60">
                      <span className="text-base">📋</span>
                      <div>
                        <h4 className="font-extrabold text-xs text-amber-950 uppercase tracking-wider">
                          VIP Loyalty Card Verification Application
                        </h4>
                        <p className="text-[11px] text-amber-800">
                          These 10 verified fields will appear on your Golden Loyalty Card and be confirmed at the assistant desk.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      {/* Field 1: Full Name (Required) */}
                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          1. Full Name * <span className="text-[10px] text-emerald-700 font-semibold">(Required)</span>
                        </label>
                        <input
                          type="text"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          placeholder="e.g. Muhammad Ahmed Khan"
                          required
                          className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>

                      {/* Field 2: Father's / Husband's Name (Optional) */}
                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          2. Father's / Husband's Name <span className="text-[10px] text-slate-400">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={loyaltyGuardianName}
                          onChange={(e) => setLoyaltyGuardianName(e.target.value)}
                          placeholder="e.g. Tariq Khan"
                          className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>

                      {/* Field 3: Date of Birth (Required) */}
                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          3. Date of Birth * <span className="text-[10px] text-emerald-700 font-semibold">(Required)</span>
                        </label>
                        <input
                          type="date"
                          value={loyaltyDob}
                          onChange={(e) => setLoyaltyDob(e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>

                      {/* Field 4: Gender (Optional) */}
                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          4. Gender <span className="text-[10px] text-slate-400">(Optional)</span>
                        </label>
                        <select
                          value={loyaltyGender}
                          onChange={(e) => setLoyaltyGender(e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Field 5: CNIC / B-Form Number (Optional) */}
                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          5. CNIC / B-Form Number <span className="text-[10px] text-slate-400">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={loyaltyCnic}
                          onChange={(e) => setLoyaltyCnic(e.target.value)}
                          placeholder="e.g. 12101-1234567-1"
                          className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                        />
                      </div>

                      {/* Field 6: Mobile Number (Required) */}
                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          6. Mobile Number * <span className="text-[10px] text-emerald-700 font-semibold">(Required)</span>
                        </label>
                        <input
                          type="text"
                          value={loyaltyMobile || patientPhone}
                          onChange={(e) => setLoyaltyMobile(e.target.value)}
                          placeholder="+92 300 123 4567"
                          required
                          className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                        />
                      </div>

                      {/* Field 7: WhatsApp Number (If different) */}
                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          7. WhatsApp Number <span className="text-[10px] text-slate-400">(If different)</span>
                        </label>
                        <input
                          type="text"
                          value={loyaltyWhatsapp}
                          onChange={(e) => setLoyaltyWhatsapp(e.target.value)}
                          placeholder="Leave blank if same as mobile"
                          className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                        />
                      </div>

                      {/* Field 8: Email Address (Optional) */}
                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          8. Email Address <span className="text-[10px] text-slate-400">(Optional)</span>
                        </label>
                        <input
                          type="email"
                          value={loyaltyEmail || patientEmail}
                          onChange={(e) => setLoyaltyEmail(e.target.value)}
                          placeholder="yourname@gmail.com"
                          className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>

                      {/* Field 9: Residential Address (Required) */}
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-amber-950 mb-1">
                          9. Residential Address * <span className="text-[10px] text-emerald-700 font-semibold">(Required)</span>
                        </label>
                        <input
                          type="text"
                          value={loyaltyAddress}
                          onChange={(e) => setLoyaltyAddress(e.target.value)}
                          placeholder="House / Street / Mohallah"
                          required
                          className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>

                      {/* Field 10: City (Required) */}
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-amber-950 mb-1">
                          10. City * <span className="text-[10px] text-emerald-700 font-semibold">(Required)</span>
                        </label>
                        <input
                          type="text"
                          value={loyaltyCity}
                          onChange={(e) => setLoyaltyCity(e.target.value)}
                          placeholder="Dera Ismail Khan"
                          required
                          className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason for visit (optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for your visit (optional)</label>
                  <textarea
                    value={patientReason}
                    onChange={(e) => setPatientReason(e.target.value)}
                    rows={2}
                    placeholder="Follow-up for blood pressure and a review of my current medication."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f766e]/30 focus:border-[#0f766e] transition resize-none"
                  />
                </div>

                {/* SMS Reminder Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700 pt-1">
                  <input
                    type="checkbox"
                    checked={sendSmsReminder}
                    onChange={(e) => setSendSmsReminder(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0f766e] border-slate-300 focus:ring-[#0f766e] accent-[#0f766e]"
                  />
                  <span>Send me an appointment confirmation and reminder by SMS.</span>
                </label>
              </div>

              {/* ── Step 3: Review & book ── */}
              <div className="pt-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-teal-100 text-[#0f766e] font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">Review &amp; book</h3>
                </div>

                {/* Summary Pill */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-slate-800 font-semibold">
                  <Calendar className="w-4 h-4 text-[#0f766e]" />
                  <span>{selectedDayObj?.label} &middot; {selectedTimeSlot} &middot; In-person</span>
                </div>

                {/* Fee and Payment Notice */}
                <div className="pt-2 space-y-2">
                  {Boolean(doctor.loyalty_card_enabled) && applyLoyaltyCard ? (
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Standard Consultation Fee:</span>
                        <span className="line-through font-mono">{formatCurrency(doctor.fee_clinic)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                        <span>VIP Golden Loyalty Discount ({Number(doctor.loyalty_discount_percent ?? 20)}% OFF):</span>
                        <span className="font-mono">-{formatCurrency(Math.round(doctor.fee_clinic * (Number(doctor.loyalty_discount_percent ?? 20) / 100)))}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-amber-200/80 gap-3">
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-amber-950">Discounted Fee Payable at Clinic</p>
                          <p className="text-[10px] text-amber-800">Collect physical VIP Card from reception upon arrival</p>
                        </div>
                        <span className="text-xl sm:text-2xl font-black text-amber-950 font-mono whitespace-nowrap flex-shrink-0 text-right">
                          {formatCurrency(Math.round(doctor.fee_clinic * (1 - Number(doctor.loyalty_discount_percent ?? 20) / 100)))}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-slate-900">Total consultation fee</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Pay at the clinic &middot; No online payment required</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          {formatCurrency(doctor.fee_clinic)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Error Notification */}
                {errorMessage && bookingState === 'form' && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-start gap-2.5 shadow-2xs animate-fade-in">
                    <span className="text-base leading-none">⚠️</span>
                    <div className="flex-1 leading-relaxed">
                      {errorMessage}
                    </div>
                  </div>
                )}

                {/* Primary CTA Button */}
                <button
                  type="button"
                  onClick={handleStartBooking}
                  disabled={isSubmitting || activeSlotsToDisplay.length === 0}
                  className="w-full py-4 bg-[#0f766e] hover:bg-[#0b5c56] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting
                    ? 'Securing your slot...'
                    : activeSlotsToDisplay.length === 0
                      ? 'No slots available for this date'
                      : 'Book appointment →'}
                </button>

                <p className="text-[11px] text-slate-400 text-center font-normal pt-1">
                  By booking, you agree to our terms and privacy policy. You can reschedule or cancel up to 2 hours before your visit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Interactive OTP Verification Modal ── */}
      {bookingState === 'otp' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-7 relative">
            <button
              onClick={() => setBookingState('form')}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0f766e] flex items-center justify-center mx-auto mb-3 font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Verify your mobile</h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter the 6-digit verification code sent to <strong className="text-slate-800">{patientPhone}</strong>
              </p>
            </div>

            {/* Clickable Dev Code Preview for Fast Testing */}
            {devCode && (
              <div
                onClick={() => handleFillCode(devCode)}
                className="mb-5 bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between text-xs cursor-pointer hover:bg-slate-800 transition shadow-md group"
                title="Click to auto-fill code"
              >
                <div>
                  <span className="text-[#0f766e] text-[10px] font-bold block uppercase tracking-wider">DEMO VERIFICATION CODE</span>
                  <span className="text-base font-black font-mono tracking-widest text-emerald-400">{devCode}</span>
                </div>
                <span className="text-[11px] bg-slate-800 group-hover:bg-slate-700 px-2.5 py-1 rounded-lg text-slate-300 font-semibold">
                  Auto-fill →
                </span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {errorMessage}
              </div>
            )}

            {/* 6 Digit Input Boxes */}
            <form onSubmit={handleConfirmOtp} className="space-y-6">
              <div className="flex justify-center items-center gap-1 sm:gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`profile-otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    className="w-9 sm:w-11 h-11 sm:h-13 text-center text-lg sm:text-xl font-bold font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-[#0f766e] shadow-2xs"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#0f766e] hover:bg-[#0b5c56] disabled:opacity-60 text-white font-bold rounded-2xl text-sm transition shadow-md"
              >
                {isSubmitting ? 'Verifying code...' : 'Confirm Appointment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmed Appointment Slip Modal ── */}
      {bookingState === 'confirmed' && confirmedSlip && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-8 relative">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Appointment Confirmed!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your consultation slot has been reserved. Please bring this slip to the reception desk.
              </p>
            </div>

            {/* Slip Paper Card */}
            <div className="bg-gradient-to-b from-teal-50/60 to-slate-50 border border-teal-200/80 rounded-2xl p-5 mb-6 space-y-3 font-sans shadow-2xs">
              <div className="flex items-center justify-between border-b border-teal-200/60 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-[#0f766e] uppercase tracking-wider block">CLINIC SLIP NUMBER</span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">{confirmedSlip.slipNumber}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  CONFIRMED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">Doctor</span>
                  <strong className="text-slate-900 font-bold">{confirmedSlip.doctorName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Patient</span>
                  <strong className="text-slate-900 font-bold">{confirmedSlip.patientName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Scheduled Date</span>
                  <strong className="text-slate-900 font-bold">{confirmedSlip.date}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Time Slot</span>
                  <strong className="text-slate-900 font-bold">{confirmedSlip.time}</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-teal-200/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Consultation Fee (Pay at clinic desk)</span>
                  <span className="text-xs text-slate-400">Cash upon arrival</span>
                </div>
                <span className="text-lg font-black text-slate-900 font-mono">
                  {formatCurrency(confirmedSlip.fee)}
                </span>
              </div>

              {confirmedSlip.patientEmail && (
                <div className="pt-2 border-t border-teal-200/60">
                  <div className="bg-sky-50 border border-sky-200/80 rounded-xl p-2.5 text-[11px] text-sky-800 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                    <span>
                      Slip receipt &amp; status updates sent to: <strong>{confirmedSlip.patientEmail}</strong>
                    </span>
                  </div>
                </div>
              )}

              {confirmedSlip.hasLoyaltyDiscount && (
                <div className="pt-2 border-t border-teal-200/60">
                  <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/25 to-amber-500/15 border-2 border-amber-400/90 rounded-2xl p-4 text-xs text-amber-950 space-y-2 shadow-2xs">
                    <div className="flex items-center gap-2 font-black text-amber-950 text-sm">
                      <span className="text-lg">💳</span>
                      <span>VIP Golden Loyalty Card &bull; Application Submitted</span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-auto">
                        Pending Assistant Approval
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed font-semibold">
                      Your 10 verification details have been submitted. Once the clinic assistant confirms your appointment, your Golden VIP Loyalty Card will be approved and ready for pickup at reception!
                    </p>
                    <div className="pt-1 border-t border-amber-300/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
                      <span className="text-amber-950"><strong>Clinic Address:</strong> {confirmedSlip.clinic}</span>
                      {doctor.google_maps_url && (
                        <a
                          href={doctor.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold underline text-amber-900 hover:text-amber-950 flex items-center gap-1"
                        >
                          Google Maps Link <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition"
              >
                Back to Directory
              </button>
              <button
                type="button"
                onClick={onTrackNav}
                className="flex-1 py-3.5 bg-[#0f766e] hover:bg-[#0b5c56] text-white font-bold rounded-xl text-xs transition shadow-md"
              >
                Track Status →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Patient Reviews Modal ── */}
      {showReviewsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 md:p-7 relative max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">Verified Patient Reviews</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PMDC Verified
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {doctor.full_name} &middot; <strong className="text-slate-900">{reviewsSummary ? reviewsSummary.average_rating.toFixed(1) : '5.0'} ★</strong> ({reviewsSummary?.total_reviews || 0} reviews)
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReviewsModal(false);
                  setReviewModalView('list');
                  setReviewError('');
                  setReviewSuccessMsg('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs (Read Reviews vs Mark Review) */}
            <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-2xl mb-5">
              <button
                type="button"
                onClick={() => { setReviewModalView('list'); setReviewError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${reviewModalView === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                All Reviews ({reviewsSummary?.total_reviews || 0})
              </button>
              <button
                type="button"
                onClick={() => { setReviewModalView('write'); setReviewError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${reviewModalView === 'write'
                  ? 'bg-[#0f766e] text-white shadow-xs'
                  : 'text-[#0f766e] hover:bg-teal-50/50'
                  }`}
              >
                <Star className={`w-3.5 h-3.5 ${reviewModalView === 'write' ? 'fill-white' : 'fill-teal-600'}`} />
                Mark / Write Review
              </button>
            </div>

            {/* ── View 1: List of Reviews ── */}
            {reviewModalView === 'list' && (
              <div className="space-y-4">
                {/* Score breakdown highlight */}
                <div className="bg-gradient-to-br from-teal-50/60 via-slate-50 to-white p-4 rounded-2xl border border-teal-100/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {reviewsSummary ? reviewsSummary.average_rating.toFixed(1) : '5.0'}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">/ 5.0</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 mt-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= Math.round(reviewsSummary ? reviewsSummary.average_rating : 5)
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-slate-300'
                            }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Based on genuine completed visits</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewModalView('write')}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#0f766e]/30 text-[#0f766e] hover:bg-[#0f766e] hover:text-white transition-all text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    Leave Review
                  </button>
                </div>

                {loadingReviews ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-[#0f766e]" />
                    <span>Loading verified patient reviews...</span>
                  </div>
                ) : reviewsSummary && reviewsSummary.reviews && reviewsSummary.reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviewsSummary.reviews.map((rev) => (
                      <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs hover:border-slate-200 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{rev.patient_name}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Completed Visit
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(rev.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500 mb-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`}
                            />
                          ))}
                          <span className="text-[11px] text-slate-400 ml-1 font-mono">{rev.patient_phone}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{rev.comment}</p>
                        {rev.tags && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {rev.tags.split(',').filter(Boolean).map((t, idx) => (
                              <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 bg-teal-50 text-[#0f766e] border border-teal-200/60 rounded-md">
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                    <Sparkles className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-800 text-xs">No reviews published yet</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Have you completed a consultation with {doctor.full_name}? Be the first verified patient to share your feedback.
                    </p>
                    <button
                      type="button"
                      onClick={() => setReviewModalView('write')}
                      className="mt-3.5 px-4 py-2 bg-[#0f766e] text-white text-xs font-bold rounded-xl hover:bg-[#0d625b] transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" />
                      Mark First Review
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── View 2: Mark / Write a Review Form ── */}
            {reviewModalView === 'write' && (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="p-3.5 bg-teal-50/70 border border-teal-100 rounded-2xl text-xs text-slate-600 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#0f766e] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-semibold">Verified Patient Security</strong>
                    <span className="text-[11px] text-slate-500">
                      To prevent false reviews, reviews are strictly reserved for patients with a <strong>COMPLETED</strong> appointment with {doctor.full_name}.
                    </span>
                  </div>
                </div>

                {reviewError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block">Verification Notice</strong>
                      <span className="text-[11px] leading-relaxed">{reviewError}</span>
                    </div>
                  </div>
                )}

                {reviewSuccessMsg && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block">Thank You!</strong>
                      <span className="text-[11px] leading-relaxed">{reviewSuccessMsg}</span>
                    </div>
                  </div>
                )}

                {/* Patient Identifier & Verification Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Mobile Number or Digital Slip # <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={reviewIdentifier}
                      onChange={(e) => {
                        setReviewIdentifier(e.target.value);
                        setEligibilityData(null);
                        setReviewError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCheckEligibility();
                        }
                      }}
                      placeholder="e.g. +92 300 123 4567 or DIK-GYNE-20261007-002-72"
                      className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-transparent font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleCheckEligibility()}
                      disabled={isCheckingEligibility}
                      className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 flex-shrink-0"
                    >
                      {isCheckingEligibility ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" />
                          <span>Find Bookings</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter the phone number or slip number used during your clinic visit.
                  </p>
                </div>

                {/* Multiple Completed Appointments Selector */}
                {eligibilityData?.can_review && eligibilityData.completed_appointments.length > 0 && (
                  <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-900">
                        Select Completed Visit to Review:
                      </label>
                      <span className="text-[11px] text-[#0f766e] font-bold">
                        {eligibilityData.completed_appointments.length} completed {eligibilityData.completed_appointments.length === 1 ? 'visit' : 'visits'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {eligibilityData.completed_appointments.map((appt) => {
                        const isSelected = selectedAppointmentId === appt.id;
                        return (
                          <div
                            key={appt.id}
                            onClick={() => {
                              setSelectedAppointmentId(appt.id);
                              if (appt.existing_rating) setReviewRating(appt.existing_rating);
                              if (appt.existing_comment) setReviewComment(appt.existing_comment);
                            }}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isSelected
                              ? 'border-[#0f766e] bg-teal-50/70 ring-1 ring-[#0f766e]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-[#0f766e] bg-[#0f766e]' : 'border-slate-300'
                                }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900">
                                    {appt.slot_date || 'Completed Visit'} {appt.slot_time ? `· ${appt.slot_time}` : ''}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                    COMPLETED
                                  </span>
                                  {appt.already_reviewed && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                      Reviewed ({appt.existing_rating}★)
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  Slip: {appt.slip_number || 'N/A'} &middot; Patient: {appt.patient_name}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-[#0f766e] ml-2 flex-shrink-0">
                              {isSelected ? 'Selected ✓' : 'Select'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {eligibilityData.other_appointments_count > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2 mt-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>
                          Notice: You also have {eligibilityData.other_appointments_count} other booking(s) ({eligibilityData.other_statuses.join(', ')}). Only completed visits can be marked for review.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Rating selection (Interactive 5 Stars) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Your Rating <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setReviewRating(s)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${s <= (hoverRating || reviewRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200 fill-slate-100'
                              }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-700 ml-2">
                      {hoverRating === 5 || (!hoverRating && reviewRating === 5) && '⭐⭐⭐⭐⭐ Excellent'}
                      {hoverRating === 4 || (!hoverRating && reviewRating === 4) && '⭐⭐⭐⭐ Very Good'}
                      {hoverRating === 3 || (!hoverRating && reviewRating === 3) && '⭐⭐⭐ Good'}
                      {hoverRating === 2 || (!hoverRating && reviewRating === 2) && '⭐⭐ Fair'}
                      {hoverRating === 1 || (!hoverRating && reviewRating === 1) && '⭐ Poor'}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Consultation Highlights (Optional)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Accurate diagnosis',
                      'Courteous staff',
                      'Detailed explanation',
                      'Punctual checkup',
                      'Gentle care',
                      'Clean clinic'
                    ].map((tag) => {
                      const isSelected = reviewSelectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setReviewSelectedTags(reviewSelectedTags.filter((t) => t !== tag));
                            } else {
                              setReviewSelectedTags([...reviewSelectedTags, tag]);
                            }
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${isSelected
                            ? 'bg-teal-50 border-teal-400 text-[#0f766e] font-bold shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment Text */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Review & Feedback <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="How was the doctor's diagnosis, explanation of medications, and overall consultation experience?"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-transparent font-medium resize-none leading-relaxed"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => { setReviewModalView('list'); setReviewError(''); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview || isCheckingEligibility}
                    className="px-5 py-2.5 rounded-xl bg-[#0f766e] hover:bg-[#0d625b] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingReview ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Verifying & Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Publish Verified Review
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="mt-16 pt-8 border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 D.I. Khan Care. Care closer to home.</p>
          <div className="flex items-center gap-6 font-medium">
            <button onClick={onBack} className="hover:text-slate-900 transition-colors">Privacy policy</button>
            <button onClick={onBack} className="hover:text-slate-900 transition-colors">Terms of service</button>
            <button onClick={onBack} className="hover:text-slate-900 transition-colors">Contact us</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-4 flex items-center gap-2 text-[11px] text-slate-400">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>For a medical emergency, please call 1122 or visit your nearest emergency department. This service is for scheduled appointments only.</span>
        </div>
      </footer>
    </div>
  );
}

function PatientSection({ openTrackTrigger, onSwitchRole }: { openTrackTrigger?: number; onSwitchRole?: (r: 'patient' | 'assistant' | 'doctor' | 'admin') => void }) {
  const [doctors, setDoctors] = useState<DoctorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocality, setSelectedLocality] = useState('All D.I. Khan');
  const [selectedShift, setSelectedShift] = useState('Any shift');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All specialties');
  const [quickFilter, setQuickFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTrack, setShowTrack] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'105' | '100' | '110'>('105');

  // Profile / booking
  const [profileDoctor, setProfileDoctor] = useState<DoctorData | null>(null);
  const [bookingDoctor, setBookingDoctor] = useState<DoctorData | null>(null);
  const [availableSlots, setAvailableSlots] = useState<SlotData[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Patient form
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [devCodePreview, setDevCodePreview] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [otpError, setOtpError] = useState('');

  // Track
  const [trackPhone, setTrackPhone] = useState('');
  const [trackSlip, setTrackSlip] = useState('');
  const [trackedAppointment, setTrackedAppointment] = useState<AppointmentItem | null>(null);
  const [trackError, setTrackError] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  useEffect(() => {
    if (openTrackTrigger && openTrackTrigger > 0) {
      setShowTrack(true);
    }
  }, [openTrackTrigger]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<DoctorData[]>('/doctors');
      const list = Array.isArray(data) ? data : [];
      setDoctors(list);

      // Deep-link from completion notification email: ?doctor_id=...
      try {
        const params = new URLSearchParams(window.location.search);
        const docIdParam = params.get('doctor_id') || params.get('doctor');
        if (docIdParam && list.length > 0) {
          const match = list.find(d => d.id === docIdParam);
          if (match) {
            setProfileDoctor(match);
          }
        }
      } catch (_) { }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const openBookingModal = async (doctor: DoctorData) => {
    setProfileDoctor(doctor);
    setBookingDoctor(doctor);
    setSelectedSlot(null);
    setOtpSent(false);
    setVerifySuccess(false);
    setStatusMessage('');
    setOtpError('');
    setDevCodePreview(null);
    setOtpDigits(['', '', '', '', '', '']);
    try {
      const cached = clientSlotCache[doctor.id];
      if (cached && (Date.now() - cached.timestamp < 120000)) {
        const nowMs = Date.now();
        const validSlots = cached.slots.filter(s => {
          if (!s.start_time) return false;
          const iso = s.start_time.endsWith('Z') || s.start_time.includes('+') ? s.start_time : s.start_time + 'Z';
          const t = new Date(iso).getTime();
          return !isNaN(t) && t > nowMs;
        });
        setAvailableSlots(validSlots);
        setSlotsLoading(false);
        return;
      }
      setSlotsLoading(true);
      const slots = await apiFetch<SlotData[]>(`/doctors/${doctor.id}/slots`);
      const nowMs = Date.now();
      const validSlots = (Array.isArray(slots) ? slots : []).filter(s => {
        if (!s.start_time) return false;
        const iso = s.start_time.endsWith('Z') || s.start_time.includes('+') ? s.start_time : s.start_time + 'Z';
        const t = new Date(iso).getTime();
        return !isNaN(t) && t > nowMs;
      });
      clientSlotCache[doctor.id] = { timestamp: Date.now(), slots: Array.isArray(slots) ? slots : [] };
      setAvailableSlots(validSlots);
    } catch (err) {
      console.error(err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleRequestBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !bookingDoctor) return;
    try {
      setVerifyLoading(true);
      setStatusMessage('');
      const res: any = await apiFetch('/booking/request', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: bookingDoctor.id,
          slot_id: selectedSlot.id,
          full_name: fullName,
          phone: whatsappNumber,
          email: email,
          whatsapp_number: whatsappNumber,
          notes
        })
      });
      setOtpSent(true);
      if (res.dev_code) {
        setDevCodePreview(res.dev_code);
      }
      setStatusMessage('Verification code sent. Slot held for 10 minutes.');
    } catch (err: any) {
      setStatusMessage(err.message || 'Booking request failed');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleFillDevCode = (code: string) => {
    if (!code) return;
    const digits = code.split('').slice(0, 6);
    while (digits.length < 6) digits.push('');
    setOtpDigits(digits);
  };

  const otpCode = otpDigits.join('');
  const handleOtpDigit = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpDigits];
    next[idx] = val.slice(-1);
    setOtpDigits(next);
    if (val && idx < 5) {
      const nextInput = document.getElementById(`otp-${idx + 1}`);
      if (nextInput) (nextInput as HTMLInputElement).focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || otpCode.length !== 6) return;
    try {
      setVerifyLoading(true);
      setOtpError('');
      await apiFetch('/booking/verify', {
        method: 'POST',
        body: JSON.stringify({
          contact: whatsappNumber,
          code: otpCode,
          slot_id: selectedSlot.id,
          patient_name: fullName.trim(),
          patient_phone: whatsappNumber.trim(),
          patient_email: email.trim()
        })
      });
      setVerifySuccess(true);
      setStatusMessage('Booking submitted! Pending clinic assistant approval.');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid code. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleTrackAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError('');
    setTrackedAppointment(null);
    const cleanP = trackPhone.trim();
    const cleanS = trackSlip.trim();
    if (!cleanP && !cleanS) {
      setTrackError('Please enter your mobile number or digital slip number.');
      return;
    }
    try {
      setTrackLoading(true);
      const bodyPayload: any = {};
      if (cleanP) bodyPayload.phone = cleanP;
      if (cleanS) bodyPayload.slip_number = cleanS;
      const data = await apiFetch<AppointmentItem>('/booking/track', {
        method: 'POST',
        body: JSON.stringify(bodyPayload)
      });
      setTrackedAppointment(data);
    } catch (err: any) {
      setTrackError(err.message || 'Slip number or mobile number does not match any appointment.');
    } finally {
      setTrackLoading(false);
    }
  };

  const subRegions = ['All D.I. Khan', 'Circular Road', 'Cantt', 'University Road', 'Topanwala / Commissionery Bazaar', 'Tank Road / Qayyum Nagar'];
  const shifts = ['Any shift', 'Morning', 'Evening', 'Both shifts'];

  const filteredDoctors = doctors.filter(doc => {
    const matchLoc = selectedLocality === 'All D.I. Khan' || doc.sub_region.toLowerCase().includes(selectedLocality.split('/')[0].trim().toLowerCase());
    const matchShift = selectedShift === 'Any shift' || doc.shift.toLowerCase().includes(selectedShift.toLowerCase());
    const matchSearch = !searchTerm || doc.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) || doc.clinic_address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSpecialty = selectedSpecialty === 'All specialties' || 
      doc.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase()) ||
      (selectedSpecialty.toLowerCase().includes('lap') && doc.specialty.toLowerCase().includes('lap')) ||
      (selectedSpecialty.toLowerCase().includes('face') && doc.specialty.toLowerCase().includes('face'));
    if (!matchLoc || !matchShift || !matchSearch || !matchSpecialty) return false;

    if (quickFilter === 'top_rated') {
      return doc.is_spotlight;
    }
    if (quickFilter === 'fee_under_1500') {
      return (doc.fee_clinic || 0) <= 1500;
    }
    if (quickFilter === 'female') {
      const nameL = doc.full_name.toLowerCase();
      const specL = doc.specialty.toLowerCase();
      return nameL.includes('sadia') || nameL.includes('ayesha') || nameL.includes('fatima') || nameL.includes('amna') || nameL.includes('zainab') || nameL.includes('dr. s') || specL.includes('gyn');
    }
    if (quickFilter === 'today') {
      return getDoctorAvailability(doc).isAvailableToday;
    }
    if (quickFilter === 'circular_road') {
      return doc.sub_region.toLowerCase().includes('circular') || doc.clinic_address.toLowerCase().includes('circular');
    }
    if (quickFilter === 'cantt') {
      return doc.sub_region.toLowerCase().includes('cantt') || doc.clinic_address.toLowerCase().includes('cantt');
    }

    return true;
  });

  // Spotlighted doctors appear first at the top, followed by non-spotlighted doctors
  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    if (a.is_spotlight === b.is_spotlight) return 0;
    return a.is_spotlight ? -1 : 1;
  });

  // Group slots by date in Asia/Karachi (strictly FUTURE slots and days)
  const slotsByDate: Record<string, SlotData[]> = {};
  const nowMs = Date.now();
  const patientTodayPKT = (() => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  })();

  availableSlots.forEach(s => {
    if (!s.start_time) return;
    const d = new Date(s.start_time);
    if (isNaN(d.getTime())) return;
    // Skip slots whose scheduled time has already passed
    if (d.getTime() <= nowMs) return;

    const dk = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
    // Skip days that have passed
    if (dk < patientTodayPKT) return;

    if (!slotsByDate[dk]) slotsByDate[dk] = [];
    slotsByDate[dk].push(s);
  });
  Object.keys(slotsByDate).forEach(k => {
    slotsByDate[k].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  });

  const fmtTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso || '';
      return d.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return iso || '';
    }
  };
  const fmtDate = (dk: string) => {
    try {
      const [y, m, d] = dk.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dk;
    }
  };

  if (profileDoctor) {
    return (
      <DoctorProfileAndBookingView
        doctor={profileDoctor}
        onBack={() => setProfileDoctor(null)}
        onTrackNav={() => {
          setProfileDoctor(null);
          if (onSwitchRole) onSwitchRole('track' as any);
          else setShowTrack(true);
        }}
        onSwitchRole={onSwitchRole}
      />
    );
  }

  return (
    <div style={{ zoom: zoomLevel === '105' ? '1.05' : zoomLevel === '110' ? '1.10' : '1' }} className="transition-all duration-300 mobile-zoom-safe">
      {/* ── Official District Verification Protocol Banner (AI Studio Reference) ── */}
      <div className="bg-[#eaf5ef] border-b border-clinic-200/70 text-slate-800 text-[11px] sm:text-xs py-2 sm:py-2.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-4 h-4 rounded-full bg-clinic-700 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</span>
            <span className="leading-tight sm:leading-normal">
              <strong className="font-bold text-slate-900">District Verification Protocol:</strong> Pre-registered digital tokens are valid at all counters across D.I. Khan.
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse flex-shrink-0" />
              LIVE HOSPITAL SYNC
            </span>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setShowTrack(t => !t)}
              className="text-clinic-800 hover:text-clinic-900 hover:underline font-semibold"
            >
              Counter Guidelines
            </button>
          </div>
        </div>
      </div>

      {/* ── Modern Hero Section with Image Banner ── */}
      <div className="relative bg-[#f0f6f3] border-b border-clinic-100/80 pt-5 sm:pt-9 lg:pt-11 pb-0">
        {/* Right photo filling the right side, seamlessly dissolving into the background on the left */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[58%] xl:w-[55%] h-full pointer-events-none overflow-hidden select-none">
          <img
            src="/images/private-clinic-consultation.jpg"
            alt="Doctor consultation in a private clinic in Dera Ismail Khan"
            className="w-full h-full object-cover object-[center_right] lg:object-center opacity-40 sm:opacity-75 lg:opacity-100"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 15%, rgba(0,0,0,0.7) 35%, black 60%)',
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 15%, rgba(0,0,0,0.7) 35%, black 60%)'
            }}
            loading="eager"
          />
          {/* Broad, soft linear gradient wash matching container background (#f0f6f3) */}
          <div
            className="absolute inset-y-0 left-0 w-full sm:w-1/2 bg-gradient-to-r from-[#f0f6f3] via-[#f0f6f3]/90 sm:via-[#f0f6f3]/80 to-transparent pointer-events-none"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 w-full mb-3 sm:mb-4">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-clinic-200/80 text-[10px] sm:text-[11px] font-bold text-clinic-800 uppercase tracking-widest mb-3 sm:mb-4 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Local Care. A Clearer Next Step.</span>
          </div>

          {/* Heading */}
          <div className="max-w-xl lg:max-w-2xl">
            <h1
              className="text-2xl sm:text-4xl lg:text-[2.85rem] font-black text-slate-900 leading-[1.25] sm:leading-[1.3] lg:leading-[1.35] tracking-wide"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Book a trusted doctor
              <span className="block mt-1 sm:mt-2 text-slate-900">of D.I. Khan</span>
            </h1>
            <p className="text-xs sm:text-base text-slate-600 mt-2.5 sm:mt-4 leading-relaxed font-normal max-w-lg">
              Explore clinics across Dera Ismail Khan. Choose a time, verify your request, and pay cash at reception.
            </p>

            {/* Reassurance Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 sm:mt-4 text-xs sm:text-sm text-slate-700 font-semibold">
              <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full border border-clinic-200/70 shadow-2xs text-[11px] sm:text-xs">
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] sm:text-[10px] font-bold">✓</span>
                No patient password
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full border border-clinic-200/70 shadow-2xs text-[11px] sm:text-xs">
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] sm:text-[10px] font-bold">✓</span>
                Live in-app tracking
              </span>
            </div>

            {/* Tablet & Mobile Safe Inline Anchor (< 1024px, never overlaps photo) */}
            <div className="block lg:hidden mt-3.5 pt-3 border-t border-clinic-200/60 w-full max-w-[270px]">
              <Hero3DPass isStatic={true} />
            </div>
          </div>
        </div>

        {/* ── 3D Timothy Ricks-Style Glassmorphic Digital Patient Pass (Desktop >= 1024px) ── */}
        {/* Moved rightwards near patient so the bottom edge touches the subject's mouth level */}
        <div
          className="absolute z-10 pointer-events-auto hidden lg:block -translate-x-1/2 select-none"
          style={{
            left: '77%',
            top: '14%'
          }}
        >
          <Hero3DPass />
        </div>

        {/* ── Unified Horizontal Search Bar docked: exactly half on image banner on desktop, clean spaced on mobile ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-20 w-full mt-5 sm:mt-10 lg:mt-12 mb-3 sm:-mb-12">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 sm:gap-3 items-center">
              {/* Specialty Dropdown */}
              <div className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white focus-within:bg-white focus-within:border-clinic-500 transition-all">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  <Stethoscope className="w-3.5 h-3.5 text-clinic-700" /> Specialty
                </div>
                <select
                  value={selectedSpecialty}
                  onChange={e => { setSelectedSpecialty(e.target.value); setQuickFilter('all'); }}
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {['All specialties', 'General Physician', 'General Surgeon', 'Laparoscopic Surgeon', 'Face Aesthetic Surgeon', 'Cardiologist', 'Dermatologist', 'Gynaecologist', 'ENT Specialist', 'Ophthalmologist', 'Orthopedic Surgeon', 'Dentist', 'Pediatrician', 'Neurologist', 'Urologist'].map(s => (
                    <option key={s} value={s}>{s === 'All specialties' ? 'All Specialties' : s}</option>
                  ))}
                </select>
              </div>

              {/* Area / Vicinity Dropdown */}
              <div className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white focus-within:bg-white focus-within:border-clinic-500 transition-all">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  <MapPin className="w-3.5 h-3.5 text-clinic-700" /> Area / Vicinity
                </div>
                <select
                  value={selectedLocality}
                  onChange={e => { setSelectedLocality(e.target.value); setQuickFilter('all'); }}
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {subRegions.map(r => (
                    <option key={r} value={r}>{r === 'All D.I. Khan' ? 'All Areas' : r}</option>
                  ))}
                </select>
              </div>

              {/* Shift Timing Dropdown */}
              <div className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white focus-within:bg-white focus-within:border-clinic-500 transition-all">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  <Clock className="w-3.5 h-3.5 text-clinic-700" /> Shift Timing
                </div>

                <select
                  value={selectedShift}
                  onChange={e => setSelectedShift(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {shifts.map(s => (
                    <option key={s} value={s}>{s === 'Any shift' ? 'All Shifts' : s}</option>
                  ))}
                </select>
              </div>

              {/* Search Button */}
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('doctors-results-grid');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full h-full min-h-[46px] sm:min-h-[50px] px-6 py-2.5 sm:py-3 bg-clinic-800 hover:bg-clinic-900 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 tracking-wide group cursor-pointer"
              >
                <Search className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Search Doctors</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Outside Image Box: Horizontal Specialty Filters Row (Responsive spacing) ── */}
      <div className="bg-white border-b border-slate-100 pt-3 sm:pt-[60px] lg:pt-[60px] pb-3 sm:pb-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs touch-scroll">
            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider mr-1 flex items-center gap-1">
              Specialties:
            </span>
            {[
              { name: 'All specialties', label: 'All Specialties', emoji: '⚪' },
              { name: 'General Physician', label: 'General Physician', emoji: '🩺' },
              { name: 'General Surgeon', label: 'General Surgeon', emoji: '🩹' },
              { name: 'Laparoscopic Surgeon', label: 'Laparoscopic Surgeon', emoji: '🔬' },
              { name: 'Face Aesthetic Surgeon', label: 'Face Aesthetic Surgeon', emoji: '🪞' },
              { name: 'Cardiologist', label: 'Cardiologist', emoji: '🫀' },
              { name: 'Dermatologist', label: 'Dermatologist', emoji: '✨' },
              { name: 'Gynaecologist', label: 'Gynaecologist', emoji: '🌸' },
              { name: 'Pediatrician', label: 'Pediatrician', emoji: '👶' },
              { name: 'ENT Specialist', label: 'ENT Specialist', emoji: '👂' },
              { name: 'Orthopedic Surgeon', label: 'Orthopedic Surgeon', emoji: '🦴' },
              { name: 'Ophthalmologist', label: 'Eye Specialist', emoji: '👁️' },
              { name: 'Dentist', label: 'Dentist', emoji: '🦷' },
              { name: 'Neurologist', label: 'Neurologist', emoji: '🧠' },
              { name: 'Urologist', label: 'Urologist', emoji: '🔬' },
            ].map(spec => {
              const isActive = selectedSpecialty.toLowerCase() === spec.name.toLowerCase();
              return (
                <button
                  key={spec.name}
                  type="button"
                  onClick={() => {
                    setSelectedSpecialty(spec.name);
                    setQuickFilter('all');
                  }}
                  className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all shadow-2xs cursor-pointer group flex items-center ${isActive
                    ? 'bg-clinic-800 text-white shadow-sm border border-clinic-800 font-bold'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:border-clinic-300 hover:bg-clinic-50/50'
                    }`}
                >
                  <span
                    className="inline-block text-xs mr-1.5 select-none transition-transform group-hover:scale-110"
                    style={{ filter: 'grayscale(100%)', opacity: isActive ? 1 : 0.7 }}
                  >
                    {spec.emoji}
                  </span>
                  <span>{spec.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Full-Width Doctor Results Grid (Responsive padding) ── */}
      <div id="doctors-results-grid" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Track appointment panel (expandable) */}
        {showTrack && (
          <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-lg" style={{ fontFamily: 'Outfit,sans-serif' }}>Track Your Visit</h3>
              <button onClick={() => setShowTrack(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Track your appointment status and digital slip without a password.</p>
            <form onSubmit={handleTrackAppointment} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-600 block">Mobile / WhatsApp Number</label>
                    <span className="text-[10px] text-slate-400 font-medium">Optional if Slip entered</span>
                  </div>
                  <input
                    type="text"
                    placeholder="0300 1234567 or +92300..."
                    value={trackPhone}
                    onChange={e => setTrackPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-clinic-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-600 block">Digital Slip Number</label>
                    <span className="text-[10px] text-slate-400 font-medium">Optional if phone entered</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. SLIP #DIK-... or DIK-..."
                    value={trackSlip}
                    onChange={e => setTrackSlip(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-clinic-400 font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={trackLoading}
                className="w-full py-2.5 bg-clinic-700 hover:bg-clinic-800 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {trackLoading ? 'Searching...' : 'Find Appointment'}
              </button>
            </form>
            {trackError && <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{trackError}</div>}
            {trackedAppointment && (
              <div className="mt-4 p-4 bg-clinic-900 rounded-xl text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${trackedAppointment.status?.toUpperCase() === 'COMPLETED'
                    ? 'bg-emerald-600 text-white'
                    : trackedAppointment.status?.toUpperCase() === 'CANCELLED' || trackedAppointment.status?.toUpperCase() === 'REJECTED'
                      ? 'bg-rose-600 text-white'
                      : trackedAppointment.status?.toUpperCase() === 'PENDING_ASSISTANT_APPROVAL' || trackedAppointment.status?.toUpperCase() === 'PENDING'
                        ? 'bg-amber-600 text-white'
                        : 'bg-clinic-700'
                    }`}>
                    {trackedAppointment.status}
                  </span>
                  <RealtimeLive />
                </div>
                {trackedAppointment.status?.toUpperCase() === 'COMPLETED' ? (
                  <div className="pt-2 border-t border-white/10 space-y-1">
                    <p className="text-sm font-bold text-emerald-300">✓ Consultation Completed</p>
                    <p className="text-xs text-white">
                      You have completed your appointment with <span className="font-semibold">{trackedAppointment.doctor_name || 'your doctor'}</span>
                      {trackedAppointment.slot_date ? ` on ${trackedAppointment.slot_date}` : ''}
                      {trackedAppointment.slot_time ? ` at ${trackedAppointment.slot_time}` : ''}.
                    </p>
                    <p className="text-[11px] text-clinic-300">Slip #{trackedAppointment.slip_number} &bull; {formatCurrency(trackedAppointment.fee_amount)} ({trackedAppointment.payment_status})</p>
                  </div>
                ) : trackedAppointment.status?.toUpperCase() === 'CANCELLED' || trackedAppointment.status?.toUpperCase() === 'REJECTED' ? (
                  <div className="pt-2 border-t border-white/10 space-y-1">
                    <p className="text-sm font-bold text-rose-300">✕ Appointment {trackedAppointment.status?.toUpperCase() === 'REJECTED' ? 'Rejected' : 'Cancelled'}</p>
                    <p className="text-xs text-white">
                      Your appointment with <span className="font-semibold">{trackedAppointment.doctor_name || 'your doctor'}</span> has been {trackedAppointment.status?.toUpperCase() === 'REJECTED' ? 'rejected' : 'cancelled'}.
                    </p>
                    {trackedAppointment.notes && (
                      <p className="text-[11px] text-rose-200">Reason: {trackedAppointment.notes}</p>
                    )}
                    <p className="text-[11px] text-clinic-300">Slip #{trackedAppointment.slip_number}</p>
                  </div>
                ) : (trackedAppointment.status?.toUpperCase() === 'PENDING_ASSISTANT_APPROVAL' || trackedAppointment.status?.toUpperCase() === 'PENDING') ? (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <p className="text-sm font-bold text-amber-300">⏳ Pending Assistant Approval</p>
                    <p className="text-xs text-amber-100 leading-relaxed font-medium">
                      Try again later. The clinic assistant has not checked your request yet. Please try after some time, or when the assistant approves your request, you will receive a message on your number.
                    </p>
                    <p className="text-[11px] text-amber-200/80">Slip #{trackedAppointment.slip_number} &bull; Doctor: {trackedAppointment.doctor_name || 'Specialist'}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-clinic-300">Slip Number: <span className="text-white font-mono font-bold text-sm">#{trackedAppointment.slip_number}</span></p>
                    <p className="text-xs text-clinic-300">Doctor: <span className="text-white font-semibold">{trackedAppointment.doctor_name}</span></p>
                    <p className="text-xs text-clinic-300">Fee: <span className="text-white font-bold font-mono">{formatCurrency(trackedAppointment.fee_amount)}</span> &bull; {trackedAppointment.payment_status}</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Text Filter, Display Zoom Controller & Refined Quick-Filters Bar */}
        <div className="space-y-3 mb-6 pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by doctor name, specialty, clinic..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-clinic-500 transition-all font-medium"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                    ✕
                  </button>
                )}
              </div>
              {(selectedLocality !== 'All D.I. Khan' || selectedShift !== 'Any shift' || selectedSpecialty !== 'All specialties' || quickFilter !== 'all' || searchTerm) && (
                <button
                  onClick={() => { setSelectedLocality('All D.I. Khan'); setSelectedShift('Any shift'); setSelectedSpecialty('All specialties'); setQuickFilter('all'); setSearchTerm(''); }}
                  className="text-xs text-clinic-700 hover:text-clinic-900 font-semibold whitespace-nowrap hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 self-end sm:self-auto text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Display Zoom:</span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setZoomLevel('100')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${zoomLevel === '100' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel('105')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${zoomLevel === '105' ? 'bg-clinic-700 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  ★ 105% Luxury
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel('110')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${zoomLevel === '110' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  110%
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider mr-1">
              Quick Filter:
            </span>
            {[
              { id: 'all', label: 'All Doctors' },
              { id: 'today', label: 'Available Today' },
              { id: 'top_rated', label: 'Top Rated 4.8+' },
              { id: 'fee_under_1500', label: 'Fee < Rs. 1500' },
              { id: 'female', label: 'Female Doctors' },
              { id: 'circular_road', label: 'Circular Road' },
              { id: 'cantt', label: 'Cantt' },
            ].map(chip => {
              const isActive = quickFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    if (isActive && chip.id !== 'all') {
                      setQuickFilter('all');
                    } else {
                      setQuickFilter(chip.id);
                      if (chip.id === 'all') {
                        setSelectedLocality('All D.I. Khan');
                        setSelectedShift('Any shift');
                      } else if (chip.id === 'circular_road') {
                        setSelectedLocality('Circular Road');
                      } else if (chip.id === 'cantt') {
                        setSelectedLocality('Cantt');
                      }
                    }
                  }}
                  className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all shadow-2xs cursor-pointer ${isActive
                    ? 'bg-slate-800 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200/60'
                    }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 text-sm">
            <div className="w-8 h-8 border-2 border-clinic-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading verified doctors...
          </div>
        ) : (
          <>
            {/* Unified Doctors Grid - Spotlighted shown first */}
            {sortedDoctors.length > 0 && (
              <div className="mb-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                      Verified Specialists &amp; Doctors in D.I. Khan
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {sortedDoctors.length} available doctor profiles &middot; PMDC-verified specialists with active clinic schedules
                    </p>
                  </div>
                  {sortedDoctors.some(d => d.is_spotlight) && (
                    <span className="self-start sm:self-auto text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/80 shadow-2xs flex items-center gap-1.5">
                      <span className="text-amber-500">★</span> Featured Specialists First
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedDoctors.map(doctor => (
                    <DoctorCard
                      key={doctor.id}
                      doctor={doctor}
                      onBook={openBookingModal}
                      onProfile={setProfileDoctor}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredDoctors.length === 0 && (
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl mx-auto mb-3">
                  🔍
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">No doctors found</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">We couldn't find any doctor matching your current filter selections.</p>
                <button
                  onClick={() => { setSelectedLocality('All D.I. Khan'); setSelectedShift('Any shift'); setSelectedSpecialty('All specialties'); setQuickFilter('all'); setSearchTerm(''); }}
                  className="mt-4 px-4 py-2 bg-clinic-700 hover:bg-clinic-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── AI Health Assistant Chatbot (Roman Urdu & English) ── */}
      <HealthChatbot
        doctors={doctors}
        onBook={openBookingModal}
        onProfile={setProfileDoctor}
        onTrack={() => {
          setShowTrack(true);
          const el = document.getElementById('doctors-results-grid');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* ── Rich Doctor Profile View Modal ── */}
      {profileDoctor && (
        <DoctorProfileModal
          doctor={profileDoctor}
          onClose={() => setProfileDoctor(null)}
          onBook={() => {
            const doc = profileDoctor;
            setProfileDoctor(null);
            openBookingModal(doc);
          }}
          allDoctors={doctors}
          onSelectDoctor={setProfileDoctor}
        />
      )}

      {/* ── Booking Modal (With Interactive OTP) ── */}
      {bookingDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto animate-fade-in">
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg" style={{ fontFamily: 'Outfit,sans-serif' }}>Book Clinic Visit</h3>
                <p className="text-xs text-clinic-700 font-medium">{bookingDoctor.full_name} &bull; {bookingDoctor.specialty}</p>
              </div>
              <button onClick={() => setBookingDoctor(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6 text-xs">
                <span className={`font-semibold ${!otpSent ? 'text-clinic-700' : 'text-slate-400'}`}>1 &bull; Choose slot</span>
                <span className="text-slate-300">&rarr;</span>
                <span className={`font-semibold ${otpSent && !verifySuccess ? 'text-clinic-700' : 'text-slate-400'}`}>2 &bull; Verify code</span>
                <span className="text-slate-300">&rarr;</span>
                <span className={`font-semibold ${verifySuccess ? 'text-clinic-700' : 'text-slate-400'}`}>3 &bull; Confirmed</span>
              </div>

              {statusMessage && (
                <div className="mb-4 p-3 bg-clinic-50 border border-clinic-200 rounded-xl text-xs text-clinic-900 font-medium">
                  {statusMessage}
                </div>
              )}

              {/* Dev OTP banner (Clickable to auto-fill) */}
              {devCodePreview && !verifySuccess && (
                <div
                  onClick={() => handleFillDevCode(devCodePreview)}
                  className="mb-4 bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between text-xs cursor-pointer hover:bg-slate-800 transition-all shadow-md group"
                  title="Click to auto-fill this verification code"
                >
                  <div>
                    <span className="text-clinic-400 font-bold uppercase tracking-wider text-[10px] block">DEMO VERIFICATION CODE</span>
                    <span className="text-slate-300 text-[11px]">Click here to auto-fill into boxes below &rarr;</span>
                  </div>
                  <span className="font-mono font-bold text-xl tracking-widest text-emerald-400 bg-white/10 px-3 py-1 rounded-lg group-hover:scale-105 transition-transform">
                    {devCodePreview}
                  </span>
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleRequestBooking} className="space-y-5">
                  {/* Slot selection */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-2">1. Choose your appointment slot</label>
                    {slotsLoading ? (
                      <div className="text-xs text-slate-500 py-4 text-center">Checking slot availability...</div>
                    ) : availableSlots.length === 0 || Object.keys(slotsByDate).length === 0 ? (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                        No upcoming slots currently available for this doctor. Please check back soon or choose another doctor.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-56 overflow-y-auto rounded-xl border border-slate-100 p-2 bg-slate-50/50">
                        {Object.entries(slotsByDate).map(([dk, dSlots]) => (
                          <div key={dk} className="bg-white rounded-xl border border-slate-200 p-3">
                            <p className="text-[11px] font-bold text-clinic-800 mb-2 flex items-center gap-1">
                              <span>📅</span> {fmtDate(dk)}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
                              {dSlots.map(slot => {
                                const isSelected = selectedSlot?.id === slot.id;
                                return (
                                  <button
                                    type="button"
                                    key={slot.id}
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`py-2 rounded-lg text-[11px] font-semibold border text-center transition-all ${isSelected
                                      ? 'bg-clinic-700 text-white border-clinic-700 shadow-sm'
                                      : 'bg-white text-slate-700 border-slate-200 hover:border-clinic-400 hover:bg-clinic-50'
                                      }`}
                                  >
                                    {fmtTime(slot.start_time)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedSlot && (
                      <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                        <span>✓</span> Selected time: <strong>{fmtTime(selectedSlot.start_time)}</strong> (10-minute temporary lock)
                      </div>
                    )}
                  </div>

                  {/* Patient details */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-700 block">2. Patient Details</label>
                    <input
                      type="text"
                      placeholder="Patient Full Name"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-clinic-400 placeholder:text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="WhatsApp / Phone (e.g. +923001234567)"
                      value={whatsappNumber}
                      onChange={e => setWhatsappNumber(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-clinic-400 placeholder:text-slate-400"
                    />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-clinic-400 placeholder:text-slate-400"
                    />
                    <textarea
                      placeholder="Reason for visit / symptoms (optional)"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-clinic-400 placeholder:text-slate-400 resize-none"
                    />
                  </div>

                  {/* Payment notice */}
                  <div className="p-3 bg-clinic-50 border border-clinic-100 rounded-xl text-xs text-clinic-900">
                    <strong>Pay {formatCurrency(bookingDoctor.fee_clinic)} cash at clinic desk</strong>
                    <p className="text-clinic-700 mt-0.5">No online payment required. Pay at the clinic counter upon arrival.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedSlot || verifyLoading}
                    className="w-full py-3 bg-clinic-700 hover:bg-clinic-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
                  >
                    {verifyLoading ? 'Locking slot...' : 'Lock Slot & Send Verification Code'}
                  </button>
                </form>
              ) : !verifySuccess ? (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-slate-700">Enter Verification Code</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">Passwordless</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      Enter the 6-digit code for <strong>{whatsappNumber}</strong>. Valid for 10 minutes.
                    </p>

                    {/* 6 OTP boxes */}
                    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4">
                      {otpDigits.map((d, i) => (
                        <input
                          key={i}
                          id={`otp-${i}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={e => handleOtpDigit(i, e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Backspace' && !d && i > 0) {
                              (document.getElementById(`otp-${i - 1}`) as HTMLInputElement)?.focus();
                            }
                          }}
                          className={`w-9 sm:w-12 h-11 sm:h-14 text-center text-base sm:text-xl font-bold border rounded-xl focus:outline-none focus:ring-2 transition-all ${otpError
                            ? 'border-rose-400 focus:ring-rose-300 bg-rose-50'
                            : 'border-slate-300 focus:ring-clinic-400 focus:border-clinic-400 bg-white'
                            }`}
                          style={{ fontFamily: 'Outfit,monospace' }}
                        />
                      ))}
                    </div>

                    {otpError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 mb-3">{otpError}</div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={verifyLoading || otpCode.length !== 6}
                    className="w-full py-3 bg-clinic-700 hover:bg-clinic-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
                  >
                    {verifyLoading ? 'Verifying...' : 'Verify & Submit Appointment'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1" style={{ fontFamily: 'Outfit,sans-serif' }}>Appointment Submitted!</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">Your visit is in the reception queue. Your digital slip will be issued upon assistant confirmation.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Pending assistant approval
                  </div>
                  <div className="space-y-2 mt-4">
                    <button
                      onClick={() => {
                        setBookingDoctor(null);
                        if (onSwitchRole) {
                          onSwitchRole('track' as any);
                        } else {
                          setShowTrack(true);
                        }
                      }}
                      className="block w-full py-3 bg-clinic-700 hover:bg-clinic-800 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
                    >
                      Track My Appointment &amp; Slip &rarr;
                    </button>
                    <button
                      onClick={() => setBookingDoctor(null)}
                      className="block w-full py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Doctor Card Component (Luxurious elevated design with subtle hover zoom) ──────
function DoctorCard({ doctor, onBook, onProfile }: { doctor: DoctorData; onBook: (d: DoctorData) => void; onProfile: (d: DoctorData) => void }) {
  const initials = doctor.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const avail = getDoctorAvailability(doctor);
  return (
    <div className={`group relative bg-white rounded-3xl border transition-all duration-300 ease-out flex flex-col justify-between overflow-hidden ${doctor.is_spotlight
      ? 'border-amber-200/90 shadow-md shadow-amber-50 hover:shadow-2xl hover:shadow-amber-100/60 hover:border-amber-300 hover:-translate-y-1.5 hover:scale-[1.018]'
      : 'border-slate-200/90 shadow-sm hover:shadow-2xl hover:shadow-slate-200/70 hover:border-clinic-300 hover:-translate-y-1.5 hover:scale-[1.018]'
      }`}>
      {/* Subtle luxury ambient glow for spotlight cards */}
      {doctor.is_spotlight && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
      )}

      {/* ── Full Box Width Doctor Image Header ── */}
      <div className="relative w-full h-56 sm:h-72 bg-slate-900 overflow-hidden flex-shrink-0">
        <img
          src={getDoctorProfileImage(doctor, 500)}
          alt={doctor.full_name}
          className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
            const fallback = (e.target as HTMLElement).nextElementSibling;
            if (fallback) (fallback as HTMLElement).style.display = 'flex';
          }}
        />
        <div
          style={{ display: 'none' }}
          className="w-full h-full bg-gradient-to-br from-clinic-800 via-clinic-900 to-slate-950 text-white flex items-center justify-center font-extrabold text-4xl"
        >
          {initials}
        </div>

        {/* Gradient dark vignette over bottom & top of image for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-black/15 to-slate-950/40 pointer-events-none" />

        {/* Top Badges (floating over image) */}
        <div className="absolute top-2.5 sm:top-3.5 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 flex items-center justify-between pointer-events-none">
          {doctor.is_spotlight ? (
            <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-amber-950 bg-amber-300/95 backdrop-blur-md px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-md border border-amber-200/80">
              <span className="text-amber-600">★</span> Spotlight Specialist
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-emerald-950 bg-emerald-300/95 backdrop-blur-md px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-md border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" /> Verified Doctor
            </span>
          )}
          <span className="text-[10px] sm:text-[11px] font-bold text-white bg-slate-900/85 backdrop-blur-md px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-white/20 capitalize shadow-sm inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-clinic-300" />
            <span>{avail.shiftBadge}</span>
          </span>
        </div>

        {/* Bottom doctor label on image */}
        <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 flex items-center justify-between pointer-events-none gap-2">
          {doctor.verification_status === 'verified' && (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-300 bg-slate-950/80 backdrop-blur-md px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-emerald-500/30 shadow-xs flex-shrink-0">
              <Check className="w-3 h-3 stroke-[3] text-emerald-400" /> PMDC Verified
            </span>
          )}
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-200 bg-slate-950/80 backdrop-blur-md px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-white/10 ml-auto shadow-xs truncate max-w-[140px] sm:max-w-none">
            {doctor.sub_region}, D.I. Khan
          </span>
        </div>
      </div>

      {/* ── Card Body Content ── */}
      <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Doctor Name & Specialty */}
          <div className="mb-4">
            <h3 className="font-extrabold text-slate-900 text-xl leading-tight group-hover:text-clinic-800 transition-colors" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {doctor.full_name}
            </h3>
            <p className="text-xs font-bold text-clinic-700 mt-1 uppercase tracking-wider">
              {doctor.specialty} Specialist
            </p>
            {doctor.qualification && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {doctor.qualification}
              </p>
            )}
          </div>

          {/* Location line - Clean, unboxed, airy */}
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-4">
            <MapPin className="w-3.5 h-3.5 text-clinic-600 flex-shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-slate-800">{doctor.clinic_address}</span>
              <span className="text-slate-300 mx-1.5">&bull;</span>
              <span className="text-slate-500">{doctor.sub_region}</span>
            </div>
          </div>

          {/* Real-Time Today Availability Badge */}
          <div className="flex items-center justify-between mb-3.5 pt-2 border-t border-slate-100">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 sm:py-1 rounded-full border shadow-2xs ${avail.todayBadgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${avail.isAvailableToday ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'}`} />
              {avail.todayBadgeText}
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
              {avail.statusText}
            </span>
          </div>

          {/* Fee & Next Available - Clean, balanced typography with live indicator */}
          <div className="pt-2 pb-1 border-t border-slate-100 mb-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fee</p>
              <p className="font-extrabold text-slate-900 text-lg font-mono tracking-tight leading-none mt-1">
                {formatCurrency(doctor.fee_clinic)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Next Slot</p>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${avail.nextSlotClass}`} />
                <span>{avail.nextSlotText}</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Profile & Book CTA */}
        <button
          onClick={() => onProfile(doctor)}
          className="w-full py-3.5 bg-gradient-to-r from-clinic-700 via-clinic-800 to-clinic-900 hover:from-clinic-800 hover:to-slate-950 text-white font-bold rounded-2xl text-sm transition-all duration-200 shadow-md hover:shadow-xl hover:scale-[1.015] active:scale-[0.99] flex items-center justify-center gap-2 tracking-wide group/btn"
        >
          <span>Book Appointment</span>
          <span className="text-xs opacity-80 group-hover/btn:translate-x-1 transition-transform">&rarr;</span>
        </button>
      </div>
    </div>
  );
}


const HOURS_12 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES_STEP = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

function parse24to12(timeStr: string = '09:00') {
  if (!timeStr || !timeStr.includes(':')) {
    return { hour: '09', minute: '00', period: 'AM' };
  }
  const [hRaw, mRaw] = timeStr.split(':');
  let h = parseInt(hRaw, 10);
  if (isNaN(h)) h = 9;
  const m = mRaw ? mRaw.padStart(2, '0') : '00';
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return {
    hour: String(h).padStart(2, '0'),
    minute: ['00', '15', '30', '45'].includes(m) ? m : '00',
    period
  };
}

function format12to24(hour: string, minute: string, period: string) {
  let h = parseInt(hour, 10);
  if (isNaN(h)) h = 9;
  if (period === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, '0')}:${(minute || '00').padStart(2, '0')}`;
}

function TimePickerDropdowns({
  label,
  hour,
  minute,
  period,
  onHourChange,
  onMinuteChange,
  onPeriodChange,
  disabled
}: {
  label: string;
  hour: string;
  minute: string;
  period: string;
  onHourChange: (v: string) => void;
  onMinuteChange: (v: string) => void;
  onPeriodChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      <div className={`inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <select
          value={hour}
          disabled={disabled}
          onChange={e => onHourChange(e.target.value)}
          aria-label={`${label} Hour`}
          className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
        >
          {HOURS_12.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-slate-400 font-bold text-xs">:</span>
        <select
          value={minute}
          disabled={disabled}
          onChange={e => onMinuteChange(e.target.value)}
          aria-label={`${label} Minute`}
          className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
        >
          {MINUTES_STEP.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={period}
          disabled={disabled}
          onChange={e => onPeriodChange(e.target.value)}
          aria-label={`${label} Period`}
          className="bg-clinic-50 border border-clinic-200 text-clinic-800 text-[11px] font-bold rounded-md px-1 py-0.5 ml-0.5 focus:outline-hidden cursor-pointer"
        >
          {PERIODS.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

const WEEKDAY_OPTIONS = [
  { id: 'monday', label: 'Mon', full: 'Monday' },
  { id: 'tuesday', label: 'Tue', full: 'Tuesday' },
  { id: 'wednesday', label: 'Wed', full: 'Wednesday' },
  { id: 'thursday', label: 'Thu', full: 'Thursday' },
  { id: 'friday', label: 'Fri', full: 'Friday' },
  { id: 'saturday', label: 'Sat', full: 'Saturday' },
  { id: 'sunday', label: 'Sun', full: 'Sunday' },
];

function AssistantSection({ onSwitchRole }: { onSwitchRole?: (r: 'patient' | 'assistant' | 'doctor' | 'admin') => void }) {
  const [queue, setQueue] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [appointmentActionLoading, setAppointmentActionLoading] = useState<{ id: string; action: 'approve' | 'reject' | 'paid' | 'cancel' | 'complete' } | null>(null);
  const [reschedLoading, setReschedLoading] = useState(false);
  const [selectedLoyaltyAppt, setSelectedLoyaltyAppt] = useState<AppointmentItem | null>(null);

  // Assistant Login State
  const [token, setToken] = useState(localStorage.getItem('assistant_token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Reception Desk State
  const [myDoctors, setMyDoctors] = useState<any[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => {
    return localStorage.getItem('assistant_selected_doctor_id') || '';
  });
  const [portalView, setPortalView] = useState<'select' | 'portal'>(() => {
    return localStorage.getItem('assistant_selected_doctor_id') ? 'portal' : 'select';
  });
  const [deskTab, setDeskTab] = useState<'queue' | 'schedule' | 'smart_resched' | 'cash' | 'all' | 'pos'>('queue');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [callingOrderActive, setCallingOrderActive] = useState<boolean>(() => {
    return localStorage.getItem('asst_calling_order') === 'true';
  });

  // ── POS (Point of Sale) & Walk-In Desk State ──
  interface PosSlotItem {
    id: string;
    doctor_id: string;
    start_time: string;
    end_time: string;
    start_time_fmt: string;
    end_time_fmt: string;
    daily_slot_number: number;
    status: string;
    is_emergency?: boolean;
  }
  interface PosDayItem {
    date: string;
    label: string;
    date_fmt: string;
    is_today: boolean;
    is_tomorrow: boolean;
    is_off_day?: boolean;
    total_slots: number;
    available_count: number;
    slots: PosSlotItem[];
  }

  const [posDays, setPosDays] = useState<PosDayItem[]>([]);
  const [posLoadingDays, setPosLoadingDays] = useState<boolean>(false);
  const [selectedPosDate, setSelectedPosDate] = useState<string>('');
  const [selectedPosSlot, setSelectedPosSlot] = useState<PosSlotItem | null>(null);
  const [creatingEmergencySlot, setCreatingEmergencySlot] = useState<boolean>(false);

  // Emergency Slot Timing Selection State
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [emgModalDate, setEmgModalDate] = useState<string>('');
  const [emgHour, setEmgHour] = useState<string>('08');
  const [emgMinute, setEmgMinute] = useState<string>('30');
  const [emgPeriod, setEmgPeriod] = useState<'AM' | 'PM'>('PM');
  const [emgDuration, setEmgDuration] = useState<number>(20);

  // Patient Registration & Phone Lookup
  const [posPatientName, setPosPatientName] = useState<string>('');
  const [posPatientPhone, setPosPatientPhone] = useState<string>('');
  const [posPatientEmail, setPosPatientEmail] = useState<string>('');
  const [posNotes, setPosNotes] = useState<string>('');
  const [patientLookupResults, setPatientLookupResults] = useState<any[]>([]);
  const [patientLookupLoading, setPatientLookupLoading] = useState<boolean>(false);

  // Fee & POS Billing
  const [posFee, setPosFee] = useState<number>(1000);
  const [posPaymentMode, setPosPaymentMode] = useState<'PENDING_CASH' | 'PAID'>('PENDING_CASH');
  const [posCashTendered, setPosCashTendered] = useState<string>('');
  const [posSubmitting, setPosSubmitting] = useState<boolean>(false);
  const [posError, setPosError] = useState<string>('');
  const [posSuccessReceipt, setPosSuccessReceipt] = useState<any | null>(null);

  // Handle global auth expiration
  useEffect(() => {
    const handleAuthExpired = (e: any) => {
      if (e?.detail?.role === 'assistant') {
        localStorage.removeItem('assistant_token');
        setToken('');
        setMyDoctors([]);
        setQueue([]);
        setAsstSlots([]);
        setLoginError(e.detail.message || 'Your session expired. Please sign in again.');
      }
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  // Schedule & Slot Controls State for Assistant
  const [asstSlots, setAsstSlots] = useState<SlotData[]>([]);
  const [asstSlotsLoading, setAsstSlotsLoading] = useState(false);
  const [asstShift, setAsstShift] = useState<string>('BOTH');
  const [asstMorningStartHour, setAsstMorningStartHour] = useState('09');
  const [asstMorningStartMin, setAsstMorningStartMin] = useState('00');
  const [asstMorningStartPeriod, setAsstMorningStartPeriod] = useState('AM');
  const [asstMorningEndHour, setAsstMorningEndHour] = useState('01');
  const [asstMorningEndMin, setAsstMorningEndMin] = useState('00');
  const [asstMorningEndPeriod, setAsstMorningEndPeriod] = useState('PM');

  const [asstEveningStartHour, setAsstEveningStartHour] = useState('05');
  const [asstEveningStartMin, setAsstEveningStartMin] = useState('00');
  const [asstEveningStartPeriod, setAsstEveningStartPeriod] = useState('PM');
  const [asstEveningEndHour, setAsstEveningEndHour] = useState('09');
  const [asstEveningEndMin, setAsstEveningEndMin] = useState('00');
  const [asstEveningEndPeriod, setAsstEveningEndPeriod] = useState('PM');

  const [asstShiftMsg, setAsstShiftMsg] = useState('');
  const [asstSavingShift, setAsstSavingShift] = useState(false);

  const pktTodayYmd = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }, []);
  const todayIso = pktTodayYmd;
  const nextWeekIso = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const [asstSlotFromDate, setAsstSlotFromDate] = useState(todayIso);
  const [asstSlotToDate, setAsstSlotToDate] = useState(nextWeekIso);
  const [asstSlotInterval, setAsstSlotInterval] = useState<number>(20);
  const [asstOffDays, setAsstOffDays] = useState<string[]>(['sunday']);
  const [asstGenerating, setAsstGenerating] = useState(false);
  const [asstGenMsg, setAsstGenMsg] = useState('');
  const [asstClearingSlots, setAsstClearingSlots] = useState(false);
  const [asstSlotActionLoading, setAsstSlotActionLoading] = useState<{ id: string; action: 'block' | 'unblock' | 'delete' } | null>(null);

  const [asstSlotDateFilter, setAsstSlotDateFilter] = useState<string>('all');
  const [asstSlotStatusFilter, setAsstSlotStatusFilter] = useState<string>('all');
  const [asstShowPastSlots, setAsstShowPastSlots] = useState<boolean>(false);
  const [asstSlotLimitCount, setAsstSlotLimitCount] = useState<number>(100);

  const fetchAsstSlots = async (docId: string) => {
    if (!docId) return;
    try {
      setAsstSlotsLoading(true);
      const activeTok = token || localStorage.getItem('assistant_token') || '';
      const res: any = await apiFetch(`/doctor/slots/my-slots?doctor_id=${docId}`, {
        headers: activeTok ? { Authorization: `Bearer ${activeTok}` } : {}
      });
      if (Array.isArray(res)) {
        setAsstSlots(res);
      }
    } catch (err: any) {
      console.error('Failed to load slots for assistant:', err);
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('credentials were changed') || err.message?.toLowerCase().includes('invalid token') || err.message?.toLowerCase().includes('unauthorized')) {
        localStorage.removeItem('assistant_token');
        setToken('');
        setMyDoctors([]);
        setAsstSlots([]);
        setLoginError('Your session has expired. Please sign in with your assistant credentials.');
      }
    } finally {
      setAsstSlotsLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('assistant_token');
    localStorage.removeItem('assistant_selected_doctor_id');
    localStorage.removeItem('token');
    try { sessionStorage.clear(); } catch (_) { }
    setToken('');
    setMyDoctors([]);
    setSelectedDoctorId('');
    setPortalView('select');
    if (onSwitchRole) {
      onSwitchRole('patient');
    } else {
      window.location.href = '/';
    }
  };

  const handleSaveShift = async () => {
    if (!selectedDoctorId) return;
    try {
      setAsstSavingShift(true);
      setAsstShiftMsg('');
      const morning_start = format12to24(asstMorningStartHour, asstMorningStartMin, asstMorningStartPeriod);
      const morning_end = format12to24(asstMorningEndHour, asstMorningEndMin, asstMorningEndPeriod);
      const evening_start = format12to24(asstEveningStartHour, asstEveningStartMin, asstEveningStartPeriod);
      const evening_end = format12to24(asstEveningEndHour, asstEveningEndMin, asstEveningEndPeriod);

      await apiFetch('/doctor/shift-hours', {
        method: 'PUT',
        body: JSON.stringify({
          doctor_id: selectedDoctorId,
          shift: asstShift,
          morning_start,
          morning_end,
          evening_start,
          evening_end
        })
      });
      setAsstShiftMsg('✓ Operating shift hours saved for this clinic!');
      setTimeout(() => setAsstShiftMsg(''), 4000);
    } catch (err: any) {
      setAsstShiftMsg(`Error: ${err.message || 'Failed to update shift hours'}`);
    } finally {
      setAsstSavingShift(false);
    }
  };

  const handleGenerateSlots = async () => {
    if (!selectedDoctorId) return;
    try {
      setAsstGenerating(true);
      setAsstGenMsg('');
      const morning_start = format12to24(asstMorningStartHour, asstMorningStartMin, asstMorningStartPeriod);
      const morning_end = format12to24(asstMorningEndHour, asstMorningEndMin, asstMorningEndPeriod);
      const evening_start = format12to24(asstEveningStartHour, asstEveningStartMin, asstEveningStartPeriod);
      const evening_end = format12to24(asstEveningEndHour, asstEveningEndMin, asstEveningEndPeriod);

      const res: any = await apiFetch('/doctor/slots/generate', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: selectedDoctorId,
          start_date: asstSlotFromDate,
          end_date: asstSlotToDate,
          interval_minutes: asstSlotInterval,
          shift: asstShift,
          replace_existing: true,
          morning_start,
          morning_end,
          evening_start,
          evening_end,
          off_days: asstOffDays
        })
      });
      setAsstGenMsg(res.message || `✓ Generated slots successfully!`);
      setMyDoctors(prev => prev.map(d => d.doctor_id === selectedDoctorId ? { ...d, off_days: asstOffDays.join(',') } : d));
      await fetchAsstSlots(selectedDoctorId);
      if (deskTab === 'pos') {
        fetchPosDays(selectedDoctorId);
      }
    } catch (err: any) {
      setAsstGenMsg(`Error: ${err.message || 'Failed to generate slots'}`);
    } finally {
      setAsstGenerating(false);
    }
  };

  const handleClearUnbooked = async () => {
    if (!selectedDoctorId) return;
    const confirmClear = window.confirm(
      `Are you sure you want to delete all UNBOOKED (available) slots for ${asstSlotFromDate} to ${asstSlotToDate}? Booked/held slots will remain safe.`
    );
    if (!confirmClear) return;
    try {
      setAsstClearingSlots(true);
      const res: any = await apiFetch(
        `/doctor/slots/clear-unbooked?doctor_id=${selectedDoctorId}&start_date=${asstSlotFromDate}&end_date=${asstSlotToDate}`,
        { method: 'DELETE' }
      );
      setAsstGenMsg(res.message || '✓ Unbooked slots cleared.');
      await fetchAsstSlots(selectedDoctorId);
    } catch (err: any) {
      setAsstGenMsg(`Error: ${err.message || 'Failed to clear unbooked slots'}`);
    } finally {
      setAsstClearingSlots(false);
    }
  };

  const handleToggleBlockSlot = async (slotId: string, currentStatus: string) => {
    if (!selectedDoctorId) return;
    const action = currentStatus === 'blocked' ? 'unblock' : 'block';
    try {
      setAsstSlotActionLoading({ id: slotId, action });
      await apiFetch(`/doctor/slots/${slotId}/${action}?doctor_id=${selectedDoctorId}`, { method: 'PATCH' });
      setAsstSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: action === 'block' ? 'blocked' : 'available' } : s));
    } catch (err: any) {
      alert(err.message || `Failed to ${action} slot`);
    } finally {
      setAsstSlotActionLoading(null);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!selectedDoctorId) return;
    if (!window.confirm('Are you sure you want to permanently delete this slot?')) return;
    try {
      setAsstSlotActionLoading({ id: slotId, action: 'delete' });
      await apiFetch(`/doctor/slots/${slotId}?doctor_id=${selectedDoctorId}`, { method: 'DELETE' });
      setAsstSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete slot');
    } finally {
      setAsstSlotActionLoading(null);
    }
  };

  const getAsstSlotDateKey = (s: SlotData): string => {
    if (s.slot_date && /^\d{4}-\d{2}-\d{2}$/.test(s.slot_date)) {
      return s.slot_date;
    }
    try {
      const d = new Date(s.start_time);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(d);
      }
    } catch { }
    return '';
  };

  const asstSlotDatesInfo = useMemo(() => {
    const map = new Map<string, { count: number; label: string }>();
    asstSlots.forEach(s => {
      const key = getAsstSlotDateKey(s);
      if (!key) return;
      // Automatically hide dates that have already passed unless explicitly requested
      if (!asstShowPastSlots && key < pktTodayYmd) return;
      if (!map.has(key)) {
        let label = s.slot_date_fmt || '';
        if (!label) {
          try {
            const parts = key.split('-').map(Number);
            const localD = new Date(parts[0], parts[1] - 1, parts[2], 12);
            label = localD.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
          } catch {
            label = key;
          }
        }
        map.set(key, { count: 0, label });
      }
      map.get(key)!.count += 1;
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, val]) => ({
        date,
        count: val.count,
        label: val.label
      }));
  }, [asstSlots, asstShowPastSlots, pktTodayYmd]);

  // Only upcoming dates with available slots starting at least 45 minutes in future (Smart Rescheduling)
  const futureSlotDatesInfo = useMemo(() => {
    const map = new Map<string, { count: number; label: string }>();
    asstSlots.forEach(s => {
      // Must be available
      if (s.status !== 'available') return;
      // Must be eligible under 45-minute travel notice buffer rule
      if (!isSlotEligibleForReschedule(s, pktTodayYmd, RESCHEDULE_MIN_TRAVEL_BUFFER_MINUTES)) {
        return;
      }
      const key = getAsstSlotDateKey(s);
      if (!key) return;


      if (!map.has(key)) {
        let label = s.slot_date_fmt || '';
        if (!label) {
          try {
            const parts = key.split('-').map(Number);
            const localD = new Date(parts[0], parts[1] - 1, parts[2], 12);
            label = localD.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
          } catch {
            label = key;
          }
        }
        map.set(key, { count: 0, label });
      }
      map.get(key)!.count += 1;
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, val]) => ({
        date,
        count: val.count,
        label: val.label
      }));
  }, [asstSlots, pktTodayYmd]);

  // Visible slots for overview metrics (automatically excludes past slots unless toggled)
  const asstVisibleSlots = useMemo(() => {
    return asstSlots.filter(s => {
      if (asstShowPastSlots) return true;
      const k = getAsstSlotDateKey(s);
      return !k || k >= pktTodayYmd;
    });
  }, [asstSlots, asstShowPastSlots, pktTodayYmd]);

  const filteredAsstSlots = useMemo(() => {
    return asstSlots.filter(s => {
      const slotKey = getAsstSlotDateKey(s);
      // Automatically hide slots from days that have passed unless explicitly toggled on
      if (!asstShowPastSlots && slotKey && slotKey < pktTodayYmd) {
        return false;
      }
      if (asstSlotStatusFilter !== 'all' && s.status !== asstSlotStatusFilter) {
        return false;
      }
      if (asstSlotDateFilter !== 'all') {
        if (slotKey !== asstSlotDateFilter) return false;
      }
      return true;
    });
  }, [asstSlots, asstSlotDateFilter, asstSlotStatusFilter, asstShowPastSlots, pktTodayYmd]);

  const [reschedItem, setReschedItem] = useState<AppointmentItem | null>(null);
  const [selectedNewSlotId, setSelectedNewSlotId] = useState<string>('');
  const [selectedNewSlot, setSelectedNewSlot] = useState<SlotData | null>(null);
  const [reschedSelectedDate, setReschedSelectedDate] = useState<string>(todayIso);
  const [reschedReasonText, setReschedReasonText] = useState('Patient requested a different time slot.');
  const [reschedError, setReschedError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'PAID' | 'COMPLETED' | 'LOYALTY'>('ALL');
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [manualCallingStarted, setManualCallingStarted] = useState<boolean>(false);

  // Identify active doctor for the opened live desk
  const currentDoctor = useMemo(() => {
    return myDoctors.find(d => d.doctor_id === selectedDoctorId) || myDoctors[0];
  }, [myDoctors, selectedDoctorId]);

  // Synchronize assistant off days with current doctor profile
  useEffect(() => {
    if (currentDoctor?.off_days) {
      const days = currentDoctor.off_days
        .split(',')
        .map((d: string) => d.trim().toLowerCase())
        .filter(Boolean);
      if (days.length > 0) {
        setAsstOffDays(days);
      }
    }
  }, [currentDoctor?.off_days]);

  useEffect(() => {
    setManualCallingStarted(false);
  }, [selectedDoctorId]);

  // Calling sequence timing: starts precisely 10 minutes before doctor's shift
  const callingShiftInfo = useMemo(() => {
    return getDoctorCallingShiftInfo(currentDoctor, pktTodayYmd, queue);
  }, [currentDoctor, pktTodayYmd, queue]);

  // Filtered queue items (Calling sequence by Time & Token when active, else newest submissions)
  const filteredQueue = useMemo(() => {
    const list = queue.filter(item => {
      // Hide past consultations when includeArchived is false
      if (!includeArchived) {
        const itemDate = getApptDateStrGlobal(item);
        if (itemDate && itemDate < pktTodayYmd) {
          return false;
        }
      }

      const matchesSearch =
        (item.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.patient_phone || '').includes(searchQuery) ||
        (item.slip_number || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'PENDING') return item.status === 'PENDING_ASSISTANT_APPROVAL' || item.status === 'pending';
      if (statusFilter === 'CONFIRMED') return item.status === 'CONFIRMED';
      if (statusFilter === 'PAID') return item.payment_status === 'PAID';
      if (statusFilter === 'COMPLETED') return item.status === 'COMPLETED';
      if (statusFilter === 'LOYALTY') return Boolean(item.has_loyalty_discount);
      return true;
    });

    if (callingOrderActive) {
      return sortCallingSequence(list, pktTodayYmd, callingShiftInfo);
    }

    return list.sort((a, b) => {
      // Newest requests at the top (descending created_at)
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [queue, searchQuery, statusFilter, callingOrderActive, pktTodayYmd, callingShiftInfo, includeArchived]);


  useEffect(() => {
    if (selectedDoctorId) {
      fetchAsstSlots(selectedDoctorId);
      fetchPosDays(selectedDoctorId);
      const doc = myDoctors.find(d => d.doctor_id === selectedDoctorId);
      if (doc) {
        if (doc.fee_clinic) setPosFee(Number(doc.fee_clinic));
        setAsstShift(doc.shift || 'BOTH');
        if (doc.morning_start) {
          const mS = parse24to12(doc.morning_start);
          setAsstMorningStartHour(mS.hour);
          setAsstMorningStartMin(mS.minute);
          setAsstMorningStartPeriod(mS.period);
        }
        if (doc.morning_end) {
          const mE = parse24to12(doc.morning_end);
          setAsstMorningEndHour(mE.hour);
          setAsstMorningEndMin(mE.minute);
          setAsstMorningEndPeriod(mE.period);
        }
        if (doc.evening_start) {
          const eS = parse24to12(doc.evening_start);
          setAsstEveningStartHour(eS.hour);
          setAsstEveningStartMin(eS.minute);
          setAsstEveningStartPeriod(eS.period);
        }
        if (doc.evening_end) {
          const eE = parse24to12(doc.evening_end);
          setAsstEveningEndHour(eE.hour);
          setAsstEveningEndMin(eE.minute);
          setAsstEveningEndPeriod(eE.period);
        }
      }
    }
  }, [selectedDoctorId, myDoctors]);

  const handleLoginSubmit = async (loginEmail?: string, loginPass?: string) => {
    try {
      setLoginLoading(true);
      setLoginError('');
      const targetEmail = (loginEmail !== undefined ? loginEmail : email).trim();
      const targetPass = loginPass !== undefined ? loginPass : password;
      const res: any = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, password: targetPass, portal: 'ASSISTANT' })
      });
      const userRole = res.user?.role?.toUpperCase();
      if (userRole !== 'ASSISTANT') {
        localStorage.removeItem('assistant_token');
        setToken('');
        setMyDoctors([]);
        if (userRole === 'DOCTOR') {
          setLoginError('Access Denied: Doctor credentials cannot be used to access the Assistant Reception Desk. Please sign in via the Doctor Portal.');
        } else {
          setLoginError(`Access Denied: Your account role is "${userRole}". Assistant privileges required.`);
        }
        return;
      }
      const t = res.access_token || res.token || '';
      localStorage.setItem('assistant_token', t);

      // Hydrate assigned doctor desks BEFORE unmounting login screen to prevent black/blank transition screen
      try {
        const doctors = await apiFetch<any[]>('/assistant/my-doctors', {
          headers: { Authorization: `Bearer ${t}` }
        });
        const docList = Array.isArray(doctors) ? doctors : [];
        setMyDoctors(docList);
        const savedDocId = localStorage.getItem('assistant_selected_doctor_id');
        const defaultDoc = docList.find(d => d.doctor_id === savedDocId) || docList[0];
        if (defaultDoc) {
          setSelectedDoctorId(defaultDoc.doctor_id);
          localStorage.setItem('assistant_selected_doctor_id', defaultDoc.doctor_id);
          setPortalView('portal');
          fetchQueue(defaultDoc.doctor_id);
          fetchAsstSlots(defaultDoc.doctor_id);
        } else {
          setPortalView('select');
        }
      } catch (docErr) {
        console.warn('Could not pre-fetch doctors during assistant login:', docErr);
      }

      setToken(t);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Check your assistant credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLoginSubmit();
  };

  const fetchMyDoctors = async (explicitToken?: string) => {
    const activeToken = explicitToken || token || localStorage.getItem('assistant_token');
    if (!activeToken) return;
    try {
      setDoctorsLoading(true);
      const me: any = await apiFetch('/auth/me', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const userRole = (me?.role || '').toUpperCase();
      if (userRole !== 'ASSISTANT' && userRole !== 'ADMIN') {
        console.warn('Current token does not possess ASSISTANT or ADMIN role:', me?.role);
        localStorage.removeItem('assistant_token');
        setToken('');
        setMyDoctors([]);
        setPortalView('select');
        return;
      }

      try {
        const doctors = await apiFetch<any[]>('/assistant/my-doctors', {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        const docList = Array.isArray(doctors) ? doctors : [];
        setMyDoctors(docList);
        const savedDocId = localStorage.getItem('assistant_selected_doctor_id');
        const defaultDoc = docList.find(d => d.doctor_id === savedDocId) || docList[0];
        if (defaultDoc) {
          setSelectedDoctorId(defaultDoc.doctor_id);
          localStorage.setItem('assistant_selected_doctor_id', defaultDoc.doctor_id);
          setPortalView('portal');
          fetchQueue(defaultDoc.doctor_id);
          fetchAsstSlots(defaultDoc.doctor_id);
        } else {
          setSelectedDoctorId('');
          localStorage.removeItem('assistant_selected_doctor_id');
          setPortalView('select');
        }
      } catch (docErr: any) {
        console.error('Failed to fetch assigned doctor desks:', docErr);
        // Do NOT kick the user out of the session if desk fetching fails or returns empty
        setMyDoctors([]);
        setPortalView('select');
      }
    } catch (err: any) {
      console.error('Auth verification error in assistant fetchMyDoctors:', err);
      // Only clear token if an explicit 401 Unauthorized occurred on session verification
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('unauthorized') || err.message?.toLowerCase().includes('invalid token')) {
        localStorage.removeItem('assistant_token');
        localStorage.removeItem('assistant_selected_doctor_id');
        setToken('');
        setMyDoctors([]);
        setPortalView('select');
      } else {
        setPortalView('select');
      }
    } finally {
      setDoctorsLoading(false);
    }
  };

  const fetchQueue = async (docId?: string, archived = includeArchived) => {
    try {
      setLoading(true);
      const targetDoc = docId || selectedDoctorId;
      if (!targetDoc) return;
      const params = new URLSearchParams();
      params.set('doctor_id', targetDoc);
      if (archived) params.set('include_archived', 'true');
      const url = `/assistant/queue?${params.toString()}`;
      const activeTok = token || localStorage.getItem('assistant_token') || '';
      const data = await apiFetch<AppointmentItem[]>(url, {
        headers: activeTok ? { Authorization: `Bearer ${activeTok}` } : {}
      });
      setQueue(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load queue for assistant:', err);
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('credentials were changed') || err.message?.toLowerCase().includes('invalid token') || err.message?.toLowerCase().includes('unauthorized')) {
        localStorage.removeItem('assistant_token');
        setToken('');
        setMyDoctors([]);
        setQueue([]);
        setLoginError('Your session has expired. Please sign in with your assistant credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchMyDoctors();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedDoctorId) return;
    fetchQueue(selectedDoctorId, includeArchived);
  }, [token, selectedDoctorId, includeArchived]);

  const handleApprove = async (id: string) => {
    try {
      setAppointmentActionLoading({ id, action: 'approve' });
      setActionMessage('Generating Digital Slip & Confirming...');
      const res: any = await apiFetch(`/assistant/appointments/${id}/approve`, { method: 'POST' });
      setActionMessage(`✓ Approved! Assigned Slip: ${res.slip_number}`);
      await fetchQueue(selectedDoctorId);
    } catch (err: any) {
      alert(err.message || 'Failed to approve appointment');
    } finally {
      setAppointmentActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const input = prompt('Please enter rejection reason (or click Cancel to abort):', 'Slot unavailable / Clinic fully booked');
    if (input === null) {
      // User clicked "Cancel" on the prompt dialog -> abort without performing action
      return;
    }
    const reason = input.trim() || 'Rejected by clinic assistant.';
    try {
      setAppointmentActionLoading({ id, action: 'reject' });
      await apiFetch(`/assistant/appointments/${id}/reject?reason=${encodeURIComponent(reason)}`, { method: 'POST' });
      setActionMessage('✓ Appointment rejected. Slot released back to available.');
      await fetchQueue(selectedDoctorId);
    } catch (err: any) {
      alert(err.message || 'Failed to reject appointment');
    } finally {
      setAppointmentActionLoading(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      setAppointmentActionLoading({ id, action: 'paid' });
      await apiFetch(`/assistant/appointments/${id}/mark-paid`, { method: 'POST' });
      setActionMessage('✓ Payment recorded as PAID at clinic cash desk.');
      await fetchQueue(selectedDoctorId);
    } catch (err: any) {
      alert(err.message || 'Failed to mark paid');
    } finally {
      setAppointmentActionLoading(null);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    const input = prompt('Please enter cancellation reason (or click Cancel to abort):', 'Patient requested cancellation');
    if (input === null) {
      // User clicked "Cancel" on the prompt dialog -> abort without performing action
      return;
    }
    const reason = input.trim() || 'Patient requested cancellation.';
    try {
      setAppointmentActionLoading({ id, action: 'cancel' });
      await apiFetch(`/assistant/appointments/${id}/cancel?reason=${encodeURIComponent(reason)}`, { method: 'POST' });
      setActionMessage('✓ Appointment cancelled and slot released back to available.');
      await fetchQueue(selectedDoctorId);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setAppointmentActionLoading(null);
    }
  };

  const handleCompleteAppointment = async (id: string) => {
    const item = queue.find(q => q.id === id);
    if (!item) return;
    if (item.payment_status !== 'PAID') {
      alert(`⚠️ Payment Required: Consultation fee (${formatCurrency(item.fee_amount || currentDoctor?.fee_clinic || 1000)}) must be collected at the Cash Desk before this visit can be marked as completed.`);
      return;
    }
    const isToday = getApptDateStrGlobal(item) === pktTodayYmd;
    const isDateTimeReached = isApptTimePassedGlobal(item, pktTodayYmd);
    const itemMins = getApptMinutesFromMidnight(item);
    const isItemMorning = itemMins < 840;
    const isShiftMatch = (callingShiftInfo.activeShiftType === 'MORNING' && isItemMorning) ||
      (callingShiftInfo.activeShiftType === 'EVENING' && !isItemMorning);
    const isCallingStarted = callingShiftInfo.isCallingStarted || manualCallingStarted;
    const isFirstActive = Boolean(callingOrderActive && queue[0]?.id === item.id && isToday && isShiftMatch && isCallingStarted);

    if (!isDateTimeReached && !isFirstActive) {
      alert('⚠️ Cannot mark consultation as completed before its scheduled date and time has arrived.');
      return;
    }
    try {
      setAppointmentActionLoading({ id, action: 'complete' });

      setActionMessage('Marking consultation as completed...');
      const activeTok = token || localStorage.getItem('assistant_token') || '';
      await apiFetch(`/assistant/appointments/${id}/complete`, {
        method: 'POST',
        headers: activeTok ? { Authorization: `Bearer ${activeTok}` } : {}
      });
      setActionMessage('✓ Consultation marked as completed.');
      await fetchQueue(selectedDoctorId);
    } catch (err: any) {
      alert(err.message || 'Failed to complete appointment');
    } finally {
      setAppointmentActionLoading(null);
    }
  };

  // ── POS (Point of Sale) & Walk-In Desk Functions ─────────────────────────
  const fetchPosDays = async (docId?: string) => {
    const targetDoc = docId || selectedDoctorId;
    if (!targetDoc) return;
    try {
      setPosLoadingDays(true);
      setPosError('');
      const activeTok = token || localStorage.getItem('assistant_token') || '';
      const data = await apiFetch<PosDayItem[]>(`/assistant/slots/available-by-date?doctor_id=${targetDoc}&days_ahead=14`, {
        headers: activeTok ? { Authorization: `Bearer ${activeTok}` } : {}
      });
      if (Array.isArray(data)) {
        setPosDays(data);
        if (data.length > 0) {
          setSelectedPosDate(prev => {
            if (prev && data.some(d => d.date === prev)) return prev;
            return data[0].date;
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to load POS days:', err);
      setPosError(err.message || 'Failed to load available slots.');
    } finally {
      setPosLoadingDays(false);
    }
  };

  const openEmergencySlotModal = (preferredDate?: string) => {
    const targetDate = preferredDate || selectedPosDate || (posDays[0] && posDays[0].date) || new Date().toISOString().split('T')[0];
    setEmgModalDate(targetDate);
    try {
      const now = new Date();
      // Pakistan Standard Time is UTC+5
      const totalMins = (now.getUTCHours() + 5) * 60 + now.getUTCMinutes();
      const roundedMins = Math.ceil((totalMins + 5) / 5) * 5;
      const h24 = Math.floor(roundedMins / 60) % 24;
      const m = roundedMins % 60;
      const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
      const displayH = h24 % 12 === 0 ? 12 : h24 % 12;
      setEmgHour(String(displayH).padStart(2, '0'));
      setEmgMinute(String(m).padStart(2, '0'));
      setEmgPeriod(period);
    } catch (_) {
      setEmgHour('08');
      setEmgMinute('30');
      setEmgPeriod('PM');
    }
    setEmgDuration(20);
    setShowEmergencyModal(true);
  };

  const handleCreateEmergencySlot = async (timeChoice?: string, customDuration?: number, customDate?: string) => {
    if (!selectedDoctorId) {
      setPosError('Please select a doctor first.');
      return;
    }
    const targetDate = customDate || emgModalDate || selectedPosDate || (posDays[0] && posDays[0].date) || new Date().toISOString().split('T')[0];
    try {
      setCreatingEmergencySlot(true);
      setPosError('');
      const activeTok = token || localStorage.getItem('assistant_token') || '';
      const payload: any = {
        doctor_id: selectedDoctorId,
        visit_date: targetDate,
        duration_minutes: customDuration || emgDuration || 20
      };
      if (timeChoice) {
        payload.time_str = timeChoice;
      }

      const res: any = await apiFetch('/assistant/pos/emergency-slot', {
        method: 'POST',
        headers: activeTok ? { Authorization: `Bearer ${activeTok}` } : {},
        body: JSON.stringify(payload)
      });

      if (res && res.slot) {
        const newSlot: PosSlotItem = res.slot;
        setPosDays(prevDays => {
          const dayIndex = prevDays.findIndex(d => d.date === targetDate);
          if (dayIndex >= 0) {
            const updated = [...prevDays];
            const targetDay = { ...updated[dayIndex] };
            targetDay.slots = [...targetDay.slots, newSlot];
            targetDay.available_count = (targetDay.available_count || 0) + 1;
            targetDay.total_slots = (targetDay.total_slots || 0) + 1;
            targetDay.is_off_day = false;
            updated[dayIndex] = targetDay;
            return updated;
          } else {
            return [
              {
                date: targetDate,
                label: 'Emergency Walk-In',
                date_fmt: targetDate,
                is_today: true,
                is_tomorrow: false,
                total_slots: 1,
                available_count: 1,
                slots: [newSlot]
              },
              ...prevDays
            ];
          }
        });

        setSelectedPosDate(targetDate);
        setSelectedPosSlot(newSlot);
        setPosNotes(prev => prev ? prev : '🚨 EMERGENCY WALK-IN: Priority consultation');
        setActionMessage(`✓ Emergency Slot #${newSlot.daily_slot_number} (${newSlot.start_time_fmt}) generated for Walk-in Patient!`);
        setShowEmergencyModal(false);
        setTimeout(() => setActionMessage(''), 6000);
      }
    } catch (err: any) {
      console.error('Failed to create emergency slot:', err);
      setPosError(err.message || 'Failed to create emergency slot.');
    } finally {
      setCreatingEmergencySlot(false);
    }
  };

  const handlePatientPhoneSearch = async (val: string) => {
    setPosPatientPhone(val);
    if (val.trim().length >= 3) {
      try {
        setPatientLookupLoading(true);
        const activeTok = token || localStorage.getItem('assistant_token') || '';
        const res = await apiFetch<any[]>(`/assistant/patients/lookup?query=${encodeURIComponent(val.trim())}`, {
          headers: activeTok ? { Authorization: `Bearer ${activeTok}` } : {}
        });
        if (Array.isArray(res)) {
          setPatientLookupResults(res);
        }
      } catch (_) {
        setPatientLookupResults([]);
      } finally {
        setPatientLookupLoading(false);
      }
    } else {
      setPatientLookupResults([]);
    }
  };

  const handleConfirmPosBooking = async () => {
    if (!selectedDoctorId) {
      setPosError('Please select a doctor.');
      return;
    }
    if (!selectedPosSlot) {
      setPosError('Please select an available time slot.');
      return;
    }

    const isTargetToday = Boolean(selectedPosDate === pktTodayYmd || (posDays[0] && posDays[0].date === selectedPosDate && posDays[0].is_today));
    if (isPosSlotPassed(selectedPosSlot, isTargetToday)) {
      setPosError(`The selected consultation slot (${selectedPosSlot.start_time_fmt}) has already passed. Please select an upcoming slot or use Emergency Walk-In.`);
      return;
    }

    const cleanName = posPatientName.trim();
    const cleanPhone = posPatientPhone.trim().replace(/[\s-]/g, '');

    if (!cleanName) {
      setPosError('Please enter the patient’s full name.');
      return;
    }
    if (/^\d{7,}$/.test(cleanName)) {
      setPosError('It looks like a phone number was entered into the Full Name field. Please enter the name in "Patient Full Name" and phone in "Phone Number".');
      return;
    }
    if (!cleanPhone) {
      setPosError('Please enter the patient’s phone number.');
      return;
    }
    if (/[a-zA-Z]/.test(cleanPhone)) {
      setPosError('Please enter a valid phone number with digits (e.g. 03451234567). Names should be entered in the "Patient Full Name" field.');
      return;
    }
    if (cleanPhone.length < 10) {
      setPosError('Phone number is too short. Please enter a valid mobile number (e.g. 03456789012).');
      return;
    }

    try {
      setPosSubmitting(true);
      setPosError('');
      const activeTok = token || localStorage.getItem('assistant_token') || '';
      const cleanNotes = posNotes.trim();
      const finalNotes = selectedPosSlot.is_emergency
        ? (cleanNotes ? (cleanNotes.includes('EMERGENCY') ? cleanNotes : `[EMERGENCY WALK-IN] ${cleanNotes}`) : '[EMERGENCY WALK-IN] Urgent walk-in consultation')
        : (cleanNotes || undefined);

      const payload = {
        doctor_id: selectedDoctorId,
        slot_id: selectedPosSlot.id,
        patient_name: posPatientName.trim(),
        patient_phone: posPatientPhone.trim(),
        patient_email: posPatientEmail.trim() || undefined,
        notes: finalNotes,
        payment_status: posPaymentMode,
        fee_amount: posFee,
        cash_tendered: posPaymentMode === 'PAID' && posCashTendered ? Number(posCashTendered) : undefined
      };

      const res: any = await apiFetch('/assistant/pos/book', {
        method: 'POST',
        headers: activeTok ? { Authorization: `Bearer ${activeTok}` } : {},
        body: JSON.stringify(payload)
      });

      const tenderedNum = posPaymentMode === 'PAID' && posCashTendered ? Number(posCashTendered) : undefined;
      const isPartial = tenderedNum !== undefined && tenderedNum > 0 && tenderedNum < posFee;
      const effectivePaid = isPartial ? tenderedNum : (posPaymentMode === 'PAID' ? posFee : 0);
      const effectiveDue = Math.max(0, posFee - effectivePaid);

      setPosSuccessReceipt({
        ...res,
        payment_status: isPartial ? 'PARTIAL' : (res.payment_status || posPaymentMode),
        amount_paid: effectivePaid,
        amount_due: effectiveDue,
        cash_tendered: tenderedNum,
        change_amount: tenderedNum !== undefined && tenderedNum >= posFee ? tenderedNum - posFee : 0
      });

      setPosPatientName('');
      setPosPatientPhone('');
      setPosPatientEmail('');
      setPosNotes('');
      setSelectedPosSlot(null);
      setPosCashTendered('');
      setPatientLookupResults([]);

      await fetchQueue(selectedDoctorId);
      await fetchPosDays(selectedDoctorId);
      await fetchAsstSlots(selectedDoctorId);
    } catch (err: any) {
      setPosError(err.message || 'Failed to complete POS booking.');
    } finally {
      setPosSubmitting(false);
    }
  };

  // ── Staff Login (Figma Split Panel) ─────────────────────────────────────────
  if (!token) {
    return (
      <StaffLoginSplitView
        currentRole="assistant"
        onSwitchRole={onSwitchRole}
        onLogin={async (em, pw) => {
          await handleLoginSubmit(em, pw);
        }}
        loginLoading={loginLoading}
        loginError={loginError}
      />
    );
  }

  // ── Doctor Selection Screen ────────────────────────────────────────────────
  if (portalView === 'select') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
          {/* Sub-nav */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>Select Doctor Desk</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select a doctor to open their live reception queue and cash register</p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <RealtimeLive />
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold transition-colors cursor-pointer flex items-center gap-1 hover:underline"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>

          {doctorsLoading ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 text-slate-400 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Loading your assigned clinic portals...</p>
              <p className="text-xs text-slate-400 mt-1">Checking linked doctor desks for your account...</p>
            </div>
          ) : myDoctors.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-400" />
              <p className="text-sm font-bold text-slate-800">No Clinic Desks Assigned Yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                If no clinics appear, ask the clinic administrator to link your account to a doctor reception desk.
              </p>
              <button
                onClick={() => fetchMyDoctors(token)}
                className="mt-4 px-4 py-2 bg-clinic-700 hover:bg-clinic-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Desks</span>
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myDoctors.map(doc => (
              <div
                key={doc.doctor_id}
                onClick={() => {
                  setSelectedDoctorId(doc.doctor_id);
                  localStorage.setItem('assistant_selected_doctor_id', doc.doctor_id);
                  setPortalView('portal');
                  setLoading(true);
                  fetchQueue(doc.doctor_id);
                  fetchAsstSlots(doc.doctor_id);
                }}
                className="bg-white border border-slate-200 hover:border-clinic-500 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <InitialsAvatar name={doc.doctor_name || 'Dr.'} size="md" />
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-clinic-700 transition-colors">
                          {doc.doctor_name}
                        </h3>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-clinic-50 text-clinic-700 border border-clinic-200 mt-0.5">
                          {doc.specialty || 'Specialist'}
                        </span>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1.5" title="Desk Active" />
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl mb-4">
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-clinic-600 flex-shrink-0" />
                      <span className="truncate">{doc.clinic_address || 'Clinic, D.I. Khan'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-clinic-600 flex-shrink-0" />
                      <span>Shift: <strong>{doc.shift || 'EVENING'}</strong></span>
                    </p>
                    <p className="flex items-center gap-2 font-semibold text-slate-800">
                      <CreditCard className="w-3.5 h-3.5 text-clinic-600 flex-shrink-0" />
                      <span>Fee: {formatCurrency(doc.fee_clinic || 1000)}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">Reception Desk</span>
                  <span className="text-xs font-bold text-clinic-700 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Open Desk &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Guard against uninitialized state if doctor data is actively loading
  if (doctorsLoading && myDoctors.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-clinic-700 mb-3" />
        <h3 className="text-base font-bold text-slate-800" style={{ fontFamily: 'Outfit,sans-serif' }}>
          Opening Assistant Reception Desk...
        </h3>
        <p className="text-xs text-slate-500 mt-1">Connecting to linked doctor desks and live patient queue</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('assistant_selected_doctor_id');
              setPortalView('select');
              setDoctorsLoading(false);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            ← View All Desks
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-3 py-1.5 text-xs font-semibold bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ── Dedicated Doctor Reception Desk ────────────────────────────────────────
  const pendingCount = queue.filter(q => q.status === 'PENDING_ASSISTANT_APPROVAL' || q.status === 'pending').length;

  const confirmedCount = queue.filter(q => q.status === 'CONFIRMED' || q.status === 'confirmed').length;
  const paidCount = queue.filter(q => q.payment_status === 'PAID' || q.payment_status === 'PARTIAL').length;
  const totalRevenue = queue.reduce((sum, q) => {
    if (q.payment_status === 'PAID') {
      return sum + Number(q.amount_paid !== undefined ? q.amount_paid : (q.fee_amount || 0));
    } else if (q.payment_status === 'PARTIAL') {
      return sum + Number(q.amount_paid || 0);
    }
    return sum;
  }, 0);



  const asSidebarNav = [
    { id: 'queue', label: 'Live desk' },
    { id: 'pos', label: 'POS / Walk-In Desk' },
    { id: 'schedule', label: 'Schedule & Slots' },
    { id: 'smart_resched', label: 'Smart rescheduling' },
    { id: 'cash', label: 'Cash ledger' },
  ];

  return (
    <div className="flex min-h-screen bg-white animate-fade-in">
      <PortalSidebar
        workspaceLabel="Assistant Workspace"
        clinicName={currentDoctor?.clinic_address ? currentDoctor.clinic_address.split(',')[0].trim() : (currentDoctor?.doctor_name || 'Rehmat Polyclinic')}
        clinicSub={currentDoctor?.clinic_address ? currentDoctor.clinic_address.split(',').slice(1).join(', ').trim() : 'Circular Road, D.I. Khan'}
        navItems={asSidebarNav}
        activeNav={deskTab}
        onNavChange={(id) => setDeskTab(id as any)}
        onSignOut={handleSignOut}
        bottomNote="Linked doctors only · Concept environment"
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="portal-content flex-1">
        {/* Top breadcrumb bar */}
        <div className="h-12 border-b border-slate-200 px-3 sm:px-8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex-shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 truncate max-w-[130px] sm:max-w-none">
              Assistant / {deskTab === 'pos' ? 'POS Counter' : deskTab === 'schedule' ? 'Schedule' : 'Live desk'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <div className="hidden sm:block">
              <RealtimeLive />
            </div>
            <button
              type="button"
              onClick={() => {
                setDeskTab('pos');
                fetchPosDays(selectedDoctorId);
              }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-xs ${deskTab === 'pos'
                ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-300'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              title="Open POS / Walk-in patient booking desk"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="hidden sm:inline">+ POS Walk-In</span>
              <span className="sm:hidden">+ POS</span>
            </button>
            {myDoctors.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200 max-w-[130px] sm:max-w-none">
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold hidden sm:inline">Doctor:</span>
                <select
                  value={selectedDoctorId || currentDoctor?.doctor_id || ''}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedDoctorId(newId);
                    localStorage.setItem('assistant_selected_doctor_id', newId);
                    fetchQueue(newId);
                    fetchAsstSlots(newId);
                    fetchPosDays(newId);
                  }}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer truncate max-w-[110px] sm:max-w-none"
                >
                  {myDoctors.map(d => (
                    <option key={d.doctor_id} value={d.doctor_id}>
                      {d.doctor_name} ({d.specialty || 'Specialist'})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer flex items-center gap-1 hover:underline flex-shrink-0"
              title="Sign out of Assistant Desk"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        <div className="p-3 sm:p-5 md:p-8 space-y-4 sm:space-y-6">
          {/* Sub-nav tabs (inside content area) — smooth swipeable on mobile */}
          <div className="flex items-center gap-1 border-b border-slate-100 overflow-x-auto pb-1 scrollbar-none touch-scroll flex-nowrap">
            {[
              ['queue', 'Live desk'],
              ['pos', 'POS / Walk-In Desk'],
              ['schedule', 'Schedule & Slots'],
              ['smart_resched', 'Smart rescheduling'],
              ['cash', 'Cash ledger'],
              ['all', 'All visit records']
            ].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setDeskTab(tab as any)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${deskTab === tab ? 'border-clinic-700 text-clinic-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Header heading */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
                {formatDoctorName(currentDoctor?.doctor_name)} &mdash; Reception Desk
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentDoctor?.specialty} &bull; {currentDoctor?.clinic_address} &bull; Shift: {currentDoctor?.shift} &bull; Weekly Off: <span className="font-bold text-rose-700 capitalize">{currentDoctor?.off_days ? currentDoctor.off_days.split(',').join(', ') : 'Sunday'}</span>
              </p>
            </div>
            <button
              onClick={() => fetchQueue(selectedDoctorId)}
              disabled={loading}
              className="self-start sm:self-auto px-3.5 sm:px-4 py-1.5 sm:py-2 bg-clinic-700 hover:bg-clinic-800 disabled:opacity-75 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing Queue...' : 'Refresh Queue'}</span>
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 sm:p-4">
              <p className="text-[11px] sm:text-xs font-semibold text-amber-700 uppercase tracking-wider">Awaiting Slip</p>
              <p className="text-2xl sm:text-3xl font-bold text-amber-900 mt-1" style={{ fontFamily: 'Outfit,sans-serif' }}>{pendingCount}</p>
              <p className="text-[10px] sm:text-[11px] text-amber-600 mt-0.5">Need assistant approval</p>
            </div>
            <div className="bg-clinic-50/60 border border-clinic-200/80 rounded-2xl p-3 sm:p-4">
              <p className="text-[11px] sm:text-xs font-semibold text-clinic-700 uppercase tracking-wider">Confirmed &amp; Queued</p>
              <p className="text-2xl sm:text-3xl font-bold text-clinic-900 mt-1" style={{ fontFamily: 'Outfit,sans-serif' }}>{confirmedCount}</p>
              <p className="text-[10px] sm:text-[11px] text-clinic-600 mt-0.5">Digital slips issued</p>
            </div>
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3 sm:p-4">
              <p className="text-[11px] sm:text-xs font-semibold text-emerald-700 uppercase tracking-wider">Paid at Cash Desk</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-900 mt-1" style={{ fontFamily: 'Outfit,sans-serif' }}>{paidCount}</p>
              <p className="text-[10px] sm:text-[11px] text-emerald-600 mt-0.5">Cash collected</p>
            </div>
            <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4">
              <p className="text-[11px] sm:text-xs font-semibold text-clinic-400 uppercase tracking-wider">Total Shift Cash</p>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1" style={{ fontFamily: 'Outfit,sans-serif' }}>
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Reconciliation ledger</p>
            </div>
          </div>

          {/* Action alert */}
          {actionMessage && (
            <div className="p-3.5 bg-clinic-50 border border-clinic-200 rounded-xl text-xs text-clinic-800 font-medium flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-clinic-700 flex-shrink-0" />
                <span>{actionMessage}</span>
              </div>
              <button onClick={() => setActionMessage('')} className="text-clinic-600 hover:text-clinic-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Tab: Live Queue & Slips ── */}
          {deskTab === 'queue' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Table controls */}
              <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="relative flex-1 max-w-sm w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search patient name, phone, or slip #..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-clinic-400"
                  />
                </div>
                {/* Filter pills — swipeable scroll strip on mobile */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-scroll flex-nowrap w-full sm:w-auto">
                  {((['ALL', 'PENDING', 'CONFIRMED', 'PAID', 'LOYALTY'] as const)).map(f => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${statusFilter === f
                        ? (f === 'LOYALTY' ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400' : 'bg-clinic-700 text-white')
                        : (f === 'LOYALTY' ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                        }`}
                    >
                      {f === 'ALL' ? 'All Patients' : f === 'PENDING' ? 'Pending Approval' : f === 'CONFIRMED' ? 'Confirmed' : f === 'PAID' ? 'Paid' : `💳 VIP Loyalty Requests (${queue.filter(q => q.has_loyalty_discount).length})`}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setIncludeArchived(!includeArchived)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border whitespace-nowrap flex-shrink-0 ${includeArchived
                      ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    title="Past closed consultations from previous days are automatically hidden to keep your reception desk clean."
                  >
                    <Archive className="w-3.5 h-3.5 text-slate-500" />
                    <span>{includeArchived ? 'Past History: ON' : 'Past History: Hidden'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !callingOrderActive;
                      setCallingOrderActive(next);
                      localStorage.setItem('asst_calling_order', String(next));
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border whitespace-nowrap flex-shrink-0 ${callingOrderActive
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    title="Arrange appointments in live calling sequence (Today's Time & Token order). Completed visits automatically move down."
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{callingOrderActive ? '⏱️ Calling: ON' : '⏱️ Calling Order'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchQueue(selectedDoctorId)}
                    disabled={loading}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 shadow-sm whitespace-nowrap flex-shrink-0"
                    title="Refresh live patient queue"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-clinic-700 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Calling Sequence Banner */}
              {callingOrderActive && (
                (() => {
                  const isStarted = callingShiftInfo.isCallingStarted || manualCallingStarted;
                  return isStarted ? (
                    <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900 transition-all">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold">
                          🟢 Live Calling Active &middot; {callingShiftInfo.shiftName} (Today: {pktTodayYmd})
                        </span>
                        <span className="text-emerald-700 hidden sm:inline">
                          &middot; Calling started at {callingShiftInfo.callingStartTimeStr} (10 mins before {formatDoctorName(currentDoctor?.doctor_name)}&apos;s {callingShiftInfo.shiftStartTimeStr} shift).
                        </span>
                      </div>
                      <span className="text-[11px] font-mono bg-emerald-600 text-white px-2.5 py-0.5 rounded-full font-semibold shadow-xs">
                        Active Patient at Top
                      </span>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 transition-all">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                        <span className="font-bold">
                          ⏳ Calling Starts at {callingShiftInfo.callingStartTimeStr}
                        </span>
                        <span className="text-amber-800">
                          (10 mins before {formatDoctorName(currentDoctor?.doctor_name)}&apos;s {callingShiftInfo.shiftName} at {callingShiftInfo.shiftStartTimeStr})
                        </span>
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">
                          Opens in {callingShiftInfo.minutesUntilCalling} min{callingShiftInfo.minutesUntilCalling === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setManualCallingStarted(true)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold shadow-xs transition-colors cursor-pointer"
                          title="If the doctor has arrived early, click here to start calling patients right now"
                        >
                          ▶ Start Calling Early
                        </button>
                        <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-amber-200 font-semibold text-amber-800">
                          Queue Arranged
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Queue table */}
              <div className="overflow-x-auto touch-scroll">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Selected Slot Date & Time</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Digital Slip #</th>
                      <th className="py-3 px-4">Cash Desk</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-10 h-10 animate-spin text-clinic-600" />
                            <p className="text-sm font-semibold text-slate-800">Loading incoming patient queue...</p>
                            <p className="text-xs text-slate-400">Fetching verified requests, digital slips, and live queue data</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm font-semibold text-slate-600">No appointments in this view</p>
                          <p className="text-xs text-slate-400 mt-0.5">New bookings will show up here automatically via real-time sync.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredQueue.map((item, idx) => {
                        const isCallingStarted = callingShiftInfo.isCallingStarted || manualCallingStarted;
                        const isConfirmed = item.status === 'CONFIRMED' || item.status === 'confirmed';
                        const isPaid = item.payment_status === 'PAID';
                        const isToday = getApptDateStrGlobal(item) === pktTodayYmd;

                        // Check shift alignment
                        const itemMins = getApptMinutesFromMidnight(item);
                        const isItemMorning = itemMins < 840;
                        const isShiftMatch = (callingShiftInfo.activeShiftType === 'MORNING' && isItemMorning) ||
                          (callingShiftInfo.activeShiftType === 'EVENING' && !isItemMorning);
                        const isItemCallingEligible = isShiftMatch && isCallingStarted;

                        const isCurrentActive = callingOrderActive && idx === 0 && isConfirmed && isToday && isItemCallingEligible;
                        const isNextInLineWaiting = callingOrderActive && idx === 0 && isConfirmed && isToday && !isItemCallingEligible;
                        const isDateTimeReached = isApptTimePassedGlobal(item, pktTodayYmd);
                        const canComplete = isConfirmed && isPaid && (isDateTimeReached || isCurrentActive);

                        return (
                          <tr key={item.id} className={`transition-colors ${isCurrentActive ? 'bg-emerald-50/80 hover:bg-emerald-100/70 border-l-4 border-l-emerald-600 shadow-sm' : isNextInLineWaiting ? 'bg-amber-50/60 hover:bg-amber-100/60 border-l-4 border-l-amber-500' : 'hover:bg-slate-50/70'}`}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <InitialsAvatar name={item.patient_name || 'Patient'} size="sm" />
                                <div>
                                  {isCurrentActive && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white uppercase tracking-wider mb-1 shadow-xs animate-pulse">
                                      📢 Now Calling · Token #{parseQueueNumberFromSlip(item.slip_number, item.token_number) || '1'}
                                      {item.payment_status === 'PARTIAL' && (
                                        <span className="ml-1 bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded font-black text-[9px]">
                                          ⚠️ Collect Due: {formatCurrency(item.amount_due !== undefined ? item.amount_due : Math.max(0, (item.fee_amount || 1000) - (item.amount_paid || 0)))}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  {isNextInLineWaiting && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-600 text-white uppercase tracking-wider mb-1 shadow-xs">
                                      ⏱️ 1st To Call · Token #{parseQueueNumberFromSlip(item.slip_number, item.token_number) || '1'} · {!isShiftMatch ? `${isItemMorning ? 'Morning' : 'Evening'} Shift (${item.slot_time || callingShiftInfo.shiftStartTimeStr})` : `Opens at ${callingShiftInfo.callingStartTimeStr}`}
                                    </span>
                                  )}
                                  {callingOrderActive && idx > 0 && isConfirmed && isToday && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-1">
                                      {!isShiftMatch ? `${isItemMorning ? 'Morning Shift' : 'Evening Shift'} · ` : ''}Line #{idx + 1} · Token #{parseQueueNumberFromSlip(item.slip_number, item.token_number) || (idx + 1)}
                                    </span>
                                  )}
                                  {item.notes && item.notes.includes('EMERGENCY') && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white uppercase tracking-wider mb-1 shadow-xs animate-pulse">
                                      🚨 Emergency Walk-In
                                    </span>
                                  )}
                                  <p className="font-bold text-slate-900">{item.patient_name || 'Unnamed Patient'}</p>

                                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {item.patient_phone || 'No phone'}
                                  </p>
                                  {item.has_loyalty_discount && (
                                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold shadow-2xs">
                                        💳 VIP Loyalty Card Requested
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedLoyaltyAppt(item)}
                                        className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[10px] font-bold transition shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        📋 View 10 Application Details
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                  <Calendar className="w-3.5 h-3.5 text-clinic-700 flex-shrink-0" />
                                  <span>{item.slot_date || formatSlotDateTime(item.slot_start || (item as any).start_time, item.slip_number, item.created_at).date}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                                  <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span>{item.slot_time || formatSlotDateTime(item.slot_start || (item as any).start_time, item.slip_number, item.created_at).time}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <StatusPill status={item.status} />
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold">
                              {item.slip_number ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {(() => {
                                    const isInactive = item.status === 'CANCELLED' || item.status === 'REJECTED';
                                    const qNum = parseQueueNumberFromSlip(item.slip_number, item.token_number);
                                    if (isInactive) {
                                      return (
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[10px] font-sans font-medium">
                                          No Queue
                                        </span>
                                      );
                                    }
                                    if (qNum) {
                                      return (
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold font-sans border ${
                                          item.has_loyalty_discount
                                            ? 'bg-amber-100 border-amber-300 text-amber-950 font-black shadow-xs'
                                            : 'bg-teal-50 border border-teal-200 text-teal-800'
                                        }`}>
                                          Token #{qNum} {item.has_loyalty_discount ? '🌟 VIP' : ''}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                  <span className="px-2 py-0.5 rounded-lg bg-clinic-50 border border-clinic-200 text-clinic-800 text-[11px] font-bold">
                                    #{item.slip_number}
                                  </span>
                                  {item.has_loyalty_discount && (
                                    <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-extrabold shadow-2xs">
                                      💳 VIP LOYALTY TOKEN
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="text-slate-400 italic text-[11px] block">Awaiting Approval</span>
                                  {item.has_loyalty_discount && (
                                    <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-950 text-[10px] font-extrabold shadow-2xs">
                                      💳 VIP Loyalty Token Request
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {item.payment_status === 'PAID' ? (
                                <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                                  ✓ PAID ({formatCurrency(item.amount_paid || item.fee_amount || 1000)})
                                </span>
                              ) : item.payment_status === 'PARTIAL' ? (
                                <div className="space-y-0.5">
                                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                    🟡 ADVANCE: {formatCurrency(item.amount_paid || 0)}
                                  </span>
                                  <div className="text-[10px] font-extrabold text-rose-600 pl-0.5">
                                    Due on Calling: {formatCurrency(item.amount_due !== undefined ? item.amount_due : Math.max(0, (item.fee_amount || 1000) - (item.amount_paid || 0)))}
                                  </div>
                                </div>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-amber-50 border border-amber-200 text-amber-800">
                                  PENDING CASH ({formatCurrency(item.fee_amount || currentDoctor?.fee_clinic || 1000)})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {/* 1. COMPLETED status chip */}
                              {item.status === 'COMPLETED' && (
                                <div className="flex justify-end">
                                  <span className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 inline-flex items-center gap-1.5 shadow-2xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Completed</span>
                                  </span>
                                </div>
                              )}

                              {/* 2. CANCELLED status chip */}
                              {item.status === 'CANCELLED' && (
                                <div className="flex justify-end">
                                  <span className="h-7 px-2.5 rounded-lg text-[11px] font-medium bg-slate-50 text-slate-400 border border-slate-200 inline-flex items-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Cancelled</span>
                                  </span>
                                </div>
                              )}

                              {/* 3. REJECTED status chip */}
                              {item.status === 'REJECTED' && (
                                <div className="flex justify-end">
                                  <span className="h-7 px-2.5 rounded-lg text-[11px] font-medium bg-rose-50 text-rose-500 border border-rose-200 inline-flex items-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Rejected</span>
                                  </span>
                                </div>
                              )}

                              {/* 4. Active appointment: Up-and-Down 2-Tier Layout */}
                              {item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && item.status !== 'REJECTED' && (
                                <div className="flex flex-col items-end gap-1.5">
                                  {/* Top Line: Primary Actions */}
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* PENDING: Reject + Issue Slip */}
                                    {(item.status === 'PENDING_ASSISTANT_APPROVAL' || item.status === 'pending') && (
                                      <>
                                        {item.has_loyalty_discount && (
                                          <button
                                            type="button"
                                            onClick={() => setSelectedLoyaltyAppt(item)}
                                            className="h-7 px-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-[11px] font-extrabold transition-all inline-flex items-center gap-1 shadow-xs cursor-pointer animate-pulse"
                                            title="View 10-Field Loyalty Application details"
                                          >
                                            <span>📋 View Form</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          disabled={Boolean(appointmentActionLoading)}
                                          onClick={() => handleReject(item.id)}
                                          className="h-7 px-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                          title="Reject appointment request"
                                        >
                                          {appointmentActionLoading?.id === item.id && appointmentActionLoading.action === 'reject' ? (
                                            <>
                                              <Loader2 className="w-3 h-3 animate-spin text-rose-600" />
                                              <span>Rejecting...</span>
                                            </>
                                          ) : (
                                            <>
                                              <X className="w-3 h-3 text-rose-500" />
                                              <span>Reject</span>
                                            </>
                                          )}
                                        </button>

                                        <button
                                          type="button"
                                          disabled={Boolean(appointmentActionLoading)}
                                          onClick={() => handleApprove(item.id)}
                                          className="h-7 px-3 bg-gradient-to-r from-clinic-700 to-clinic-800 hover:from-clinic-800 hover:to-clinic-900 text-white rounded-lg text-[11px] font-bold shadow-xs hover:shadow-sm transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                                          title="Approve and issue digital appointment slip"
                                        >
                                          {appointmentActionLoading?.id === item.id && appointmentActionLoading.action === 'approve' ? (
                                            <>
                                              <Loader2 className="w-3 h-3 animate-spin text-white" />
                                              <span>Issuing...</span>
                                            </>
                                          ) : (
                                            <>
                                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                              <span>Issue Slip</span>
                                            </>
                                          )}
                                        </button>
                                      </>
                                    )}

                                    {/* CONFIRMED: Mark Paid / Collect Due + Complete / Upcoming Slot */}
                                    {isConfirmed && (
                                      <>
                                        {item.has_loyalty_discount && (
                                          <button
                                            type="button"
                                            onClick={() => setSelectedLoyaltyAppt(item)}
                                            className="h-7 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                            title="View patient's Golden VIP Loyalty Card details"
                                          >
                                            <span>💳 Loyalty Details</span>
                                          </button>
                                        )}
                                        {item.payment_status === 'PENDING_CASH' && (
                                          <button
                                            type="button"
                                            disabled={Boolean(appointmentActionLoading)}
                                            onClick={() => handleMarkPaid(item.id)}
                                            className="h-7 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                            title="Record cash collection at desk"
                                          >
                                            {appointmentActionLoading?.id === item.id && appointmentActionLoading.action === 'paid' ? (
                                              <>
                                                <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                                                <span>Saving...</span>
                                              </>
                                            ) : (
                                              <>
                                                <CreditCard className="w-3 h-3 text-emerald-600" />
                                                <span>Mark Paid</span>
                                              </>
                                            )}
                                          </button>
                                        )}

                                        {item.payment_status === 'PARTIAL' && (
                                          <button
                                            type="button"
                                            disabled={Boolean(appointmentActionLoading)}
                                            onClick={() => handleMarkPaid(item.id)}
                                            className="h-7 px-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-[11px] font-extrabold shadow-xs hover:shadow-sm transition-all inline-flex items-center gap-1 disabled:opacity-50 animate-pulse"
                                            title="Collect remaining balance on calling"
                                          >
                                            {appointmentActionLoading?.id === item.id && appointmentActionLoading.action === 'paid' ? (
                                              <>
                                                <Loader2 className="w-3 h-3 animate-spin text-white" />
                                                <span>Collecting...</span>
                                              </>
                                            ) : (
                                              <>
                                                <CreditCard className="w-3 h-3 text-white" />
                                                <span>Collect Due ({formatCurrency(item.amount_due !== undefined ? item.amount_due : Math.max(0, (item.fee_amount || 1000) - (item.amount_paid || 0)))})</span>
                                              </>
                                            )}
                                          </button>
                                        )}

                                        {canComplete ? (
                                          <button
                                            type="button"
                                            disabled={Boolean(appointmentActionLoading)}
                                            onClick={() => handleCompleteAppointment(item.id)}
                                            className={`h-7 px-3 text-white rounded-lg text-[11px] font-bold shadow-xs hover:shadow-sm transition-all inline-flex items-center gap-1.5 disabled:opacity-50 ${isCurrentActive
                                              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 ring-2 ring-emerald-300 shadow-sm'
                                              : 'bg-gradient-to-r from-clinic-700 to-clinic-800 hover:from-clinic-800 hover:to-clinic-900'
                                              }`}
                                            title="Mark consultation as completed"
                                          >
                                            {appointmentActionLoading?.id === item.id && appointmentActionLoading.action === 'complete' ? (
                                              <>
                                                <Loader2 className="w-3 h-3 animate-spin text-white" />
                                                <span>Completing...</span>
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                                <span>Complete</span>
                                              </>
                                            )}
                                          </button>
                                        ) : !isPaid && (isDateTimeReached || isCurrentActive) ? (
                                          <span
                                            className="h-7 px-2.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1"
                                            title="Please collect payment balance before completing consultation"
                                          >
                                            <CreditCard className="w-3 h-3 text-amber-600" />
                                            <span>Pay Due to Complete</span>
                                          </span>
                                        ) : (
                                          <span
                                            className="h-7 px-2.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1"
                                            title="Appointment date and time has not arrived yet"
                                          >
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            <span>Upcoming Slot</span>
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  {/* Bottom Line: Secondary Actions (Reschedule & Cancel) */}
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReschedItem(item);
                                        setSelectedNewSlotId('');
                                        setSelectedNewSlot(null);
                                        setReschedError('');
                                        const initialDate = futureSlotDatesInfo.length > 0 ? futureSlotDatesInfo[0].date : pktTodayYmd;
                                        setReschedSelectedDate(initialDate);
                                        setDeskTab('smart_resched');
                                      }}
                                      className="h-6 px-2 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 hover:border-sky-300 rounded-md text-[11px] font-medium transition-all inline-flex items-center gap-1 shadow-2xs"
                                      title="Reschedule appointment to a new slot"
                                    >
                                      <Clock className="w-3 h-3 text-sky-600" />
                                      <span>Reschedule</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={Boolean(appointmentActionLoading)}
                                      onClick={() => handleCancelAppointment(item.id)}
                                      className="h-6 px-2 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-md text-[11px] font-medium transition-all inline-flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                      title="Cancel appointment"
                                    >
                                      {appointmentActionLoading?.id === item.id && appointmentActionLoading.action === 'cancel' ? (
                                        <>
                                          <Loader2 className="w-2.5 h-2.5 animate-spin text-rose-600" />
                                          <span>Cancelling...</span>
                                        </>
                                      ) : (
                                        <>
                                          <X className="w-3 h-3 text-slate-400" />
                                          <span>Cancel</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Schedule & Individual Slot Controls (Assistant Authority) ── */}
          {deskTab === 'schedule' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Schedule & Shift Controls — {currentDoctor?.doctor_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage consultation shifts, timing intervals, and individual slot availability for this clinic.
                  </p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => fetchAsstSlots(selectedDoctorId)}
                    disabled={asstSlotsLoading}
                    className="flex-1 sm:flex-none justify-center px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${asstSlotsLoading ? 'animate-spin' : ''}`} />
                    <span>{asstSlotsLoading ? 'Loading...' : 'Refresh Slots'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveShift}
                    disabled={asstSavingShift}
                    className="flex-1 sm:flex-none justify-center px-4 py-1.5 bg-clinic-700 hover:bg-clinic-800 disabled:opacity-75 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
                  >
                    {asstSavingShift ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{asstSavingShift ? 'Saving...' : 'Save Shift Timings'}</span>
                  </button>
                </div>
              </div>

              {/* Status / feedback banners */}
              {asstShiftMsg && (
                <div className="p-3.5 bg-clinic-50 border border-clinic-200 rounded-xl text-xs text-clinic-900 font-semibold flex items-center justify-between">
                  <span>{asstShiftMsg}</span>
                  <button onClick={() => setAsstShiftMsg('')}><X className="w-4 h-4 text-clinic-600" /></button>
                </div>
              )}
              {asstGenMsg && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold flex items-center justify-between">
                  <span>{asstGenMsg}</span>
                  <button onClick={() => setAsstGenMsg('')}><X className="w-4 h-4 text-amber-600" /></button>
                </div>
              )}

              {/* 2-Column layout: Left: Shift & Generation | Right: Summary & Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                  {/* Operating Shift Hours Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Operating Shift Hours & Schedule</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Configure morning and evening consultation hours</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(['MORNING', 'EVENING', 'BOTH'] as const).map(sh => (
                          <button
                            key={sh}
                            type="button"
                            onClick={() => setAsstShift(sh)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${asstShift === sh
                              ? 'bg-clinic-700 text-white shadow-sm'
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            {sh === 'BOTH' ? 'Both Shifts' : sh}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shift Dropdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Morning Shift */}
                      <div className={`p-4 rounded-2xl border transition-all ${asstShift === 'MORNING' || asstShift === 'BOTH'
                        ? 'bg-amber-50/60 border-amber-200 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 opacity-60'
                        }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🌅</span>
                            <div>
                              <span className="font-bold block text-slate-900 text-xs">Morning Shift</span>
                              <span className="text-[10px] text-slate-500">Starting & ending hours</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${asstShift === 'MORNING' || asstShift === 'BOTH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-600'
                            }`}>
                            {asstShift === 'MORNING' || asstShift === 'BOTH' ? 'Active Shift' : 'Inactive'}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <TimePickerDropdowns
                              label="Starting Hour"
                              hour={asstMorningStartHour}
                              minute={asstMorningStartMin}
                              period={asstMorningStartPeriod}
                              onHourChange={setAsstMorningStartHour}
                              onMinuteChange={setAsstMorningStartMin}
                              onPeriodChange={setAsstMorningStartPeriod}
                              disabled={asstShift === 'EVENING'}
                            />
                            <div className="text-slate-400 font-bold text-xs pt-4">➔</div>
                            <TimePickerDropdowns
                              label="Ending Hour"
                              hour={asstMorningEndHour}
                              minute={asstMorningEndMin}
                              period={asstMorningEndPeriod}
                              onHourChange={setAsstMorningEndHour}
                              onMinuteChange={setAsstMorningEndMin}
                              onPeriodChange={setAsstMorningEndPeriod}
                              disabled={asstShift === 'EVENING'}
                            />
                          </div>
                          <div className="pt-2 border-t border-amber-100/80 flex items-center justify-between text-[11px] text-slate-600">
                            <span>Selected: <strong>{asstMorningStartHour}:{asstMorningStartMin} {asstMorningStartPeriod} – {asstMorningEndHour}:{asstMorningEndMin} {asstMorningEndPeriod}</strong></span>
                            <span className="text-[10px] text-amber-800 font-mono">({format12to24(asstMorningStartHour, asstMorningStartMin, asstMorningStartPeriod)} – {format12to24(asstMorningEndHour, asstMorningEndMin, asstMorningEndPeriod)})</span>
                          </div>
                        </div>
                      </div>

                      {/* Evening Shift */}
                      <div className={`p-4 rounded-2xl border transition-all ${asstShift === 'EVENING' || asstShift === 'BOTH'
                        ? 'bg-indigo-50/60 border-indigo-200 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 opacity-60'
                        }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🌙</span>
                            <div>
                              <span className="font-bold block text-slate-900 text-xs">Evening Shift</span>
                              <span className="text-[10px] text-slate-500">Starting & ending hours</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${asstShift === 'EVENING' || asstShift === 'BOTH'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-200 text-slate-600'
                            }`}>
                            {asstShift === 'EVENING' || asstShift === 'BOTH' ? 'Active Shift' : 'Inactive'}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <TimePickerDropdowns
                              label="Starting Hour"
                              hour={asstEveningStartHour}
                              minute={asstEveningStartMin}
                              period={asstEveningStartPeriod}
                              onHourChange={setAsstEveningStartHour}
                              onMinuteChange={setAsstEveningStartMin}
                              onPeriodChange={setAsstEveningStartPeriod}
                              disabled={asstShift === 'MORNING'}
                            />
                            <div className="text-slate-400 font-bold text-xs pt-4">➔</div>
                            <TimePickerDropdowns
                              label="Ending Hour"
                              hour={asstEveningEndHour}
                              minute={asstEveningEndMin}
                              period={asstEveningEndPeriod}
                              onHourChange={setAsstEveningEndHour}
                              onMinuteChange={setAsstEveningEndMin}
                              onPeriodChange={setAsstEveningEndPeriod}
                              disabled={asstShift === 'MORNING'}
                            />
                          </div>
                          <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between text-[11px] text-slate-600">
                            <span>Selected: <strong>{asstEveningStartHour}:{asstEveningStartMin} {asstEveningStartPeriod} – {asstEveningEndHour}:{asstEveningEndMin} {asstEveningEndPeriod}</strong></span>
                            <span className="text-[10px] text-indigo-800 font-mono">({format12to24(asstEveningStartHour, asstEveningStartMin, asstEveningStartPeriod)} – {format12to24(asstEveningEndHour, asstEveningEndMin, asstEveningEndPeriod)})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Slot Generation & Clear Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm">Generate Consultation Slots</h4>
                    <p className="text-xs text-slate-400">Generate recurring slots for this doctor across a date range. Booked & held slots are strictly protected.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">From Date</label>
                        <input
                          type="date"
                          value={asstSlotFromDate}
                          onChange={e => setAsstSlotFromDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">To Date</label>
                        <input
                          type="date"
                          value={asstSlotToDate}
                          onChange={e => setAsstSlotToDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Slot Interval</label>
                        <div className="flex items-center gap-1">
                          {[5, 10, 15, 20, 30].map(mins => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setAsstSlotInterval(mins)}
                              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${asstSlotInterval === mins
                                ? 'bg-clinic-700 text-white shadow-2xs font-bold'
                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                              {mins}m
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Weekly Working Days & Off Days Selector */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-clinic-700" />
                            <span>Weekly Working Days &amp; Off Days</span>
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Select off days (e.g. Friday and Sunday). Off days will <strong className="text-rose-600">NOT</strong> have slots generated and old unbooked slots will be cleared.
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setAsstOffDays(['sunday'])}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${asstOffDays.length === 1 && asstOffDays[0] === 'sunday'
                              ? 'bg-clinic-700 text-white border-clinic-700'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                            Sun Off
                          </button>
                          <button
                            type="button"
                            onClick={() => setAsstOffDays(['friday', 'sunday'])}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${asstOffDays.length === 2 && asstOffDays.includes('friday') && asstOffDays.includes('sunday')
                              ? 'bg-clinic-700 text-white border-clinic-700'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                            Fri &amp; Sun Off
                          </button>
                          <button
                            type="button"
                            onClick={() => setAsstOffDays([])}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${asstOffDays.length === 0
                              ? 'bg-clinic-700 text-white border-clinic-700'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                            All 7 Days Open
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1.5 pt-1">
                        {WEEKDAY_OPTIONS.map(day => {
                          const isOff = asstOffDays.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => {
                                setAsstOffDays(prev =>
                                  prev.includes(day.id)
                                    ? prev.filter(d => d !== day.id)
                                    : [...prev, day.id]
                                );
                              }}
                              className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${isOff
                                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs ring-1 ring-rose-200'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100/70'
                                }`}
                            >
                              <span className="block text-xs font-black">{day.label}</span>
                              <span className={`inline-block text-[9px] font-extrabold uppercase px-1 rounded mt-0.5 ${isOff ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-950'
                                }`}>
                                {isOff ? 'OFF' : 'OPEN'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>
                          Active schedule: {asstOffDays.length === 0 ? (
                            <strong className="text-emerald-700 font-bold">Open all 7 days</strong>
                          ) : (
                            <>
                              Closed on: <strong className="text-rose-700 capitalize font-bold">{asstOffDays.join(', ')}</strong>
                            </>
                          )}
                        </span>
                        <span className="text-slate-400">Option A: Old empty slots on off days wiped automatically</span>
                      </div>
                    </div>

                    {asstGenMsg && (
                      <div className={`p-3 rounded-xl text-xs font-semibold border ${asstGenMsg.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-clinic-50 border-clinic-200 text-clinic-900'}`}>
                        {asstGenMsg}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleClearUnbooked}
                        disabled={asstClearingSlots || asstSlotsLoading}
                        className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {asstClearingSlots ? 'Clearing Slots...' : 'Clear Unbooked Slots'}
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateSlots}
                        disabled={asstGenerating || asstSlotsLoading}
                        className="px-5 py-2 bg-clinic-700 hover:bg-clinic-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {asstGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>{asstGenerating ? 'Generating Slots...' : 'Generate / Rebuild Slots'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right 4 cols: Authority notice & Slot summary chips */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Doctor Authority Notice */}
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0" />
                      <h4 className="font-bold text-amber-900 text-sm">Assistant Authority Granted</h4>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      As an authorized assistant for <strong>{currentDoctor?.doctor_name}</strong>, you have full authority to adjust shift timings, build slots, and block/unblock individual appointment times.
                    </p>
                    <div className="p-3 bg-white/80 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                      <strong>Note:</strong> Full-day Blackouts / Emergency Leaves are exclusively managed by the Doctor directly in the Doctor Portal.
                    </div>
                  </div>

                  {/* Slot Counts Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">Slots Overview</h4>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {asstShowPastSlots ? 'Showing all dates' : 'Upcoming dates only'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xl font-bold text-slate-900 block" style={{ fontFamily: 'Outfit, sans-serif' }}>{asstVisibleSlots.length}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Slots</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                        <span className="text-xl font-bold text-emerald-800 block" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {asstVisibleSlots.filter(s => s.status === 'available').length}
                        </span>
                        <span className="text-[10px] text-emerald-600 uppercase font-semibold">Available</span>
                      </div>
                      <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                        <span className="text-xl font-bold text-blue-800 block" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {asstVisibleSlots.filter(s => s.status === 'booked').length}
                        </span>
                        <span className="text-[10px] text-blue-600 uppercase font-semibold">Booked</span>
                      </div>
                      <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                        <span className="text-xl font-bold text-rose-800 block" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {asstVisibleSlots.filter(s => s.status === 'blocked').length}
                        </span>
                        <span className="text-[10px] text-rose-600 uppercase font-semibold">Blocked</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Individual Slot Controls Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Individual Slot Controls
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Block, unblock, or remove individual consultation slots for this doctor. Past days are hidden automatically.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Row 1: Date Filter & Calendar Picker */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <label className="text-xs text-slate-500 font-semibold w-9 shrink-0 text-left">Date:</label>
                      <select
                        value={asstSlotDateFilter}
                        onChange={e => setAsstSlotDateFilter(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-clinic-400"
                      >
                        <option value="all">
                          {asstShowPastSlots ? `All Dates (${asstSlots.length} slots)` : `All Upcoming Dates (${asstVisibleSlots.length} slots)`}
                        </option>
                        {asstSlotDatesInfo.map(info => (
                          <option key={info.date} value={info.date}>
                            {info.date === pktTodayYmd ? `Today: ${info.label}` : info.label} ({info.count} slots)
                          </option>
                        ))}
                      </select>

                      {/* Quick date picker */}
                      <input
                        type="date"
                        value={asstSlotDateFilter === 'all' ? '' : asstSlotDateFilter}
                        onChange={e => {
                          const val = e.target.value;
                          if (val && val < pktTodayYmd) {
                            setAsstShowPastSlots(true);
                          }
                          setAsstSlotDateFilter(val || 'all');
                        }}
                        title="Jump directly to a specific calendar date"
                        className="px-2.5 py-1 border border-slate-300 rounded-xl text-xs bg-white font-medium text-slate-700"
                      />
                    </div>

                    {/* Row 2: Status, Past Slots Toggle & Reset (Starts at the exact same position as first line box) */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div className="w-9 shrink-0 hidden sm:block" aria-hidden="true" />
                      {/* Status filter */}
                      <select
                        value={asstSlotStatusFilter}
                        onChange={e => setAsstSlotStatusFilter(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs bg-white font-medium text-slate-700"
                      >
                        <option value="all">All Statuses</option>
                        <option value="available">Available Only</option>
                        <option value="hold">Hold Only</option>
                        <option value="booked">Booked Only</option>
                        <option value="blocked">Blocked Only</option>
                      </select>

                      {/* Show Past Slots Toggle */}
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">
                        <input
                          type="checkbox"
                          checked={asstShowPastSlots}
                          onChange={e => setAsstShowPastSlots(e.target.checked)}
                          className="rounded border-slate-300 text-clinic-600 focus:ring-clinic-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Show past slots</span>
                      </label>

                      {(asstSlotDateFilter !== 'all' || asstSlotStatusFilter !== 'all' || asstShowPastSlots) && (
                        <button
                          type="button"
                          onClick={() => { setAsstSlotDateFilter('all'); setAsstSlotStatusFilter('all'); setAsstShowPastSlots(false); }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {filteredAsstSlots.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {asstSlotDateFilter === 'all' && asstSlotStatusFilter === 'all'
                      ? "No slots found for this doctor yet. Use the slot generator above to create slots."
                      : `No slots found matching the selected filter criteria.`}
                  </div>
                ) : (
                  <div className="overflow-x-auto touch-scroll max-h-[30rem]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-50 z-10">
                        <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider text-left">
                          <th className="py-3 px-5 font-semibold">Date &amp; Start Time</th>
                          <th className="py-3 px-5 font-semibold">End Time</th>
                          <th className="py-3 px-5 font-semibold">Status</th>
                          <th className="py-3 px-5 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAsstSlots.slice(0, asstSlotDateFilter === 'all' ? asstSlotLimitCount : undefined).map((slot) => {
                          const slotDateWithDay = slot.slot_date_fmt || (() => {
                            try {
                              const d = new Date(slot.start_time);
                              if (!isNaN(d.getTime())) {
                                return d.toLocaleDateString('en-US', {
                                  timeZone: 'Asia/Karachi',
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                });
                              }
                            } catch { }
                            return slot.slot_date || '';
                          })();

                          const sTime = slot.start_time_fmt || (() => {
                            try {
                              return new Date(slot.start_time).toLocaleTimeString('en-US', {
                                timeZone: 'Asia/Karachi',
                                hour: 'numeric',
                                minute: '2-digit'
                              });
                            } catch {
                              return '';
                            }
                          })();

                          const eTime = slot.end_time_fmt || (() => {
                            try {
                              return new Date(slot.end_time).toLocaleTimeString('en-US', {
                                timeZone: 'Asia/Karachi',
                                hour: 'numeric',
                                minute: '2-digit'
                              });
                            } catch {
                              return '';
                            }
                          })();

                          return (
                            <tr key={slot.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-5">
                                <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                                  <Calendar className="w-3.5 h-3.5 text-clinic-700 flex-shrink-0" />
                                  <span>{slotDateWithDay}</span>
                                </div>
                                <div className="text-slate-500 font-medium flex items-center gap-1.5 text-[11px] mt-0.5">
                                  <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span>{sTime}</span>
                                </div>
                              </td>

                              <td className="py-3 px-5 text-slate-600 font-mono">
                                {eTime}
                              </td>

                              <td className="py-3 px-5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${slot.status === 'available'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : slot.status === 'hold'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : slot.status === 'booked'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                  {slot.status === 'available' && '● Available'}
                                  {slot.status === 'hold' && '⏳ In Review'}
                                  {slot.status === 'booked' && '✓ Booked'}
                                  {slot.status === 'blocked' && '✕ Blocked'}
                                </span>
                              </td>

                              <td className="py-3 px-5 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  {slot.status === 'available' && (
                                    <button
                                      type="button"
                                      disabled={Boolean(asstSlotActionLoading)}
                                      onClick={() => handleToggleBlockSlot(slot.id, slot.status)}
                                      className="px-2.5 py-1 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg text-xs font-semibold border border-slate-200 transition-colors inline-flex items-center gap-1"
                                      title="Block slot from booking"
                                    >
                                      {asstSlotActionLoading?.id === slot.id && asstSlotActionLoading.action === 'block' ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                                      ) : (
                                        <Lock className="w-3 h-3 text-amber-600" />
                                      )}
                                      <span>Block</span>
                                    </button>
                                  )}

                                  {slot.status === 'blocked' && (
                                    <button
                                      type="button"
                                      disabled={Boolean(asstSlotActionLoading)}
                                      onClick={() => handleToggleBlockSlot(slot.id, slot.status)}
                                      className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold border border-slate-200 transition-colors inline-flex items-center gap-1"
                                      title="Unblock slot"
                                    >
                                      {asstSlotActionLoading?.id === slot.id && asstSlotActionLoading.action === 'unblock' ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                                      ) : (
                                        <Unlock className="w-3 h-3 text-emerald-600" />
                                      )}
                                      <span>Unblock</span>
                                    </button>
                                  )}

                                  {(slot.status === 'booked' || slot.status === 'hold') && (
                                    <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded-md">
                                      Protected
                                    </span>
                                  )}

                                  {slot.status !== 'booked' && slot.status !== 'hold' && (
                                    <button
                                      type="button"
                                      disabled={Boolean(asstSlotActionLoading)}
                                      onClick={() => handleDeleteSlot(slot.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Delete slot"
                                    >
                                      {asstSlotActionLoading?.id === slot.id && asstSlotActionLoading.action === 'delete' ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {asstSlotDateFilter === 'all' && filteredAsstSlots.length > asstSlotLimitCount && (
                      <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                        <button
                          type="button"
                          onClick={() => setAsstSlotLimitCount(prev => prev + 150)}
                          className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl shadow-2xs transition-colors"
                        >
                          Load More (+150 Slots) — Showing {Math.min(asstSlotLimitCount, filteredAsstSlots.length)} of {filteredAsstSlots.length}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Cash Ledger ── */}
          {/* ── Smart Rescheduling Tab (Connected to Real Slots & Backend API) ── */}
          {deskTab === 'smart_resched' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Find a better time.
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reschedule within {currentDoctor?.doctor_name}'s real available slots. Releases the old slot and reassigns the new slot with updated digital queue slip.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <RealtimeLive />
                  <button
                    type="button"
                    onClick={() => { setReschedError(''); setDeskTab('queue'); }}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-sm transition-colors"
                  >
                    Back to live desk
                  </button>
                </div>
              </div>

              {/* Linked doctor selector bar */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Linked doctor clinic</label>
                  <div className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-sm flex items-center gap-2">
                    <span className="font-bold text-clinic-800">{currentDoctor?.doctor_name || 'Doctor Clinic'}</span>
                    <span className="text-slate-400">&middot;</span>
                    <span className="text-slate-600">{currentDoctor?.clinic_address || 'D.I. Khan'}</span>
                    <span className="text-slate-400">&middot;</span>
                    <span className="text-slate-500">{currentDoctor?.specialty || 'General'}</span>
                  </div>
                </div>

                {reschedItem && (
                  <button
                    type="button"
                    onClick={() => { setReschedItem(null); setSelectedNewSlotId(''); setSelectedNewSlot(null); setReschedError(''); }}
                    className="text-xs text-clinic-700 hover:text-clinic-900 font-semibold underline"
                  >
                    Change Patient
                  </button>
                )}
              </div>

              {/* If no patient is selected yet, prompt to pick one from active queue */}
              {!reschedItem ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-clinic-700" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Select a Patient to Reschedule</h3>
                      <p className="text-xs text-slate-400">Choose an active patient from today's reception queue to assign them a new consultation slot.</p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {queue.filter(q => q.status !== 'CANCELLED' && q.status !== 'REJECTED' && q.status !== 'COMPLETED').length === 0 ? (
                      <p className="text-xs text-slate-400 py-8 text-center">No active appointments available to reschedule. Return to Live Desk or check back when new bookings arrive.</p>
                    ) : (
                      queue
                        .filter(q => q.status !== 'CANCELLED' && q.status !== 'REJECTED' && q.status !== 'COMPLETED')
                        .map(item => (
                          <div key={item.id} className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{item.patient_name}</span>
                                <span className="text-[11px] text-slate-500 font-mono">({item.patient_phone})</span>
                                {item.slip_number && (
                                  <span className="px-2 py-0.5 rounded-md bg-clinic-50 text-clinic-800 text-[10px] font-bold font-mono">
                                    #{item.slip_number}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Current visit: {item.appointment_date || 'Today'} &middot; {item.start_time ? new Date(item.start_time).toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit' }) : (item.time || 'Scheduled')}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setReschedItem(item);
                                setSelectedNewSlotId('');
                                setSelectedNewSlot(null);
                                setReschedError('');
                                const initialDate = futureSlotDatesInfo.length > 0 ? futureSlotDatesInfo[0].date : pktTodayYmd;
                                setReschedSelectedDate(initialDate);
                              }}
                              className="px-3 py-1.5 bg-clinic-700 hover:bg-clinic-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                            >
                              <span>Reschedule</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              ) : (
                /* 2-column layout when patient is selected */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left 5 cols: Current appointment + Safeguards */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Current appointment card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Current appointment
                        </h3>
                        <StatusPill status={reschedItem.status} />
                      </div>

                      <div>
                        <h4 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {reschedItem.patient_name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">{reschedItem.patient_phone}</p>
                        <p className="text-xs font-mono text-slate-400 mt-1">
                          {reschedItem.slip_number ? `SLIP #${reschedItem.slip_number}` : 'Awaiting Slip Issue'}
                        </p>
                      </div>

                      <div className="space-y-2 text-xs pt-3 border-t border-slate-100">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Current date</span>
                          <span className="font-semibold text-slate-800">{reschedItem.appointment_date || 'Today'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Current time</span>
                          <span className="font-semibold text-slate-800">
                            {reschedItem.start_time
                              ? new Date(reschedItem.start_time).toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit' })
                              : (reschedItem.time || 'Scheduled slot')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Doctor</span>
                          <span className="font-semibold text-slate-800">{currentDoctor?.doctor_name}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <span className="text-slate-400">Consultation fee</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{formatCurrency(reschedItem.fee_amount || currentDoctor?.fee_clinic || 1000)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${reschedItem.payment_status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                              {reschedItem.payment_status === 'PAID' ? 'CASH PAID' : 'PENDING CASH'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                        Rescheduling preserves payment status and maintains clinic record integrity.
                      </p>
                    </div>

                    {/* Safeguards box */}
                    <div className="bg-clinic-50/70 border border-clinic-100 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3">
                      <h4 className="font-bold text-clinic-900 text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Rescheduling safeguards
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <strong className="text-clinic-900 block">Only available slots</strong>
                          <p className="text-slate-600 text-[11px]">Held, booked, and blocked times cannot be assigned.</p>
                        </div>
                        <div>
                          <strong className="text-clinic-900 block">Atomic reassignment</strong>
                          <p className="text-slate-600 text-[11px]">The old slot is safely released back to available upon confirming the new slot.</p>
                        </div>
                        <div>
                          <strong className="text-clinic-900 block">Automatic Slip Sync</strong>
                          <p className="text-slate-600 text-[11px]">If moved to another calendar date, a new sequential daily queue slip is generated.</p>
                        </div>
                        <div>
                          <strong className="text-clinic-900 block">Audit Logged</strong>
                          <p className="text-slate-600 text-[11px]">Assistant ID, before/after slots, and reason are permanently logged.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right 7 cols: Alternate availability + Review the change */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Check alternate availability from real database slots */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Choose Alternate Available Slot
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">Showing real doctor consultation slots (PKT time zone).</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchAsstSlots(selectedDoctorId)}
                          disabled={asstSlotsLoading}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 self-start sm:self-auto"
                        >
                          <RefreshCw className={`w-3 h-3 ${asstSlotsLoading ? 'animate-spin' : ''}`} />
                          <span>Refresh Slots</span>
                        </button>
                      </div>

                      {/* Date selection bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700">Select Target Date</label>
                          <input
                            type="date"
                            min={pktTodayYmd}
                            value={reschedSelectedDate}
                            onChange={e => {
                              const val = e.target.value;
                              if (val && val < pktTodayYmd) {
                                setReschedError('Cannot select dates in the past.');
                                setReschedSelectedDate(pktTodayYmd);
                              } else {
                                setReschedSelectedDate(val);
                                setReschedError('');
                              }
                              setSelectedNewSlotId('');
                              setSelectedNewSlot(null);
                            }}
                            className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs bg-white font-medium text-slate-800"
                          />
                        </div>

                        {/* Quick date chips from doctor's upcoming slots */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {futureSlotDatesInfo.length === 0 ? (
                            <span className="text-[11px] text-slate-400">No upcoming dates with available future slots.</span>
                          ) : (
                            futureSlotDatesInfo.slice(0, 6).map(info => (
                              <button
                                key={info.date}
                                type="button"
                                onClick={() => {
                                  setReschedSelectedDate(info.date);
                                  setSelectedNewSlotId('');
                                  setSelectedNewSlot(null);
                                  setReschedError('');
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all text-center ${reschedSelectedDate === info.date
                                  ? 'bg-clinic-700 text-white border-clinic-700 shadow-sm'
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                              >
                                {info.label.split(',')[0]} ({info.count})
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Real Slot Grid for reschedSelectedDate (Omitting passed times & times < 45m today) */}
                      {(() => {
                        const isPastDate = reschedSelectedDate < pktTodayYmd;
                        const isToday = reschedSelectedDate === pktTodayYmd;
                        const currentMinsPkt = getCurrentMinutesInPkt();
                        const minEligibleMins = currentMinsPkt + RESCHEDULE_MIN_TRAVEL_BUFFER_MINUTES;
                        const minEligibleTimeStr = formatMinutesTo12h(minEligibleMins);

                        const dateSlots = isPastDate ? [] : asstSlots.filter(s => {
                          if (getAsstSlotDateKey(s) !== reschedSelectedDate) return false;
                          return isSlotEligibleForReschedule(s, pktTodayYmd, RESCHEDULE_MIN_TRAVEL_BUFFER_MINUTES);
                        });

                        // Sort slots chronologically ascending by Pakistan time
                        dateSlots.sort((a, b) => {
                          const minA = getSlotMinutesFromMidnightInPkt(a);
                          const minB = getSlotMinutesFromMidnightInPkt(b);
                          if (minA !== minB) return minA - minB;
                          return String(a.id || '').localeCompare(String(b.id || ''));
                        });



                        const availCount = dateSlots.filter(s => s.status === 'available').length;
                        const bookedCount = dateSlots.filter(s => s.status === 'booked').length;
                        const holdCount = dateSlots.filter(s => s.status === 'hold').length;
                        const blockCount = dateSlots.filter(s => s.status === 'blocked').length;

                        return (
                          <div className="space-y-3">
                            {/* 45-minute Travel Buffer Indicator */}
                            {isToday && (
                              <div className="bg-sky-50 border border-sky-200 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-sky-900">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                                  <span className="font-bold">45-Minute Travel Notice Buffer Active</span>
                                  <span className="text-sky-700 hidden sm:inline">&middot; Showing slots starting at least 45 minutes from now.</span>
                                </div>
                                <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-sky-200 font-semibold text-sky-800">
                                  Earliest Slot: {minEligibleTimeStr}
                                </span>
                              </div>
                            )}

                            {/* Legend */}
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                {availCount} available
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                                {bookedCount} booked
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                                {holdCount} held
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                                {blockCount} blocked
                              </span>
                            </div>

                            {isPastDate ? (
                              <div className="p-6 bg-rose-50 border border-rose-100 rounded-xl text-center text-xs text-rose-700">
                                This date ({reschedSelectedDate}) has already passed. Please select an upcoming date to reschedule.
                              </div>
                            ) : dateSlots.length === 0 ? (
                              <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-500">
                                {isToday
                                  ? `No remaining slots available today starting after ${minEligibleTimeStr} (45-minute buffer). Please select tomorrow or an upcoming date above.`
                                  : `No upcoming consultation slots configured for ${reschedSelectedDate}. Pick another date or generate slots in the Schedule & Slots tab.`}
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
                                {dateSlots.map(s => {

                                  const isSelected = selectedNewSlotId === s.id;
                                  const isAvailable = s.status === 'available';
                                  const timeLabel = s.start_time_fmt || (() => {
                                    try {
                                      return new Date(s.start_time).toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit' });
                                    } catch {
                                      return 'Slot';
                                    }
                                  })();

                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      disabled={!isAvailable}
                                      onClick={() => {
                                        if (isAvailable) {
                                          setSelectedNewSlotId(s.id);
                                          setSelectedNewSlot(s);
                                          setReschedError('');
                                        }
                                      }}
                                      className={`p-2.5 rounded-xl border text-center transition-all ${isSelected
                                        ? 'bg-clinic-700 text-white border-clinic-700 shadow-sm font-bold'
                                        : !isAvailable
                                          ? s.status === 'booked'
                                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                            : s.status === 'hold'
                                              ? 'bg-amber-50/70 border-amber-200 text-amber-800 cursor-not-allowed opacity-75'
                                              : 'bg-rose-50 border-rose-200 text-rose-700 cursor-not-allowed opacity-60'
                                          : 'bg-white border-slate-200 text-slate-800 hover:border-clinic-500 hover:bg-clinic-50/80 cursor-pointer'
                                        }`}
                                    >
                                      <span className="text-xs font-semibold block">{timeLabel}</span>
                                      <span className="text-[10px] opacity-80 block mt-0.5">
                                        {isSelected ? '✓ Selected' : s.status === 'available' ? 'Available' : s.status.toUpperCase()}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Review the change & save */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Review &amp; Confirm Reschedule
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                            CURRENT SLOT
                          </span>
                          <p className="font-bold text-slate-900 text-sm">{reschedItem.appointment_date || 'Today'}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {reschedItem.start_time
                              ? new Date(reschedItem.start_time).toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit' })
                              : (reschedItem.time || 'Scheduled slot')}
                          </p>
                        </div>

                        <div className={`p-4 rounded-xl border transition-all ${selectedNewSlot
                          ? 'bg-clinic-50/90 border-clinic-300'
                          : 'bg-amber-50/60 border-amber-200'
                          }`}>
                          <span className="text-[10px] uppercase tracking-wider text-clinic-700 font-bold block mb-1">
                            PROPOSED NEW SLOT
                          </span>
                          {selectedNewSlot ? (
                            <>
                              <p className="font-bold text-clinic-900 text-sm">
                                {selectedNewSlot.slot_date_fmt || reschedSelectedDate}
                              </p>
                              <p className="text-[11px] text-clinic-800 font-semibold mt-0.5">
                                {selectedNewSlot.start_time_fmt} – {selectedNewSlot.end_time_fmt} ({selectedNewSlot.duration_minutes || 20}m)
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-amber-800 italic mt-1">
                              👈 Click an available time slot above to select it.
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Reason for Rescheduling &middot; Required
                        </label>
                        <input
                          type="text"
                          value={reschedReasonText}
                          onChange={e => setReschedReasonText(e.target.value)}
                          placeholder="e.g., Patient requested morning time due to travel"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-clinic-400 focus:outline-none"
                          required
                        />
                      </div>

                      {reschedError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                          <span>{reschedError}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-400 leading-normal">
                        Digital slip number updates sequentially if rescheduled to a new calendar date. Patient live tracking link stays active.
                      </p>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => { setReschedError(''); setDeskTab('queue'); }}
                          className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                        >
                          Cancel / Keep Original
                        </button>
                        <button
                          type="button"
                          disabled={!selectedNewSlotId || reschedLoading}
                          onClick={async () => {
                            if (!selectedNewSlotId || !reschedItem) return;
                            try {
                              setReschedLoading(true);
                              setReschedError('');
                              const res: any = await apiFetch(`/assistant/appointments/${reschedItem.id}/reschedule`, {
                                method: 'POST',
                                body: JSON.stringify({
                                  new_slot_id: selectedNewSlotId,
                                  reason: reschedReasonText.trim() || 'Rescheduled by reception assistant'
                                })
                              });

                              const finalDate = selectedNewSlot?.slot_date_fmt || reschedSelectedDate;
                              const finalTime = selectedNewSlot?.start_time_fmt || 'new time';
                              const finalSlip = res.slip_number || reschedItem.slip_number;

                              setActionMessage(
                                `✓ Successfully rescheduled ${reschedItem.patient_name} to ${finalDate} at ${finalTime}.${finalSlip ? ` Updated Slip: #${finalSlip}` : ''}`
                              );

                              // Refresh real-time data
                              if (selectedDoctorId) {
                                await fetchQueue(selectedDoctorId);
                                await fetchAsstSlots(selectedDoctorId);
                              }

                              setReschedItem(null);
                              setSelectedNewSlotId('');
                              setSelectedNewSlot(null);
                              setDeskTab('queue');
                            } catch (err: any) {
                              setReschedError(err.message || 'Failed to reschedule appointment. Please try again.');
                            } finally {
                              setReschedLoading(false);
                            }
                          }}
                          className="px-5 py-2.5 bg-clinic-700 hover:bg-clinic-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-sm inline-flex items-center gap-1.5"
                        >
                          {reschedLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              <span>Saving reschedule...</span>
                            </>
                          ) : (
                            <span>Confirm &amp; Save Reschedule</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {deskTab === 'cash' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Cash Collection Ledger</h3>
                  <p className="text-xs text-slate-500">Itemized cash payments recorded at this clinic's reception desk today.</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">Total Recorded</span>
                  <span className="text-2xl font-bold text-emerald-700" style={{ fontFamily: 'Outfit,sans-serif' }}>
                    {formatCurrency(totalRevenue)}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {queue.filter(q => q.payment_status === 'PAID').length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No cash transactions recorded for this session yet.</p>
                ) : (
                  queue.filter(q => q.payment_status === 'PAID').map(q => (
                    <div key={q.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{q.patient_name}</span>
                        <span className="text-slate-400 ml-2 font-mono">SLIP #{q.slip_number || '---'}</span>
                        <span className="text-slate-500 ml-2">({q.patient_phone})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">CASH PAID</span>
                        <span className="font-bold text-slate-900 font-mono text-sm">{formatCurrency(q.fee_amount || currentDoctor?.fee_clinic || 1000)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Tab: All Records ── */}
          {deskTab === 'all' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 text-base mb-1">All Patient Encounters</h3>
              <p className="text-xs text-slate-500 mb-4">Complete history of visits scheduled with {currentDoctor?.doctor_name}.</p>
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-clinic-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-semibold">Loading patient records...</p>
                  </div>
                ) : queue.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No records found.</div>
                ) : (
                  queue.map(q => (
                    <div key={q.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{q.patient_name}</span>
                        <span className="text-slate-500 ml-2">{q.patient_phone}</span>
                        {q.notes && <span className="text-slate-400 ml-2 italic">({q.notes})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={q.status} />
                        {q.slip_number && <span className="font-mono text-slate-600 font-semibold">#{q.slip_number}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Tab: POS / Walk-In Reception Desk ── */}
          {deskTab === 'pos' && (
            <div className="space-y-6">
              {/* POS Header Banner */}
              <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-4 sm:p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold uppercase tracking-wider">
                      Walk-In Counter &bull; Point of Sale
                    </span>
                    <span className="text-emerald-300 text-xs font-semibold">
                      {formatDoctorName(currentDoctor?.doctor_name)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mt-1.5" style={{ fontFamily: 'Outfit,sans-serif' }}>
                    Instant Patient Booking &amp; Token Generator
                  </h3>
                  <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
                    Register walk-in or telephone patients directly. Appointments booked from this desk are <strong>automatically confirmed</strong> with immediate Token # assignment and payment recording.
                  </p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => fetchPosDays(selectedDoctorId)}
                    disabled={posLoadingDays}
                    className="flex-1 sm:flex-none justify-center px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${posLoadingDays ? 'animate-spin' : ''}`} />
                    <span>Refresh Slots</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeskTab('queue')}
                    className="flex-1 sm:flex-none justify-center px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>View Live Queue ({queue.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status Warning if Today is fully booked */}
              {(() => {
                const todayItem = posDays.find(d => d.is_today);
                const isTodayFull = todayItem && todayItem.available_count === 0;
                if (isTodayFull) {
                  return (
                    <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center flex-shrink-0 font-bold text-lg shadow-xs">
                          ⚠️
                        </div>
                        <div className="text-xs">
                          <strong className="block font-extrabold text-amber-950 text-sm">
                            All consultation slots for Today are fully booked!
                          </strong>
                          <span className="text-amber-900 mt-0.5 block">
                            Have an urgent walk-in patient at the desk? Generate an emergency slot immediately with priority token numbering.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => openEmergencySlotModal(todayItem?.date)}
                          disabled={creatingEmergencySlot}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Clock className="w-4 h-4 text-white" />
                          <span>🚨 Select Emergency Timing for Walk-in Patient</span>
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Two-Column Grid: Left (Slots & Dates) & Right (Patient & POS Billing) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ── Left Column: Step 1: Date & Slot Selection ── */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2" style={{ fontFamily: 'Outfit,sans-serif' }}>
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span>Step 1: Select Appointment Date &amp; Slot</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Daily token numbers strictly follow the daily slot order (#1, #2, #3...).
                        </p>
                      </div>
                      {posLoadingDays && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-clinic-600" />
                          <span>Checking availability...</span>
                        </div>
                      )}
                    </div>

                    {/* Date Selector Pills */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-2">
                        Choose Visit Day:
                      </label>
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none touch-scroll -mx-1 px-1 sm:mx-0 sm:px-0 flex-nowrap">
                        {posDays.map(day => {
                          const isSelected = (selectedPosDate || (posDays[0] && posDays[0].date)) === day.date;
                          const isOff = Boolean(day.is_off_day);
                          const isDayToday = Boolean(day.is_today || day.date === pktTodayYmd);
                          const upcomingSlots = isDayToday ? (day.slots || []).filter(s => !isPosSlotPassed(s, true)) : (day.slots || []);
                          const upcomingCount = isDayToday ? upcomingSlots.length : day.available_count;
                          const hasOpen = upcomingCount > 0;
                          return (
                            <button
                              key={day.date}
                              type="button"
                              onClick={() => {
                                setSelectedPosDate(day.date);
                                setSelectedPosSlot(null);
                              }}
                              className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${isSelected
                                ? isOff
                                  ? 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-200 shadow-xs'
                                  : 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-200 shadow-xs'
                                : isOff
                                  ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50'
                                  : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs font-bold ${isSelected ? (isOff ? 'text-rose-950' : 'text-emerald-950') : 'text-slate-800'}`}>
                                  {day.label}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isOff
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : hasOpen
                                    ? isSelected
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-700'
                                  }`}>
                                  {isOff ? 'OFF DAY' : hasOpen ? `${upcomingCount} open` : (isDayToday ? 'All Passed' : 'Full')}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                                {day.date_fmt}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Available Slot Cards for Selected Day */}
                    {(() => {
                      const curDay = posDays.find(d => d.date === (selectedPosDate || (posDays[0] && posDays[0].date)));
                      if (!curDay) {
                        return (
                          <div className="py-8 text-center text-xs text-slate-400">
                            Loading slots...
                          </div>
                        );
                      }

                      if (curDay.is_off_day) {
                        return (
                          <div className="py-8 text-center bg-rose-50/60 rounded-xl border border-dashed border-rose-200 px-4 space-y-3">
                            <Calendar className="w-8 h-8 text-rose-400 mx-auto" />
                            <div>
                              <p className="text-xs font-bold text-rose-900">Clinic Closed on {curDay.label} ({curDay.date_fmt}) &mdash; Weekly Off Day</p>
                              <p className="text-[11px] text-rose-700 mt-1 max-w-sm mx-auto">
                                {currentDoctor?.doctor_name} has scheduled this day as an Off Day. However, for urgent walk-in patients, you can select specific consultation timing below.
                              </p>
                            </div>
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => openEmergencySlotModal(curDay.date)}
                                disabled={creatingEmergencySlot}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Clock className="w-3.5 h-3.5 text-white" />
                                <span>🚨 Select Emergency Timing for Walk-in</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      const isCurDayToday = Boolean(curDay.is_today || curDay.date === pktTodayYmd);
                      const availableUpcomingSlots = isCurDayToday
                        ? (curDay.slots || []).filter(s => !isPosSlotPassed(s, true))
                        : (curDay.slots || []);
                      const passedSlotsCount = isCurDayToday ? ((curDay.slots || []).length - availableUpcomingSlots.length) : 0;

                      if (availableUpcomingSlots.length === 0) {
                        return (
                          <div className="p-6 text-center bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-slate-50 rounded-2xl border-2 border-dashed border-amber-300 px-4 space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                              <AlertCircle className="w-6 h-6 text-amber-600" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-extrabold text-amber-950">
                                {isCurDayToday ? `All Standard Slots Ended or Booked Today` : `All Standard Slots Booked on ${curDay.label}`} ({curDay.date_fmt})
                              </p>
                              <p className="text-[11px] text-amber-900/90 max-w-md mx-auto">
                                {isCurDayToday
                                  ? `All regular consultation slots for earlier today (${passedSlotsCount} slots) have already passed in time or are booked. As the reception assistant, you can choose specific timing for an Emergency Walk-In Slot right now.`
                                  : `All regular consultation slots for this date are fully booked or past. As the reception assistant, you can choose specific timing for an Emergency Walk-In Slot right now.`}
                              </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                              <button
                                type="button"
                                onClick={() => openEmergencySlotModal(curDay.date)}
                                disabled={creatingEmergencySlot}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Clock className="w-4 h-4 text-white" />
                                <span>🚨 Select Specific Timing (Custom Time)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCreateEmergencySlot('NOW', 20, curDay.date)}
                                disabled={creatingEmergencySlot}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                <span>⚡ Immediate Slot (Right Now)</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div>
                          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-700">
                                Available Consultation Slots &bull; {curDay.label} ({curDay.date_fmt})
                              </span>
                              {passedSlotsCount > 0 && (
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium border border-slate-200">
                                  ⏱️ {passedSlotsCount} earlier {passedSlotsCount === 1 ? 'slot' : 'slots'} passed
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-emerald-700 font-semibold">
                                {availableUpcomingSlots.length} available
                              </span>
                              <button
                                type="button"
                                onClick={() => openEmergencySlotModal(curDay.date)}
                                disabled={creatingEmergencySlot}
                                title="Choose specific timing for emergency walk-in slot"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>🚨 + Emergency Slot</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                            {availableUpcomingSlots.map(s => {
                              const isSlotSelected = selectedPosSlot?.id === s.id;
                              const isEmg = Boolean(s.is_emergency);
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setSelectedPosSlot(s)}
                                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${isSlotSelected
                                    ? isEmg
                                      ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                                      : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                                    : isEmg
                                      ? 'bg-amber-50/70 hover:bg-amber-50 border-amber-300 text-slate-900 shadow-2xs'
                                      : 'bg-white hover:bg-emerald-50/50 hover:border-emerald-300 border-slate-200 text-slate-800 shadow-2xs'
                                    }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold ${isSlotSelected
                                      ? isEmg ? 'bg-amber-950 text-amber-200' : 'bg-white text-emerald-800'
                                      : isEmg
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                      {isEmg ? `🚨 EMG #${s.daily_slot_number}` : `Slot #${s.daily_slot_number}`}
                                    </span>
                                    <span className={`text-[10px] font-semibold ${isSlotSelected ? (isEmg ? 'text-amber-100' : 'text-emerald-100') : 'text-slate-400'
                                      }`}>
                                      Token #{s.daily_slot_number}
                                    </span>
                                  </div>

                                  <p className="text-xs font-bold mt-2">
                                    {s.start_time_fmt}
                                  </p>
                                  <p className={`text-[10px] ${isSlotSelected ? (isEmg ? 'text-amber-100' : 'text-emerald-100') : (isEmg ? 'text-amber-800 font-medium' : 'text-slate-500')
                                    }`}>
                                    to {s.end_time_fmt}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ── Right Column: Step 2: Patient Info & Billing Card ── */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2" style={{ fontFamily: 'Outfit,sans-serif' }}>
                        <User className="w-4 h-4 text-emerald-600" />
                        <span>Step 2: Patient Details &amp; Payment</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Instant direct booking with zero OTP delay.
                      </p>
                    </div>

                    {/* Patient Full Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Patient Full Name &bull; Required
                      </label>
                      <input
                        type="text"
                        value={posPatientName}
                        onChange={e => setPosPatientName(e.target.value)}
                        placeholder="e.g. Muhammad Rehan"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Patient Phone & Lookup */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Patient Phone Number &bull; Required
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          value={posPatientPhone}
                          onChange={e => handlePatientPhoneSearch(e.target.value)}
                          placeholder="03456789012"
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                        />
                        {patientLookupLoading && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-clinic-600 absolute right-3 top-3" />
                        )}
                      </div>

                      {/* Autocomplete suggestion chips for returning patient */}
                      {patientLookupResults.length > 0 && (
                        <div className="mt-2 p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px]">
                          <span className="text-[10px] font-bold text-emerald-900 block mb-1">
                            Found returning patient (click to auto-fill):
                          </span>
                          <div className="flex flex-col gap-1">
                            {patientLookupResults.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setPosPatientName(p.full_name);
                                  setPosPatientPhone(p.phone);
                                  if (p.email) setPosPatientEmail(p.email);
                                  setPatientLookupResults([]);
                                }}
                                className="text-left px-2 py-1 rounded bg-white hover:bg-emerald-100 border border-emerald-200 font-semibold text-emerald-950 flex items-center justify-between transition-colors"
                              >
                                <span>{p.full_name}</span>
                                <span className="font-mono text-[10px] text-emerald-700">{p.phone}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Email / WhatsApp / Visit Notes */}
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          value={posPatientEmail}
                          onChange={e => setPosPatientEmail(e.target.value)}
                          placeholder="patient@example.com"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Chief Complaint / Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={posNotes}
                          onChange={e => setPosNotes(e.target.value)}
                          placeholder="e.g. Blood pressure check / Walk-in consultation"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Selected Slot Recap Banner */}
                    <div className={`p-3 rounded-xl border transition-all ${selectedPosSlot
                      ? selectedPosSlot.is_emergency
                        ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300'
                        : 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">
                          Selected Consultation Slot:
                        </span>
                        {selectedPosSlot?.is_emergency && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                            🚨 Emergency Walk-In
                          </span>
                        )}
                      </div>
                      {selectedPosSlot ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={`font-extrabold text-xs block ${selectedPosSlot.is_emergency ? 'text-amber-950' : 'text-emerald-900'}`}>
                              {selectedPosSlot.is_emergency ? `🚨 Emergency Slot #${selectedPosSlot.daily_slot_number}` : `Slot #${selectedPosSlot.daily_slot_number}`} &bull; {selectedPosSlot.start_time_fmt} - {selectedPosSlot.end_time_fmt}
                            </span>
                            <span className={`text-[11px] ${selectedPosSlot.is_emergency ? 'text-amber-800' : 'text-emerald-700'}`}>
                              {posDays.find(d => d.date === selectedPosDate)?.date_fmt || selectedPosDate}
                            </span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs shadow-xs ${selectedPosSlot.is_emergency ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                            }`}>
                            Token #{selectedPosSlot.daily_slot_number}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          👈 Please click an available slot in Step 1 to proceed.
                        </p>
                      )}
                    </div>

                    {/* POS Billing & Cash Counter Section */}
                    <div className="border-t border-slate-100 pt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          Consultation Fee (Rs.)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPosFee(Number(currentDoctor?.fee_clinic || 1000))}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                          >
                            Standard ({formatCurrency(currentDoctor?.fee_clinic || 1000)})
                          </button>
                          <button
                            type="button"
                            onClick={() => setPosFee(0)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                          >
                            Free / Waiver
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="number"
                          value={posFee}
                          onChange={e => setPosFee(Math.max(0, Number(e.target.value)))}
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Payment Mode Toggle */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                          Payment Collection:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPosPaymentMode('PENDING_CASH')}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${posPaymentMode === 'PENDING_CASH'
                              ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400 text-amber-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                          >
                            <span className="block font-bold text-xs">Pay at Calling Time</span>
                            <span className="text-[10px] text-slate-500">Collect fee when called</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPosPaymentMode('PAID')}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${posPaymentMode === 'PAID'
                              ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400 text-emerald-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                          >
                            <span className="block font-bold text-xs">Paid Right Now (POS)</span>
                            <span className="text-[10px] text-slate-500">Cash collected at desk</span>
                          </button>
                        </div>
                      </div>

                      {/* Cash Tendered & Change calculator (when Paid Right Now) */}
                      {posPaymentMode === 'PAID' && (
                        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2 animate-fade-in">
                          <div className="flex items-center justify-between text-xs">
                            <label className="font-bold text-emerald-950">
                              Cash Received from Patient (Rs.):
                            </label>
                            <input
                              type="number"
                              value={posCashTendered}
                              onChange={e => setPosCashTendered(e.target.value)}
                              placeholder={`e.g. ${posFee}`}
                              className="w-28 px-2 py-1 text-right font-mono font-bold text-xs border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          {posCashTendered && Number(posCashTendered) > 0 && Number(posCashTendered) < posFee && (
                            <div className="flex items-center justify-between border-t border-amber-200/80 pt-1.5 text-xs bg-amber-50/70 p-1.5 rounded-lg text-amber-900">
                              <span className="font-bold flex items-center gap-1">
                                <span>🟡 Partial Advance Deposit</span>
                              </span>
                              <span className="font-mono font-extrabold text-xs text-rose-700">
                                Remaining Due on Calling: {formatCurrency(posFee - Number(posCashTendered))}
                              </span>
                            </div>
                          )}

                          {posCashTendered && Number(posCashTendered) >= posFee && (
                            <div className="flex items-center justify-between border-t border-emerald-200/80 pt-1.5 text-xs">
                              <span className="font-bold text-emerald-800">Change Due:</span>
                              <span className="font-mono font-extrabold text-sm text-emerald-700">
                                {formatCurrency(Math.max(0, Number(posCashTendered) - posFee))}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Error Notice */}
                    {posError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>{posError}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="button"
                      disabled={posSubmitting || !selectedPosSlot}
                      onClick={handleConfirmPosBooking}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {posSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Issuing Token &amp; Confirming...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>
                            {selectedPosSlot
                              ? `Confirm Booking · Issue Token #${selectedPosSlot.daily_slot_number}`
                              : 'Select Slot in Step 1 to Book'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Emergency Slot Timing Selection Modal ── */}
          {showEmergencyModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-amber-200 overflow-hidden relative">
                {/* Header (Pinned) */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between flex-shrink-0 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md font-bold text-lg">
                      🚨
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base" style={{ fontFamily: 'Outfit,sans-serif' }}>
                        Select Emergency Slot Timing
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Set custom consultation time &amp; duration for walk-in patient
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmergencyModal(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
                  {/* Target Date Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Appointment Date:
                    </label>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {posDays.slice(0, 5).map(d => (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => setEmgModalDate(d.date)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${emgModalDate === d.date
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          {d.label} ({d.date_fmt})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Quick Time Presets:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const h = (now.getUTCHours() + 5) % 24;
                          const m = (now.getUTCMinutes() + 2) % 60;
                          setEmgHour(String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0'));
                          setEmgMinute(String(Math.floor(m / 5) * 5).padStart(2, '0'));
                          setEmgPeriod(h >= 12 ? 'PM' : 'AM');
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span>⚡ Right Now</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const totalMins = (now.getUTCHours() + 5) * 60 + now.getUTCMinutes() + 15;
                          const h = Math.floor(totalMins / 60) % 24;
                          const m = totalMins % 60;
                          setEmgHour(String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0'));
                          setEmgMinute(String(Math.floor(m / 5) * 5).padStart(2, '0'));
                          setEmgPeriod(h >= 12 ? 'PM' : 'AM');
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span>⏱️ In 15 Mins</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const totalMins = (now.getUTCHours() + 5) * 60 + now.getUTCMinutes() + 30;
                          const h = Math.floor(totalMins / 60) % 24;
                          const m = totalMins % 60;
                          setEmgHour(String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0'));
                          setEmgMinute(String(Math.floor(m / 5) * 5).padStart(2, '0'));
                          setEmgPeriod(h >= 12 ? 'PM' : 'AM');
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span>⏱️ In 30 Mins</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEmgHour('09');
                          setEmgMinute('00');
                          setEmgPeriod('AM');
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span>☀️ Morning (09:00 AM)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEmgHour('05');
                          setEmgMinute('00');
                          setEmgPeriod('PM');
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🌙 Evening (05:00 PM)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEmgHour('08');
                          setEmgMinute('30');
                          setEmgPeriod('PM');
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🌙 Night (08:30 PM)</span>
                      </button>
                    </div>
                  </div>

                  {/* Exact Time Selection Controls (Hour : Minute : AM/PM) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                    <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Exact Start Timing:</span>
                    </label>

                    <div className="flex items-center justify-center gap-2">
                      {/* Hour */}
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Hour
                        </label>
                        <select
                          value={emgHour}
                          onChange={e => setEmgHour(e.target.value)}
                          className="w-full h-10 px-2 text-center text-sm font-extrabold font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <span className="text-xl font-bold text-slate-400 self-end mb-1.5">:</span>

                      {/* Minute */}
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Minute
                        </label>
                        <select
                          value={emgMinute}
                          onChange={e => setEmgMinute(e.target.value)}
                          className="w-full h-10 px-2 text-center text-sm font-extrabold font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                          {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      {/* AM / PM Segmented Control */}
                      <div className="w-28 self-end">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Period
                        </label>
                        <div className="h-10 p-1 bg-white border border-slate-300 rounded-xl flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEmgPeriod('AM')}
                            className={`flex-1 h-full rounded-lg text-xs font-extrabold transition-all cursor-pointer ${emgPeriod === 'AM'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                              }`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmgPeriod('PM')}
                            className={`flex-1 h-full rounded-lg text-xs font-extrabold transition-all cursor-pointer ${emgPeriod === 'PM'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                              }`}
                          >
                            PM
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Consultation Duration */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Consultation Duration:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[15, 20, 30].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setEmgDuration(mins)}
                          className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${emgDuration === mins
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                          {mins} Mins {mins === 20 ? '(Standard)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview Banner */}
                  <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-2xl flex items-center justify-between text-xs text-amber-950">
                    <div>
                      <span className="font-extrabold text-xs block">
                        ⏰ Emergency Slot: {emgHour}:{emgMinute} {emgPeriod}
                      </span>
                      <span className="text-[11px] text-amber-800">
                        Duration: {emgDuration} mins &bull; {posDays.find(d => d.date === emgModalDate)?.date_fmt || emgModalDate}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold text-[10px] border border-amber-300">
                      Priority Walk-In
                    </span>
                  </div>
                </div>

                {/* Footer with Action Buttons (Permanently Pinned at Bottom) */}
                <div className="p-3.5 sm:px-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowEmergencyModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 border border-slate-200 bg-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={creatingEmergencySlot}
                    onClick={() => {
                      const timeStr = `${emgHour}:${emgMinute} ${emgPeriod}`;
                      handleCreateEmergencySlot(timeStr, emgDuration, emgModalDate);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {creatingEmergencySlot ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Generating Slot...</span>
                      </>
                    ) : (
                      <>
                        <span>🚨 Create Emergency Slot at {emgHour}:{emgMinute} {emgPeriod}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── POS Success Thermal Slip / Receipt Modal ── */}
          {posSuccessReceipt && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 relative">
                <button
                  type="button"
                  onClick={() => setPosSuccessReceipt(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 absolute top-4 right-4 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Print receipt card */}
                <div id="printable-pos-slip" className="border-2 border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50/50 space-y-3 font-sans">
                  {/* Clinic & Doctor Header */}
                  <div className="text-center pb-2 border-b border-dashed border-slate-300">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block mb-1">
                      Confirmed Walk-In Slip
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base" style={{ fontFamily: 'Outfit,sans-serif' }}>
                      {formatDoctorName(posSuccessReceipt.doctor_name || currentDoctor?.doctor_name)} Clinic
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {posSuccessReceipt.doctor_specialty || currentDoctor?.specialty}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {posSuccessReceipt.clinic_address || currentDoctor?.clinic_address}
                    </p>
                  </div>

                  {/* Token Highlight */}
                  <div className="text-center py-2 bg-emerald-50/90 rounded-xl border border-emerald-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Queue / Daily Token Number
                    </span>
                    <span className="text-4xl font-extrabold font-mono text-emerald-700 block my-0.5">
                      #{String(posSuccessReceipt.token_number || 1).padStart(2, '0')}
                    </span>
                    <span className="font-mono text-xs font-semibold text-emerald-800">
                      SLIP #{posSuccessReceipt.slip_number}
                    </span>
                  </div>

                  {/* Patient & Appointment Details */}
                  <div className="text-xs space-y-1.5 py-1 border-b border-dashed border-slate-300 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Patient:</span>
                      <strong className="text-slate-900">{posSuccessReceipt.patient_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phone:</span>
                      <span className="font-mono">{posSuccessReceipt.patient_phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Visit Date:</span>
                      <strong>{posSuccessReceipt.slot_date}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Scheduled Time:</span>
                      <strong>{posSuccessReceipt.slot_time}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Visit Status:</span>
                      <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">
                        CONFIRMED
                      </span>
                    </div>
                  </div>

                  {/* Fee & Payment Breakdown */}
                  <div className="text-xs space-y-1.5 py-1 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Consultation Fee:</span>
                      <strong className="font-mono">{formatCurrency(posSuccessReceipt.fee_amount)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Status:</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${posSuccessReceipt.payment_status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : posSuccessReceipt.payment_status === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-amber-100 text-amber-800'
                        }`}>
                        {posSuccessReceipt.payment_status === 'PAID'
                          ? '✓ PAID IN FULL'
                          : posSuccessReceipt.payment_status === 'PARTIAL'
                            ? '🟡 PARTIAL ADVANCE (Remaining Due on Calling)'
                            : 'PAY AT CALLING TIME'}
                      </span>
                    </div>
                    {posSuccessReceipt.payment_status === 'PARTIAL' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Advance Paid at Desk:</span>
                          <span className="font-mono font-bold text-emerald-800">
                            {formatCurrency(posSuccessReceipt.amount_paid || posSuccessReceipt.cash_tendered)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-rose-700 bg-rose-50/70 p-1 rounded">
                          <span>Remaining Due on Calling:</span>
                          <span className="font-mono">
                            {formatCurrency(posSuccessReceipt.amount_due !== undefined ? posSuccessReceipt.amount_due : (posSuccessReceipt.fee_amount - (posSuccessReceipt.amount_paid || posSuccessReceipt.cash_tendered)))}
                          </span>
                        </div>
                      </>
                    )}
                    {posSuccessReceipt.payment_status === 'PAID' && posSuccessReceipt.cash_tendered !== undefined && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Cash Received:</span>
                          <span className="font-mono">{formatCurrency(posSuccessReceipt.cash_tendered)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-800">
                          <span>Change Returned:</span>
                          <span className="font-mono">{formatCurrency(posSuccessReceipt.change_amount)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <p className="text-[10px] text-center text-slate-400 italic pt-1 border-t border-dashed border-slate-300">
                    Please present this slip at the reception desk when your token number is called.
                  </p>
                </div>

                {/* Modal Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Thermal Slip / Receipt</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPosSuccessReceipt(null);
                        setDeskTab('queue');
                      }}
                      className="py-2 bg-clinic-50 hover:bg-clinic-100 text-clinic-800 border border-clinic-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Go to Live Queue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosSuccessReceipt(null)}
                      className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Book Next Walk-In</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIP Loyalty Card Application Verification Modal for Assistant */}
          {selectedLoyaltyAppt && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden relative">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 p-5 text-white flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-xs">
                      💳
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base tracking-tight">VIP Golden Loyalty Card Application</h3>
                      <p className="text-xs text-amber-100 mt-0.5">
                        Submitted during appointment booking &bull; Verify before approving &amp; card handover
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLoyaltyAppt(null)}
                    className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 10 Verified Application Details */}
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
                    <div className="text-xs font-black uppercase tracking-wider text-amber-900 mb-3 flex items-center justify-between">
                      <span>📋 10 Patient Verification Fields</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        selectedLoyaltyAppt.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {selectedLoyaltyAppt.status === 'CONFIRMED' ? '✓ Card Approved' : '⏳ Awaiting Assistant Approval'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">1. Full Name</span>
                        <span className="font-bold text-slate-900">{selectedLoyaltyAppt.loyalty_applicant_name || selectedLoyaltyAppt.patient_name || 'Ahmed Khan'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">2. Father / Husband Name</span>
                        <span className="font-bold text-slate-900">{selectedLoyaltyAppt.loyalty_guardian_name || 'Not provided'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">3. Date of Birth</span>
                        <span className="font-bold text-emerald-800 font-mono">{selectedLoyaltyAppt.loyalty_dob || 'Not provided'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">4. Gender</span>
                        <span className="font-bold text-slate-900">{selectedLoyaltyAppt.loyalty_gender || 'Not specified'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">5. CNIC / B-Form</span>
                        <span className="font-bold text-slate-900 font-mono">{selectedLoyaltyAppt.loyalty_cnic || 'Not provided'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">6. Mobile Number</span>
                        <span className="font-bold text-slate-900 font-mono">{selectedLoyaltyAppt.loyalty_mobile || selectedLoyaltyAppt.patient_phone || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">7. WhatsApp Number</span>
                        <span className="font-bold text-slate-900 font-mono">{selectedLoyaltyAppt.loyalty_whatsapp || selectedLoyaltyAppt.patient_phone || 'Same as Mobile'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">8. Email Address</span>
                        <span className="font-bold text-slate-900">{selectedLoyaltyAppt.loyalty_email || selectedLoyaltyAppt.patient_email || 'Not provided'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100 sm:col-span-2">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">9. Residential Address</span>
                        <span className="font-bold text-slate-900">{selectedLoyaltyAppt.loyalty_address || 'Not provided'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100 sm:col-span-2">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">10. City</span>
                        <span className="font-bold text-slate-900">{selectedLoyaltyAppt.loyalty_city || 'Dera Ismail Khan'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Consultation Fee & Privilege Card Summary */}
                  <div className="bg-gradient-to-r from-amber-50 to-amber-100/70 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-medium text-slate-600">
                      <span>Standard Consultation Fee:</span>
                      <span className="font-mono">{formatCurrency(currentDoctor?.fee_clinic || 1000)}</span>
                    </div>
                    <div className="flex items-center justify-between font-bold text-emerald-700">
                      <span>VIP Golden Loyalty Discount:</span>
                      <span className="font-mono">-{formatCurrency(selectedLoyaltyAppt.loyalty_discount_amount || Math.round((currentDoctor?.fee_clinic || 1000) * 0.2))}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-amber-300 font-black text-amber-950 text-sm">
                      <span>Discounted Fee Payable at Desk:</span>
                      <span className="font-mono">{formatCurrency(selectedLoyaltyAppt.fee_amount || Math.round((currentDoctor?.fee_clinic || 1000) * 0.8))}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 pt-1">
                      📍 <strong>Card Handover:</strong> Hand over the physical Golden VIP Loyalty Card to the patient at reception upon payment.
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedLoyaltyAppt(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer"
                  >
                    Close
                  </button>

                  {(selectedLoyaltyAppt.status === 'PENDING_ASSISTANT_APPROVAL' || selectedLoyaltyAppt.status === 'pending') && (
                    <button
                      type="button"
                      disabled={Boolean(appointmentActionLoading)}
                      onClick={async () => {
                        const apptId = selectedLoyaltyAppt.id;
                        setSelectedLoyaltyAppt(null);
                        await handleApprove(apptId);
                      }}
                      className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs rounded-xl shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve &amp; Issue VIP Loyalty Card</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



function DoctorSection({ onSwitchRole }: { onSwitchRole?: (r: 'patient' | 'assistant' | 'doctor' | 'admin') => void }) {
  const [token, setToken] = useState(localStorage.getItem('doctor_token') || '');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  // SWR: Initialize appointments from instant local cache so UI renders with 0ms delay
  const [appointments, setAppointments] = useState<AppointmentItem[]>(() => {
    try {
      const c = localStorage.getItem('doc_cached_appts');
      return c ? JSON.parse(c) : [];
    } catch {
      return [];
    }
  });
  const [analytics, setAnalytics] = useState<any>(() => {
    try {
      const c = localStorage.getItem('doc_cached_analytics');
      return c ? JSON.parse(c) : null;
    } catch {
      return null;
    }
  });
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [activePortalTab, setActivePortalTab] = useState<'overview' | 'schedule' | 'assistants' | 'profile'>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [assistants, setAssistants] = useState<any[]>([]);

  // Timeframe filter for overview: today, week, month, all
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [apptSearch, setApptSearch] = useState('');
  const [apptStatusFilter, setApptStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [loadingAppointments, setLoadingAppointments] = useState<boolean>(() => {
    try {
      const c = localStorage.getItem('doc_cached_appts');
      const parsed = c ? JSON.parse(c) : null;
      return !(Array.isArray(parsed) && parsed.length > 0);
    } catch {
      return true;
    }
  });
  const [isRefreshingAppts, setIsRefreshingAppts] = useState<boolean>(false);
  const [callingOrderActive, setCallingOrderActive] = useState<boolean>(() => {
    return localStorage.getItem('doc_calling_order') === 'true';
  });

  // Schedule & Slot Generation state
  const todayIso = new Date().toISOString().split('T')[0];
  const nextWeekIso = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const [slotFromDate, setSlotFromDate] = useState(todayIso);
  const [slotToDate, setSlotToDate] = useState(nextWeekIso);
  const [slotInterval, setSlotInterval] = useState<number>(20);
  const [docOffDays, setDocOffDays] = useState<string[]>(['sunday']);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [clearingSlots, setClearingSlots] = useState(false);
  const [slotDateFilter, setSlotDateFilter] = useState<string>('all');
  const [slotStatusFilter, setSlotStatusFilter] = useState<string>('all');
  const [doctorShowPastSlots, setDoctorShowPastSlots] = useState<boolean>(false);
  const [slotLimitCount, setSlotLimitCount] = useState<number>(100);

  // Blackout date state
  const tomorrowIso = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [blackoutDate, setBlackoutDate] = useState(tomorrowIso);
  const [blackoutReason, setBlackoutReason] = useState('Clinic maintenance');
  const [blackoutMsg, setBlackoutMsg] = useState('');
  const [blackoutLoading, setBlackoutLoading] = useState(false);
  const [slotActionLoading, setSlotActionLoading] = useState<{ id: string; action: 'block' | 'unblock' | 'delete' } | null>(null);

  // Weekly hours shift state
  const [selectedShift, setSelectedShift] = useState<string>('BOTH');
  const [shiftMsg, setShiftMsg] = useState('');
  const [savingShift, setSavingShift] = useState(false);

  // Custom Morning & Evening Shift Dropdown States
  const [morningStartHour, setMorningStartHour] = useState('09');
  const [morningStartMin, setMorningStartMin] = useState('00');
  const [morningStartPeriod, setMorningStartPeriod] = useState('AM');
  const [morningEndHour, setMorningEndHour] = useState('01');
  const [morningEndMin, setMorningEndMin] = useState('00');
  const [morningEndPeriod, setMorningEndPeriod] = useState('PM');

  const [eveningStartHour, setEveningStartHour] = useState('05');
  const [eveningStartMin, setEveningStartMin] = useState('00');
  const [eveningStartPeriod, setEveningStartPeriod] = useState('PM');
  const [eveningEndHour, setEveningEndHour] = useState('09');
  const [eveningEndMin, setEveningEndMin] = useState('00');
  const [eveningEndPeriod, setEveningEndPeriod] = useState('PM');

  // Assistant management state
  const [showAddAsstModal, setShowAddAsstModal] = useState(false);
  const [newAsstName, setNewAsstName] = useState('');
  const [newAsstEmail, setNewAsstEmail] = useState('');
  const [newAsstPhone, setNewAsstPhone] = useState('');
  const [newAsstPass, setNewAsstPass] = useState('');
  const [asstActionMsg, setAsstActionMsg] = useState('');
  const [asstLoading, setAsstLoading] = useState(false);

  // Reset Assistant Password Modal state
  const [resetAsstModal, setResetAsstModal] = useState<{
    id: string;
    name: string;
    email: string;
    currentPassword?: string;
  } | null>(null);
  const [newResetPass, setNewResetPass] = useState('');
  const [confirmResetPass, setConfirmResetPass] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [copiedAsstId, setCopiedAsstId] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [id: string]: boolean }>({});

  // Appointment details & Consultation action modal
  const [selectedAppt, setSelectedAppt] = useState<AppointmentItem | null>(null);
  const [consultNote, setConsultNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [apptActionMsg, setApptActionMsg] = useState('');
  const [doctorMarkPaidLoading, setDoctorMarkPaidLoading] = useState<string | null>(null);

  // Profile Edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFee, setEditFee] = useState<number>(1000);
  const [editShift, setEditShift] = useState('BOTH');
  const [editAddress, setEditAddress] = useState('');
  const [editMapsUrl, setEditMapsUrl] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editExpertise1, setEditExpertise1] = useState('');
  const [editExpertise2, setEditExpertise2] = useState('');
  const [editExpertise3, setEditExpertise3] = useState('');
  const [editExpYears, setEditExpYears] = useState<number>(10);
  const [editQualification, setEditQualification] = useState('MBBS, FCPS');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadMsg, setImageUploadMsg] = useState('');

  const handleLoginSubmit = async (emailInput?: string, passInput?: string) => {
    try {
      setLoginLoading(true);
      setLoginError('');
      const targetEmail = (emailInput !== undefined ? emailInput : loginEmail).trim();
      const targetPass = passInput !== undefined ? passInput : loginPass;
      const res: any = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: targetEmail,
          password: targetPass,
          portal: 'DOCTOR'
        })
      });

      // Role check: If an assistant attempts to sign into Doctor Portal, reject immediately
      const userRole = res.user?.role?.toUpperCase();
      if (userRole !== 'DOCTOR') {
        localStorage.removeItem('doctor_token');
        setToken('');
        setDoctorProfile(null);
        if (userRole === 'ASSISTANT') {
          setLoginError('Access Denied: Assistant accounts are not permitted to log in or access the Doctor Portal. Please sign in via the Assistant Desk.');
        } else {
          setLoginError(`Access Denied: Your account role is "${userRole}". This portal is exclusively for verified medical doctors.`);
        }
        return;
      }

      const t = res.access_token || res.token || '';
      setToken(t);
      localStorage.setItem('doctor_token', t);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Check credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLoginSubmit();
  };

  const handleSignOut = () => {
    localStorage.removeItem('doctor_token');
    localStorage.removeItem('token');
    try { sessionStorage.clear(); } catch (_) { }
    setToken('');
    setDoctorProfile(null);
    setAppointments([]);
    setAnalytics(null);
    setSlots([]);
    setAssistants([]);
    if (onSwitchRole) {
      onSwitchRole('patient');
    } else {
      window.location.href = '/';
    }
  };

  const loadDoctorData = (archived?: boolean, silent: boolean = false) => {
    if (!token) return Promise.resolve();
    if (!silent && appointments.length === 0) {
      setLoadingAppointments(true);
    }
    setIsRefreshingAppts(true);
    const showArchived = typeof archived === 'boolean' ? archived : includeArchived;
    const headers = { Authorization: `Bearer ${token}` };

    // Performance: Fire all requests concurrently rather than waiting sequentially on /auth/me
    const mePromise = apiFetch<any>('/auth/me', { headers });
    const profilePromise = apiFetch<any>('/doctor/profile', { headers }).catch(() => null);
    const apptsPromise = apiFetch<AppointmentItem[]>(`/doctor/appointments?include_archived=${showArchived}`, { headers }).catch(() => []);
    const analyPromise = apiFetch<any>('/doctor/analytics', { headers }).catch(() => null);
    const slotsPromise = apiFetch<SlotData[]>('/doctor/slots/my-slots', { headers }).catch(() => []);
    const asstsPromise = apiFetch<any[]>('/doctor/assistants', { headers }).catch(() => []);

    // Instant UI responsiveness: render appointments table the instant apptsPromise resolves and cache in localStorage
    apptsPromise.then((appts) => {
      if (Array.isArray(appts)) {
        setAppointments(appts);
        try {
          localStorage.setItem('doc_cached_appts', JSON.stringify(appts));
        } catch {}
      }
      setLoadingAppointments(false);
      setIsRefreshingAppts(false);
    });

    analyPromise.then((analy) => {
      if (analy) {
        setAnalytics(analy);
        try {
          localStorage.setItem('doc_cached_analytics', JSON.stringify(analy));
        } catch {}
      }
    });

    return mePromise
      .then((me) => {
        if (!me || me.role?.toUpperCase() !== 'DOCTOR') {
          // Invalidate non-doctor token immediately: clear token and return to doctor login screen
          localStorage.removeItem('doctor_token');
          localStorage.removeItem('doc_cached_appts');
          localStorage.removeItem('doc_cached_analytics');
          setToken('');
          setDoctorProfile(null);
          setAppointments([]);
          setAnalytics(null);
          setSlots([]);
          setAssistants([]);
          setLoginError('Access Denied: Assistant credentials cannot access the Doctor Portal. Please sign in via the Assistant Desk.');
          return;
        }

        return Promise.all([
          profilePromise,
          apptsPromise,
          analyPromise,
          slotsPromise,
          asstsPromise,
        ]).then(([profile, appts, analy, sl, assts]) => {
          if (profile) {
            setDoctorProfile(profile);
            if (profile.off_days) {
              const days = profile.off_days.split(',').map((d: string) => d.trim().toLowerCase()).filter(Boolean);
              if (days.length > 0) setDocOffDays(days);
            }
            setSelectedShift(profile.shift || 'BOTH');
            setEditFee(profile.fee_clinic || 1000);
            setEditShift(profile.shift || 'BOTH');
            setEditAddress(profile.clinic_address || '');
            setEditMapsUrl(profile.google_maps_url || '');
            setEditBio(profile.bio || '');
            setEditQualification(profile.qualification || 'MBBS, FCPS');
            const expParts = (profile.expertise || '').split(',').map((s: string) => s.trim());
            setEditExpertise1(expParts[0] || '');
            setEditExpertise2(expParts[1] || '');
            setEditExpertise3(expParts[2] || '');
            setEditExpYears(profile.experience_years !== undefined && profile.experience_years !== null ? Number(profile.experience_years) : 10);

            const ms = parse24to12(profile.morning_start || '09:00');
            setMorningStartHour(ms.hour);
            setMorningStartMin(ms.minute);
            setMorningStartPeriod(ms.period);

            const me = parse24to12(profile.morning_end || '13:00');
            setMorningEndHour(me.hour);
            setMorningEndMin(me.minute);
            setMorningEndPeriod(me.period);

            const es = parse24to12(profile.evening_start || '17:00');
            setEveningStartHour(es.hour);
            setEveningStartMin(es.minute);
            setEveningStartPeriod(es.period);

            const ee = parse24to12(profile.evening_end || '21:00');
            setEveningEndHour(ee.hour);
            setEveningEndMin(ee.minute);
            setEveningEndPeriod(ee.period);
          }
          if (Array.isArray(appts)) {
            setAppointments(appts);
          }
          if (analy) {
            setAnalytics(analy);
          }
          setSlots(Array.isArray(sl) ? sl : []);
          setAssistants(Array.isArray(assts) ? assts : []);
        });
      })
      .catch((err) => {
        localStorage.removeItem('doctor_token');
        localStorage.removeItem('doc_cached_appts');
        localStorage.removeItem('doc_cached_analytics');
        setToken('');
        setDoctorProfile(null);
        setLoginError(err.message || 'Session expired. Please sign in again.');
      })
      .finally(() => {
        setLoadingAppointments(false);
        setIsRefreshingAppts(false);
      });
  };

  useEffect(() => {
    loadDoctorData(includeArchived);
  }, [token, includeArchived]);

  // Robust date helpers: extract calendar date in PKT without timezone offset distortion
  const getApptDateStr = (a: AppointmentItem): string => {
    return getApptDateStrGlobal(a);
  };

  const getApptCreatedDateStr = (a: AppointmentItem): string => {
    return getApptDateStrGlobal(a);
  };

  const { todayStr: activeTodayStr, weekStartStr, weekEndStr, monthPrefix } = useMemo(() => {
    let todayStr = '';
    try {
      todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
    } catch {
      todayStr = new Date().toISOString().split('T')[0];
    }
    const [y, m, d] = todayStr.split('-').map(Number);
    const monthPrefix = `${y}-${String(m).padStart(2, '0')}`;

    // Current week in PKT: From Monday through Sunday
    const curr = new Date(y, m - 1, d);
    const day = curr.getDay(); // 0 is Sun, 1 is Mon...
    const startDay = new Date(curr);
    startDay.setDate(curr.getDate() - (day === 0 ? 6 : day - 1));
    const endDay = new Date(curr);
    endDay.setDate(curr.getDate() + (day === 0 ? 7 : 7 - day));

    const toIso = (dt: Date) => {
      const yy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    };

    return {
      todayStr,
      weekStartStr: toIso(startDay),
      weekEndStr: toIso(endDay),
      monthPrefix
    };
  }, []);

  const isMatchToday = (a: AppointmentItem): boolean => {
    const dt = getApptDateStrGlobal(a);
    return dt === activeTodayStr;
  };

  const isMatchWeek = (a: AppointmentItem): boolean => {
    const dt = getApptDateStrGlobal(a);
    return dt >= weekStartStr && dt <= weekEndStr;
  };

  const isMatchMonth = (a: AppointmentItem): boolean => {
    const dt = getApptDateStrGlobal(a);
    return dt.startsWith(monthPrefix);
  };

  const isApptTimePassed = (a: AppointmentItem): boolean => {
    const raw = a.slot_start || a.start_time;
    if (raw && typeof raw === 'string') {
      const normalized = raw.endsWith('Z') || raw.includes('+') || (raw.length > 10 && raw.slice(10).includes('-'))
        ? raw
        : raw + 'Z';
      const parsedTime = new Date(normalized).getTime();
      if (!isNaN(parsedTime)) {
        return parsedTime <= Date.now();
      }
    }
    const dtStr = getApptDateStrGlobal(a) || getApptDateStr(a);
    if (dtStr) {
      if (dtStr < activeTodayStr) return true;
      if (dtStr > activeTodayStr) return false;
      if (a.slot_time) {
        try {
          const match = a.slot_time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (match) {
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const ap = match[3]?.toUpperCase();
            if (ap === 'PM' && h < 12) h += 12;
            if (ap === 'AM' && h === 12) h = 0;
            const slotD = new Date();
            slotD.setHours(h, m, 0, 0);
            return slotD.getTime() <= Date.now();
          }
        } catch { }
      }
    }
    return false;
  };

  const canDoctorComplete = (a: AppointmentItem, isFirstActive: boolean = false): boolean => {
    const status = (a.status || '').toUpperCase();
    if (status !== 'CONFIRMED') return false;
    if (isFirstActive) return true;
    return isApptTimePassedGlobal(a, activeTodayStr);
  };


  // Compute live counts for all 4 timeframe filter buttons
  const todayCount = useMemo(() => {
    return appointments.filter(isMatchToday).length;
  }, [appointments, activeTodayStr]);

  const weekCount = useMemo(() => {
    return appointments.filter(isMatchWeek).length;
  }, [appointments, weekStartStr, weekEndStr]);

  const monthCount = useMemo(() => {
    return appointments.filter(isMatchMonth).length;
  }, [appointments, monthPrefix]);

  const totalAllCount = appointments.length;

  // Filter appointments according to selected timeframe, status, and search query
  const filteredAppts = useMemo(() => {
    return appointments.filter(a => {
      // 0. Hide past consultations when includeArchived is false
      if (!includeArchived) {
        const itemDate = getApptDateStrGlobal(a) || getApptDateStr(a);
        if (itemDate && itemDate < activeTodayStr) {
          return false;
        }
      }

      // 1. Timeframe filter
      if (timeframe === 'today' && !isMatchToday(a)) return false;
      if (timeframe === 'week' && !isMatchWeek(a)) return false;
      if (timeframe === 'month' && !isMatchMonth(a)) return false;

      // 2. Status filter
      if (apptStatusFilter !== 'ALL') {
        const st = (a.status || '').toUpperCase();
        if (apptStatusFilter === 'PENDING' && !st.includes('PENDING')) return false;
        if (apptStatusFilter === 'CONFIRMED' && st !== 'CONFIRMED') return false;
        if (apptStatusFilter === 'COMPLETED' && st !== 'COMPLETED') return false;
        if (apptStatusFilter === 'CANCELLED' && st !== 'CANCELLED') return false;
      }

      // 3. Search filter
      if (apptSearch.trim()) {
        const q = apptSearch.toLowerCase().trim();
        const name = (a.patient_name || '').toLowerCase();
        const phone = (a.patient_phone || '').toLowerCase();
        const slip = (a.slip_number || '').toLowerCase();
        const notes = (a.notes || '').toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !slip.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, timeframe, activeTodayStr, weekStartStr, weekEndStr, monthPrefix, apptStatusFilter, apptSearch, includeArchived]);

  const docCallingShiftInfo = useMemo(() => {
    return getDoctorCallingShiftInfo(doctorProfile, activeTodayStr, appointments);
  }, [doctorProfile, activeTodayStr, appointments]);

  const displayAppts = useMemo(() => {
    if (callingOrderActive) {
      return sortCallingSequence(filteredAppts, activeTodayStr, docCallingShiftInfo);
    }
    return filteredAppts;
  }, [filteredAppts, callingOrderActive, activeTodayStr, docCallingShiftInfo]);


  // Appointments scoped to the currently active timeframe filter (independent of text search/status)
  const timeframeScopedAppts = useMemo(() => {
    return appointments.filter(a => {
      if (timeframe === 'today') return isMatchToday(a);
      if (timeframe === 'week') return isMatchWeek(a);
      if (timeframe === 'month') return isMatchMonth(a);
      return true;
    });
  }, [appointments, timeframe, activeTodayStr, weekStartStr, weekEndStr, monthPrefix]);

  // Income & Revenue calculations (Paid cash vs Pending at desk)
  const calcIncome = (list: AppointmentItem[]) => {
    return list
      .filter(a => a.payment_status === 'PAID')
      .reduce((sum, a) => sum + Number(a.fee_amount || doctorProfile?.fee_clinic || 1000), 0);
  };

  const calcPendingCash = (list: AppointmentItem[]) => {
    return list
      .filter(a => a.payment_status !== 'PAID' && a.status?.toUpperCase() !== 'CANCELLED' && a.status?.toUpperCase() !== 'REJECTED')
      .reduce((sum, a) => sum + Number(a.fee_amount || doctorProfile?.fee_clinic || 1000), 0);
  };

  const todayIncome = useMemo(() => calcIncome(appointments.filter(isMatchToday)), [appointments, activeTodayStr, doctorProfile]);
  const weekIncome = useMemo(() => calcIncome(appointments.filter(isMatchWeek)), [appointments, weekStartStr, weekEndStr, doctorProfile]);
  const monthIncome = useMemo(() => calcIncome(appointments.filter(isMatchMonth)), [appointments, monthPrefix, doctorProfile]);
  const allIncome = useMemo(() => calcIncome(appointments), [appointments, doctorProfile]);

  const currentTimeframeIncome = useMemo(() => calcIncome(timeframeScopedAppts), [timeframeScopedAppts, doctorProfile]);
  const currentTimeframePendingCash = useMemo(() => calcPendingCash(timeframeScopedAppts), [timeframeScopedAppts, doctorProfile]);

  const timeframePaidCount = useMemo(() => timeframeScopedAppts.filter(a => a.payment_status === 'PAID').length, [timeframeScopedAppts]);
  const timeframeCompletedCount = useMemo(() => timeframeScopedAppts.filter(a => a.status?.toUpperCase() === 'COMPLETED').length, [timeframeScopedAppts]);
  const timeframeConfirmedCount = useMemo(() => timeframeScopedAppts.filter(a => a.status?.toUpperCase() === 'CONFIRMED').length, [timeframeScopedAppts]);

  const confirmedCount = appointments.filter(a => a.status?.toUpperCase() === 'CONFIRMED').length;
  const pendingCount = appointments.filter(a => a.status?.toUpperCase().includes('PENDING')).length;
  const completedCount = appointments.filter(a => a.status?.toUpperCase() === 'COMPLETED').length;
  const totalRevenue = allIncome;

  const getSlotDateKey = (s: SlotData | string): string => {
    if (typeof s === 'object' && s.slot_date && /^\d{4}-\d{2}-\d{2}$/.test(s.slot_date)) {
      return s.slot_date;
    }
    const iso = typeof s === 'string' ? s : s.start_time;
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Karachi',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        return formatter.format(d);
      }
    } catch { }
    return iso ? iso.split('T')[0] : '';
  };

  // Distinct dates in slots for dropdown with human-friendly labels and slot counts (auto-excludes past dates)
  const slotDatesInfo = useMemo(() => {
    const map = new Map<string, { date: string; label: string; count: number }>();
    slots.forEach(s => {
      const dk = getSlotDateKey(s);
      if (!dk) return;
      // Automatically hide dates that have passed unless explicitly requested
      if (!doctorShowPastSlots && dk < activeTodayStr) return;
      if (!map.has(dk)) {
        let label = s.slot_date_fmt || '';
        if (!label) {
          try {
            const [y, m, d] = dk.split('-').map(Number);
            label = new Date(y, m - 1, d).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
          } catch {
            label = dk;
          }
        }
        map.set(dk, { date: dk, label, count: 0 });
      }
      map.get(dk)!.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [slots, doctorShowPastSlots, activeTodayStr]);

  const slotDates = useMemo(() => slotDatesInfo.map(info => info.date), [slotDatesInfo]);

  // Auto-reset orphaned date filter if the filtered date is no longer in slotDates
  useEffect(() => {
    if (slotDateFilter !== 'all' && slotDates.length > 0 && !slotDates.includes(slotDateFilter)) {
      setSlotDateFilter('all');
    }
  }, [slotDates, slotDateFilter]);

  // Visible slots for metrics (excludes past dates unless toggled)
  const doctorVisibleSlots = useMemo(() => {
    return slots.filter(s => {
      if (doctorShowPastSlots) return true;
      const dk = getSlotDateKey(s);
      return !dk || dk >= activeTodayStr;
    });
  }, [slots, doctorShowPastSlots, activeTodayStr]);

  // Filter slots for Individual Slot Controls
  const filteredSlots = useMemo(() => {
    return slots.filter(s => {
      const dk = getSlotDateKey(s);
      // Automatically hide slots from days that have passed unless explicitly toggled on
      if (!doctorShowPastSlots && dk && dk < activeTodayStr) {
        return false;
      }
      if (slotDateFilter !== 'all' && dk !== slotDateFilter) {
        return false;
      }
      if (slotStatusFilter !== 'all' && (s.status || '').toLowerCase() !== slotStatusFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [slots, slotDateFilter, slotStatusFilter, doctorShowPastSlots, activeTodayStr]);

  const doctorSidebarNav = [
    { id: 'overview', label: 'Overview' },
    { id: 'schedule', label: 'Schedule & Blackouts' },
    { id: 'assistants', label: 'Assistants' },
    { id: 'profile', label: 'Clinic Profile' },
  ];

  const agendaTitle = timeframe === 'today'
    ? "Today's Clinic Agenda & Consultations"
    : timeframe === 'week'
      ? "This Week's Clinic Agenda & Consultations"
      : timeframe === 'month'
        ? "This Month's Clinic Agenda & Consultations"
        : "All Clinic Appointments & Patient Directory";

  const agendaSubtitle = timeframe === 'today'
    ? `Showing appointments scheduled for today (${activeTodayStr})`
    : timeframe === 'week'
      ? `Showing appointments scheduled for this week (${weekStartStr} to ${weekEndStr})`
      : timeframe === 'month'
        ? `Showing appointments scheduled in current month (${monthPrefix})`
        : includeArchived
          ? `Showing all ${totalAllCount} booked and requested appointments for your clinic (including past history)`
          : `Showing ${displayAppts.length} active and upcoming appointments (past history hidden)`;

  const todayStr = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Karachi', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const doctorName = doctorProfile?.full_name || 'Doctor';

  // 1. Generate slots handler
  const handleGenerateSlots = async () => {
    try {
      setGenerating(true);
      setGenMsg('');
      const morning_start = format12to24(morningStartHour, morningStartMin, morningStartPeriod);
      const morning_end = format12to24(morningEndHour, morningEndMin, morningEndPeriod);
      const evening_start = format12to24(eveningStartHour, eveningStartMin, eveningStartPeriod);
      const evening_end = format12to24(eveningEndHour, eveningEndMin, eveningEndPeriod);

      const res: any = await apiFetch('/doctor/slots/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          start_date: slotFromDate,
          end_date: slotToDate,
          slot_duration_minutes: slotInterval,
          shift: selectedShift,
          morning_start,
          morning_end,
          evening_start,
          evening_end,
          replace_existing: true,
          off_days: docOffDays
        })
      });
      const shiftWindowDesc = selectedShift === 'MORNING'
        ? `Morning ${morning_start}–${morning_end}`
        : selectedShift === 'EVENING'
          ? `Evening ${evening_start}–${evening_end}`
          : `Morning ${morning_start}–${morning_end} & Evening ${evening_start}–${evening_end}`;
      setGenMsg(`✓ ${res.slots_created ?? res.created ?? 0} slots generated successfully (${res.duration_minutes || slotInterval} min duration · ${res.shift || selectedShift} shift: ${shiftWindowDesc}).`);
      setDoctorProfile((prev: any) => prev ? {
        ...prev,
        shift: res.shift || selectedShift,
        morning_start,
        morning_end,
        evening_start,
        evening_end,
        off_days: docOffDays.join(',')
      } : prev);
      loadDoctorData();
    } catch (err: any) {
      setGenMsg(`Error: ${err.message || 'Failed to generate slots.'}`);
    } finally {
      setGenerating(false);
    }
  };

  // 2. Clear unbooked slots handler
  const handleClearUnbookedSlots = async () => {
    if (!window.confirm(`Are you sure you want to clear unbooked slots from ${slotFromDate} to ${slotToDate}? Slots on other dates will remain safe and untouched.`)) return;
    try {
      setClearingSlots(true);
      setGenMsg('');
      const res: any = await apiFetch(`/doctor/slots/clear-unbooked?start_date=${slotFromDate}&end_date=${slotToDate}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setGenMsg(`✓ ${res.message || 'Successfully cleared unbooked slots for selected date range.'}`);
      loadDoctorData();
    } catch (err: any) {
      setGenMsg(`Error: ${err.message || 'Failed to clear unbooked slots.'}`);
    } finally {
      setClearingSlots(false);
    }
  };

  // 3. Save weekly hours / shift
  const handleSaveWeeklyHours = async () => {
    try {
      setSavingShift(true);
      setShiftMsg('Saving custom shift hours to profile...');
      const morning_start = format12to24(morningStartHour, morningStartMin, morningStartPeriod);
      const morning_end = format12to24(morningEndHour, morningEndMin, morningEndPeriod);
      const evening_start = format12to24(eveningStartHour, eveningStartMin, eveningStartPeriod);
      const evening_end = format12to24(eveningEndHour, eveningEndMin, eveningEndPeriod);

      await apiFetch('/doctor/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          shift: selectedShift,
          morning_start,
          morning_end,
          evening_start,
          evening_end
        })
      });
      const shiftWindowDesc = selectedShift === 'MORNING'
        ? `Morning (${morningStartHour}:${morningStartMin} ${morningStartPeriod} – ${morningEndHour}:${morningEndMin} ${morningEndPeriod})`
        : selectedShift === 'EVENING'
          ? `Evening (${eveningStartHour}:${eveningStartMin} ${eveningStartPeriod} – ${eveningEndHour}:${eveningEndMin} ${eveningEndPeriod})`
          : `Morning (${morningStartHour}:${morningStartMin} ${morningStartPeriod} – ${morningEndHour}:${morningEndMin} ${morningEndPeriod}) & Evening (${eveningStartHour}:${eveningStartMin} ${eveningStartPeriod} – ${eveningEndHour}:${eveningEndMin} ${eveningEndPeriod})`;
      setShiftMsg(`✓ Shift hours saved to your profile! Active Shift: ${selectedShift} (${shiftWindowDesc})`);
      setDoctorProfile((prev: any) => prev ? {
        ...prev,
        shift: selectedShift,
        morning_start,
        morning_end,
        evening_start,
        evening_end
      } : prev);
      await loadDoctorData();
      setTimeout(() => setShiftMsg(''), 5000);
    } catch (err: any) {
      setShiftMsg(`Error: ${err.message}`);
    } finally {
      setSavingShift(false);
    }
  };

  // 4. Blackout date handler
  const handleApplyBlackout = async () => {
    if (!blackoutDate) return;
    try {
      setBlackoutLoading(true);
      setBlackoutMsg('Applying blackout...');
      const res: any = await apiFetch(`/doctor/blackout?date=${blackoutDate}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlackoutMsg(`✓ Blackout applied for ${blackoutDate}: ${res.slots_blocked || 0} slots blocked.`);
      await loadDoctorData();
      setTimeout(() => setBlackoutMsg(''), 5000);
    } catch (err: any) {
      setBlackoutMsg(`Error: ${err.message}`);
    } finally {
      setBlackoutLoading(false);
    }
  };

  // 5. Individual slot handlers (block, unblock, delete)
  const handleBlockSlot = async (slotId: string) => {
    try {
      setSlotActionLoading({ id: slotId, action: 'block' });
      await apiFetch(`/doctor/slots/${slotId}/block`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Optimistically mark as blocked in local state
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'blocked' } : s));
      await loadDoctorData();
    } catch (err: any) {
      alert(err.message || 'Failed to block slot');
    } finally {
      setSlotActionLoading(null);
    }
  };

  const handleUnblockSlot = async (slotId: string) => {
    try {
      setSlotActionLoading({ id: slotId, action: 'unblock' });
      await apiFetch(`/doctor/slots/${slotId}/unblock`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Optimistically mark as available in local state
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'available' } : s));
      await loadDoctorData();
    } catch (err: any) {
      alert(err.message || 'Failed to unblock slot');
    } finally {
      setSlotActionLoading(null);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('Delete this single available slot?')) return;
    try {
      setSlotActionLoading({ id: slotId, action: 'delete' });
      await apiFetch(`/doctor/slots/${slotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Optimistically remove from local state
      setSlots(prev => prev.filter(s => s.id !== slotId));
      await loadDoctorData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete slot');
    } finally {
      setSlotActionLoading(null);
    }
  };

  // 5.5 Doctor mark-paid handler
  const handleDoctorMarkPaid = async (apptId: string) => {
    try {
      setDoctorMarkPaidLoading(apptId);
      await apiFetch(`/doctor/appointments/${apptId}/mark-paid`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedAppt(prev => (prev && prev.id === apptId ? { ...prev, payment_status: 'PAID' } : prev));
      await loadDoctorData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment as paid');
    } finally {
      setDoctorMarkPaidLoading(null);
    }
  };

  // 6. Complete consultation handler
  const handleCompleteAppointment = async (apptId: string, autoMarkPaid: boolean = false) => {
    const target = appointments.find(a => a.id === apptId) || selectedAppt;
    if (target && target.payment_status !== 'PAID' && !autoMarkPaid) {
      const confirmPaid = window.confirm(
        `Consultation fee (${formatCurrency(target.fee_amount || 1000)}) is currently unpaid (Pay at Calling / Desk).\n\n` +
        `Would you like to collect fee and mark as PAID & COMPLETED?`
      );
      if (confirmPaid) {
        autoMarkPaid = true;
      } else {
        return;
      }
    }
    const isFirstActive = Boolean(callingOrderActive && displayAppts[0]?.id === target?.id);
    if (target && !isApptTimePassedGlobal(target, activeTodayStr) && !isFirstActive) {
      alert('Cannot mark consultation as completed before its scheduled date and time has passed.');
      return;
    }

    try {
      setActionLoading(true);
      setApptActionMsg('');
      const params = new URLSearchParams();
      if (consultNote) params.append('consultation_notes', consultNote);
      if (autoMarkPaid) params.append('mark_paid', 'true');
      const q = params.toString() ? `?${params.toString()}` : '';
      await apiFetch(`/doctor/appointments/${apptId}/complete${q}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setApptActionMsg('✓ Consultation marked as completed.' + (autoMarkPaid ? ' Payment marked as PAID.' : ''));
      setConsultNote('');
      loadDoctorData();
      setTimeout(() => {
        setSelectedAppt(null);
        setApptActionMsg('');
      }, 1500);
    } catch (err: any) {
      setApptActionMsg(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Cancel appointment handler
  const handleCancelAppointment = async (apptId: string) => {
    const reason = window.prompt('Please enter cancellation reason for this appointment (or click Cancel to abort):', 'Doctor Emergency / Unavailable');
    if (reason === null) return;
    const finalReason = reason.trim() || 'Doctor Emergency / Unavailable';
    try {
      setActionLoading(true);
      await apiFetch(`/doctor/appointments/${apptId}/cancel?reason=${encodeURIComponent(finalReason)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✓ Appointment cancelled and slot released back to available.');
      setSelectedAppt(null);
      loadDoctorData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Assistant management handlers
  const handleCreateAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsstEmail || !newAsstName || !newAsstPass) return;
    try {
      setAsstLoading(true);
      setAsstActionMsg('');
      const activeToken = token || localStorage.getItem('doctor_token') || localStorage.getItem('token');
      const createdAsst: any = await apiFetch('/doctor/assistants', {
        method: 'POST',
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
        body: JSON.stringify({
          full_name: newAsstName,
          email: newAsstEmail.trim(),
          phone: newAsstPhone || 'N/A',
          password: newAsstPass
        })
      });
      setAsstActionMsg(`✓ Assistant "${newAsstName}" created and assigned to your clinic desk! Login Password: ${newAsstPass}`);
      setNewAsstName('');
      setNewAsstEmail('');
      setNewAsstPhone('');
      setNewAsstPass('');
      setShowAddAsstModal(false);
      // Immediately reflect created assistant with exact entered password in local state
      if (createdAsst && createdAsst.id) {
        setAssistants(prev => {
          const others = prev.filter(a => a.id !== createdAsst.id && a.email.toLowerCase() !== createdAsst.email.toLowerCase());
          return [{ ...createdAsst, plain_password: newAsstPass }, ...others];
        });
      }
      loadDoctorData();
      setTimeout(() => setAsstActionMsg(''), 7000);
    } catch (err: any) {
      setAsstActionMsg(`Error: ${err.message}`);
    } finally {
      setAsstLoading(false);
    }
  };

  const handleRevokeAssistant = async (assistantId: string, name: string) => {
    if (!window.confirm(`Revoke receptionist access for "${name}"? They will no longer be able to log in to your clinic desk.`)) return;
    try {
      setAsstActionMsg('Revoking assistant access...');
      const activeToken = token || localStorage.getItem('doctor_token') || localStorage.getItem('token');
      await apiFetch(`/doctor/assistants/${assistantId}`, {
        method: 'DELETE',
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {}
      });
      setAsstActionMsg(`✓ Access revoked for "${name}". Their login has been immediately deactivated.`);
      // Optimistically remove from state so assistant disappears from active desk list immediately
      setAssistants(prev => prev.filter(a => a.id !== assistantId));
      loadDoctorData();
      setTimeout(() => setAsstActionMsg(''), 5000);
    } catch (err: any) {
      setAsstActionMsg(`Error: ${err.message}`);
    }
  };

  const openResetAsstModal = (asst: any) => {
    setResetAsstModal({
      id: asst.id,
      name: asst.full_name,
      email: asst.email,
      currentPassword: asst.plain_password || ''
    });
    setNewResetPass('');
    setConfirmResetPass('');
    setShowResetPass(false);
    setResetError('');
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetAsstModal) return;
    if (!newResetPass || newResetPass.trim().length < 6) {
      setResetError('New password must be at least 6 characters long.');
      return;
    }
    if (confirmResetPass && newResetPass !== confirmResetPass) {
      setResetError('Passwords do not match. Please verify both fields.');
      return;
    }
    try {
      setResetLoading(true);
      setResetError('');
      const pwd = newResetPass.trim();
      const activeToken = token || localStorage.getItem('doctor_token') || localStorage.getItem('token');
      await apiFetch(`/doctor/assistants/${resetAsstModal.id}/reset-password?new_password=${encodeURIComponent(pwd)}`, {
        method: 'PUT',
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
        body: JSON.stringify({ new_password: pwd, password: pwd })
      });
      setAsstActionMsg(`✓ Password for assistant "${resetAsstModal.name}" updated successfully to: ${pwd}`);
      // Optimistically update local assistant state so new password shows immediately
      setAssistants(prev => prev.map(a => a.id === resetAsstModal.id ? { ...a, plain_password: pwd } : a));
      setResetAsstModal(null);
      loadDoctorData();
      setTimeout(() => setAsstActionMsg(''), 6000);
    } catch (err: any) {
      setResetError(err.message || 'Failed to update assistant password.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyPassword = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAsstId(id);
    setTimeout(() => setCopiedAsstId(null), 2500);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let res = 'Desk';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    res += Math.floor(100 + Math.random() * 900) + '!';
    setNewResetPass(res);
    setConfirmResetPass(res);
  };

  // 9. Profile update handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProfileLoading(true);
      setProfileMsg('');
      const morning_start = format12to24(morningStartHour, morningStartMin, morningStartPeriod);
      const morning_end = format12to24(morningEndHour, morningEndMin, morningEndPeriod);
      const evening_start = format12to24(eveningStartHour, eveningStartMin, eveningStartPeriod);
      const evening_end = format12to24(eveningEndHour, eveningEndMin, eveningEndPeriod);
      const expList = [editExpertise1.trim(), editExpertise2.trim(), editExpertise3.trim()].filter(Boolean);
      const expertisePayload = expList.join(', ');

      await apiFetch('/doctor/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fee_clinic: Number(editFee),
          shift: editShift,
          clinic_address: editAddress,
          google_maps_url: editMapsUrl,
          morning_start,
          morning_end,
          evening_start,
          evening_end,
          bio: editBio.trim(),
          expertise: expertisePayload,
          experience_years: Number(editExpYears),
          qualification: editQualification.trim() || 'MBBS, FCPS'
        })
      });
      setProfileMsg('✓ Clinic profile updated successfully!');
      setDoctorProfile((prev: any) => prev ? {
        ...prev,
        fee_clinic: Number(editFee),
        shift: editShift,
        clinic_address: editAddress,
        google_maps_url: editMapsUrl,
        bio: editBio.trim(),
        expertise: expertisePayload,
        experience_years: Number(editExpYears),
        qualification: editQualification.trim() || 'MBBS, FCPS'
      } : prev);
      setIsEditingProfile(false);
      loadDoctorData();
      setTimeout(() => setProfileMsg(''), 4000);
    } catch (err: any) {
      setProfileMsg(`Error: ${err.message}`);
    } finally {
      setProfileLoading(false);
    }
  };

  // Pre-compresses high-resolution phone/camera photos client-side to ~80-150KB for instant uploads
  const compressImageForUpload = async (inputFile: File, maxDim = 800, quality = 0.85): Promise<File> => {
    if (!inputFile.type.startsWith('image/') || inputFile.type === 'image/svg+xml') {
      return inputFile;
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(inputFile);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= inputFile.size) {
                resolve(inputFile);
              } else {
                const compressedFile = new File([blob], inputFile.name.replace(/\.[^/.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(inputFile);
        img.src = event.target?.result as string;
      };
      reader.onerror = () => resolve(inputFile);
      reader.readAsDataURL(inputFile);
    });
  };

  // 10. Profile photo upload handler (Cloudinary)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    try {
      setUploadingImage(true);
      setImageUploadMsg('Optimizing & compressing photo in browser...');
      const fileToUpload = await compressImageForUpload(rawFile, 800, 0.85);

      const formData = new FormData();
      formData.append('file', fileToUpload);

      setImageUploadMsg('Uploading photo to Cloudinary CDN...');
      const res: any = await apiFetch('/doctor/profile/picture', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setImageUploadMsg('✓ Profile picture updated successfully on Cloudinary!');
      setDoctorProfile((prev: any) => ({ ...prev, profile_image: res.profile_image }));
      loadDoctorData();
      setTimeout(() => setImageUploadMsg(''), 4000);
    } catch (err: any) {
      setImageUploadMsg(`Error: ${err.message || 'Upload failed'}`);
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (!window.confirm('Are you sure you want to remove your custom photo and reset to the default portrait?')) return;
    try {
      setUploadingImage(true);
      setImageUploadMsg('Removing photo...');
      await apiFetch('/doctor/profile/picture', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setImageUploadMsg('✓ Photo removed. Default specialist portrait restored.');
      setDoctorProfile((prev: any) => ({ ...prev, profile_image: null }));
      loadDoctorData();
      setTimeout(() => setImageUploadMsg(''), 4000);
    } catch (err: any) {
      setImageUploadMsg(`Error: ${err.message || 'Failed to remove photo'}`);
    } finally {
      setUploadingImage(false);
    }
  };

  // ── Staff Login (Figma Split Panel) ─────────────────────────────────────────
  if (!token) {
    return (
      <StaffLoginSplitView
        currentRole="doctor"
        onSwitchRole={onSwitchRole}
        onLogin={async (em, pw) => {
          await handleLoginSubmit(em, pw);
        }}
        loginLoading={loginLoading}
        loginError={loginError}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 animate-fade-in">
      <PortalSidebar
        workspaceLabel="Doctor Workspace"
        clinicName={doctorProfile?.clinic_address ? doctorProfile.clinic_address.split(',')[0].trim() : (doctorProfile?.full_name || 'Clinic')}
        clinicSub={doctorProfile?.clinic_address ? doctorProfile.clinic_address.split(',').slice(1).join(', ').trim() : 'D.I. Khan'}
        navItems={doctorSidebarNav}
        activeNav={activePortalTab}
        onNavChange={(id) => setActivePortalTab(id as any)}
        onSignOut={handleSignOut}
        bottomNote="Your clinic & linked staff only"
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="portal-content flex-1">
        {/* Top breadcrumb bar */}
        <div className="portal-topbar sticky top-0 z-30 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex-shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest hidden sm:inline">Doctor Portal</span>
            <ChevronRight className="w-3 h-3 text-slate-300 hidden sm:inline" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest truncate max-w-[120px] sm:max-w-none">
              {activePortalTab === 'overview' ? 'Overview' : activePortalTab === 'schedule' ? 'Schedule & Slots' : activePortalTab === 'assistants' ? 'Assistants' : 'Clinic Profile'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => loadDoctorData(undefined, true)}
              disabled={isRefreshingAppts}
              className="px-2.5 sm:px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 disabled:opacity-75 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all hover:shadow-card"
              title="Refresh clinic appointments and live queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-clinic-600 ${isRefreshingAppts ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshingAppts ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-slate-100">
              <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100 shadow-xs">
                <img
                  src={getDoctorProfileImage({
                    full_name: doctorProfile?.full_name,
                    specialty: doctorProfile?.specialty,
                    profile_image: doctorProfile?.profile_image
                  }, 80)}
                  alt={doctorName}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <span className="text-xs text-slate-700 font-semibold hidden md:inline">Dr. {doctorName.replace(/^Dr\.\s*/i, '')}</span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50 flex-shrink-0"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-5 md:p-8 space-y-4 sm:space-y-6">
          {/* Portal sub-nav — Premium pill tabs with horizontal swipe on mobile */}
          <div className="flex items-center gap-1 pb-1 overflow-x-auto scrollbar-none touch-scroll flex-nowrap">
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 sm:p-1.5 rounded-2xl border border-slate-200/60 flex-nowrap">
              {([['overview', 'Overview'], ['schedule', 'Schedule & Slots'], ['assistants', 'Assistants Desk'], ['profile', 'Clinic Profile']] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActivePortalTab(tab as any)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap flex-shrink-0 ${activePortalTab === tab
                    ? 'text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/70'
                    }`}
                  style={activePortalTab === tab ? { background: 'linear-gradient(135deg, #1a6359, #143d38)' } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="ml-auto items-center gap-3 hidden sm:flex">
              <RealtimeLive />
              <span className="text-xs text-slate-400 font-medium">{doctorProfile?.clinic_address || 'Clinic'}</span>
            </div>
          </div>

          {/* ── Overview Tab ── */}
          {activePortalTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Premium Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Welcome back, <span className="text-gradient-clinic">Dr. {doctorName.replace(/^Dr\.\s*/i, '')}</span>.
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                    {todayStr} &middot; Live operational overview
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => setActivePortalTab('schedule')}
                    className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-clinic-700 hover:bg-clinic-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                  >
                    Manage schedule
                  </button>
                </div>
              </div>

              {/* Sub bar: Realtime + 4 Timeframe Filter Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                <div className="flex items-center gap-2">
                  <RealtimeLive />
                  <span className="text-xs text-slate-500 font-medium">
                    {doctorProfile?.clinic_address || 'Rehmat Polyclinic · Circular Road'}
                  </span>
                </div>
                {/* 4 Timeframe Filter Buttons: Today, This Week, This Month, All (swipeable scroll strip on mobile) */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto pb-1 scrollbar-none touch-scroll flex-nowrap w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setTimeframe('today')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap flex-shrink-0 ${timeframe === 'today'
                      ? 'bg-clinic-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                  >
                    <span>Today</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${timeframe === 'today' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {todayCount}
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${timeframe === 'today' ? 'text-emerald-200' : 'text-emerald-700'}`}>
                      ({formatCurrency(todayIncome)})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('week')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap flex-shrink-0 ${timeframe === 'week'
                      ? 'bg-clinic-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                  >
                    <span>This Week</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${timeframe === 'week' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {weekCount}
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${timeframe === 'week' ? 'text-emerald-200' : 'text-emerald-700'}`}>
                      ({formatCurrency(weekIncome)})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('month')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap flex-shrink-0 ${timeframe === 'month'
                      ? 'bg-clinic-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                  >
                    <span>This Month</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${timeframe === 'month' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {monthCount}
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${timeframe === 'month' ? 'text-emerald-200' : 'text-emerald-700'}`}>
                      ({formatCurrency(monthIncome)})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap flex-shrink-0 ${timeframe === 'all'
                      ? 'bg-clinic-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                  >
                    <span>All</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${timeframe === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {totalAllCount}
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${timeframe === 'all' ? 'text-emerald-200' : 'text-emerald-700'}`}>
                      ({formatCurrency(allIncome)})
                    </span>
                  </button>
                </div>
              </div>

              {/* 5 Top KPI Cards: Dynamic Income + Operational Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
                {/* 1. Clinic Income (PAID) Card — Accent Green */}
                <div className="col-span-2 md:col-span-1 lg:col-span-2 rounded-2xl p-4 sm:p-6 relative overflow-hidden shadow-kpi-accent border border-emerald-200/80"
                  style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}
                >
                  {/* Decorative glow orb */}
                  <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #34d399, transparent)' }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-emerald-200" />
                        </div>
                        <p className="text-xs text-emerald-200 font-bold uppercase tracking-widest">Clinic Income</p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/15 text-emerald-100 capitalize border border-white/10">
                        {timeframe === 'today' ? 'Today' : timeframe === 'week' ? 'This Week' : timeframe === 'month' ? 'This Month' : 'All Time'}
                      </span>
                    </div>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mt-2 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {formatCurrency(currentTimeframeIncome)}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-300">{timeframePaidCount} paid visit{timeframePaidCount === 1 ? '' : 's'}</span>
                      {currentTimeframePendingCash > 0 && (
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1" title="Cash awaiting collection at reception desk">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Desk: {formatCurrency(currentTimeframePendingCash)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Total Appointments Card */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-kpi relative overflow-hidden group hover:shadow-kpi-accent transition-all duration-200">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-3xl opacity-30" style={{ background: 'linear-gradient(135deg, #f0faf8, transparent)' }} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Appointments</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 mb-3">
                    {timeframe === 'today' ? 'Today' : timeframe === 'week' ? 'This Week' : timeframe === 'month' ? 'This Month' : 'All time'}
                  </p>
                  <p className="text-4xl font-extrabold text-slate-900 leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {timeframeScopedAppts.length}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">{selectedShift} Shift</p>
                </div>

                {/* 3. Completed Visits Card */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-kpi relative overflow-hidden group hover:shadow-kpi-accent transition-all duration-200">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #ecfdf5, transparent)' }} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 mb-3">Consultations</p>
                  <p className="text-4xl font-extrabold text-emerald-600 leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {timeframeCompletedCount}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">Finished visits</p>
                </div>

                {/* 4. Confirmed Visits Card */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-kpi relative overflow-hidden group hover:shadow-kpi-accent transition-all duration-200">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #f0faf8, transparent)' }} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirmed</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 mb-3">Approved visits</p>
                  <p className="text-4xl font-extrabold text-clinic-700 leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {timeframeConfirmedCount}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">Upcoming queue</p>
                </div>

                {/* 5. Available Slots Card */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-kpi relative overflow-hidden group hover:shadow-kpi-accent transition-all duration-200">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #fffbeb, transparent)' }} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Open Slots</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 mb-3">For booking</p>
                  <p className="text-4xl font-extrabold text-amber-600 leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {slots.filter(s => s.status === 'available').length}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">Patient bookable</p>
                </div>
              </div>

              {/* Clinic agenda table with REAL appointment data & working action buttons */}
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-card">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between"
                  style={{ background: 'linear-gradient(180deg, #fafcfb 0%, #ffffff 100%)' }}
                >
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {agendaTitle}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      {agendaSubtitle} &middot; Real-time queue
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3.5 py-1.5 rounded-full border"
                    style={{ background: 'linear-gradient(135deg, #f0faf8, #d9f2ed)', color: '#1a6359', borderColor: '#b3e4db' }}
                  >
                    {displayAppts.length} appointments
                  </span>
                </div>

                {/* Filter Toolbar: Search Bar + Status Chips */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-5 py-3 border-b border-slate-50" style={{ background: 'linear-gradient(180deg, #f8fafc, #ffffff)' }}>
                  <div className="relative flex-1 w-full sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={apptSearch}
                      onChange={e => setApptSearch(e.target.value)}
                      placeholder="Search patient, phone, slip #..."
                      className="w-full pl-9 pr-7 py-2 rounded-xl border border-slate-100 bg-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-clinic-300 shadow-xs"
                    />
                    {apptSearch && (
                      <button
                        type="button"
                        onClick={() => setApptSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-scroll flex-nowrap pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:pb-0 text-xs w-full sm:w-auto">
                    {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setApptStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-all whitespace-nowrap flex-shrink-0 ${apptStatusFilter === st
                          ? 'text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-100/80'
                          }`}
                        style={apptStatusFilter === st ? { background: 'linear-gradient(135deg, #1a6359, #143d38)' } : {}}
                      >
                        {st === 'ALL' ? 'All' : st === 'PENDING' ? 'Pending' : st.charAt(0) + st.slice(1).toLowerCase()}
                      </button>
                    ))}


                    <button
                      type="button"
                      onClick={() => setIncludeArchived(!includeArchived)}
                      className={`ml-1.5 px-2.5 py-1 rounded-lg font-semibold text-[11px] flex items-center gap-1.5 transition-all border whitespace-nowrap flex-shrink-0 ${includeArchived
                        ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      title="Past closed consultations from previous days are automatically hidden to keep your daily active queue clean."
                    >
                      <Archive className="w-3.5 h-3.5 text-slate-500" />
                      <span>{includeArchived ? 'Past History: ON' : 'Past History: Hidden'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !callingOrderActive;
                        setCallingOrderActive(next);
                        localStorage.setItem('doc_calling_order', String(next));
                      }}
                      className={`ml-1.5 px-2.5 py-1 rounded-lg font-semibold text-[11px] flex items-center gap-1.5 transition-all border whitespace-nowrap shadow-sm flex-shrink-0 ${callingOrderActive
                        ? 'bg-emerald-600 border-emerald-500 text-white ring-1 ring-emerald-300'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      title="Arrange appointments in live calling sequence (Today's Time & Token order). Completed visits automatically move down."
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{callingOrderActive ? '⏱️ Calling Order: Active' : '⏱️ Arrange Calling Order'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => loadDoctorData(undefined, true)}
                      disabled={isRefreshingAppts}
                      className="ml-1.5 px-2.5 py-1 rounded-lg font-semibold text-[11px] flex items-center gap-1.5 transition-all border whitespace-nowrap bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 shadow-sm flex-shrink-0"
                      title="Refresh clinic appointments and live queue"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-clinic-700 ${isRefreshingAppts ? 'animate-spin' : ''}`} />
                      <span>{isRefreshingAppts ? 'Refreshing...' : 'Refresh Queue'}</span>
                    </button>
                  </div>
                </div>

                {loadingAppointments && appointments.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-10 h-10 animate-spin text-clinic-600" />
                      <p className="text-sm font-semibold text-slate-800">Loading clinic appointments &amp; queue...</p>
                      <p className="text-xs text-slate-400">Fetching latest patient requests and today's consultation agenda</p>
                    </div>
                  </div>
                ) : displayAppts.length === 0 ? (
                  <div className="p-12 text-center">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-700 text-sm font-semibold">
                      {timeframe === 'today'
                        ? "No appointments scheduled for Today."
                        : timeframe === 'week'
                          ? "No appointments scheduled for This Week."
                          : timeframe === 'month'
                            ? "No appointments scheduled for This Month."
                            : "No appointments match your filter criteria."}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {totalAllCount > 0
                        ? `You have ${totalAllCount} total appointment${totalAllCount === 1 ? '' : 's'} recorded across all dates.`
                        : "Open the 'Schedule & Slots' tab to generate bookable slots for your clinic."}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {totalAllCount > 0 && timeframe !== 'all' && (
                        <button
                          type="button"
                          onClick={() => { setTimeframe('all'); setApptSearch(''); setApptStatusFilter('ALL'); }}
                          className="px-4 py-2 bg-clinic-700 text-white rounded-xl text-xs font-semibold hover:bg-clinic-800 transition-colors shadow-sm"
                        >
                          View All Appointments ({totalAllCount})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActivePortalTab('schedule')}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                      >
                        Go to schedule manager &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {callingOrderActive && (
                      (() => {
                        const isStarted = docCallingShiftInfo.isCallingStarted;
                        return isStarted ? (
                          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-900 transition-all">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="font-bold">🟢 Live Calling Active &middot; {docCallingShiftInfo.shiftName} (Today: {activeTodayStr})</span>
                              <span className="text-emerald-700 hidden sm:inline">&middot; Calling started at {docCallingShiftInfo.callingStartTimeStr} (10 mins before your {docCallingShiftInfo.shiftStartTimeStr} shift).</span>
                            </div>
                            <span className="text-[11px] font-mono bg-emerald-600 text-white px-2.5 py-0.5 rounded-full font-semibold shadow-xs">
                              Active Consultation at Top
                            </span>
                          </div>
                        ) : (
                          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between text-xs text-amber-900 transition-all">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                              <span className="font-bold">⏳ Calling Starts at {docCallingShiftInfo.callingStartTimeStr}</span>
                              <span className="text-amber-800 hidden sm:inline">(10 mins before your {docCallingShiftInfo.shiftName} starts at {docCallingShiftInfo.shiftStartTimeStr})</span>
                              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">
                                Opens in {docCallingShiftInfo.minutesUntilCalling} min{docCallingShiftInfo.minutesUntilCalling === 1 ? '' : 's'}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-amber-200 font-semibold text-amber-800">
                              Queue Arranged
                            </span>
                          </div>
                        );
                      })()
                    )}
                    <div className="hidden md:block overflow-x-auto touch-scroll">
                      <table className="w-full text-xs min-w-[760px]">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider text-left bg-slate-50/50">
                            <th className="py-3 px-5 font-semibold">Scheduled Date & Time</th>
                            <th className="py-3 px-5 font-semibold">Patient Name</th>
                            <th className="py-3 px-5 font-semibold">Phone</th>
                            <th className="py-3 px-5 font-semibold">Slip #</th>
                            <th className="py-3 px-5 font-semibold">Visit Status</th>
                            <th className="py-3 px-5 font-semibold">Payment</th>
                            <th className="py-3 px-5 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayAppts.map((appt, idx) => {
                            const slotInfo = formatSlotDateTime(appt.slot_start || appt.start_time, appt.slip_number, appt.created_at);
                            const isDone = appt.status?.toUpperCase() === 'COMPLETED';
                            const isCancelled = appt.status?.toUpperCase() === 'CANCELLED';
                            const isCallingStarted = docCallingShiftInfo.isCallingStarted;
                            const apptMins = getApptMinutesFromMidnight(appt);
                            const isApptMorning = apptMins < 840;
                            const isShiftMatch = (docCallingShiftInfo.activeShiftType === 'MORNING' && isApptMorning) ||
                              (docCallingShiftInfo.activeShiftType === 'EVENING' && !isApptMorning);
                            const isCallingEligible = isShiftMatch && isCallingStarted;

                            const isCurrentActive = callingOrderActive && idx === 0 && appt.status?.toUpperCase() === 'CONFIRMED' && (getApptDateStrGlobal(appt) === activeTodayStr || getApptDateStr(appt) === activeTodayStr) && isCallingEligible;
                            const isNextInLineWaiting = callingOrderActive && idx === 0 && appt.status?.toUpperCase() === 'CONFIRMED' && (getApptDateStrGlobal(appt) === activeTodayStr || getApptDateStr(appt) === activeTodayStr) && !isCallingEligible;

                            return (
                              <tr key={appt.id} className={`transition-colors ${isCurrentActive ? 'bg-emerald-50/80 hover:bg-emerald-100/70 border-l-4 border-l-emerald-600 shadow-sm' : isNextInLineWaiting ? 'bg-amber-50/60 hover:bg-amber-100/60 border-l-4 border-l-amber-500' : 'hover:bg-slate-50/70'}`}>
                                <td className="py-3.5 px-5">
                                  <div className="space-y-1">
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                                      <Calendar className="w-3.5 h-3.5 text-clinic-700 flex-shrink-0" />
                                      <span>{appt.slot_date && appt.slot_date !== 'Date Pending' ? appt.slot_date : slotInfo.date}</span>
                                    </div>
                                    <div className="text-slate-500 font-medium flex items-center gap-1.5 text-[11px]">
                                      <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                      <span>{appt.slot_time && appt.slot_time !== 'Time Scheduled' ? appt.slot_time : slotInfo.time}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-5">
                                  {isCurrentActive && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white uppercase tracking-wider mb-1 shadow-xs animate-pulse">
                                      🩺 Active Consultation · Now Treating
                                    </span>
                                  )}
                                  {isNextInLineWaiting && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-600 text-white uppercase tracking-wider mb-1 shadow-xs">
                                      ⏱️ 1st To Consult · Starts at {docCallingShiftInfo.callingStartTimeStr}
                                    </span>
                                  )}
                                  {callingOrderActive && idx > 0 && appt.status?.toUpperCase() === 'CONFIRMED' && (getApptDateStrGlobal(appt) === activeTodayStr || getApptDateStr(appt) === activeTodayStr) && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-1">
                                      Calling Line #{idx + 1}
                                    </span>
                                  )}
                                  <p className="font-bold text-slate-900">{appt.patient_name || 'Walk-in Patient'}</p>

                                </td>
                                <td className="py-3.5 px-5 text-slate-600 font-mono text-[11px] whitespace-nowrap">{appt.patient_phone || 'N/A'}</td>
                                <td className="py-3.5 px-5 text-slate-600 font-mono text-[11px] font-semibold whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(() => {
                                      const isInactive = appt.status === 'CANCELLED' || appt.status === 'REJECTED';
                                      const qNum = parseQueueNumberFromSlip(appt.slip_number, appt.token_number);
                                      if (isInactive) {
                                        return (
                                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[10px] font-sans font-medium">
                                            No Queue
                                          </span>
                                        );
                                      }
                                      if (qNum) {
                                        return (
                                          <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold font-sans">
                                            Queue #{qNum}
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                    <span className="text-[11px] text-slate-600 font-mono font-medium">
                                      {appt.slip_number || `SLIP-${appt.id.slice(0, 6).toUpperCase()}`}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-5">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${isDone ? 'bg-emerald-100 text-emerald-800' :
                                    isCancelled ? 'bg-rose-100 text-rose-800' :
                                      appt.status?.toUpperCase() === 'CONFIRMED' ? 'bg-clinic-100 text-clinic-800' :
                                        'bg-amber-100 text-amber-800'
                                    }`}>
                                    {appt.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${appt.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                                    }`}>
                                    {appt.payment_status || 'PENDING'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5 text-right space-x-1.5 whitespace-nowrap">
                                  {!isDone && !isCancelled && appt.status?.toUpperCase() === 'CONFIRMED' && appt.payment_status !== 'PAID' && (
                                    <button
                                      type="button"
                                      disabled={doctorMarkPaidLoading === appt.id}
                                      onClick={() => handleDoctorMarkPaid(appt.id)}
                                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                      title="Click to record consultation fee as PAID"
                                    >
                                      {doctorMarkPaidLoading === appt.id ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                                          <span>Saving...</span>
                                        </>
                                      ) : (
                                        <>
                                          <CreditCard className="w-3 h-3 text-emerald-600" />
                                          <span>Mark as Paid</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                  {!isDone && !isCancelled && canDoctorComplete(appt, isCurrentActive) && (
                                    <button
                                      type="button"
                                      onClick={() => { setSelectedAppt(appt); }}
                                      className={`px-3 py-1 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm ${isCurrentActive ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300' : 'bg-clinic-700 hover:bg-clinic-800'}`}
                                      title="Mark consultation as completed"
                                    >
                                      ✓ Complete
                                    </button>
                                  )}
                                  {!isDone && !isCancelled && appt.status?.toUpperCase() === 'CONFIRMED' && !canDoctorComplete(appt, isCurrentActive) && (
                                    <span
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 inline-block align-middle"
                                      title="Appointment time has not arrived yet. Doctor can mark as complete once scheduled slot time has passed or when patient is active."
                                    >
                                      Upcoming Slot
                                    </span>
                                  )}

                                  {!isDone && !isCancelled && appt.status?.toUpperCase().includes('PENDING') && (
                                    <span
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-block align-middle"
                                      title="Awaiting reception/assistant desk approval"
                                    >
                                      Awaiting Desk
                                    </span>
                                  )}
                                  {!isDone && !isCancelled && (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelAppointment(appt.id)}
                                      className="px-2.5 py-1 border border-rose-300 hover:bg-rose-50 text-rose-700 font-semibold rounded-lg text-[11px] transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAppt(appt)}
                                    className="px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-[11px] transition-colors"
                                  >
                                    Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Appointments Card List (< md screens) */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {displayAppts.map((appt, idx) => {
                        const slotInfo = formatSlotDateTime(appt.slot_start || appt.start_time, appt.slip_number, appt.created_at);
                        const isDone = appt.status?.toUpperCase() === 'COMPLETED';
                        const isCancelled = appt.status?.toUpperCase() === 'CANCELLED';
                        const qNum = parseQueueNumberFromSlip(appt.slip_number, appt.token_number);
                        const isCurrentActive = callingOrderActive && idx === 0 && appt.status?.toUpperCase() === 'CONFIRMED' && (getApptDateStrGlobal(appt) === activeTodayStr || getApptDateStr(appt) === activeTodayStr) && docCallingShiftInfo.isCallingStarted;

                        return (
                          <div key={`m-${appt.id}`} className={`p-4 space-y-3 transition-colors ${isCurrentActive ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/60'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                {isCurrentActive && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white uppercase tracking-wider mb-1.5 shadow-xs animate-pulse">
                                    🩺 Now Treating
                                  </span>
                                )}
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                  {appt.patient_name || 'Walk-in Patient'}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 text-slate-500 dark:text-slate-400 font-mono text-xs">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{appt.patient_phone || 'No phone'}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isDone ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' :
                                  isCancelled ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' :
                                  appt.status?.toUpperCase() === 'CONFIRMED' ? 'bg-clinic-100 text-clinic-800 dark:bg-teal-900/60 dark:text-teal-300' :
                                  'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                }`}>
                                  {appt.status}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  appt.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-700' : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:border-amber-700'
                                }`}>
                                  {appt.payment_status || 'PENDING'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex-wrap gap-2">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                                  <Calendar className="w-3.5 h-3.5 text-clinic-700" />
                                  {appt.slot_date && appt.slot_date !== 'Date Pending' ? appt.slot_date : slotInfo.date}
                                </span>
                                <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {appt.slot_time && appt.slot_time !== 'Time Scheduled' ? appt.slot_time : slotInfo.time}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {qNum && (
                                  <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold">
                                    Queue #{qNum}
                                  </span>
                                )}
                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  {appt.slip_number || `SLIP-${appt.id.slice(0, 6).toUpperCase()}`}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons Row */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              {!isDone && !isCancelled && appt.status?.toUpperCase() === 'CONFIRMED' && appt.payment_status !== 'PAID' && (
                                <button
                                  type="button"
                                  disabled={doctorMarkPaidLoading === appt.id}
                                  onClick={() => handleDoctorMarkPaid(appt.id)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Mark as Paid</span>
                                </button>
                              )}
                              {!isDone && !isCancelled && canDoctorComplete(appt, isCurrentActive) && (
                                <button
                                  type="button"
                                  onClick={() => { setSelectedAppt(appt); }}
                                  className={`px-3.5 py-1.5 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm cursor-pointer ${isCurrentActive ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300' : 'bg-clinic-700 hover:bg-clinic-800'}`}
                                >
                                  ✓ Complete
                                </button>
                              )}
                              {!isDone && !isCancelled && appt.status?.toUpperCase() === 'CONFIRMED' && !canDoctorComplete(appt, isCurrentActive) && (
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                  Upcoming Slot
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Schedule & Blackouts Tab ── */}
          {activePortalTab === 'schedule' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Clinic Schedule &amp; Slot Manager
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate bookable slots &middot; Configure shift hours &middot; Manage blackout dates
                  </p>
                </div>
                <button
                  onClick={handleSaveWeeklyHours}
                  className="px-4 py-2.5 bg-clinic-700 hover:bg-clinic-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                >
                  Save Weekly Shift Hours
                </button>
              </div>

              {shiftMsg && (
                <div className="p-3 bg-clinic-50 border border-clinic-200 rounded-xl text-xs text-clinic-900 font-semibold">
                  {shiftMsg}
                </div>
              )}

              {/* 2-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 cols: Recurring weekly hours + Generate slots */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Recurring hours card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Operating Shift Hours & Schedule</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Configure your custom morning and evening consultation hours</p>
                      </div>
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        {(['MORNING', 'EVENING', 'BOTH'] as const).map(sh => (
                          <button
                            key={sh}
                            type="button"
                            onClick={() => setSelectedShift(sh)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedShift === sh
                              ? 'bg-clinic-700 text-white shadow-sm'
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            {sh === 'BOTH' ? 'Both Shifts' : sh}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Morning and Evening Hour Dropdown Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Morning Shift Configuration */}
                      <div className={`p-4 rounded-2xl border transition-all ${selectedShift === 'MORNING' || selectedShift === 'BOTH'
                        ? 'bg-amber-50/60 border-amber-200 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 opacity-60'
                        }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🌅</span>
                            <div>
                              <span className="font-bold block text-slate-900 text-xs">Morning Shift</span>
                              <span className="text-[10px] text-slate-500">Starting &amp; ending hours</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedShift === 'MORNING' || selectedShift === 'BOTH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-600'
                            }`}>
                            {selectedShift === 'MORNING' || selectedShift === 'BOTH' ? 'Active Shift' : 'Inactive'}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <TimePickerDropdowns
                              label="Starting Hour"
                              hour={morningStartHour}
                              minute={morningStartMin}
                              period={morningStartPeriod}
                              onHourChange={setMorningStartHour}
                              onMinuteChange={setMorningStartMin}
                              onPeriodChange={setMorningStartPeriod}
                              disabled={selectedShift === 'EVENING'}
                            />
                            <div className="text-slate-400 font-bold text-xs pt-4">➔</div>
                            <TimePickerDropdowns
                              label="Ending Hour"
                              hour={morningEndHour}
                              minute={morningEndMin}
                              period={morningEndPeriod}
                              onHourChange={setMorningEndHour}
                              onMinuteChange={setMorningEndMin}
                              onPeriodChange={setMorningEndPeriod}
                              disabled={selectedShift === 'EVENING'}
                            />
                          </div>

                          <div className="pt-2 border-t border-amber-100/80 flex items-center justify-between text-[11px] text-slate-600">
                            <span>Selected: <strong>{morningStartHour}:{morningStartMin} {morningStartPeriod} – {morningEndHour}:{morningEndMin} {morningEndPeriod}</strong></span>
                            <span className="text-[10px] text-amber-800 font-mono">({format12to24(morningStartHour, morningStartMin, morningStartPeriod)} – {format12to24(morningEndHour, morningEndMin, morningEndPeriod)})</span>
                          </div>
                        </div>
                      </div>

                      {/* Evening Shift Configuration */}
                      <div className={`p-4 rounded-2xl border transition-all ${selectedShift === 'EVENING' || selectedShift === 'BOTH'
                        ? 'bg-indigo-50/60 border-indigo-200 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 opacity-60'
                        }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🌙</span>
                            <div>
                              <span className="font-bold block text-slate-900 text-xs">Evening Shift</span>
                              <span className="text-[10px] text-slate-500">Starting &amp; ending hours</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedShift === 'EVENING' || selectedShift === 'BOTH'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-200 text-slate-600'
                            }`}>
                            {selectedShift === 'EVENING' || selectedShift === 'BOTH' ? 'Active Shift' : 'Inactive'}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <TimePickerDropdowns
                              label="Starting Hour"
                              hour={eveningStartHour}
                              minute={eveningStartMin}
                              period={eveningStartPeriod}
                              onHourChange={setEveningStartHour}
                              onMinuteChange={setEveningStartMin}
                              onPeriodChange={setEveningStartPeriod}
                              disabled={selectedShift === 'MORNING'}
                            />
                            <div className="text-slate-400 font-bold text-xs pt-4">➔</div>
                            <TimePickerDropdowns
                              label="Ending Hour"
                              hour={eveningEndHour}
                              minute={eveningEndMin}
                              period={eveningEndPeriod}
                              onHourChange={setEveningEndHour}
                              onMinuteChange={setEveningEndMin}
                              onPeriodChange={setEveningEndPeriod}
                              disabled={selectedShift === 'MORNING'}
                            />
                          </div>

                          <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between text-[11px] text-slate-600">
                            <span>Selected: <strong>{eveningStartHour}:{eveningStartMin} {eveningStartPeriod} – {eveningEndHour}:{eveningEndMin} {eveningEndPeriod}</strong></span>
                            <span className="text-[10px] text-indigo-800 font-mono">({format12to24(eveningStartHour, eveningStartMin, eveningStartPeriod)} – {format12to24(eveningEndHour, eveningEndMin, eveningEndPeriod)})</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="text-xs text-slate-500">
                        Active Shift: <strong className="text-slate-800">{selectedShift}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveWeeklyHours}
                        disabled={savingShift}
                        className="px-4 py-2 bg-clinic-700 hover:bg-clinic-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-colors inline-flex items-center gap-1.5 shadow-xs"
                      >
                        {savingShift ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Saving Shift Hours...</span>
                          </>
                        ) : (
                          <span>Save Shift Hours to Profile</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Generate appointment slots card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Generate consultation slots</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Batch create available slots for online patient booking.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearUnbookedSlots}
                        disabled={clearingSlots}
                        title={`Clear unbooked slots only for ${slotFromDate} to ${slotToDate}`}
                        className="px-3 py-1 border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed text-[11px] font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        {clearingSlots ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-rose-600" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <span>Clear unbooked ({slotFromDate.slice(5)} to {slotToDate.slice(5)})</span>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">From date</label>
                        <input
                          type="date"
                          value={slotFromDate}
                          onChange={e => setSlotFromDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Through date</label>
                        <input
                          type="date"
                          value={slotToDate}
                          onChange={e => setSlotToDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">Consultation interval per slot</label>
                      <div className="grid grid-cols-5 gap-2">
                        {[5, 10, 15, 20, 30].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setSlotInterval(mins)}
                            className={`py-2 text-xs font-semibold rounded-xl border text-center transition-all ${slotInterval === mins
                              ? 'bg-clinic-50 border-clinic-600 text-clinic-800 font-bold shadow-sm'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            {mins} mins
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Shift Windows</label>
                        <input
                          type="text"
                          readOnly
                          value={selectedShift === 'BOTH'
                            ? `Morning (${morningStartHour}:${morningStartMin} ${morningStartPeriod} – ${morningEndHour}:${morningEndMin} ${morningEndPeriod}) + Evening (${eveningStartHour}:${eveningStartMin} ${eveningStartPeriod} – ${eveningEndHour}:${eveningEndMin} ${eveningEndPeriod})`
                            : selectedShift === 'MORNING'
                              ? `Morning (${morningStartHour}:${morningStartMin} ${morningStartPeriod} – ${morningEndHour}:${morningEndMin} ${morningEndPeriod})`
                              : `Evening (${eveningStartHour}:${eveningStartMin} ${eveningStartPeriod} – ${eveningEndHour}:${eveningEndMin} ${eveningEndPeriod})`
                          }
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-xs text-slate-700 font-medium truncate"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Duration &amp; Shift</label>
                        <div className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-xs font-semibold text-slate-800">
                          {slotInterval} mins &middot; {selectedShift}
                        </div>
                      </div>
                    </div>

                    {/* Weekly Working Days & Off Days Selector */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-clinic-700" />
                            <span>Weekly Working Days &amp; Off Days</span>
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Select off days (e.g. Friday and Sunday). Off days will <strong className="text-rose-600">NOT</strong> have slots generated and old unbooked slots will be cleared.
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDocOffDays(['sunday'])}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${docOffDays.length === 1 && docOffDays[0] === 'sunday'
                              ? 'bg-clinic-700 text-white border-clinic-700'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                            Sun Off
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocOffDays(['friday', 'sunday'])}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${docOffDays.length === 2 && docOffDays.includes('friday') && docOffDays.includes('sunday')
                              ? 'bg-clinic-700 text-white border-clinic-700'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                            Fri &amp; Sun Off
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocOffDays([])}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${docOffDays.length === 0
                              ? 'bg-clinic-700 text-white border-clinic-700'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                            All 7 Days Open
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1.5 pt-1">
                        {WEEKDAY_OPTIONS.map(day => {
                          const isOff = docOffDays.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => {
                                setDocOffDays(prev =>
                                  prev.includes(day.id)
                                    ? prev.filter(d => d !== day.id)
                                    : [...prev, day.id]
                                );
                              }}
                              className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${isOff
                                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs ring-1 ring-rose-200'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100/70'
                                }`}
                            >
                              <span className="block text-xs font-black">{day.label}</span>
                              <span className={`inline-block text-[9px] font-extrabold uppercase px-1 rounded mt-0.5 ${isOff ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-950'
                                }`}>
                                {isOff ? 'OFF' : 'OPEN'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>
                          Active schedule: {docOffDays.length === 0 ? (
                            <strong className="text-emerald-700 font-bold">Open all 7 days</strong>
                          ) : (
                            <>
                              Closed on: <strong className="text-rose-700 capitalize font-bold">{docOffDays.join(', ')}</strong>
                            </>
                          )}
                        </span>
                        <span className="text-slate-400">Option A: Old empty slots on off days wiped automatically</span>
                      </div>
                    </div>

                    {genMsg && (
                      <div className={`p-3 rounded-xl text-xs font-semibold border ${genMsg.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-clinic-50 border-clinic-200 text-clinic-900'}`}>
                        {genMsg}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleGenerateSlots}
                      disabled={generating}
                      className="w-full py-3 bg-clinic-700 hover:bg-clinic-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Processing slot generation...</span>
                        </>
                      ) : (
                        `Generate Batch of Slots (${slotInterval} min interval)`
                      )}
                    </button>
                  </div>
                </div>

                {/* Right 5 cols: Blackout dates & Calendar exceptions */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Add a date blackout card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-900 text-sm">Add a clinic blackout date</h3>
                    <p className="text-xs text-slate-400">Instantly blocks all available slots on this day for leave or maintenance.</p>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Closure date</label>
                      <input
                        type="date"
                        value={blackoutDate}
                        onChange={e => setBlackoutDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Reason / Note</label>
                      <input
                        type="text"
                        value={blackoutReason}
                        onChange={e => setBlackoutReason(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                        placeholder="Clinic maintenance / Off-day"
                      />
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                      <p className="font-semibold mb-0.5">Safe Blackout Logic</p>
                      <p className="text-[11px] text-amber-800 leading-normal">
                        Blocks all unbooked slots on this date so new patients cannot book. Confirmed appointments remain intact.
                      </p>
                    </div>

                    {blackoutMsg && (
                      <div className={`p-3 rounded-xl text-xs font-semibold border ${blackoutMsg.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-clinic-50 border-clinic-200 text-clinic-900'}`}>
                        {blackoutMsg}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleApplyBlackout}
                      disabled={blackoutLoading}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      {blackoutLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing blackout...</span>
                        </>
                      ) : (
                        <span>Apply blackout for {blackoutDate}</span>
                      )}
                    </button>
                  </div>

                  {/* Summary of slot counts */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">Slots Overview</h3>
                      <span className="text-xs text-slate-500 font-medium">
                        {slotDateFilter === 'all'
                          ? (doctorShowPastSlots ? `All Dates (${slots.length} total slots)` : `Upcoming Dates (${doctorVisibleSlots.length} total slots)`)
                          : `${slotDatesInfo.find(i => i.date === slotDateFilter)?.label || slotDateFilter} (${filteredSlots.length} matching slots)`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <span className="text-lg font-bold text-emerald-800 block">
                          {(slotDateFilter === 'all' ? (doctorShowPastSlots ? slots : doctorVisibleSlots) : filteredSlots).filter(s => s.status === 'available').length}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold uppercase">Available</span>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="text-lg font-bold text-amber-800 block">
                          {(slotDateFilter === 'all' ? (doctorShowPastSlots ? slots : doctorVisibleSlots) : filteredSlots).filter(s => s.status === 'hold').length}
                        </span>
                        <span className="text-[10px] text-amber-600 font-semibold uppercase">Hold / In Review</span>
                      </div>
                      <div className="p-3 bg-clinic-50 border border-clinic-200 rounded-xl">
                        <span className="text-lg font-bold text-clinic-800 block">
                          {(slotDateFilter === 'all' ? (doctorShowPastSlots ? slots : doctorVisibleSlots) : filteredSlots).filter(s => s.status === 'booked').length}
                        </span>
                        <span className="text-[10px] text-clinic-600 font-semibold uppercase">Booked</span>
                      </div>
                      <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
                        <span className="text-lg font-bold text-slate-700 block">
                          {(slotDateFilter === 'all' ? (doctorShowPastSlots ? slots : doctorVisibleSlots) : filteredSlots).filter(s => s.status === 'blocked').length}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Blocked</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual slot controls table with REAL slot data & WORKING Block/Unblock/Delete */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Individual Slot Controls
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Block, unblock, or delete specific slots. Past days are hidden automatically.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Date Dropdown with formatted labels & slot counts */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-500 font-semibold">Filter Date:</label>
                      <select
                        value={slotDateFilter}
                        onChange={e => setSlotDateFilter(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-clinic-400"
                      >
                        <option value="all">
                          {doctorShowPastSlots ? `All Dates (${slots.length} slots)` : `All Upcoming Dates (${doctorVisibleSlots.length} slots)`}
                        </option>
                        {slotDatesInfo.map(info => (
                          <option key={info.date} value={info.date}>
                            {info.date === activeTodayStr ? `Today: ${info.label}` : info.label} ({info.count} slots)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Direct Date Picker */}
                    <input
                      type="date"
                      value={slotDateFilter === 'all' ? '' : slotDateFilter}
                      onChange={e => {
                        const val = e.target.value;
                        if (val && val < activeTodayStr) {
                          setDoctorShowPastSlots(true);
                        }
                        setSlotDateFilter(val || 'all');
                      }}
                      title="Jump directly to a specific calendar date"
                      className="px-2.5 py-1 border border-slate-300 rounded-xl text-xs bg-white font-medium text-slate-700"
                    />

                    {/* Status Filter */}
                    <select
                      value={slotStatusFilter}
                      onChange={e => setSlotStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs bg-white font-medium text-slate-700"
                    >
                      <option value="all">All Statuses</option>
                      <option value="available">Available Only</option>
                      <option value="hold">Hold Only</option>
                      <option value="booked">Booked Only</option>
                      <option value="blocked">Blocked Only</option>
                    </select>

                    {/* Show Past Slots Toggle */}
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">
                      <input
                        type="checkbox"
                        checked={doctorShowPastSlots}
                        onChange={e => setDoctorShowPastSlots(e.target.checked)}
                        className="rounded border-slate-300 text-clinic-600 focus:ring-clinic-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Show past slots</span>
                    </label>

                    {/* Reset Button if filtered */}
                    {(slotDateFilter !== 'all' || slotStatusFilter !== 'all' || doctorShowPastSlots) && (
                      <button
                        type="button"
                        onClick={() => { setSlotDateFilter('all'); setSlotStatusFilter('all'); setDoctorShowPastSlots(false); }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>

                {filteredSlots.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {slotDateFilter === 'all' && slotStatusFilter === 'all'
                      ? "No slots generated yet. Use the slot generator above to create slots."
                      : `No slots found matching the selected filter criteria (${slotDateFilter !== 'all' ? `Date: ${slotDatesInfo.find(i => i.date === slotDateFilter)?.label || slotDateFilter}` : ''} ${slotStatusFilter !== 'all' ? `Status: ${slotStatusFilter}` : ''}).`}
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[30rem]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-50 z-10">
                        <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider text-left">
                          <th className="py-3 px-5 font-semibold">Date &amp; Start Time</th>
                          <th className="py-3 px-5 font-semibold">End Time</th>
                          <th className="py-3 px-5 font-semibold">Status</th>
                          <th className="py-3 px-5 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSlots.slice(0, slotDateFilter === 'all' ? slotLimitCount : undefined).map((slot) => {
                          const slotDateWithDay = slot.slot_date_fmt || (() => {
                            try {
                              const d = new Date(slot.start_time);
                              if (!isNaN(d.getTime())) {
                                return d.toLocaleDateString('en-US', {
                                  timeZone: 'Asia/Karachi',
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                });
                              }
                            } catch { }
                            return slot.slot_date || '';
                          })();

                          const sTime = slot.start_time_fmt || (() => {
                            try {
                              return new Date(slot.start_time).toLocaleTimeString('en-US', {
                                timeZone: 'Asia/Karachi',
                                hour: 'numeric',
                                minute: '2-digit'
                              });
                            } catch {
                              return '';
                            }
                          })();

                          const eTime = slot.end_time_fmt || (() => {
                            try {
                              return new Date(slot.end_time).toLocaleTimeString('en-US', {
                                timeZone: 'Asia/Karachi',
                                hour: 'numeric',
                                minute: '2-digit'
                              });
                            } catch {
                              return '';
                            }
                          })();

                          return (
                            <tr key={slot.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-5">
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                                    <Calendar className="w-3.5 h-3.5 text-clinic-700 flex-shrink-0" />
                                    <span>{slotDateWithDay}</span>
                                  </div>
                                  <div className="text-slate-500 font-medium flex items-center gap-1.5 text-[11px]">
                                    <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                    <span>{sTime}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-5 text-slate-600 font-medium">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span>{eTime}</span>
                                </div>
                              </td>
                              <td className="py-3 px-5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${slot.status === 'available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  slot.status === 'hold' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                    slot.status === 'booked' ? 'bg-clinic-100 text-clinic-800 border border-clinic-200' :
                                      'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                  {slot.status === 'hold' ? 'Hold' : slot.status}
                                </span>
                              </td>
                              <td className="py-3 px-5 text-right space-x-1.5">
                                {slot.status === 'available' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleBlockSlot(slot.id)}
                                      disabled={Boolean(slotActionLoading)}
                                      className="px-2.5 py-1 border border-slate-300 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed text-slate-700 font-semibold rounded-lg text-[11px] transition-all inline-flex items-center gap-1.5"
                                    >
                                      {slotActionLoading?.id === slot.id && slotActionLoading.action === 'block' ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin text-clinic-700" />
                                          <span>Processing...</span>
                                        </>
                                      ) : (
                                        <span>Block</span>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSlot(slot.id)}
                                      disabled={Boolean(slotActionLoading)}
                                      className="px-2.5 py-1 border border-rose-300 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed text-rose-600 font-semibold rounded-lg text-[11px] transition-all inline-flex items-center gap-1.5"
                                    >
                                      {slotActionLoading?.id === slot.id && slotActionLoading.action === 'delete' ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin text-rose-600" />
                                          <span>Processing...</span>
                                        </>
                                      ) : (
                                        <span>Delete</span>
                                      )}
                                    </button>
                                  </>
                                )}
                                {slot.status === 'blocked' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUnblockSlot(slot.id)}
                                    disabled={Boolean(slotActionLoading)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-[11px] transition-all inline-flex items-center gap-1.5"
                                  >
                                    {slotActionLoading?.id === slot.id && slotActionLoading.action === 'unblock' ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                                        <span>Processing...</span>
                                      </>
                                    ) : (
                                      <span>Unblock</span>
                                    )}
                                  </button>
                                )}
                                {slot.status === 'booked' && (
                                  <span className="text-[11px] text-slate-400 italic">Booked visit</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {filteredSlots.length > slotLimitCount && slotDateFilter === 'all' && (
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Showing first {slotLimitCount} of {filteredSlots.length} total slots</span>
                    <button
                      type="button"
                      onClick={() => setSlotLimitCount(prev => prev + 150)}
                      className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-sm transition-colors"
                    >
                      Load More Slots (+150)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Assistants Desk Tab ── */}
          {activePortalTab === 'assistants' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Linked Clinic Receptionists &amp; Assistants</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Self-service: add or revoke assistants directly. Receptionists can approve queues and record cash at your desk.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAsstModal(true)}
                  className="px-4 py-2 bg-clinic-700 hover:bg-clinic-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Clinic Assistant
                </button>
              </div>

              {asstActionMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold border ${asstActionMsg.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-clinic-50 border-clinic-200 text-clinic-900'}`}>
                  {asstActionMsg}
                </div>
              )}

              {/* List of assistants */}
              <div className="divide-y divide-slate-100">
                {assistants.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs text-slate-500 font-semibold">No assistant receptionists linked to your clinic yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Click "Add Clinic Assistant" above to create an account for your front-desk staff.</p>
                  </div>
                ) : (
                  assistants.map((asst) => {
                    const isPassVisible = visiblePasswords[asst.id] ?? false;
                    const pwd = asst.plain_password || '';
                    const isCopied = copiedAsstId === asst.id;

                    return (
                      <div key={asst.id} className="py-4 px-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl transition-all space-y-3.5 mb-3 last:mb-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Left: Avatar & Identity */}
                          <div className="flex items-center gap-3.5">
                            <InitialsAvatar name={asst.full_name || 'Assistant'} size="md" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm tracking-tight">{asst.full_name}</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  ACTIVE DESK
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                  <strong className="text-slate-700 font-medium">{asst.email}</strong>
                                </span>
                                {asst.phone && asst.phone !== 'N/A' && (
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{asst.phone}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-2 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() => openResetAsstModal(asst)}
                              className="px-3.5 py-1.5 bg-white border border-clinic-300 hover:border-clinic-500 hover:bg-clinic-50 text-clinic-800 font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <Key className="w-3.5 h-3.5 text-clinic-600" />
                              Reset Password
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeAssistant(asst.id, asst.full_name)}
                              className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold rounded-xl text-xs transition-colors"
                            >
                              Revoke Access
                            </button>
                          </div>
                        </div>

                        {/* Current Password & Credentials Display Strip */}
                        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-clinic-50 border border-clinic-200 flex items-center justify-center text-clinic-700 flex-shrink-0">
                              <Lock className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Current Assistant Password
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`font-mono text-xs font-semibold ${isPassVisible ? (pwd ? 'text-clinic-900 bg-clinic-50/60 px-2 py-0.5 rounded border border-clinic-200' : 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 italic') : 'text-slate-500 tracking-widest'}`}>
                                  {isPassVisible ? (pwd ? pwd : '(No password set)') : '••••••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(asst.id)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                                  title={isPassVisible ? 'Hide password' : 'Show password'}
                                >
                                  {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(pwd, asst.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Copy Password</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── Clinic Profile Tab ── */}
          {activePortalTab === 'profile' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Doctor &amp; Clinic Profile</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Your public practitioner and clinic details shown to patients.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  {isEditingProfile ? 'Cancel Editing' : 'Edit Profile Details'}
                </button>
              </div>

              {/* VIP Loyalty Card Management Section */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-400/15 to-amber-600/10 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-500/50 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-bold text-sm shadow-xs">
                      💳
                    </span>
                    <div>
                      <h4 className="font-extrabold text-amber-950 dark:text-amber-200 text-sm">
                        {doctorProfile?.loyalty_card_title || 'RK Loyalty Card'} &bull; VIP Loyalty Program
                      </h4>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300/90 font-medium">
                        Consultation fee discount program for returning &amp; registered patients.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const newStatus = !doctorProfile?.loyalty_card_enabled;
                        try {
                          await apiFetch('/doctor/loyalty-card/settings', {
                            method: 'PUT',
                            body: JSON.stringify({
                              loyalty_card_enabled: newStatus,
                              loyalty_card_title: doctorProfile?.loyalty_card_title || 'RK Loyalty Card',
                              loyalty_discount_percent: doctorProfile?.loyalty_discount_percent ?? 20.0
                            })
                          });
                          setDoctorProfile((prev: any) => ({ ...prev, loyalty_card_enabled: newStatus }));
                          alert(newStatus ? 'VIP Loyalty Card is now ACTIVE and visible on your profile.' : 'VIP Loyalty Card is now INACTIVE and hidden from your profile.');
                        } catch (err: any) {
                          alert(err.message || 'Failed to update loyalty settings');
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 ${
                        doctorProfile?.loyalty_card_enabled
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {doctorProfile?.loyalty_card_enabled ? `✓ Program Active (${doctorProfile?.loyalty_discount_percent ?? 20}% OFF)` : '✕ Program Inactive (Hidden)'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
                  {/* Card Image Preview */}
                  <div className="relative group w-48 h-32 rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-400 shadow-md flex-shrink-0">
                    <img
                      src={doctorProfile?.loyalty_card_image_url || '/rk-loyalty-card.png'}
                      alt="Loyalty Card"
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const fb = (e.target as HTMLElement).nextElementSibling;
                        if (fb) (fb as HTMLElement).style.display = 'flex';
                      }}
                    />
                    <div
                      style={{ display: doctorProfile?.loyalty_card_image_url ? 'none' : 'flex' }}
                      className="w-full h-full bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 font-black text-xs flex flex-col justify-center items-center text-center p-2"
                    >
                      <span>{doctorProfile?.loyalty_card_title || 'RK Loyalty Card'}</span>
                      <span className="text-[10px] opacity-80 mt-1">Upload Card Photo</span>
                    </div>
                  </div>

                  {/* Upload Controls & Settings */}
                  <div className="space-y-2 flex-1 w-full text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Custom Loyalty Card Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const fd = new FormData();
                            fd.append('file', file);
                            try {
                              const res: any = await apiFetch('/doctor/loyalty-card/upload', {
                                method: 'POST',
                                body: fd
                              });
                              setDoctorProfile((prev: any) => ({
                                ...prev,
                                loyalty_card_image_url: res.loyalty_card_image_url,
                                loyalty_card_enabled: true,
                                loyalty_card_title: res.loyalty_card_title || prev?.loyalty_card_title,
                                loyalty_discount_percent: res.loyalty_discount_percent ?? prev?.loyalty_discount_percent
                              }));
                              alert(res.message || `VIP Loyalty Card photo uploaded! Autodetected consultation discount: ${res.loyalty_discount_percent}% OFF`);
                            } catch (err: any) {
                              alert(err.message || 'Failed to upload loyalty card');
                            }
                          }}
                        />
                      </label>
                      <span className="text-[11px] text-amber-900 dark:text-amber-300">
                        Supports JPG, PNG, WEBP &bull; AI autodetects discount
                      </span>
                    </div>

                    {/* Direct Loyalty Discount & Title Controls */}
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-amber-200/60 dark:border-amber-700/50">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-950 dark:text-amber-200 mb-1">Card Title / Clinic Branding</label>
                        <input
                          type="text"
                          value={doctorProfile?.loyalty_card_title || 'RK Loyalty Card'}
                          onChange={(e) => setDoctorProfile((prev: any) => ({ ...prev, loyalty_card_title: e.target.value }))}
                          className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-600/50 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-950 dark:text-amber-200 mb-1">
                          Consultation Discount (%)
                          <span className="ml-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">(Autodetected from photo)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="99"
                            step="0.5"
                            value={doctorProfile?.loyalty_discount_percent ?? 20}
                            onChange={(e) => setDoctorProfile((prev: any) => ({ ...prev, loyalty_discount_percent: parseFloat(e.target.value) || 0 }))}
                            className="w-24 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-600/50 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await apiFetch('/doctor/loyalty-card/settings', {
                                  method: 'PUT',
                                  body: JSON.stringify({
                                    loyalty_card_enabled: Boolean(doctorProfile?.loyalty_card_enabled),
                                    loyalty_card_title: doctorProfile?.loyalty_card_title || 'RK Loyalty Card',
                                    loyalty_discount_percent: doctorProfile?.loyalty_discount_percent ?? 20.0
                                  })
                                });
                                alert(`Loyalty settings saved! Consultation discount updated to ${doctorProfile?.loyalty_discount_percent}% OFF.`);
                              } catch (err: any) {
                                alert(err.message || 'Failed to save loyalty settings');
                              }
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-xs"
                          >
                            Save Settings
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                      AI analyzes your uploaded loyalty card and extracts the exact consultation fee discount automatically. You can also customize or adjust the discount percentage above at any time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Doctor Profile Picture Card (Cloudinary Powered) */}
              <div className="bg-gradient-to-r from-slate-50 to-clinic-50/40 dark:from-slate-800 dark:to-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-700 p-5 flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group w-28 h-28 rounded-2xl overflow-hidden bg-slate-900 border-2 border-clinic-600/30 shadow-md flex-shrink-0">
                  <img
                    src={getDoctorProfileImage({
                      full_name: doctorProfile?.full_name,
                      specialty: doctorProfile?.specialty,
                      profile_image: doctorProfile?.profile_image
                    }, 300)}
                    alt={doctorProfile?.full_name || 'Doctor'}
                    className="w-full h-full object-cover object-top"
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white text-center p-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-clinic-400 mb-1" />
                      <span className="text-[10px] font-bold">Uploading...</span>
                    </div>
                  )}
                  {doctorProfile?.profile_image && (
                    <span className="absolute bottom-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm" title="Cloudinary CDN Active">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Profile Photo &amp; Portrait
                    </h4>
                    {doctorProfile?.profile_image ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-800 bg-sky-100/80 border border-sky-300 px-2 py-0.5 rounded-full shadow-2xs">
                        Cloudinary CDN Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-full shadow-2xs">
                        Default Specialist Portrait
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-300 text-xs">
                    Upload your official doctor portrait. Photos are securely hosted on Cloudinary, automatically face-centered, optimized, and updated live across the patient directory.
                  </p>

                  {imageUploadMsg && (
                    <div className={`p-2.5 rounded-xl text-xs font-semibold border ${imageUploadMsg.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-clinic-50 border-clinic-200 text-clinic-900'}`}>
                      {imageUploadMsg}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                    <label className={`px-4 py-2 bg-clinic-700 hover:bg-clinic-800 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Camera className="w-3.5 h-3.5" />
                      {doctorProfile?.profile_image ? 'Change Photo' : 'Upload Profile Picture'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    {doctorProfile?.profile_image && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={uploadingImage}
                        className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs transition-colors"
                      >
                        Reset to Default
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {profileMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold border ${profileMsg.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-clinic-50 border-clinic-200 text-clinic-900'}`}>
                  {profileMsg}
                </div>
              )}

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Consultation Fee (Rs.)</label>
                      <input
                        type="number"
                        value={editFee}
                        onChange={e => setEditFee(Number(e.target.value))}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Clinical Experience (Years)</label>
                      <input
                        type="number"
                        min={1}
                        max={70}
                        value={editExpYears}
                        onChange={e => setEditExpYears(Number(e.target.value))}
                        required
                        placeholder="e.g. 12"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-clinic-600"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="font-semibold text-slate-600 block mb-1 flex items-center justify-between">
                        <span>Medical Degrees &amp; Qualifications</span>
                        <span className="text-[10px] text-slate-400 font-normal">e.g. MBBS, FCPS</span>
                      </label>
                      <input
                        type="text"
                        value={editQualification}
                        onChange={e => setEditQualification(e.target.value)}
                        required
                        placeholder="e.g. MBBS, FCPS (Medicine)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-clinic-600 font-medium text-slate-800"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="font-semibold text-slate-600 block mb-1">Clinic Shift Pattern</label>
                      <select
                        value={editShift}
                        onChange={e => setEditShift(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium"
                      >
                        <option value="MORNING">MORNING ({morningStartHour}:{morningStartMin} {morningStartPeriod} – {morningEndHour}:{morningEndMin} {morningEndPeriod})</option>
                        <option value="EVENING">EVENING ({eveningStartHour}:{eveningStartMin} {eveningStartPeriod} – {eveningEndHour}:{eveningEndMin} {eveningEndPeriod})</option>
                        <option value="BOTH">BOTH (Morning &amp; Evening Shifts)</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="font-semibold text-slate-600 block mb-1">Clinic Address in D.I. Khan</label>
                      <textarea
                        value={editAddress}
                        onChange={e => setEditAddress(e.target.value)}
                        rows={2}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="font-semibold text-slate-600 block mb-1">Google Maps URL</label>
                      <input
                        type="url"
                        value={editMapsUrl}
                        onChange={e => setEditMapsUrl(e.target.value)}
                        placeholder="https://maps.google.com/..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      />
                    </div>
                    {/* About Doctor / Diagnoses / Treated Diseases */}
                    <div className="col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                        <span>About Doctor &amp; Treated Diseases / Diagnoses</span>
                        <span className="text-[11px] text-slate-400 font-normal">Shown publicly on booking page</span>
                      </label>
                      <textarea
                        value={editBio}
                        onChange={e => setEditBio(e.target.value)}
                        rows={3}
                        placeholder="e.g. Dr. Babar provides thoughtful, evidence-based care for adults, with a focus on cardiology, high blood pressure, diabetes and long-term wellbeing."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-clinic-600 focus:border-transparent transition-all"
                      />
                    </div>
                    {/* 3 Expertise Boxes */}
                    <div className="col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                        <span>Doctor Specialties &amp; Clinical Expertise (3 Boxes)</span>
                        <span className="text-[11px] text-slate-400 font-normal">Shown as badges to patients</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Expertise 1</span>
                          <input
                            type="text"
                            value={editExpertise1}
                            onChange={e => setEditExpertise1(e.target.value)}
                            placeholder="e.g. Cardiology"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-clinic-600"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Expertise 2</span>
                          <input
                            type="text"
                            value={editExpertise2}
                            onChange={e => setEditExpertise2(e.target.value)}
                            placeholder="e.g. Hypertension"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-clinic-600"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Expertise 3</span>
                          <input
                            type="text"
                            value={editExpertise3}
                            onChange={e => setEditExpertise3(e.target.value)}
                            placeholder="e.g. General Medicine"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-clinic-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-5 py-2.5 bg-clinic-700 hover:bg-clinic-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-colors shadow-sm inline-flex items-center gap-2"
                  >
                    {profileLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Processing profile update...</span>
                      </>
                    ) : (
                      <span>Save Profile Changes</span>
                    )}
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-400 block text-[11px]">Doctor Full Name</span>
                    <span className="font-bold text-slate-800 dark:text-white text-sm">{doctorProfile?.full_name}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-400 block text-[11px]">Medical Specialty</span>
                    <span className="font-bold text-slate-800 dark:text-white text-sm">{doctorProfile?.specialty}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-400 block text-[11px]">Degrees &amp; Qualifications</span>
                    <span className="font-bold text-clinic-800 dark:text-clinic-400 text-sm">{doctorProfile?.qualification || 'MBBS, FCPS'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-400 block text-[11px]">Consultation Fee</span>
                    <span className="font-bold text-slate-800 dark:text-white text-sm">{formatCurrency(doctorProfile?.fee_clinic)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-400 block text-[11px]">Clinical Experience</span>
                    <span className="font-bold text-slate-800 dark:text-white text-sm">
                      {doctorProfile?.experience_years !== undefined && doctorProfile?.experience_years !== null ? `${doctorProfile.experience_years} Years` : '12 Years'}
                    </span>
                  </div>
                  <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Operating Shift &amp; Hours</span>
                    <span className="font-bold text-slate-800 text-sm">{doctorProfile?.shift}</span>
                    <span className="text-[11px] text-clinic-700 font-medium block mt-0.5">
                      {doctorProfile?.shift === 'MORNING'
                        ? `Morning: ${doctorProfile?.morning_start || '09:00'} – ${doctorProfile?.morning_end || '13:00'}`
                        : doctorProfile?.shift === 'EVENING'
                          ? `Evening: ${doctorProfile?.evening_start || '17:00'} – ${doctorProfile?.evening_end || '21:00'}`
                          : `Morning: ${doctorProfile?.morning_start || '09:00'}–${doctorProfile?.morning_end || '13:00'} · Evening: ${doctorProfile?.evening_start || '17:00'}–${doctorProfile?.evening_end || '21:00'}`}
                    </span>
                  </div>
                  <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Weekly Off Days</span>
                    <span className="font-bold text-slate-800 text-sm capitalize">
                      {doctorProfile?.off_days ? doctorProfile.off_days.split(',').join(', ') : 'Sunday'}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Clinic is closed on these days &mdash; slots will not be generated.
                    </span>
                  </div>
                  {/* About Doctor Bio View */}
                  <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px] font-semibold">About Doctor &amp; Treated Diseases / Diagnoses</span>
                    <p className="text-slate-700 text-xs mt-1 leading-relaxed whitespace-pre-line">
                      {doctorProfile?.bio || (
                        <span className="text-slate-400 italic">No bio configured yet. Click &quot;Edit Profile Details&quot; to add a description of your treated diseases and clinical diagnoses.</span>
                      )}
                    </p>
                  </div>
                  {/* Expertise Badges View */}
                  <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px] font-semibold mb-1.5">Doctor Specialties &amp; Clinical Expertise</span>
                    <div className="flex flex-wrap gap-2">
                      {((doctorProfile?.expertise && doctorProfile.expertise.trim())
                        ? doctorProfile.expertise.split(',').map((t: string) => t.trim()).filter(Boolean)
                        : ['Cardiology', 'Hypertension', 'General medicine']
                      ).map((t: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-xs shadow-2xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Clinic Address</span>
                    <span className="font-medium text-slate-800">{doctorProfile?.clinic_address}</span>
                  </div>
                  {doctorProfile?.google_maps_url && (
                    <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px]">Google Maps Location</span>
                      <a href={doctorProfile.google_maps_url} target="_blank" rel="noreferrer" className="text-clinic-700 hover:underline font-mono text-[11px] truncate block">
                        {doctorProfile.google_maps_url}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Add Assistant ── */}
      {showAddAsstModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Add New Clinic Receptionist
              </h3>
              <button onClick={() => setShowAddAsstModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Create an account for your reception staff. They will receive access to your live clinic desk to check-in patients and collect cash.
            </p>
            <form onSubmit={handleCreateAssistant} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={newAsstName}
                  onChange={e => setNewAsstName(e.target.value)}
                  required
                  placeholder="e.g. Nida Ahmed"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Login Email</label>
                <input
                  type="email"
                  value={newAsstEmail}
                  onChange={e => setNewAsstEmail(e.target.value)}
                  required
                  placeholder="receptionist@clinic.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newAsstPhone}
                  onChange={e => setNewAsstPhone(e.target.value)}
                  placeholder="03001234567"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Initial Password (min 6 chars)</label>
                <input
                  type="text"
                  value={newAsstPass}
                  onChange={e => setNewAsstPass(e.target.value)}
                  required
                  placeholder="DeskPass123!"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-mono"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAsstModal(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={asstLoading}
                  className="px-4 py-2 bg-clinic-700 hover:bg-clinic-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-sm transition-colors inline-flex items-center gap-1.5"
                >
                  {asstLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Create Assistant</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Reset Assistant Password ── */}
      {resetAsstModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-fade-in border border-slate-100">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-clinic-100 text-clinic-800 flex items-center justify-center flex-shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Reset Assistant Password
                  </h3>
                  <p className="text-xs text-slate-500">
                    Front-desk staff: <strong className="text-slate-800">{resetAsstModal.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetAsstModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active Password Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Current Active Password
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyPassword(resetAsstModal.currentPassword || '', 'modal-current')}
                  className="text-[11px] font-semibold text-clinic-700 hover:text-clinic-800 flex items-center gap-1"
                >
                  {copiedAsstId === 'modal-current' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Current</span>
                    </>
                  )}
                </button>
              </div>
              <p className="font-mono text-sm font-bold text-clinic-900 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 inline-block">
                {resetAsstModal.currentPassword ? resetAsstModal.currentPassword : '(No password set)'}
              </p>
              <p className="text-[10px] text-slate-400">
                Staff member currently uses this password to log in at the reception desk.
              </p>
            </div>

            {/* Reset Form */}
            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              {resetError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {/* New Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">New Password</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] font-semibold text-clinic-700 hover:text-clinic-800 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Generate Strong Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    value={newResetPass}
                    onChange={e => setNewResetPass(e.target.value)}
                    required
                    placeholder="Enter at least 6 characters..."
                    className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-clinic-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Minimum 6 characters required. Can include letters, numbers, and symbols.
                </span>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Confirm New Password</label>
                <input
                  type={showResetPass ? 'text' : 'password'}
                  value={confirmResetPass}
                  onChange={e => setConfirmResetPass(e.target.value)}
                  required
                  placeholder="Re-enter new password..."
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-clinic-400"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetAsstModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 bg-clinic-700 hover:bg-clinic-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  {resetLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Appointment Details / Complete Consultation ── */}
      {selectedAppt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Consultation Details
                </h3>
                <span className="text-xs text-slate-400">Slip #{selectedAppt.slip_number || `SLIP-${selectedAppt.id.slice(0, 6).toUpperCase()}`}</span>
              </div>
              <button onClick={() => setSelectedAppt(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Patient Name</span>
                <span className="font-bold text-slate-800">{selectedAppt.patient_name || 'Walk-in Patient'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Phone</span>
                <span className="font-semibold text-slate-800 font-mono">{selectedAppt.patient_phone || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Selected Slot Date</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-clinic-700" />
                  {selectedAppt.slot_date || formatSlotDateTime(selectedAppt.slot_start || selectedAppt.start_time, selectedAppt.slip_number, selectedAppt.created_at).date}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Selected Slot Time</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-clinic-700" />
                  {selectedAppt.slot_time || formatSlotDateTime(selectedAppt.slot_start || selectedAppt.start_time, selectedAppt.slip_number, selectedAppt.created_at).time}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Visit Status</span>
                <span className="font-bold text-clinic-700">{selectedAppt.status}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Payment</span>
                <span className="font-bold text-emerald-700">{selectedAppt.payment_status || 'PENDING'} ({formatCurrency(selectedAppt.fee_amount || doctorProfile?.fee_clinic || 1000)})</span>
              </div>
            </div>

            {selectedAppt.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-400 block text-[11px] mb-0.5">Existing Notes:</span>
                <span className="text-slate-700">{selectedAppt.notes}</span>
              </div>
            )}

            {selectedAppt.status?.toUpperCase() !== 'COMPLETED' && selectedAppt.status?.toUpperCase() !== 'CANCELLED' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">Doctor Clinical Remarks / Prescription Note</label>
                <textarea
                  value={consultNote}
                  onChange={e => setConsultNote(e.target.value)}
                  placeholder="e.g. Prescribed medication, follow-up in 2 weeks..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>
            )}

            {apptActionMsg && (
              <div className={`p-3 rounded-xl text-xs font-semibold border ${apptActionMsg.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-clinic-50 border-clinic-200 text-clinic-900'}`}>
                {apptActionMsg}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              {selectedAppt.status?.toUpperCase() !== 'COMPLETED' && selectedAppt.status?.toUpperCase() !== 'CANCELLED' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleCancelAppointment(selectedAppt.id)}
                    className="px-3 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel Appointment
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAppt(null)}
                      className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Close
                    </button>
                    {(() => {
                      const isModalFirstActive = Boolean(callingOrderActive && displayAppts[0]?.id === selectedAppt?.id);
                      const canModalDoctorComplete = canDoctorComplete(selectedAppt, isModalFirstActive);
                      if (!canModalDoctorComplete) {
                        return (
                          <div className="flex items-center gap-2">
                            {selectedAppt.payment_status !== 'PAID' && (
                              <button
                                type="button"
                                disabled={Boolean(doctorMarkPaidLoading) || actionLoading}
                                onClick={() => handleDoctorMarkPaid(selectedAppt.id)}
                                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="Record cash payment at desk / consultation"
                              >
                                {doctorMarkPaidLoading === selectedAppt.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Mark as Paid ({formatCurrency(selectedAppt.fee_amount || 1000)})</span>
                                  </>
                                )}
                              </button>
                            )}
                            <span
                              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1.5"
                              title="Appointment scheduled date & time has not arrived yet"
                            >
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Upcoming Slot</span>
                            </span>
                          </div>
                        );
                      }
                      return selectedAppt.payment_status !== 'PAID' ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={Boolean(doctorMarkPaidLoading) || actionLoading}
                            onClick={() => handleDoctorMarkPaid(selectedAppt.id)}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Record cash payment at desk / consultation"
                          >
                            {doctorMarkPaidLoading === selectedAppt.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Mark as Paid ({formatCurrency(selectedAppt.fee_amount || 1000)})</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCompleteAppointment(selectedAppt.id, true)}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                            title="Mark fee as PAID and complete consultation in 1 click"
                          >
                            {actionLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                <span>Mark Paid & Complete</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCompleteAppointment(selectedAppt.id)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors shadow-sm inline-flex items-center gap-1.5"
                        >
                          {actionLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              <span>Processing completion...</span>
                            </>
                          ) : (
                            <span>Mark Consultation Complete</span>
                          )}
                        </button>
                      );
                    })()}

                  </div>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedAppt(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function AdminSection({ onSwitchRole }: { onSwitchRole?: (r: 'patient' | 'assistant' | 'doctor' | 'admin') => void }) {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [doctors, setDoctors] = useState<DoctorData[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState<boolean>(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminTab, setAdminTab] = useState<'directory' | 'audit' | 'system'>('directory');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Doctor Form Modal state
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);

  // Form Fields
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSpecialty, setFormSpecialty] = useState('Cardiologist');
  const [formSubRegion, setFormSubRegion] = useState('Circular Road');
  const [formClinicAddress, setFormClinicAddress] = useState('');
  const [formGoogleMapsUrl, setFormGoogleMapsUrl] = useState('');
  const [formFeeClinic, setFormFeeClinic] = useState<number>(1000);
  const [formShift, setFormShift] = useState('EVENING');
  const [formMorningStart, setFormMorningStart] = useState('09:00');
  const [formMorningEnd, setFormMorningEnd] = useState('13:00');
  const [formEveningStart, setFormEveningStart] = useState('17:00');
  const [formEveningEnd, setFormEveningEnd] = useState('21:00');
  const [formVerificationStatus, setFormVerificationStatus] = useState('verified');
  const [formIsSpotlight, setFormIsSpotlight] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Doctor Credentials Reset Modal state
  const [resetDocModal, setResetDocModal] = useState<DoctorData | null>(null);
  const [newDocEmail, setNewDocEmail] = useState('');
  const [newDocPassword, setNewDocPassword] = useState('');
  const [showDocPassword, setShowDocPassword] = useState(false);
  const [showDocNewPassword, setShowDocNewPassword] = useState(false);

  // Redis Cache status
  const [redisStatus, setRedisStatus] = useState<any>(null);

  const handleLoginSubmit = async (adminEmail?: string, adminPass?: string) => {
    try {
      setLoginLoading(true);
      setLoginError('');
      const targetEmail = (adminEmail !== undefined ? adminEmail : email).trim();
      const targetPass = adminPass !== undefined ? adminPass : password;
      const res: any = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, password: targetPass, portal: 'ADMIN' })
      });

      // Role check: If Doctor or Assistant attempts to sign into Admin Portal, reject immediately
      const userRole = res.user?.role?.toUpperCase();
      if (userRole !== 'ADMIN') {
        localStorage.removeItem('admin_token');
        setToken('');
        setDoctors([]);
        setAuditLogs([]);
        if (userRole === 'DOCTOR') {
          setLoginError('Access Denied: Doctor credentials cannot be used to access the Admin Portal. System administrator privileges required.');
        } else if (userRole === 'ASSISTANT') {
          setLoginError('Access Denied: Assistant credentials cannot be used to access the Admin Portal. System administrator privileges required.');
        } else {
          setLoginError(`Access Denied: Your account role is "${userRole}". System administrator privileges required.`);
        }
        return;
      }

      const t = res.access_token || res.token || '';
      localStorage.setItem('admin_token', t);
      setToken(t);
      loadAdminData(t);
    } catch (err: any) {
      setLoginError(err.message || 'Admin login failed. Check credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLoginSubmit();
  };

  const loadAdminData = async (explicitToken?: any) => {
    const activeToken = (typeof explicitToken === 'string' ? explicitToken : '') || token || localStorage.getItem('admin_token') || '';
    if (!activeToken) return;
    setDoctorsLoading(true);
    const authHeaders = { Authorization: `Bearer ${activeToken}` };
    try {
      // First verify role via /auth/me to ensure user has ADMIN role
      const me: any = await apiFetch('/auth/me', { headers: authHeaders });
      if (me?.role?.toUpperCase() !== 'ADMIN') {
        localStorage.removeItem('admin_token');
        setToken('');
        setDoctors([]);
        setAuditLogs([]);
        if (me?.role?.toUpperCase() === 'DOCTOR') {
          setLoginError('Access Denied: Doctor credentials cannot be used to access the Admin Portal. Administrator privileges required.');
        } else if (me?.role?.toUpperCase() === 'ASSISTANT') {
          setLoginError('Access Denied: Assistant credentials cannot be used to access the Admin Portal. Administrator privileges required.');
        } else {
          setLoginError(`Access Denied: Your account role is "${me?.role}". System administrator privileges required.`);
        }
        return;
      }

      const [docsData, logsData] = await Promise.all([
        apiFetch<DoctorData[]>('/admin/doctors', { headers: authHeaders }),
        apiFetch<any[]>('/admin/audit-logs', { headers: authHeaders }).catch(() => [])
      ]);
      setDoctors(Array.isArray(docsData) ? docsData : []);
      setAuditLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err: any) {
      localStorage.removeItem('admin_token');
      setToken('');
      setDoctors([]);
      setAuditLogs([]);
      setLoginError(err.message || 'Session expired or unauthorized.');
    } finally {
      setDoctorsLoading(false);
    }
  };

  const checkRedis = async () => {
    try {
      const activeToken = token || localStorage.getItem('admin_token') || '';
      const res = await apiFetch<any>('/admin/redis/status', {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {}
      });
      setRedisStatus(res);
    } catch (e) {
      setRedisStatus({ connected: false, error: 'Could not connect' });
    }
  };

  useEffect(() => {
    if (token) {
      loadAdminData();
    }
  }, [token]);

  const handleResetDoctorPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetDocModal) return;

    const cleanEmail = newDocEmail.trim();
    const cleanPass = newDocPassword.trim();

    if (!cleanEmail) {
      alert("Doctor login email/username cannot be empty.");
      return;
    }
    if (cleanPass && cleanPass.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    const payload: any = {};
    if (cleanEmail !== resetDocModal.email) {
      payload.email = cleanEmail;
    }
    if (cleanPass) {
      payload.password = cleanPass;
    }

    if (Object.keys(payload).length === 0) {
      alert("No changes detected in credentials.");
      return;
    }

    try {
      await apiFetch(`/admin/doctors/${resetDocModal.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setStatusMsg(`✓ Successfully updated credentials for Dr. ${resetDocModal.full_name}! Doctor can now log in with the new credentials. Previous credentials and any active sessions have been suspended.`);
      setResetDocModal(null);
      setNewDocPassword('');
      setNewDocEmail('');
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update doctor credentials');
    }
  };

  const openCreateModal = () => {
    setEditingDoctorId(null);
    setFormFullName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormSpecialty('Cardiologist');
    setFormSubRegion('Circular Road');
    setFormClinicAddress('');
    setFormGoogleMapsUrl('');
    setFormFeeClinic(1000);
    setFormShift('EVENING');
    setFormMorningStart('09:00');
    setFormMorningEnd('13:00');
    setFormEveningStart('17:00');
    setFormEveningEnd('21:00');
    setFormVerificationStatus('verified');
    setFormIsSpotlight(false);
    setShowDoctorModal(true);
  };

  const openEditModal = (doc: DoctorData) => {
    setEditingDoctorId(doc.id);
    setFormFullName(doc.full_name || '');
    setFormEmail(doc.email || '');
    setFormPhone(doc.phone || '');
    setFormPassword('');
    setFormSpecialty(doc.specialty || 'General Physician');
    setFormSubRegion(doc.sub_region || 'Circular Road');
    setFormClinicAddress(doc.clinic_address || '');
    setFormGoogleMapsUrl(doc.google_maps_url || '');
    setFormFeeClinic(doc.fee_clinic || 1000);
    setFormShift(doc.shift || 'EVENING');
    setFormMorningStart(doc.morning_start || '09:00');
    setFormMorningEnd(doc.morning_end || '13:00');
    setFormEveningStart(doc.evening_start || '17:00');
    setFormEveningEnd(doc.evening_end || '21:00');
    setFormVerificationStatus(doc.verification_status || 'verified');
    setFormIsSpotlight(doc.is_spotlight || false);
    setShowDoctorModal(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingDoctorId) {
        const payload: any = {
          full_name: formFullName,
          email: formEmail,
          phone: formPhone,
          specialty: formSpecialty,
          sub_region: formSubRegion,
          clinic_address: formClinicAddress,
          google_maps_url: formGoogleMapsUrl || null,
          fee_clinic: formFeeClinic,
          shift: formShift,
          morning_start: formMorningStart,
          morning_end: formMorningEnd,
          evening_start: formEveningStart,
          evening_end: formEveningEnd,
          verification_status: formVerificationStatus,
          is_spotlight: formIsSpotlight
        };
        if (formPassword.trim()) {
          payload.password = formPassword;
        }

        await apiFetch(`/admin/doctors/${editingDoctorId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setStatusMsg(`✓ Successfully updated Dr. ${formFullName}!`);
      } else {
        if (!formPassword) {
          alert('Password is required when creating a new doctor.');
          setIsSubmitting(false);
          return;
        }
        const payload = {
          full_name: formFullName,
          email: formEmail,
          phone: formPhone,
          password: formPassword,
          specialty: formSpecialty,
          sub_region: formSubRegion,
          clinic_address: formClinicAddress,
          google_maps_url: formGoogleMapsUrl || null,
          fee_clinic: formFeeClinic,
          shift: formShift,
          morning_start: formMorningStart,
          morning_end: formMorningEnd,
          evening_start: formEveningStart,
          evening_end: formEveningEnd,
          verification_status: formVerificationStatus,
          is_spotlight: formIsSpotlight
        };

        await apiFetch('/admin/doctors', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setStatusMsg(`✓ Successfully registered new doctor: Dr. ${formFullName}!`);
      }

      setShowDoctorModal(false);
      loadAdminData();
    } catch (err: any) {
      handleAdminAuthError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDoctor = async (docId: string, docName: string) => {
    if (!window.confirm(`Are you sure you want to delete Dr. ${docName}? This will remove their doctor profile and account.`)) {
      return;
    }
    try {
      await apiFetch(`/admin/doctors/${docId}`, { method: 'DELETE' });
      setStatusMsg(`✓ Successfully deleted Dr. ${docName}.`);
      loadAdminData();
    } catch (err: any) {
      handleAdminAuthError(err);
    }
  };

  const handleAdminAuthError = (err: any) => {
    if (!localStorage.getItem('admin_token') || (err.message && (err.message.includes('token') || err.message.includes('401') || err.message.includes('Unauthorized')))) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('token');
      setToken('');
      alert('Your admin session has expired or is invalid. Please log in again.');
    } else {
      alert(err.message || 'Operation failed');
    }
  };

  const toggleSpotlight = async (docId: string, current: boolean) => {
    try {
      await apiFetch(`/admin/doctors/${docId}/spotlight`, {
        method: 'POST',
        body: JSON.stringify({ is_spotlight: !current })
      });
      setStatusMsg('✓ Spotlight updated & Redis directory cache cleared!');
      loadAdminData();
    } catch (err: any) {
      handleAdminAuthError(err);
    }
  };

  const toggleVerify = async (docId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'verified' ? 'rejected' : 'verified';
    try {
      await apiFetch(`/admin/doctors/${docId}/verify?status_update=${nextStatus}`, {
        method: 'POST'
      });
      setStatusMsg(`✓ Doctor status updated to ${nextStatus}!`);
      loadAdminData();
    } catch (err: any) {
      handleAdminAuthError(err);
    }
  };

  const filteredDoctors = doctors.filter(doc =>
    (doc.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.specialty || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.sub_region || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.email && doc.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const verifiedCount = doctors.filter(d => d.verification_status === 'verified').length;
  const spotlightCount = doctors.filter(d => d.is_spotlight).length;

  // ── Staff Login (Figma Split Panel) ─────────────────────────────────────────
  if (!token) {
    return (
      <StaffLoginSplitView
        currentRole="admin"
        onSwitchRole={onSwitchRole}
        onLogin={async (em, pw) => {
          await handleLoginSubmit(em, pw);
        }}
        loginLoading={loginLoading}
        loginError={loginError}
      />
    );
  }

  // ── Authenticated Admin Portal ─────────────────────────────────────────────
  const adminSidebarNav = [
    { id: 'directory', label: 'Doctor verification' },
    { id: 'system', label: 'Spotlight governance' },
    { id: 'audit', label: 'Audit & infrastructure' }
  ];

  const handleSignOut = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('token');
    try { sessionStorage.clear(); } catch (_) { }
    setToken('');
    setDoctors([]);
    if (onSwitchRole) {
      onSwitchRole('patient');
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="flex min-h-screen bg-white animate-fade-in">
      <PortalSidebar
        workspaceLabel="Admin Workspace"
        clinicName="Platform Governance"
        clinicSub="D.I. Khan Directory"
        navItems={adminSidebarNav}
        activeNav={adminTab}
        onNavChange={(id) => {
          setAdminTab(id as any);
          if (id === 'system' || id === 'audit') checkRedis();
        }}
        onSignOut={handleSignOut}
        bottomNote="Administrator access · Concept environment"
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="portal-content flex-1">
        {/* Top breadcrumb bar */}
        <div className="h-12 border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 truncate max-w-[170px] sm:max-w-none">
              Admin portal / {adminTab === 'directory' ? 'Doctor verification' : adminTab === 'system' ? 'Spotlight governance' : 'Audit & infrastructure'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadAdminData()}
              disabled={doctorsLoading}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 disabled:opacity-75 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              title="Refresh queue and doctor directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-clinic-700 ${doctorsLoading ? 'animate-spin' : ''}`} />
              <span>{doctorsLoading ? 'Refreshing...' : 'Refresh Queue'}</span>
            </button>
            <span className="text-xs text-slate-600 font-medium">Sana Ali &middot; Demo workspace</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="p-8 space-y-6">
          {/* Sub-nav tabs */}
          <div className="flex items-center gap-1 border-b border-slate-100">
            {[
              ['directory', 'Doctor Directory & Verification'],
              ['system', 'Spotlight Governance'],
              ['audit', 'Audit Trail & Infrastructure']
            ].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => {
                  setAdminTab(tab as any);
                  if (tab === 'audit' || tab === 'system') checkRedis();
                }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${adminTab === tab ? 'border-clinic-700 text-clinic-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Header (matching media_1791569483061.png) */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Trust, before discovery.
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review doctor credentials and curate directory Spotlight &middot; Admin / Developer only
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Exclusive admin controls
              </span>
              <button
                onClick={() => loadAdminData()}
                disabled={doctorsLoading}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 disabled:opacity-75 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                title="Refresh doctor records and queue"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-clinic-700 ${doctorsLoading ? 'animate-spin' : ''}`} />
                <span>{doctorsLoading ? 'Refreshing Queue...' : 'Refresh Queue'}</span>
              </button>
              <button
                onClick={openCreateModal}
                className="px-3.5 py-2 bg-clinic-700 hover:bg-clinic-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Doctor
              </button>
            </div>
          </div>

          {/* Top 3 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">Verified doctors</p>
              <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {verifiedCount > 0 ? verifiedCount : 6}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Conceptual directory profiles</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">Pending review</p>
              <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {doctors.filter(d => d.verification_status !== 'verified').length > 0 ? doctors.filter(d => d.verification_status !== 'verified').length : 2}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Awaiting license &amp; clinic review</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">Rejected applications</p>
              <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>1</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Rejection reason retained in audit log</p>
            </div>
          </div>



          {/* Status banner */}
          {statusMsg && (
            <div className="p-3.5 bg-clinic-50 border border-clinic-200 rounded-xl text-xs text-clinic-900 font-medium flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-clinic-700 flex-shrink-0" />
                <span>{statusMsg}</span>
              </div>
              <button onClick={() => setStatusMsg('')} className="text-clinic-600 hover:text-clinic-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Tab: Doctor Directory ── */}
          {adminTab === 'directory' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search doctors by name, specialty, sub-region, or email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-clinic-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Showing {filteredDoctors.length} of {doctors.length} doctors</span>
                  <button
                    onClick={() => loadAdminData()}
                    disabled={doctorsLoading}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                    title="Refresh doctor directory"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-clinic-700 ${doctorsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {doctorsLoading ? (
                  <div className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-10 h-10 animate-spin text-clinic-600" />
                      <p className="text-sm font-semibold text-slate-800">Loading doctor directory...</p>
                      <p className="text-xs text-slate-400">Fetching verified doctors, credentials, and practice locations</p>
                    </div>
                  </div>
                ) : filteredDoctors.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    No doctors match your search query.
                  </div>
                ) : (
                  filteredDoctors.map(doc => (
                    <div key={doc.id} className="p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-start gap-3.5">
                        <InitialsAvatar name={doc.full_name} size="md" />
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                            {doc.full_name}
                            <StatusPill status={doc.verification_status} />
                            {doc.is_spotlight && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" /> Spotlight
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                            <span><strong>Specialty:</strong> {doc.specialty}</span>
                            <span>&bull;</span>
                            <span><strong>Area:</strong> {doc.sub_region}</span>
                            <span>&bull;</span>
                            <span><strong>Fee:</strong> {formatCurrency(doc.fee_clinic)}</span>
                            <span>&bull;</span>
                            <span><strong>Shift:</strong> {doc.shift}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3">
                            <span>Email: <strong className="text-slate-600">{doc.email || 'N/A'}</strong></span>
                            <span>Phone: <strong className="text-slate-600">{doc.phone || 'N/A'}</strong></span>
                            <span>Clinic: {doc.clinic_address}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end md:self-auto flex-wrap">
                        <button
                          onClick={() => toggleVerify(doc.id, doc.verification_status)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${doc.verification_status === 'verified'
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                            }`}
                          title="Toggle verification status"
                        >
                          {doc.verification_status === 'verified' ? 'Unverify' : '✓ Verify'}
                        </button>
                        <button
                          onClick={() => toggleSpotlight(doc.id, doc.is_spotlight)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${doc.is_spotlight
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          title="Toggle spotlight directory placement"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          {doc.is_spotlight ? 'Pinned' : 'Spotlight'}
                        </button>
                        <button
                          onClick={() => {
                            setResetDocModal(doc);
                            setNewDocEmail(doc.email || '');
                            setNewDocPassword('');
                            setShowDocPassword(false);
                            setShowDocNewPassword(false);
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                          title="View Credentials & Update Login Info"
                        >
                          🔑 Credentials
                        </button>
                        <button
                          onClick={() => openEditModal(doc)}
                          className="px-2.5 py-1.5 bg-clinic-50 hover:bg-clinic-100 text-clinic-800 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                          title="Edit Doctor Details"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDoctor(doc.id, doc.full_name)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                          title="Delete Doctor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Audit Trail ── */}
          {adminTab === 'audit' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Immutable Audit Trail</h3>
                  <p className="text-xs text-slate-500">Security event log tracking booking updates, financial cash desk entries, and doctor administration.</p>
                </div>
                <button
                  onClick={() => loadAdminData()}
                  className="text-xs text-clinic-700 hover:text-clinic-900 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
                </button>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">No audit logs recorded yet.</p>
                ) : (
                  auditLogs.map((log: any) => (
                    <div key={log.id} className="py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg">
                      <div>
                        <span className="font-bold text-clinic-800 font-mono px-2 py-0.5 rounded bg-clinic-50 border border-clinic-200">
                          [{log.action}]
                        </span>
                        <span className="text-slate-700 font-medium ml-2">{log.entity}</span>
                        <span className="text-slate-400 ml-1">#{log.entity_id?.slice(0, 8)}</span>
                      </div>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Tab: System & Infrastructure ── */}
          {adminTab === 'system' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-slate-900">System Infrastructure &amp; Cache Status</h3>
                <p className="text-xs text-slate-500">Inspect server connectivity, local directory cache layer, and regional settings.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Redis Cache &amp; Directory Acceleration</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {redisStatus?.connected ? 'CONNECTED' : 'STANDBY'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Directory queries and doctor spotlights are cached in-memory. Modifying a doctor automatically purges related caches.
                  </p>
                  <button
                    onClick={checkRedis}
                    className="text-xs text-clinic-700 font-semibold hover:underline"
                  >
                    Ping Redis Status &rarr;
                  </button>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-bold text-slate-800 text-xs">Supported D.I. Khan Sub-Regions</span>
                  <p className="text-xs text-slate-500">
                    Circular Road, University Road, Topanwala, Bannu Road, Mufti Mahmood Hospital Road.
                  </p>
                  <span className="text-[11px] text-emerald-700 font-semibold block">5 Local Zones Active</span>
                </div>
              </div>
            </div>
          )}

          {/* Doctor Add / Edit Modal */}
          {showDoctorModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-fade-in">
                <div className="flex items-center justify-between mb-4 border-b pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-clinic-700" />
                    {editingDoctorId ? 'Edit Doctor Profile' : 'Add New Doctor to System'}
                  </h3>
                  <button onClick={() => setShowDoctorModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveDoctor} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700">Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Tariq Khan"
                        value={formFullName}
                        onChange={e => setFormFullName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl mt-1 text-xs focus:ring-2 focus:ring-clinic-400 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Specialty *</label>
                      <select
                        value={formSpecialty}
                        onChange={e => setFormSpecialty(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl mt-1 text-xs bg-white focus:ring-2 focus:ring-clinic-400 focus:outline-none"
                        required
                      >
                        <option value="General Physician">General Physician</option>
                        <option value="General Surgeon">General Surgeon</option>
                        <option value="Laparoscopic Surgeon">Laparoscopic Surgeon</option>
                        <option value="Face Aesthetic Surgeon">Face Aesthetic Surgeon</option>
                        <option value="Cardiologist">Cardiologist</option>
                        <option value="Gynecologist">Gynecologist</option>
                        <option value="Dermatologist">Dermatologist</option>
                        <option value="Pediatrician">Pediatrician</option>
                        <option value="Neurologist">Neurologist</option>
                        <option value="ENT Specialist">ENT Specialist</option>
                        <option value="Orthopedic Surgeon">Orthopedic Surgeon</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700">Email Address (Login Username) *</label>
                      <input
                        type="email"
                        placeholder="doctor@dikhanhealth.pk"
                        value={formEmail}
                        onChange={e => setFormEmail(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl mt-1 text-xs focus:ring-2 focus:ring-clinic-400 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Phone Number *</label>
                      <input
                        type="text"
                        placeholder="03001234567"
                        value={formPhone}
                        onChange={e => setFormPhone(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl mt-1 text-xs focus:ring-2 focus:ring-clinic-400 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">
                      Password {editingDoctorId ? '(Leave blank to keep unchanged)' : '*'}
                    </label>
                    <input
                      type="password"
                      placeholder="Set login password (min 6 characters)"
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl mt-1 text-xs focus:ring-2 focus:ring-clinic-400 focus:outline-none"
                      required={!editingDoctorId}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700">D.I. Khan Sub-Region *</label>
                      <select
                        value={formSubRegion}
                        onChange={e => setFormSubRegion(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl mt-1 text-xs bg-white focus:ring-2 focus:ring-clinic-400 focus:outline-none"
                        required
                      >
                        <option value="Circular Road">Circular Road</option>
                        <option value="University Road">University Road</option>
                        <option value="Topanwala">Topanwala</option>
                        <option value="Mufti Mahmood Hospital Road">Mufti Mahmood Hospital Road</option>
                        <option value="Bannu Road">Bannu Road</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Shift *</label>
                      <select
                        value={formShift}
                        onChange={e => setFormShift(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl mt-1 text-xs bg-white focus:ring-2 focus:ring-clinic-400 focus:outline-none"
                        required
                      >
                        <option value="EVENING">EVENING</option>
                        <option value="MORNING">MORNING</option>
                        <option value="BOTH">BOTH</option>
                      </select>
                    </div>
                  </div>

                  {/* Shift Hours Configuration */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-clinic-600" />
                        Custom Clinic Shift Timings
                      </span>
                      <span className="text-[10px] font-normal text-slate-500">Auto-applied to batch slots & public booking</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 text-[11px] block">☀️ Morning Shift Hours</label>
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="time"
                            value={formMorningStart}
                            onChange={e => setFormMorningStart(e.target.value)}
                            className="w-1/2 px-2 py-1.5 border rounded-lg text-xs bg-white focus:ring-1 focus:ring-clinic-400 focus:outline-none"
                          />
                          <span className="text-slate-400 text-xs font-medium">to</span>
                          <input
                            type="time"
                            value={formMorningEnd}
                            onChange={e => setFormMorningEnd(e.target.value)}
                            className="w-1/2 px-2 py-1.5 border rounded-lg text-xs bg-white focus:ring-1 focus:ring-clinic-400 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 text-[11px] block">🌙 Evening Shift Hours</label>
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="time"
                            value={formEveningStart}
                            onChange={e => setFormEveningStart(e.target.value)}
                            className="w-1/2 px-2 py-1.5 border rounded-lg text-xs bg-white focus:ring-1 focus:ring-clinic-400 focus:outline-none"
                          />
                          <span className="text-slate-400 text-xs font-medium">to</span>
                          <input
                            type="time"
                            value={formEveningEnd}
                            onChange={e => setFormEveningEnd(e.target.value)}
                            className="w-1/2 px-2 py-1.5 border rounded-lg text-xs bg-white focus:ring-1 focus:ring-clinic-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700">Consultation Fee (Rs.) *</label>
                      <input
                        type="number"
                        value={formFeeClinic}
                        onChange={e => setFormFeeClinic(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-xl mt-1 text-xs focus:ring-2 focus:ring-clinic-400 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Verification Status</label>
                      <select
                        value={formVerificationStatus}
                        onChange={e => setFormVerificationStatus(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl mt-1 text-xs bg-white focus:ring-2 focus:ring-clinic-400 focus:outline-none"
                      >
                        <option value="verified">verified</option>
                        <option value="pending">pending</option>
                        <option value="rejected">rejected</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Clinic Address *</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Clinic #4, Circular Road, D.I. Khan"
                      value={formClinicAddress}
                      onChange={e => setFormClinicAddress(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl mt-1 text-xs focus:ring-2 focus:ring-clinic-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Google Maps URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={formGoogleMapsUrl}
                      onChange={e => setFormGoogleMapsUrl(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl mt-1 text-xs focus:ring-2 focus:ring-clinic-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="spotlight_check"
                      checked={formIsSpotlight}
                      onChange={e => setFormIsSpotlight(e.target.checked)}
                      className="w-4 h-4 text-clinic-700 rounded accent-clinic-700"
                    />
                    <label htmlFor="spotlight_check" className="font-medium text-slate-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" /> Pin to Directory Spotlight (Featured Top)
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t mt-4">
                    <button
                      type="button"
                      onClick={() => setShowDoctorModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-clinic-700 hover:bg-clinic-800 text-white rounded-xl font-medium shadow-sm disabled:opacity-50 transition-all"
                    >
                      {isSubmitting ? 'Saving...' : (editingDoctorId ? 'Update Doctor' : 'Create Doctor')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Doctor Credentials & Password Reset Modal */}
          {resetDocModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-fade-in">
                <div className="flex items-center justify-between mb-3 border-b pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    🔑 Doctor Credentials Manager
                  </h3>
                  <button onClick={() => setResetDocModal(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 text-sm">{resetDocModal.full_name}</div>
                    <div className="text-slate-600 text-xs">
                      <strong>Specialty:</strong> {resetDocModal.specialty} &bull; {resetDocModal.sub_region}
                    </div>
                    <div className="text-clinic-800 font-mono font-semibold text-xs">
                      <strong>Username (Login Email):</strong> {resetDocModal.email}
                    </div>
                    <div className="text-slate-500 text-xs">
                      <strong>Phone:</strong> {resetDocModal.phone}
                    </div>

                    {/* Stored password display */}
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="text-[11px] font-bold text-amber-900 mb-1">🔑 Stored Login Password</div>
                      {resetDocModal.plain_password ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900 tracking-wide flex-1">
                            {showDocPassword ? resetDocModal.plain_password : '••••••••'}
                          </span>
                          <button
                            onClick={() => setShowDocPassword(!showDocPassword)}
                            className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> {showDocPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 italic">
                          No stored password recorded. Reset below to set a new recoverable password.
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleResetDoctorPassword} className="space-y-3.5">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Doctor Login Email (Username) *</label>
                      <input
                        type="email"
                        value={newDocEmail}
                        onChange={e => setNewDocEmail(e.target.value)}
                        placeholder="doctor@dikhanhealth.pk"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-clinic-400 focus:outline-none bg-white"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Doctor uses this email to log in to the Doctor Portal.
                      </p>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Set New Password for Doctor</label>
                      <div className="relative">
                        <input
                          type={showDocNewPassword ? 'text' : 'password'}
                          placeholder="Enter new password (min 6 characters, or leave blank to keep current)"
                          value={newDocPassword}
                          onChange={e => setNewDocPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono pr-16 focus:ring-2 focus:ring-clinic-400 focus:outline-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDocNewPassword(!showDocNewPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-[11px] font-semibold"
                        >
                          {showDocNewPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Leave blank to keep existing password, or enter a new one to replace it.
                      </p>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-950">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700" /> Immediate Credential Enforcement
                      </div>
                      <p>
                        When updated, {resetDocModal.full_name?.toLowerCase().startsWith('dr') ? resetDocModal.full_name : `Dr. ${resetDocModal.full_name}`} must log in using these new credentials. The previous credentials will be suspended immediately and any active browser sessions will be terminated.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => { setResetDocModal(null); setShowDocPassword(false); setShowDocNewPassword(false); }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-clinic-700 hover:bg-clinic-800 text-white rounded-xl font-bold shadow-sm transition-all"
                      >
                        Save &amp; Enforce New Credentials
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

