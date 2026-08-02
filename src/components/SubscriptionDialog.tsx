import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES,
  fileToLogoDataUrl,
  nameKey,
  type BillingInterval,
  type Subscription,
} from "@/lib/hyperlite";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePlus, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  editing: Subscription | null;
  onSaved: () => void;
};

const empty = {
  name: "",
  category: "Software",
  price: "",
  billing_interval: "monthly" as BillingInterval,
  next_payment: "",
  cancel_by: "",
  credit: "",
};

export function SubscriptionDialog({
  open,
  onOpenChange,
  userId,
  editing,
  onSaved,
}: Props) {
  const [form, setForm] = useState(empty);
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        category: editing.category,
        price: String(editing.price ?? ""),
        billing_interval: editing.billing_interval,
        next_payment: editing.next_payment ?? "",
        cancel_by: editing.cancel_by ?? "",
        credit: editing.credit ? String(editing.credit) : "",
      });
      setLogo(editing.logo_url);
    } else {
      setForm(empty);
      setLogo(null);
    }
  }, [open, editing]);

  // Logo aus der geteilten Bibliothek vorschlagen, sobald ein Name getippt wird.
  useEffect(() => {
    if (!open || editing || logo) return;
    const key = nameKey(form.name);
    if (key.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("service_logos")
        .select("logo_url")
        .eq("name_key", key)
        .maybeSingle();
      if (!cancelled && data?.logo_url) setLogo(data.logo_url);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.name, open, editing, logo]);

  async function pickLogo(file: File) {
    try {
      setLogo(await fileToLogoDataUrl(file));
    } catch {
      toast.error("Logo konnte nicht verarbeitet werden.");
    }
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Bitte einen Namen eingeben.");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      logo_url: logo,
      category: form.category,
      price: Number(form.price.replace(",", ".")) || 0,
      billing_interval: form.billing_interval,
      next_payment: form.next_payment || null,
      cancel_by: form.cancel_by || null,
      credit: Number(form.credit.replace(",", ".")) || 0,
    };

    const { error } = editing
      ? await supabase.from("subscriptions").update(payload).eq("id", editing.id)
      : await supabase.from("subscriptions").insert(payload);

    if (error) {
      setSaving(false);
      toast.error("Speichern fehlgeschlagen.");
      return;
    }

    // Logo einmalig in die geteilte Bibliothek legen, damit andere es nutzen können.
    if (logo) {
      await supabase
        .from("service_logos")
        .upsert(
          {
            name: payload.name,
            name_key: nameKey(payload.name),
            logo_url: logo,
            created_by: userId,
          },
          { onConflict: "name_key", ignoreDuplicates: true },
        );
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
    toast.success(editing ? "Abo aktualisiert." : "Abo hinzugefügt.");
  }

  async function remove() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast.error("Löschen fehlgeschlagen.");
      return;
    }
    onOpenChange(false);
    onSaved();
    toast.success("Abo gelöscht.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {editing ? "Abo bearbeiten" : "Neues Abo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="grid h-14 w-14 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40">
              {logo ? (
                <img src={logo} alt="" className="h-full w-full object-contain p-1.5" />
              ) : (
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void pickLogo(file);
                }}
              />
            </label>
            <div className="min-w-0 flex-1">
              <Label htmlFor="sub-name">Dienst</Label>
              <Input
                id="sub-name"
                placeholder="z. B. Adobe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

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
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sub-price">Preis (€)</Label>
              <Input
                id="sub-price"
                inputMode="decimal"
                placeholder="9,99"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Intervall</Label>
              <Select
                value={form.billing_interval}
                onValueChange={(v) =>
                  setForm({ ...form, billing_interval: v as BillingInterval })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">pro Monat</SelectItem>
                  <SelectItem value="yearly">pro Jahr</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sub-next">Nächste Zahlung</Label>
              <Input
                id="sub-next"
                type="date"
                value={form.next_payment}
                onChange={(e) =>
                  setForm({ ...form, next_payment: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="sub-cancel">Kündigen bis</Label>
              <Input
                id="sub-cancel"
                type="date"
                value={form.cancel_by}
                onChange={(e) => setForm({ ...form, cancel_by: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sub-credit">Restguthaben (€)</Label>
            <Input
              id="sub-credit"
              inputMode="decimal"
              placeholder="0,00"
              value={form.credit}
              onChange={(e) => setForm({ ...form, credit: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Optional – zeigt, wie viele Folgemonate noch gedeckt sind.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {editing ? (
            <Button
              type="button"
              variant="ghost"
              onClick={remove}
              disabled={saving}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
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
  );
}
