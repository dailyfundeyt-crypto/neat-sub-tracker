import { useEffect, useMemo, useState } from "react";
import { Calculator, Download, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ACTIVE_SESSION_KEY = "connect-hourly-rate-session";
const REPORT_ARCHIVE_KEY = "connect-hourly-rate-reports";
const MAX_ARCHIVED_REPORTS = 120;

const moneyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

type RateSession = {
  title: string;
  client: string;
  orderValue: number;
  minHourlyRate: number;
  startedAt: number;
  warnedAt: number | null;
};

type SessionMetrics = {
  elapsedMs: number;
  allowedMs: number;
  overrunMs: number;
  effectiveHourlyRate: number;
  progress: number;
};

type TrackerForm = {
  title: string;
  client: string;
  orderValue: string;
  minHourlyRate: string;
};

type ReportForm = {
  client: string;
  reason: string;
};

type StoredReport = {
  id: string;
  title: string;
  client: string;
  createdAt: string;
  startedAt: string;
  endedAt: string;
  orderValue: number;
  minHourlyRate: number;
  allowedMinutes: number;
  elapsedMinutes: number;
  overrunMinutes: number;
  effectiveHourlyRate: number;
  fileName: string;
  markdown: string;
};

function emptyForm(): TrackerForm {
  return {
    title: "",
    client: "",
    orderValue: "",
    minHourlyRate: "",
  };
}

function parseEuro(value: string): number {
  const compact = value.trim().replace(/\s/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

async function primeNotifications() {
  if (!notificationsSupported() || Notification.permission !== "default") return;

  try {
    await Notification.requestPermission();
  } catch {
    // Some embedded browsers expose Notification but still reject permission prompts.
  }
}

function readStoredSession(): RateSession | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!isRateSession(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isRateSession(value: unknown): value is RateSession {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.title === "string" &&
    typeof item.client === "string" &&
    typeof item.orderValue === "number" &&
    typeof item.minHourlyRate === "number" &&
    typeof item.startedAt === "number" &&
    (typeof item.warnedAt === "number" || item.warnedAt === null)
  );
}

function persistSession(session: RateSession | null) {
  if (typeof window === "undefined") return;

  try {
    if (session) {
      window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch {
    // The timer keeps working in memory if localStorage is unavailable.
  }
}

function calculateMetrics(session: RateSession, nowMs: number): SessionMetrics {
  const elapsedMs = Math.max(0, nowMs - session.startedAt);
  const allowedMs = Math.max(1, (session.orderValue / session.minHourlyRate) * 60 * 60 * 1000);
  const elapsedHours = Math.max(elapsedMs / 60 / 60 / 1000, 1 / 3600);
  const effectiveHourlyRate = session.orderValue / elapsedHours;
  const overrunMs = Math.max(0, elapsedMs - allowedMs);
  const progress = Math.min((elapsedMs / allowedMs) * 100, 100);

  return {
    elapsedMs,
    allowedMs,
    overrunMs,
    effectiveHourlyRate,
    progress,
  };
}

function formatRunningTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} Min`;
  if (minutes === 0) return `${hours} Std`;
  return `${hours} Std ${minutes} Min`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMinutes(ms: number): number {
  return Math.max(0, Math.round(ms / 60000));
}

function fileStamp(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}_${h}-${min}`;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "auftrag";
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function createMarkdownReport(
  session: RateSession,
  metrics: SessionMetrics,
  report: ReportForm,
  endedAt: Date,
): string {
  const startedAt = new Date(session.startedAt);
  const allowedMinutes = roundMinutes(metrics.allowedMs);
  const elapsedMinutes = roundMinutes(metrics.elapsedMs);
  const overrunMinutes = roundMinutes(metrics.overrunMs);
  const effectiveHourlyRate = roundMoney(metrics.effectiveHourlyRate);

  return `---
title: ${yamlString(session.title)}
date: ${yamlString(endedAt.toISOString())}
auftraggeber: ${yamlString(report.client.trim())}
auftragswert_eur: ${roundMoney(session.orderValue)}
mindest_stundenlohn_eur: ${roundMoney(session.minHourlyRate)}
erlaubte_zeit_minuten: ${allowedMinutes}
tatsaechliche_zeit_minuten: ${elapsedMinutes}
ueberschreitung_minuten: ${overrunMinutes}
effektiver_stundenlohn_eur: ${effectiveHourlyRate}
---

# ${session.title}

- Datum: ${formatDateTime(endedAt)}
- Auftraggeber: ${report.client.trim()}
- Start: ${formatDateTime(startedAt)}
- Ende: ${formatDateTime(endedAt)}
- Auftragswert: ${moneyFormatter.format(session.orderValue)}
- Mindest-Stundenlohn: ${moneyFormatter.format(session.minHourlyRate)} / h
- Erlaubte Zeit: ${formatDuration(metrics.allowedMs)}
- Tatsächliche Zeit: ${formatDuration(metrics.elapsedMs)}
- Überschreitung: ${metrics.overrunMs > 0 ? formatDuration(metrics.overrunMs) : "Keine"}
- Effektiver Stundenlohn: ${moneyFormatter.format(effectiveHourlyRate)} / h

## Beschreibung

${report.reason.trim()}
`;
}

function downloadMarkdown(fileName: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function storeReport(record: StoredReport) {
  if (typeof window === "undefined") return;

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(REPORT_ARCHIVE_KEY) ?? "[]");
    const reports = Array.isArray(parsed) ? parsed : [];
    window.localStorage.setItem(
      REPORT_ARCHIVE_KEY,
      JSON.stringify([record, ...reports].slice(0, MAX_ARCHIVED_REPORTS)),
    );
  } catch {
    window.localStorage.setItem(REPORT_ARCHIVE_KEY, JSON.stringify([record]));
  }
}

export function HourlyRateTracker() {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [form, setForm] = useState<TrackerForm>(() => emptyForm());
  const [reportForm, setReportForm] = useState<ReportForm>({ client: "", reason: "" });
  const [session, setSession] = useState<RateSession | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const storedSession = readStoredSession();
    if (!storedSession) return;

    setSession(storedSession);
    setForm({
      title: storedSession.title,
      client: storedSession.client,
      orderValue: String(storedSession.orderValue),
      minHourlyRate: String(storedSession.minHourlyRate),
    });
  }, []);

  useEffect(() => {
    if (!session) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [session]);

  const metrics = useMemo(
    () => (session ? calculateMetrics(session, now) : null),
    [now, session],
  );
  const isOverLimit = Boolean(metrics && metrics.overrunMs > 0);
  const reportRequired = Boolean(session && isOverLimit);

  useEffect(() => {
    if (!session || !metrics || !isOverLimit || session.warnedAt) return;

    const warnedSession = { ...session, warnedAt: Date.now() };
    setSession(warnedSession);
    persistSession(warnedSession);
    setReportForm({ client: session.client, reason: "" });
    setReportOpen(true);

    toast.error("Stundenlohn-Limit überschritten", {
      description: `${session.title}: ${formatDuration(metrics.overrunMs)} über Ziel.`,
    });

    if (notificationsSupported() && Notification.permission === "granted") {
      const notification = new Notification("Connect: Stundenlohn-Limit überschritten", {
        body: `${session.title} liegt unter dem gewünschten Stundenlohn.`,
        icon: "/connect-logo.svg",
        badge: "/connect-logo.svg",
        tag: `connect-rate-${session.startedAt}`,
        renotify: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, [isOverLimit, metrics, session]);

  useEffect(() => {
    if (!session || !metrics || !isOverLimit || !session.warnedAt || reportOpen) return;

    setReportForm((current) => ({
      client: current.client || session.client,
      reason: current.reason,
    }));
    setReportOpen(true);
  }, [isOverLimit, metrics, reportOpen, session]);

  function patchForm(next: Partial<TrackerForm>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function patchReport(next: Partial<ReportForm>) {
    setReportForm((current) => ({ ...current, ...next }));
  }

  function startSession() {
    const title = form.title.trim();
    const client = form.client.trim();
    const orderValue = parseEuro(form.orderValue);
    const minHourlyRate = parseEuro(form.minHourlyRate);

    if (!title) {
      toast.error("Titel fehlt.");
      return;
    }

    if (orderValue <= 0) {
      toast.error("Auftragswert fehlt.");
      return;
    }

    if (minHourlyRate <= 0) {
      toast.error("Mindest-Stundenlohn fehlt.");
      return;
    }

    const nextSession: RateSession = {
      title,
      client,
      orderValue,
      minHourlyRate,
      startedAt: Date.now(),
      warnedAt: null,
    };

    setSession(nextSession);
    persistSession(nextSession);
    setNow(Date.now());
    setOpen(true);
    setReportForm({ client, reason: "" });
    void primeNotifications();
    toast.success("Stundenlohn-Timer läuft.");
  }

  function clearSession() {
    if (reportRequired) {
      setReportOpen(true);
      toast.error("Bitte zuerst die Auswertung speichern.");
      return;
    }

    setSession(null);
    persistSession(null);
    setForm(emptyForm());
    setReportForm({ client: "", reason: "" });
    toast("Stundenlohn-Timer beendet.");
  }

  function openReport() {
    if (!session) return;
    setReportForm((current) => ({
      client: current.client || session.client,
      reason: current.reason,
    }));
    setReportOpen(true);
  }

  function handleReportOpenChange(nextOpen: boolean) {
    if (!nextOpen && reportRequired) {
      toast.error("Bitte zuerst Auftraggeber und Beschreibung speichern.");
      return;
    }

    setReportOpen(nextOpen);
  }

  function saveReport() {
    if (!session) return;

    const client = reportForm.client.trim();
    const reason = reportForm.reason.trim();
    if (!client) {
      toast.error("Auftraggeber fehlt.");
      return;
    }

    if (!reason) {
      toast.error("Beschreibung fehlt.");
      return;
    }

    const endedAt = new Date();
    const finalMetrics = calculateMetrics(session, endedAt.getTime());
    const markdown = createMarkdownReport(
      session,
      finalMetrics,
      { client, reason },
      endedAt,
    );
    const fileName = `${slugify(session.title)}-${fileStamp(endedAt)}.md`;

    downloadMarkdown(fileName, markdown);
    storeReport({
      id: `${session.startedAt}-${endedAt.getTime()}`,
      title: session.title,
      client,
      createdAt: endedAt.toISOString(),
      startedAt: new Date(session.startedAt).toISOString(),
      endedAt: endedAt.toISOString(),
      orderValue: roundMoney(session.orderValue),
      minHourlyRate: roundMoney(session.minHourlyRate),
      allowedMinutes: roundMinutes(finalMetrics.allowedMs),
      elapsedMinutes: roundMinutes(finalMetrics.elapsedMs),
      overrunMinutes: roundMinutes(finalMetrics.overrunMs),
      effectiveHourlyRate: roundMoney(finalMetrics.effectiveHourlyRate),
      fileName,
      markdown,
    });

    setSession(null);
    persistSession(null);
    setForm(emptyForm());
    setReportForm({ client: "", reason: "" });
    setReportOpen(false);
    setOpen(false);
    toast.success("Markdown-Auswertung gespeichert.");
  }

  return (
    <>
      <button
        type="button"
        aria-label="Stundenlohn-Rechner"
        title="Stundenlohn-Rechner"
        onClick={() => setOpen(true)}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full border transition-colors md:h-10 md:w-10",
          session
            ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Calculator className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Stundenlohn</DialogTitle>
            <DialogDescription className="sr-only">
              Rechner für Auftragswert, Laufzeit und effektiven Stundenlohn.
            </DialogDescription>
          </DialogHeader>

          {session && metrics ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{session.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {session.client || "Auftraggeber offen"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-1 text-[11px] font-bold",
                      isOverLimit
                        ? "bg-red-500 text-white"
                        : "bg-foreground text-background",
                    )}
                  >
                    {isOverLimit ? "Limit" : "Läuft"}
                  </span>
                </div>

                <div className="mt-5 text-center">
                  <p className="font-mono text-4xl font-bold tabular-nums tracking-normal md:text-5xl">
                    {formatRunningTime(metrics.elapsedMs)}
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-sm font-semibold",
                      isOverLimit ? "text-red-600" : "text-muted-foreground",
                    )}
                  >
                    {moneyFormatter.format(roundMoney(metrics.effectiveHourlyRate))} / h
                  </p>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all",
                      isOverLimit ? "bg-red-500" : "bg-foreground",
                    )}
                    style={{ width: `${metrics.progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Wert
                  </p>
                  <p className="mt-1 text-sm font-bold">{moneyFormatter.format(session.orderValue)}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Ziel
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {moneyFormatter.format(session.minHourlyRate)} / h
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Erlaubt
                  </p>
                  <p className="mt-1 text-sm font-bold">{formatDuration(metrics.allowedMs)}</p>
                </div>
              </div>

              {isOverLimit && (
                <div className="rounded-xl border border-red-500/45 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-300">
                  {formatDuration(metrics.overrunMs)} über der erlaubten Zeit.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rate-title">Titel</Label>
                <Input
                  id="rate-title"
                  value={form.title}
                  onChange={(event) => patchForm({ title: event.target.value })}
                  placeholder="z. B. Landingpage-Fix"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rate-client">Auftraggeber</Label>
                <Input
                  id="rate-client"
                  value={form.client}
                  onChange={(event) => patchForm({ client: event.target.value })}
                  placeholder="Kunde / Unternehmen"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rate-value">Auftragswert</Label>
                  <Input
                    id="rate-value"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.orderValue}
                    onChange={(event) => patchForm({ orderValue: event.target.value })}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rate-minimum">Mindestlohn / h</Label>
                  <Input
                    id="rate-minimum"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.minHourlyRate}
                    onChange={(event) => patchForm({ minHourlyRate: event.target.value })}
                    placeholder="75"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {session ? (
              <>
                <Button type="button" variant="ghost" onClick={clearSession}>
                  <Square className="h-4 w-4" />
                  Beenden
                </Button>
                <Button type="button" onClick={openReport}>
                  <Download className="h-4 w-4" />
                  Auswertung speichern
                </Button>
              </>
            ) : (
              <Button type="button" className="w-full" onClick={startSession}>
                <Play className="h-4 w-4" />
                Starten
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={handleReportOpenChange}>
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-md"
          onEscapeKeyDown={(event) => {
            if (reportRequired) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (reportRequired) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{reportRequired ? "Zeitlimit überschritten" : "Auswertung"}</DialogTitle>
            <DialogDescription className="sr-only">
              Markdown-Auswertung mit Auftraggeber und Beschreibung speichern.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {session && metrics && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Laufzeit
                  </p>
                  <p className="mt-1 font-bold">{formatDuration(metrics.elapsedMs)}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Effektiv
                  </p>
                  <p className="mt-1 font-bold">
                    {numberFormatter.format(roundMoney(metrics.effectiveHourlyRate))} EUR / h
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="rate-report-client">Auftraggeber</Label>
              <Input
                id="rate-report-client"
                value={reportForm.client}
                onChange={(event) => patchReport({ client: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rate-report-reason">Beschreibung</Label>
              <Textarea
                id="rate-report-reason"
                rows={5}
                value={reportForm.reason}
                onChange={(event) => patchReport({ reason: event.target.value })}
                placeholder="Warum hat der Auftrag länger gedauert?"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" className="w-full" onClick={saveReport}>
              <Download className="h-4 w-4" />
              Als .md speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
