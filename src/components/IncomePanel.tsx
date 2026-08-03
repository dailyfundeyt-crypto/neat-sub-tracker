import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  INCOME_CATEGORIES,
  euro,
  formatDate,
  monthlyIncome,
  type Income,
} from "@/lib/hyperlite";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const empty = {
  name: "",
  category: "Freelance",
  amount: "",
  interval: "monthly" as Income["interval"],
  next_payout: "",
  note: "",
};

export function IncomePanel({ userId }: { userId: string }) {
  const [items, setItems] = useState<Income[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("incomes")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as Income[]) ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  const monthly = useMemo(
    () => items.reduce((sum, i) => sum + monthlyIncome(i), 0),
    [items],
  );

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(inc: Income) {
    setEditing(inc);
    setForm({
      name: inc.name,
      category: inc.category,
      amount: String(inc.amount),
      interval: inc.interval,
      next_payout: inc.next_payout ?? "",
      note: inc.note ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Name fehlt.");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      category: form.category,
      amount: Number(form.amount.replace(",", ".")) || 0,
      interval: form.interval,
      next_payout: form.next_payout || null,
      note: form.note.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("incomes").update(payload).eq("id", editing.id)
      : await supabase.from("incomes").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Speichern fehlgeschlagen.");
      return;
    }
    setOpen(false);
    void load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("incomes").delete().eq("id", id);
    if (error) {
      toast.error("Löschen fehlgeschlagen.");
      return;
    }
    setOpen(false);
    void load();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-2 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl font-bold tracking-tight">
            Einkommen
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {euro.format(monthly)} pro Monat aus Side Hustles.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          aria-label="Einnahme hinzufügen"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
        >
          <Plus className="h-5 w-5 text-foreground" strokeWidth={2.5} />
        </button>
      </div>

      {items.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted-foreground">
          Noch keine Einnahmen. Trag deinen ersten Side Hustle ein.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => openEdit(i)}
                className="w-full rounded-2xl border border-border p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{i.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.category}
                      {i.next_payout
                        ? ` · nächste Zahlung ${formatDate(i.next_payout)}`
                        : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-sm tabular-nums">
                    {euro.format(i.amount)}
                    <span className="block text-[11px] text-muted-foreground">
                      {i.interval === "yearly"
                        ? "pro Jahr"
                        : i.interval === "once"
                          ? "einmalig"
                          : "pro Monat"}
                    </span>
                  </p>
                </div>
                {i.note && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {i.note}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {editing ? "Einnahme bearbeiten" : "Einnahme hinzufügen"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inc-name">Quelle</Label>
              <Input
                id="inc-name"
                placeholder="z. B. Webdesign für Kunden"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategorie</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Intervall</Label>
                <Select
                  value={form.interval}
                  onValueChange={(v) =>
                    setForm({ ...form, interval: v as Income["interval"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monatlich</SelectItem>
                    <SelectItem value="yearly">Jährlich</SelectItem>
                    <SelectItem value="once">Einmalig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="inc-amount">Betrag (€)</Label>
                <Input
                  id="inc-amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="inc-date">Nächste Zahlung</Label>
                <Input
                  id="inc-date"
                  type="date"
                  value={form.next_payout}
                  onChange={(e) =>
                    setForm({ ...form, next_payout: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="inc-note">Notiz</Label>
              <Textarea
                id="inc-note"
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void remove(editing.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Löschen
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Speichern …" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
