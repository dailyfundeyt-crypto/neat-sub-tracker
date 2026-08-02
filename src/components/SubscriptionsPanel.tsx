import { useMemo, useState } from "react";
import {
  daysUntil,
  euro,
  formatDate,
  creditMonths,
  relativeLabel,
  urgencyScore,
  type Subscription,
} from "@/lib/hyperlite";
import { cn } from "@/lib/utils";
import { Plus, CalendarClock, Scissors } from "lucide-react";
import { SubscriptionDialog } from "@/components/SubscriptionDialog";

function LogoCell({ sub }: { sub: Subscription }) {
  if (sub.logo_url) {
    return (
      <img
        src={sub.logo_url}
        alt={`${sub.name} Logo`}
        className="h-8 w-8 shrink-0 rounded-full border border-border object-contain p-0.5"
      />
    );
  }
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-[11px] font-semibold text-muted-foreground">
      {sub.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function DueLabel({ date }: { date: string | null }) {
  const days = daysUntil(date);
  const soon = days !== null && days >= 0 && days <= 3;
  if (!date) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className="tabular-nums">{formatDate(date)}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-medium",
          soon
            ? "bg-warning text-warning-foreground"
            : "text-muted-foreground",
        )}
      >
        {relativeLabel(days)}
      </span>
    </span>
  );
}

export function SubscriptionsPanel({
  subs,
  userId,
  onChanged,
}: {
  subs: Subscription[];
  userId: string;
  onChanged: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  const sorted = useMemo(
    () => [...subs].sort((a, b) => urgencyScore(a) - urgencyScore(b)),
    [subs],
  );

  const upcoming = useMemo(() => {
    const items: { key: string; icon: "pay" | "cancel"; text: string; days: number }[] =
      [];
    for (const s of subs) {
      const p = daysUntil(s.next_payment);
      if (p !== null && p >= 0 && p <= 7)
        items.push({
          key: `p-${s.id}`,
          icon: "pay",
          text: `${s.name} · ${euro.format(s.price)} ${relativeLabel(p)}`,
          days: p,
        });
      const c = daysUntil(s.cancel_by);
      if (c !== null && c >= 0 && c <= 14)
        items.push({
          key: `c-${s.id}`,
          icon: "cancel",
          text: `${s.name} kündigen ${relativeLabel(c)}`,
          days: c,
        });
    }
    return items.sort((a, b) => a.days - b.days);
  }, [subs]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(sub: Subscription) {
    setEditing(sub);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-2 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <h2 className="truncate font-display text-2xl font-bold tracking-tight">
          Meine Abos
        </h2>
        <button
          type="button"
          onClick={openNew}
          aria-label="Abo hinzufügen"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
        >
          <Plus className="h-5 w-5 text-foreground" strokeWidth={2.5} />
        </button>
      </div>

      {upcoming.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {upcoming.map((u) => (
            <span
              key={u.key}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs",
                u.days <= 3 && "border-transparent bg-warning text-warning-foreground",
              )}
            >
              {u.icon === "pay" ? (
                <CalendarClock className="h-3.5 w-3.5" />
              ) : (
                <Scissors className="h-3.5 w-3.5" />
              )}
              {u.text}
            </span>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Abos. Mit dem Plus oben legst du das erste an.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: Tabelle */}
          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-border md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Dienst</th>
                  <th className="px-4 py-3 font-medium">Kategorie</th>
                  <th className="px-4 py-3 font-medium">Preis</th>
                  <th className="px-4 py-3 font-medium">Nächste Zahlung</th>
                  <th className="px-4 py-3 font-medium">Kündigen bis</th>
                  <th className="px-4 py-3 font-medium">Guthaben</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => {
                  const months = creditMonths(s);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => openEdit(s)}
                      className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <span className="flex min-w-0 items-center gap-3">
                          <LogoCell sub={s} />
                          <span className="truncate font-medium">{s.name}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.category}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                        {euro.format(s.price)}
                        <span className="text-muted-foreground">
                          {s.billing_interval === "yearly" ? " / Jahr" : " / Monat"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <DueLabel date={s.next_payment} />
                      </td>
                      <td className="px-4 py-3">
                        <DueLabel date={s.cancel_by} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                        {s.credit > 0 ? (
                          <>
                            {euro.format(s.credit)}
                            {months !== null && (
                              <span className="text-muted-foreground">
                                {" "}
                                ≈ {months} Mon.
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobil: kompakte Zeilenkarten */}
          <ul className="mt-5 space-y-2 md:hidden">
            {sorted.map((s) => {
              const months = creditMonths(s);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="w-full rounded-2xl border border-border p-3 text-left transition-colors active:bg-muted"
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                      <LogoCell sub={s} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.category}
                        </p>
                      </div>
                      <p className="shrink-0 text-right text-sm tabular-nums">
                        {euro.format(s.price)}
                        <span className="block text-[11px] text-muted-foreground">
                          {s.billing_interval === "yearly" ? "pro Jahr" : "pro Monat"}
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Nächste Zahlung</span>
                        <DueLabel date={s.next_payment} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Kündigen bis</span>
                        <DueLabel date={s.cancel_by} />
                      </div>
                      {s.credit > 0 && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Guthaben</span>
                          <span className="tabular-nums">
                            {euro.format(s.credit)}
                            {months !== null && ` ≈ ${months} Mon.`}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <SubscriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={userId}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
