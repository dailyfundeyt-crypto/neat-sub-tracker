import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, nameKey, type Deal } from "@/lib/hyperlite";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink } from "lucide-react";
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

const emptyDeal = {
  service_name: "",
  title: "",
  description: "",
  code: "",
  url: "",
  valid_until: "",
};

export function DealsPanel({ userId }: { userId: string }) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyDeal);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });
    setDeals((data as Deal[]) ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!form.service_name.trim() || !form.title.trim()) {
      toast.error("Dienst und Titel sind nötig.");
      return;
    }
    setSaving(true);
    const { data: logoRow } = await supabase
      .from("service_logos")
      .select("logo_url")
      .eq("name_key", nameKey(form.service_name))
      .maybeSingle();

    const { error } = await supabase.from("deals").insert({
      created_by: userId,
      service_name: form.service_name.trim(),
      logo_url: logoRow?.logo_url ?? null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      code: form.code.trim() || null,
      url: form.url.trim() || null,
      valid_until: form.valid_until || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Speichern fehlgeschlagen.");
      return;
    }
    setForm(emptyDeal);
    setOpen(false);
    void load();
    toast.success("Deal geteilt.");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) {
      toast.error("Löschen fehlgeschlagen.");
      return;
    }
    void load();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-2 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl font-bold tracking-tight">
            Rabatte
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Von Nutzern geteilte Codes und Angebote.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Deal teilen"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
        >
          <Plus className="h-5 w-5 text-foreground" strokeWidth={2.5} />
        </button>
      </div>

      {deals.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted-foreground">
          Noch keine Deals. Teile den ersten mit der Community.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {deals.map((d) => (
            <li
              key={d.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border p-3"
            >
              {d.logo_url ? (
                <img
                  src={d.logo_url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full border border-border object-contain p-0.5"
                />
              ) : (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-[11px] font-semibold text-muted-foreground">
                  {d.service_name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {d.service_name} · {d.title}
                </p>
                {d.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {d.description}
                  </p>
                )}
                <p className="truncate text-xs text-muted-foreground">
                  {d.code ? `Code ${d.code}` : "Ohne Code"}
                  {d.valid_until ? ` · bis ${formatDate(d.valid_until)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label="Angebot öffnen"
                    className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-muted"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {d.created_by === userId && (
                  <button
                    type="button"
                    onClick={() => remove(d.id)}
                    aria-label="Deal löschen"
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Deal teilen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deal-service">Dienst</Label>
              <Input
                id="deal-service"
                placeholder="z. B. Adobe"
                value={form.service_name}
                onChange={(e) =>
                  setForm({ ...form, service_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="deal-title">Angebot</Label>
              <Input
                id="deal-title"
                placeholder="z. B. 40 % im ersten Jahr"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="deal-description">Beschreibung</Label>
              <Textarea
                id="deal-description"
                rows={3}
                placeholder="Wie funktioniert der Deal? Bedingungen, Hinweise …"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="deal-code">Code</Label>
                <Input
                  id="deal-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="deal-until">Gültig bis</Label>
                <Input
                  id="deal-until"
                  type="date"
                  value={form.valid_until}
                  onChange={(e) =>
                    setForm({ ...form, valid_until: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="deal-url">Link</Label>
              <Input
                id="deal-url"
                placeholder="https://…"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Speichern …" : "Teilen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
