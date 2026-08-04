import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  REPEAT_LABELS,
  WEEKDAYS,
  addDays,
  eventsForDay,
  formatDayLabel,
  formatTimeRange,
  formatWeekRange,
  isSameDay,
  startOfWeek,
  toISODate,
  type CalendarEvent,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import {
  EventDialog,
  emptyEventForm,
  eventToForm,
  type EventForm,
} from "@/components/EventDialog";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const HOUR_HEIGHT = 72;
const DAY_MINUTES = 24 * 60;
const MIN_EVENT_HEIGHT = 38;

function padTime(value: number): string {
  return String(value).padStart(2, "0");
}

function formatClock(minutes: number): string {
  const safeMinutes = Math.min(Math.max(minutes, 0), DAY_MINUTES - 1);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${padTime(hours)}:${padTime(mins)}`;
}

function formatHour(hour: number): string {
  return `${padTime(hour)}:00`;
}

function timeToMinutes(value: string | null): number | null {
  if (!value) return null;
  const [hoursRaw, minutesRaw = "0"] = value.slice(0, 5).split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return Math.min(Math.max(hours * 60 + minutes, 0), DAY_MINUTES - 1);
}

type TimedEventBlock = {
  event: CalendarEvent;
  start: number;
  end: number;
  lane: number;
  laneCount: number;
};

function eventTimeBounds(event: CalendarEvent): { start: number; end: number } {
  const start = timeToMinutes(event.start_time) ?? 9 * 60;
  const parsedEnd = timeToMinutes(event.end_time);
  const end = parsedEnd && parsedEnd > start ? parsedEnd : start + 60;
  return { start, end: Math.min(Math.max(end, start + 15), DAY_MINUTES) };
}

function positionTimedEvents(events: CalendarEvent[]): TimedEventBlock[] {
  const timed = events
    .filter((event) => !event.all_day && event.start_time)
    .map((event) => ({ event, ...eventTimeBounds(event) }))
    .sort((a, b) => a.start - b.start || a.end - b.end || a.event.title.localeCompare(b.event.title));

  const positioned: TimedEventBlock[] = [];
  let cluster: typeof timed = [];
  let clusterEnd = -1;

  function flushCluster() {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const placed: TimedEventBlock[] = [];

    for (const item of cluster) {
      const lane = laneEnds.findIndex((end) => end <= item.start);
      const nextLane = lane === -1 ? laneEnds.length : lane;
      laneEnds[nextLane] = item.end;
      placed.push({ ...item, lane: nextLane, laneCount: 1 });
    }

    const laneCount = Math.max(laneEnds.length, 1);
    positioned.push(...placed.map((item) => ({ ...item, laneCount })));
    cluster = [];
    clusterEnd = -1;
  }

  for (const item of timed) {
    if (cluster.length === 0 || item.start < clusterEnd) {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    } else {
      flushCluster();
      cluster.push(item);
      clusterEnd = item.end;
    }
  }

  flushCluster();
  return positioned;
}

export function CalendarPanel({ userId }: { userId: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventForm>(() => emptyEventForm(toISODate(new Date())));
  const [now, setNow] = useState(() => new Date());
  const timelineRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });
    setEvents((data as CalendarEvent[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const current = new Date();
    const minutes = current.getHours() * 60 + current.getMinutes();
    timeline.scrollTo({ top: Math.max(0, (minutes / 60) * HOUR_HEIGHT - 220) });
  }, [weekStart]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => ({
        date,
        events: eventsForDay(events, date),
      })),
    [events, weekStart],
  );

  const today = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const nowTop = (currentMinute / 60) * HOUR_HEIGHT;
  const timelineHeight = DAY_MINUTES / 60 * HOUR_HEIGHT;

  function openNew(date: Date) {
    setEditing(null);
    setForm(emptyEventForm(toISODate(date)));
    setOpen(true);
  }

  function openNewAt(date: Date, hour: number) {
    const startMinutes = hour * 60;
    const endMinutes = Math.min(startMinutes + 60, DAY_MINUTES - 1);
    setEditing(null);
    setForm({
      ...emptyEventForm(toISODate(date)),
      start_time: formatClock(startMinutes),
      end_time: formatClock(endMinutes),
    });
    setOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setForm(eventToForm(event));
    setOpen(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-none flex-col px-4 pb-32 pt-2 sm:px-6 md:h-[calc(100dvh-57px)] md:px-5 md:pb-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl font-bold tracking-tight md:text-3xl">Kalender</h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground md:text-sm">
            {formatWeekRange(weekStart)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Vorherige Woche"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border transition-colors hover:bg-muted md:h-10 md:w-10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="h-9 rounded-full border border-border px-3 text-xs font-semibold transition-colors hover:bg-muted md:h-10 md:px-4 md:text-sm"
          >
            Heute
          </button>
          <button
            type="button"
            aria-label="Nächste Woche"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border transition-colors hover:bg-muted md:h-10 md:w-10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Termin hinzufügen"
            onClick={() => openNew(new Date())}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-muted md:h-11 md:w-11"
          >
            <Plus className="h-5 w-5 text-foreground" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-2 md:hidden">
        {days.map(({ date, events: dayEvents }, index) => {
          const isToday = isSameDay(date, today);
          return (
            <section
              key={toISODate(date)}
              className={cn(
                "rounded-2xl border p-3 transition-colors",
                isToday ? "border-foreground" : "border-border",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    isToday ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {WEEKDAYS[index]} {formatDayLabel(date)}
                </h3>
                <button
                  type="button"
                  aria-label={`Termin am ${formatDayLabel(date)} hinzufügen`}
                  onClick={() => openNew(date)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {dayEvents.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground/70">—</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {dayEvents.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => openEdit(event)}
                        className="w-full rounded-xl border border-border px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
                      >
                        <p className="truncate text-sm font-medium">{event.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                          {event.repeat_rule !== "none" && (
                            <Repeat className="h-3 w-3 shrink-0" aria-hidden />
                          )}
                          <span className="truncate">
                            {formatTimeRange(event)}
                            {event.repeat_rule !== "none"
                              ? ` · ${REPEAT_LABELS[event.repeat_rule]}`
                              : ""}
                          </span>
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-5 hidden min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-background md:grid md:grid-rows-[auto_minmax(0,1fr)]">
        <div className="grid grid-cols-[4.75rem_repeat(7,minmax(0,1fr))] border-b border-border bg-muted/35">
          <div className="border-r border-border" />
          {days.map(({ date, events: dayEvents }, index) => {
            const isToday = isSameDay(date, today);
            const allDayEvents = dayEvents.filter((event) => event.all_day || !event.start_time);
            return (
              <div
                key={toISODate(date)}
                className={cn(
                  "min-w-0 border-r border-border/80 px-3 py-3 last:border-r-0",
                  isToday && "bg-background",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-[11px] font-bold uppercase tracking-wide",
                        isToday ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {WEEKDAYS[index]}
                    </p>
                    <p className={cn("mt-1 text-2xl font-bold", isToday && "text-red-600")}>
                      {formatDayLabel(date)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Termin am ${formatDayLabel(date)} hinzufügen`}
                    onClick={() => openNew(date)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {allDayEvents.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {allDayEvents.slice(0, 2).map((event) => (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => openEdit(event)}
                          className="w-full truncate rounded-lg border border-border bg-background px-2 py-1 text-left text-[11px] font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                        >
                          {event.title}
                        </button>
                      </li>
                    ))}
                    {allDayEvents.length > 2 && (
                      <li className="truncate px-2 text-[11px] text-muted-foreground">
                        +{allDayEvents.length - 2} weitere
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div ref={timelineRef} className="min-h-0 overflow-y-auto overflow-x-hidden">
          <div
            className="grid grid-cols-[4.75rem_repeat(7,minmax(0,1fr))]"
            style={{ height: timelineHeight }}
          >
            <div className="relative border-r border-border bg-muted/20">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-border/70 pr-2 text-right text-[11px] font-medium text-muted-foreground"
                  style={{ top: hour * HOUR_HEIGHT }}
                >
                  <span className="relative -top-2.5">{formatHour(hour)}</span>
                </div>
              ))}
            </div>

            {days.map(({ date, events: dayEvents }) => {
              const isToday = isSameDay(date, now);
              const timedEvents = positionTimedEvents(dayEvents);
              return (
                <div
                  key={toISODate(date)}
                  className={cn("relative border-r border-border/80 last:border-r-0", isToday && "bg-red-500/[0.025]")}
                  style={{ height: timelineHeight }}
                >
                  {HOURS.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      aria-label={`Termin am ${formatDayLabel(date)} um ${formatHour(hour)} hinzufügen`}
                      onDoubleClick={() => openNewAt(date, hour)}
                      className="absolute inset-x-0 border-t border-border/55 text-left outline-none transition-colors hover:bg-muted/35 focus-visible:z-30 focus-visible:ring-2 focus-visible:ring-ring"
                      style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    />
                  ))}

                  {isToday && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-30"
                      style={{ top: nowTop }}
                    >
                      <div className="relative h-0.5 bg-red-500 shadow-[0_0_12px_oklch(0.62_0.25_25_/_0.45)]">
                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
                          {formatClock(currentMinute)}
                        </span>
                        <span className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-red-500 shadow-sm" />
                      </div>
                    </div>
                  )}

                  {timedEvents.map(({ event, start, end, lane, laneCount }) => {
                    const top = (start / 60) * HOUR_HEIGHT;
                    const height = Math.max(MIN_EVENT_HEIGHT, ((end - start) / 60) * HOUR_HEIGHT - 4);
                    const width = 100 / laneCount;
                    const left = lane * width;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => openEdit(event)}
                        className="absolute z-20 overflow-hidden rounded-xl border border-foreground/12 bg-foreground px-3 py-2 text-left text-background shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
                        style={{
                          top,
                          height,
                          left: `calc(${left}% + 0.25rem)`,
                          width: `calc(${width}% - 0.5rem)`,
                        }}
                      >
                        <p className="truncate text-xs font-bold leading-tight">{event.title}</p>
                        <p className="mt-1 flex items-center gap-1 truncate text-[11px] leading-tight text-background/75">
                          {event.repeat_rule !== "none" && (
                            <Repeat className="h-3 w-3 shrink-0" aria-hidden />
                          )}
                          <span className="truncate">
                            {formatTimeRange(event)}
                            {event.repeat_rule !== "none"
                              ? ` · ${REPEAT_LABELS[event.repeat_rule]}`
                              : ""}
                          </span>
                        </p>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <EventDialog
        open={open}
        onOpenChange={setOpen}
        userId={userId}
        editing={editing}
        form={form}
        setForm={setForm}
        onSaved={load}
      />
    </div>
  );
}
