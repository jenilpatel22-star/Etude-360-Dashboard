export const DAY_MS = 86_400_000;

/** Parse YYYY-MM-DD (or full ISO) as a local date. */
export function parseDate(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

export function today(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const diffDays = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS);
export const sameDay = (a: Date, b: Date) => diffDays(a, b) === 0;

export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(startOfDay(d), -day);
}
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', opts);
const dShort = fmt({ day: 'numeric', month: 'short' });
const dLong = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const dWeekday = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
const tShort = fmt({ hour: '2-digit', minute: '2-digit', hour12: false });
const mYear = fmt({ month: 'long', year: 'numeric' });

export const formatDate = (s: string | Date) => dLong.format(typeof s === 'string' ? parseDate(s) : s);
export const formatShort = (s: string | Date) => dShort.format(typeof s === 'string' ? parseDate(s) : s);
export const formatWeekday = (s: string | Date) => dWeekday.format(typeof s === 'string' ? parseDate(s) : s);
export const formatTime = (s: string) => tShort.format(parseDate(s));
export const formatMonthYear = (d: Date) => mYear.format(d);

export function formatRange(start: string, end: string): string {
  const a = parseDate(start);
  const b = parseDate(end);
  if (sameDay(a, b)) return formatDate(a);
  if (a.getFullYear() === b.getFullYear()) return `${formatShort(a)} – ${formatDate(b)}`;
  return `${formatDate(a)} – ${formatDate(b)}`;
}

export function quarterOf(s: string): string {
  const d = parseDate(s);
  return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
}

/** Relative description, e.g. "in 5 days", "3 days ago", "today". */
export function relativeDays(s: string): string {
  const n = diffDays(parseDate(s), today());
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
