export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

export function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function isFuture(iso: string): boolean {
  return iso > todayISO();
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function firstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function formatLongDate(iso: string): string {
  const d = fromISODate(iso);
  const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d.getDay()];
  return `${weekday}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function buildMonthGrid(year: number, month: number): (string | null)[] {
  const first = firstWeekday(year, month);
  const days = daysInMonth(year, month);
  const cells: (string | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) {
    cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
