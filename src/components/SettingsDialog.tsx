import { useEffect, useState } from "react";
import { Database, Moon, Plug, Plus, SlidersHorizontal, Sun, X } from "lucide-react";
import { CURRENCIES, useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { McpConnectionsSection } from "@/components/McpConnectionsSection";
import { McpDataAccessSection } from "@/components/McpDataAccessSection";

const settingsTabs = [
  { id: "general", label: "Allgemein", Icon: SlidersHorizontal },
  { id: "mcp", label: "MCP", Icon: Plug },
  { id: "data", label: "Daten", Icon: Database },
] as const;

const themeOptions = [
  { id: "light", label: "Hell", Icon: Sun },
  { id: "dark", label: "Dunkel", Icon: Moon },
] as const;

type SettingsTab = (typeof settingsTabs)[number]["id"];
type Theme = (typeof themeOptions)[number]["id"];

const THEME_STORAGE_KEY = "hyperlite-theme";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function SettingsDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}) {
  const { currency, setCurrency, expenseGroups, setExpenseGroups } = useCurrency();
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<SettingsTab>("general");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme: Theme = savedTheme === "dark" ? "dark" : "light";

    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  function chooseTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  function addGroup() {
    const name = draft.trim();
    if (!name || expenseGroups.includes(name)) return;
    void setExpenseGroups([...expenseGroups, name]);
    setDraft("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl border border-border/80 bg-background/95 shadow-[0_24px_80px_oklch(0_0_0_/_0.18)] backdrop-blur-xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Einstellungen</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
          <nav className="space-y-1 border-r border-border/70 pr-2">
            {settingsTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id}
                className={cn(
                  "flex h-10 w-full items-center gap-2 rounded-xl px-2 text-left text-xs font-medium transition-colors sm:h-11 sm:px-3 sm:text-sm",
                  tab === item.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <item.Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="min-w-0">
            {tab === "general" && (
              <div className="space-y-5">
                <div>
                  <Label>Darstellung</Label>
                  <div className="mt-2 grid grid-cols-2 gap-1 rounded-2xl border border-border/70 bg-muted/45 p-1">
                    {themeOptions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => chooseTheme(item.id)}
                        aria-pressed={theme === item.id}
                        className={cn(
                          "flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors",
                          theme === item.id
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                        )}
                      >
                        <item.Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Währung</Label>
                  <Select value={currency} onValueChange={(value) => void setCurrency(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((item) => (
                        <SelectItem key={item.code} value={item.code}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Ausgaben-Gruppen</Label>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {expenseGroups.map((group) => (
                      <li
                        key={group}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border py-1 pl-3 pr-1.5 text-xs"
                      >
                        {group}
                        <button
                          type="button"
                          aria-label={`${group} entfernen`}
                          onClick={() =>
                            void setExpenseGroups(expenseGroups.filter((item) => item !== group))
                          }
                          className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-2">
                    <Input
                      placeholder="Neue Gruppe"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addGroup();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addGroup}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {tab === "mcp" && <McpConnectionsSection userId={userId} active={open} />}

            {tab === "data" && <McpDataAccessSection userId={userId} active={open} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
