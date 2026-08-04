import { useCallback, useEffect, useMemo, useState } from "react";
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

export function CalendarPanel({ userId }: { userId: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventForm>(() => emptyEventForm(toISODate(new Date())));

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

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => ({
        date,
        events: eventsForDay(events, date),
      })),
    [events, weekStart],
  );

  const today = new Date();

  function openNew(date: Date) {
    setEditing(null);
    setForm(emptyEventForm(toISODate(date)));
    setOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setForm(eventToForm(event));
    setOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-2 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl font-bold tracking-tight">Kalender</h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {formatWeekRange(weekStart)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Vorherige Woche"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border transition-colors hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="h-9 rounded-full border border-border px-3 text-xs font-semibold transition-colors hover:bg-muted"
          >
            Heute
          </button>
          <button
            type="button"
            aria-label="Nächste Woche"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border transition-colors hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Termin hinzufügen"
            onClick={() => openNew(new Date())}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
          >
            <Plus className="h-5 w-5 text-foreground" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-2 md:grid-cols-7 md:gap-2">
        {days.map(({ date, events: dayEvents }, index) => {
          const isToday = isSameDay(date, today);
          return (
            <section
              key={toISODate(date)}
              className={cn(
                "rounded-2xl border p-3 transition-colors md:min-h-40",
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
