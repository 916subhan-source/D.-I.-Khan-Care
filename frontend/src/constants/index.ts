export interface WeekDayOption {
  id: string;
  label: string;
  full?: string;
}

export const RESCHEDULE_MIN_TRAVEL_BUFFER_MINUTES = 45;

export const WEEKDAY_OPTIONS: WeekDayOption[] = [
  { id: 'monday', label: 'Mon', full: 'Monday' },
  { id: 'tuesday', label: 'Tue', full: 'Tuesday' },
  { id: 'wednesday', label: 'Wed', full: 'Wednesday' },
  { id: 'thursday', label: 'Thu', full: 'Thursday' },
  { id: 'friday', label: 'Fri', full: 'Friday' },
  { id: 'saturday', label: 'Sat', full: 'Saturday' },
  { id: 'sunday', label: 'Sun', full: 'Sunday' },
];

export const SHIFT_OPTIONS = [
  { id: 'MORNING', label: 'Morning Shift' },
  { id: 'EVENING', label: 'Evening Shift' },
  { id: 'BOTH', label: 'Both Shifts' }
];

export const SLOT_INTERVALS = [5, 10, 15, 20, 30];
