import { DoctorData } from '../types';

/**
 * Format currency values cleanly without awkward trailing decimals.
 * e.g. 1200.0 -> "Rs. 1,200"
 */
export function formatCurrency(val: any, prefix = 'Rs.\u00A0'): string {
  if (val === null || val === undefined || val === '') return `${prefix}1,000`;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  if (isNaN(n)) return `${prefix}1,000`;
  return `${prefix}${Math.round(n).toLocaleString('en-US')}`;
}

/**
 * Parses sequence queue number from digital slip or token number.
 * Format: DIK-[SPECIALTY]-[YYYYMMDD]-[SEQ_NUM:03d]-[JITTER] (e.g. DIK-CARD-20261010-002-95 -> "02")
 */
export function parseQueueNumberFromSlip(slipNumber?: string, tokenNumber?: any): string {
  if (tokenNumber !== undefined && tokenNumber !== null && !isNaN(Number(tokenNumber)) && Number(tokenNumber) > 0 && Number(tokenNumber) <= 999) {
    return String(tokenNumber).padStart(2, '0');
  }
  if (!slipNumber || typeof slipNumber !== 'string') return '';
  const parts = slipNumber.trim().split('-');
  if (parts.length >= 5 && /^\d{1,3}$/.test(parts[3])) {
    const num = parseInt(parts[3], 10);
    if (!isNaN(num) && num > 0 && num <= 999) {
      return String(num).padStart(2, '0');
    }
  }
  if (parts.length === 4 && /^\d{1,3}$/.test(parts[3])) {
    const num = parseInt(parts[3], 10);
    if (!isNaN(num) && num > 0 && num <= 999) {
      return String(num).padStart(2, '0');
    }
  }
  return '';
}

/**
 * Formats slot date and time across assistant & doctor portals.
 */
export function formatSlotDateTime(dateVal?: string, slipNumber?: string, createdAt?: string): { date: string; time: string } {
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

/**
 * Converts 24-hour time string ("14:30") to 12-hour components { hour: '02', minute: '30', period: 'PM' }
 */
export function parse24to12(timeStr: string = '09:00') {
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

/**
 * Converts 12-hour components to standard 24-hour time string ("09:00", "17:30")
 */
export function format12to24(hour: string, minute: string, period: string): string {
  let h = parseInt(hour, 10);
  if (isNaN(h)) h = 9;
  if (period === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, '0')}:${(minute || '00').padStart(2, '0')}`;
}

/**
 * Converts minutes from midnight (0..1439) into 12-hour formatted string ("05:00 PM")
 */
export function formatMinutesTo12h(mins: number): string {
  let normalized = mins % 1440;
  if (normalized < 0) normalized += 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Formats doctor name with proper casing and "Dr." prefix
 */
export function formatDoctorName(name?: string): string {
  if (!name) return 'Doctor';
  const clean = name.trim();
  const titled = clean.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  if (/^dr\.?\s+/i.test(titled)) {
    return titled;
  }
  return `Dr. ${titled}`;
}

/**
 * Helper to transform any Cloudinary URL for blazing fast CDN delivery (<50ms)
 */
export function optimizeCloudinaryUrl(url?: string | null, width: number = 400): string {
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

/**
 * Resolves doctor profile image with reliable matching for D.I. Khan specialists
 */
export function getDoctorProfileImage(
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

