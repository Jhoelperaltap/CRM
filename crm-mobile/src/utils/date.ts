import {
  format,
  formatDistanceToNow,
  parseISO,
  isToday,
  isTomorrow,
  isYesterday,
  isThisWeek,
  isThisYear,
  differenceInMinutes,
} from 'date-fns';

/**
 * Parse an ISO date string to Date object
 */
export function parseDate(dateString: string): Date {
  return parseISO(dateString);
}

/**
 * Format a date for display
 * Examples: "Jan 15, 2024", "Today", "Yesterday"
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isThisYear(d)) return format(d, 'MMM d');
  return format(d, 'MMM d, yyyy');
}

/**
 * Format a date with time
 * Example: "Jan 15, 2024 at 2:30 PM"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Format just the time
 * Example: "2:30 PM"
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'h:mm a');
}

/**
 * Format a relative time
 * Examples: "5 minutes ago", "2 hours ago", "3 days ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format a smart relative time (shows time if recent, date if older)
 */
export function formatSmartTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const minutes = differenceInMinutes(new Date(), d);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return format(d, 'EEEE');
  if (isThisYear(d)) return format(d, 'MMM d');
  return format(d, 'MMM d, yyyy');
}

/**
 * Format an appointment time range
 * Example: "2:30 PM - 3:30 PM"
 */
export function formatTimeRange(start: Date | string | null | undefined, end: Date | string | null | undefined): string {
  if (!start || !end) return '';
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  return `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
}

/**
 * Format a due date with urgency indication
 */
export function formatDueDate(date: Date | string): { text: string; isUrgent: boolean; isPast: boolean } {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const isPast = d < now;
  const daysUntil = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let text: string;
  let isUrgent = false;

  if (isPast) {
    text = `Overdue (${formatDate(d)})`;
    isUrgent = true;
  } else if (isToday(d)) {
    text = 'Due Today';
    isUrgent = true;
  } else if (isTomorrow(d)) {
    text = 'Due Tomorrow';
    isUrgent = true;
  } else if (daysUntil <= 7) {
    text = `Due ${format(d, 'EEEE')}`;
    isUrgent = daysUntil <= 3;
  } else {
    text = `Due ${formatDate(d)}`;
  }

  return { text, isUrgent, isPast };
}
