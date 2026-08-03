import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export const CURRENCIES = [
  { code: "EUR", label: "Euro (€)" },
  { code: "USD", label: "US-Dollar ($)" },
  { code: "CHF", label: "Schweizer Franken (CHF)" },
  { code: "GBP", label: "Britisches Pfund (£)" },
  { code: "SEK", label: "Schwedische Krone (kr)" },
];

const DEFAULT_GROUPS = ["Allgemein", "Privat", "Business"];

type Ctx = {
  currency: string;
  expenseGroups: string[];
  money: (value: number) => string;
  symbol: string;
  setCurrency: (code: string) => Promise<void>;
  setExpenseGroups: (groups: string[]) => Promise<void>;
};

const CurrencyContext = createContext<Ctx | null>(null);

export function CurrencyProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [currency, setCurrencyState] = useState("EUR");
  const [expenseGroups, setExpenseGroupsState] =
    useState<string[]>(DEFAULT_GROUPS);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("currency, expense_groups")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setCurrencyState(data.currency);
        setExpenseGroupsState(
          data.expense_groups?.length ? data.expense_groups : DEFAULT_GROUPS,
        );
      } else {
        await supabase.from("profiles").insert({ id: userId });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }),
    [currency],
  );

  const money = useCallback(
    (value: number) => formatter.format(Number.isFinite(value) ? value : 0),
    [formatter],
  );

  const symbol = useMemo(
    () =>
      formatter
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency,
    [formatter, currency],
  );

  const setCurrency = useCallback(
    async (code: string) => {
      setCurrencyState(code);
      await supabase
        .from("profiles")
        .upsert({ id: userId, currency: code }, { onConflict: "id" });
    },
    [userId],
  );

  const setExpenseGroups = useCallback(
    async (groups: string[]) => {
      setExpenseGroupsState(groups);
      await supabase
        .from("profiles")
        .upsert({ id: userId, expense_groups: groups }, { onConflict: "id" });
    },
    [userId],
  );

  const value = useMemo(
    () => ({
      currency,
      expenseGroups,
      money,
      symbol,
      setCurrency,
      setExpenseGroups,
    }),
    [currency, expenseGroups, money, symbol, setCurrency, setExpenseGroups],
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency muss innerhalb des Providers stehen");
  return ctx;
}
