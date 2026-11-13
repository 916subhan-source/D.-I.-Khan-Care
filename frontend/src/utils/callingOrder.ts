import { AppointmentItem, DoctorCallingShiftInfo, DoctorAvailabilityInfo, DoctorData } from '../types';
import { formatMinutesTo12h } from './formatters';
import { RESCHEDULE_MIN_TRAVEL_BUFFER_MINUTES } from '../constants';

export function getApptDateStrGlobal(a: AppointmentItem): string {
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

export function getApptMinutesFromMidnight(a: AppointmentItem): number {
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

export function getApptTokenSeq(slip?: string): number {
  if (!slip) return 9999;
  const match = slip.match(/-(\d{3,4})-/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 9999;
}

export function isApptTimePassedGlobal(a: AppointmentItem, todayYmd: string): boolean {
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

export function getCurrentMinutesInPkt(): number {
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

export function parseTimeToMinutes(str?: string, defaultMins: number = 540): number {
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

export function isPosSlotPassed(s: any, isToday: boolean): boolean {
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

export function getDoctorCallingShiftInfo(
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

    if (currentMins >= 840 || (!hasIncompleteMorning && currentMins >= 720) || (!hasAnyMorning && hasAnyEvening)) {
      activeShiftType = 'EVENING';
    } else {
      activeShiftType = 'MORNING';
    }
  }

  const shiftStartMins = activeShiftType === 'MORNING' ? morningStartMins : eveningStartMins;
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

export function sortCallingSequence(
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

    const getRank = (
      isToday: boolean,
      isConf: boolean,
      isPend: boolean,
      isComp: boolean,
      isCanc: boolean,
      item: AppointmentItem
    ) => {
      const isLatePushed = Boolean(item.notes && item.notes.includes('[LATE_PUSHED_TO_END]'));

      if (isToday && isConf && !isComp && !isCanc) {
        if (callingShift) {
          const itemMins = getApptMinutesFromMidnight(item);
          const isMorningAppt = itemMins < 840;
          const isSameAsActive =
            (callingShift.activeShiftType === 'MORNING' && isMorningAppt) ||
            (callingShift.activeShiftType === 'EVENING' && !isMorningAppt);
          if (isSameAsActive) {
            // Rank 1: On-time patients in active shift
            // Rank 2: Late / Not Arrived patients pushed to the end of this active shift
            return isLatePushed ? 2 : 1;
          }
          // Other shift of today:
          // Rank 3: On-time in other shift
          // Rank 4: Late in other shift
          return isLatePushed ? 4 : 3;
        }
        return isLatePushed ? 2 : 1;
      }
      if (isToday && isPend && !isComp && !isCanc) return 5;
      if (!isToday && isConf && !isComp && !isCanc) return 6;
      if (!isToday && isPend && !isComp && !isCanc) return 7;
      if (isComp) return 8;
      return 9;
    };

    const rankA = getRank(isTodayA, isConfirmedA, isPendingA, isCompletedA, isCancelledA, a);
    const rankB = getRank(isTodayB, isConfirmedB, isPendingB, isCompletedB, isCancelledB, b);

    if (rankA !== rankB) return rankA - rankB;

    if (rankA === 1) {
      const minA = getApptMinutesFromMidnight(a);
      const minB = getApptMinutesFromMidnight(b);
      if (minA !== minB) return minA - minB;
      const tokA = getApptTokenSeq(a.slip_number);
      const tokB = getApptTokenSeq(b.slip_number);
      if (tokA !== tokB) return tokA - tokB;
    }

    if (rankA === 2) {
      // Late patients pushed to the end of the shift: ordered by token number or time
      const tokA = getApptTokenSeq(a.slip_number);
      const tokB = getApptTokenSeq(b.slip_number);
      if (tokA !== tokB) return tokA - tokB;
      const minA = getApptMinutesFromMidnight(a);
      const minB = getApptMinutesFromMidnight(b);
      if (minA !== minB) return minA - minB;
    }

    if (rankA === 3 || rankA === 4) {
      const minA = getApptMinutesFromMidnight(a);
      const minB = getApptMinutesFromMidnight(b);
      if (minA !== minB) return minA - minB;
      const tokA = getApptTokenSeq(a.slip_number);
      const tokB = getApptTokenSeq(b.slip_number);
      if (tokA !== tokB) return tokA - tokB;
    }

    if (rankA === 5) {
      const minA = getApptMinutesFromMidnight(a);
      const minB = getApptMinutesFromMidnight(b);
      if (minA !== minB) return minA - minB;
    }

    if (rankA === 8) {
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
    }

    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tB - tA;
  });
}

export function getSlotDateKeyGlobal(s: any): string {
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

export function getSlotMinutesFromMidnightInPkt(slot: any): number {
  if (!slot) return 9999;
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

export function isSlotEligibleForReschedule(
  slot: any,
  todayYmd: string,
  minBufferMinutes: number = RESCHEDULE_MIN_TRAVEL_BUFFER_MINUTES
): boolean {
  if (!slot) return false;
  const slotDateKey = getSlotDateKeyGlobal(slot);
  if (!slotDateKey || slotDateKey < todayYmd) {
    return false;
  }
  if (slotDateKey > todayYmd) {
    return true;
  }
  const currentMinsPkt = getCurrentMinutesInPkt();
  const minEligibleMins = currentMinsPkt + minBufferMinutes;
  const slotMins = getSlotMinutesFromMidnightInPkt(slot);

  if (slotMins === 9999) return false;
  return slotMins >= minEligibleMins;
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
