import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  REPEAT_LABELS,
  type CalendarEvent,
  type RepeatRule,
} from "@/lib/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EventForm = {
  title: string;
  event_date: string;
  all_day: boolean;
  start_time: string;
  end_time: string;
  repeat_rule: RepeatRule;
  repeat_until: string;
  note: string;
};

export function emptyEventForm(date: string): EventForm {
  return {
    title: "",
    event_date: date,
    all_day: false,
    start_time: "09:00",
    end_time: "10:00",
    repeat_rule: "none",
    repeat_until: "",
    note: "",
  };
}

export function eventToForm(event: CalendarEvent): EventForm {
  return {
    title: event.title,
    event_date: event.event_date,
    all_day: event.all_day,
    start_time: event.start_time?.slice(0, 5) ?? "09:00",
    end_time: event.end_time?.slice(0, 5) ?? "",
    repeat_rule: event.repeat_rule,
    repeat_until: event.repeat_until ?? "",
    note: event.note ?? "",
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  editing: CalendarEvent | null;
  form: EventForm;
  setForm: (form: EventForm) => void;
  onSaved: () => void;
};

export function EventDialog({
  open,
  onOpenChange,
  userId,
  editing,
  form,
  setForm,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setSaving(false);
  }, [open]);

  function patch(next: Partial<EventForm>) {
    setForm({ ...form, ...next });
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error("Titel fehlt.");
      return;
    }
    if (!form.event_date) {
      toast.error("Datum fehlt.");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      title: form.title.trim(),
      event_date: form.event_date,
      all_day: form.all_day,
      start_time: form.all_day ? null : form.start_time || null,
      end_time: form.all_day ? null : form.end_time || null,
      repeat_rule: form.repeat_rule,
      repeat_until: form.repeat_rule === "none" ? null : form.repeat_until || null,
      note: form.note.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("events").update(payload).eq("id", editing.id)
      : await supabase.from("events").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Speichern fehlgeschlagen.");
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  async function remove() {
    if (!editing) return;
    const { error } = await supabase.from("events").delete().eq("id", editing.id);
    if (error) {
      toast.error("Löschen fehlgeschlagen.");
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Termin bearbeiten" : "Neuer Termin"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Titel</Label>
            <Input
              id="event-title"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="z. B. Kundencall"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-date">Datum</Label>
            <Input
              id="event-date"
              type="date"
              value={form.event_date}
              onChange={(e) => patch({ event_date: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
            <Label htmlFor="event-allday" className="cursor-pointer">
              Ganztägig
            </Label>
            <Switch
              id="event-allday"
              checked={form.all_day}
              onCheckedChange={(checked) => patch({ all_day: checked })}
            />
          </div>

          {!form.all_day && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="event-start">Von</Label>
                <Input
                  id="event-start"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => patch({ start_time: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-end">Bis</Label>
                <Input
                  id="event-end"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => patch({ end_time: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Wiederholung</Label>
            <Select
              value={form.repeat_rule}
              onValueChange={(value) => patch({ repeat_rule: value as RepeatRule })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPEAT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.repeat_rule !== "none" && (
            <div className="space-y-1.5">
              <Label htmlFor="event-until">Wiederholen bis (optional)</Label>
              <Input
                id="event-until"
                type="date"
                value={form.repeat_until}
                onChange={(e) => patch({ repeat_until: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="event-note">Notiz</Label>
            <Textarea
              id="event-note"
              rows={3}
              value={form.note}
              onChange={(e) => patch({ note: e.target.value })}
              placeholder="Optional"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {editing ? (
            <Button type="button" variant="ghost" onClick={() => void remove()}>
              Löschen
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Speichern…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
