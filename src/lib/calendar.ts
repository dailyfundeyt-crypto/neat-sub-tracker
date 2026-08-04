export type RepeatRule = "none" | "daily" | "weekly" | "biweekly" | "monthly";

export type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  repeat_rule: RepeatRule;
  repeat_until: string | null;
  created_at: string;
};

export const REPEAT_LABELS: Record<RepeatRule, string> = {
  none: "Einmalig",
  daily: "Täglich",
  weekly: "Wöchentlich",
  biweekly: "Alle 2 Wochen",
  monthly: "Monatlich",
};

export const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** ISO-Datum (YYYY-MM-DD) ohne Zeitzonen-Verschiebung. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Montag der Woche, in der `date` liegt. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7;
  return addDays(d, -shift);
}

export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatDayLabel(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.`;
}

export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const fmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" });
  return `${fmt.format(weekStart)} – ${fmt.format(end)} ${end.getFullYear()}`;
}

export function formatTimeRange(event: CalendarEvent): string {
  if (event.all_day || !event.start_time) return "Ganztägig";
  const start = event.start_time.slice(0, 5);
  return event.end_time ? `${start} – ${event.end_time.slice(0, 5)}` : start;
}

/** Fällt ein (ggf. wiederkehrender) Termin auf diesen Tag? */
export function occursOn(event: CalendarEvent, day: Date): boolean {
  const start = parseISODate(event.event_date);
  const target = new Date(day);
  target.setHours(0, 0, 0, 0);
  if (target < start) return false;
  if (event.repeat_rule === "none") return target.getTime() === start.getTime();
  if (event.repeat_until && target > parseISODate(event.repeat_until)) return false;

  const dayDiff = Math.round((target.getTime() - start.getTime()) / 86400000);
  switch (event.repeat_rule) {
    case "daily":
      return true;
    case "weekly":
      return dayDiff % 7 === 0;
    case "biweekly":
      return dayDiff % 14 === 0;
    case "monthly":
      return target.getDate() === start.getDate();
    default:
      return false;
  }
}

/** Termine eines Tages, sortiert nach Startzeit (ganztägig zuerst). */
export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter((event) => occursOn(event, day))
    .sort((a, b) => {
      const aTime = a.all_day || !a.start_time ? "" : a.start_time;
      const bTime = b.all_day || !b.start_time ? "" : b.start_time;
      return aTime.localeCompare(bTime);
    });
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}
