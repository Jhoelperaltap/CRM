export interface WorkingInterval {
  id: string;
  start_time: string;
  end_time: string;
  sort_order: number;
}

export interface WorkingDay {
  id: string;
  day_of_week: number;
  day_name: string;
  is_working: boolean;
  intervals: WorkingInterval[];
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface BusinessHoursListItem {
  id: string;
  name: string;
  timezone: string;
  is_default: boolean;
  is_active: boolean;
  working_day_count: number;
  holiday_count: number;
  created_at: string;
}

export interface BusinessHoursDetail {
  id: string;
  name: string;
  timezone: string;
  is_default: boolean;
  is_active: boolean;
  working_days: WorkingDay[];
  holidays: Holiday[];
  created_at: string;
  updated_at: string;
}

export const DAYS_OF_WEEK = [
  { value: 0, label: "MON", fullLabel: "Monday" },
  { value: 1, label: "TUE", fullLabel: "Tuesday" },
  { value: 2, label: "WED", fullLabel: "Wednesday" },
  { value: 3, label: "THU", fullLabel: "Thursday" },
  { value: 4, label: "FRI", fullLabel: "Friday" },
  { value: 5, label: "SAT", fullLabel: "Saturday" },
  { value: 6, label: "SUN", fullLabel: "Sunday" },
] as const;

export const TIMEZONES = [
  { value: "Pacific/Midway", label: "Pacific/Midway" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu" },
  { value: "America/Anchorage", label: "America/Anchorage" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST)" },
  { value: "America/Denver", label: "America/Denver (MST)" },
  { value: "America/Chicago", label: "America/Chicago (CST)" },
  { value: "America/New_York", label: "America/New York (EST)" },
  { value: "America/Sao_Paulo", label: "America/Sao Paulo" },
  { value: "Atlantic/Azores", label: "Atlantic/Azores" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
  { value: "Europe/Moscow", label: "Europe/Moscow" },
  { value: "Asia/Dubai", label: "Asia/Dubai" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland" },
] as const;

export const HOURS_12 = [
  "12", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"
] as const;

export const MINUTES = [
  "00", "15", "30", "45"
] as const;

export const PERIODS = ["AM", "PM"] as const;
