export type BillingInterval = "monthly" | "yearly";

export type Subscription = {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  category: string;
  group_name: string;
  price: number;
  billing_interval: BillingInterval;
  next_payment: string | null;
  cancel_by: string | null;
  credit: number;
  created_at: string;
};

export type Deal = {
  id: string;
  created_by: string;
  service_name: string;
  logo_url: string | null;
  title: string;
  description: string | null;
  code: string | null;
  url: string | null;
  valid_until: string | null;
  created_at: string;
};

export type Income = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  group_name: string;
  amount: number;
  interval: BillingInterval | "once";
  next_payout: string | null;
  note: string | null;
  created_at: string;
};

export const INCOME_GROUPS = ["Selbständig", "Arbeit"];

export const INCOME_CATEGORIES = [
  "Freelance",
  "Online-Shop",
  "Content & Creator",
  "Nachhilfe & Coaching",
  "Vermietung",
  "Dividenden & Zinsen",
  "Verkauf",
  "Sonstiges",
];

/** Einnahme auf Monatsbasis (Einmalzahlungen zählen nicht wiederkehrend). */
export function monthlyIncome(inc: Income): number {
  if (inc.interval === "yearly") return inc.amount / 12;
  if (inc.interval === "once") return 0;
  return inc.amount;
}

export const CATEGORIES = [
  "Software",
  "Streaming",
  "Musik",
  "Cloud & Speicher",
  "Gaming",
  "Fitness",
  "Mobilfunk & Internet",
  "Versicherung",
  "Bildung",
  "Sonstiges",
];

export const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}.${m}.${y}`;
}

export function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function relativeLabel(days: number | null): string {
  if (days === null) return "—";
  if (days < 0) return `vor ${Math.abs(days)} Tg.`;
  if (days === 0) return "heute";
  if (days === 1) return "morgen";
  return `in ${days} Tagen`;
}

/** Kosten pro Monat, unabhängig vom Intervall. */
export function monthlyCost(sub: Subscription): number {
  return sub.billing_interval === "yearly" ? sub.price / 12 : sub.price;
}

/** Wie viele Folgemonate das hinterlegte Guthaben noch deckt. */
export function creditMonths(sub: Subscription): number | null {
  const m = monthlyCost(sub);
  if (!sub.credit || m <= 0) return null;
  return Math.floor(sub.credit / m);
}

/** Sortierung: was am dringendsten ist, steht oben. */
export function urgencyScore(sub: Subscription): number {
  const pay = daysUntil(sub.next_payment);
  const cancel = daysUntil(sub.cancel_by);
  const values = [pay, cancel].filter(
    (v): v is number => v !== null && v >= 0,
  );
  if (values.length === 0) return 9999;
  return Math.min(...values);
}

export function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Bild clientseitig auf ein kleines quadratisches PNG bringen (Data-URL). */
export function fileToLogoDataUrl(file: File, size = 96): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas nicht verfügbar"));
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
