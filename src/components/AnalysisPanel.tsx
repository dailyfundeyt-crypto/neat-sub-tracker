import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { monthlyCost, type Subscription } from "@/lib/hyperlite";
import { useCurrency } from "@/lib/currency";

const SHADES = [
  "#111111",
  "#3d3d3d",
  "#5e5e5e",
  "#7d7d7d",
  "#9a9a9a",
  "#b5b5b5",
  "#cfcfcf",
  "#e2e2e2",
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

export function AnalysisPanel({ subs }: { subs: Subscription[] }) {
  const { money } = useCurrency();
  const perMonth = useMemo(
    () => subs.reduce((sum, s) => sum + monthlyCost(s), 0),
    [subs],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of subs) {
      map.set(s.category, (map.get(s.category) ?? 0) + monthlyCost(s));
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [subs]);

  const overYear = useMemo(() => {
    const year = new Date().getFullYear();
    return MONTHS.map((label, index) => {
      let total = 0;
      for (const s of subs) {
        if (s.billing_interval === "monthly") {
          total += s.price;
        } else if (s.next_payment) {
          const d = new Date(`${s.next_payment}T00:00:00`);
          if (d.getMonth() === index) total += s.price;
        } else if (index === 0) {
          total += s.price;
        }
      }
      return { month: label, betrag: Number(total.toFixed(2)), year };
    });
  }, [subs]);

  if (subs.length === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-2 sm:px-6">
        <h2 className="font-display text-2xl font-bold tracking-tight">Analyse</h2>
        <p className="mt-16 text-center text-sm text-muted-foreground">
          Sobald du Abos erfasst hast, erscheint hier die Auswertung.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-2 sm:px-6">
      <h2 className="font-display text-2xl font-bold tracking-tight">Analyse</h2>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Pro Monat
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">
            {money(perMonth)}
          </p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Pro Jahr
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">
            {money(perMonth * 12)}
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-border p-4">
        <h3 className="text-sm font-medium">Ausgaben nach Kategorie</h3>
        <div className="mt-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                stroke="none"
              >
                {byCategory.map((entry, i) => (
                  <Cell key={entry.name} fill={SHADES[i % SHADES.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => money(value)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {byCategory.map((c, i) => (
            <li key={c.name} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: SHADES[i % SHADES.length] }}
              />
              <span>{c.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {money(c.value)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-border p-4">
        <h3 className="text-sm font-medium">Ausgaben über das Jahr</h3>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overYear} margin={{ left: -18, right: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={52} />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                formatter={(value: number) => money(value)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="betrag" fill="#111111" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
