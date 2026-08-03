import { useState } from "react";
import { Database, Plug, Plus, SlidersHorizontal, X } from "lucide-react";
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

type SettingsTab = (typeof settingsTabs)[number]["id"];

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

  function addGroup() {
    const name = draft.trim();
    if (!name || expenseGroups.includes(name)) return;
    void setExpenseGroups([...expenseGroups, name]);
    setDraft("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="liquid-glass max-h-[92dvh] overflow-y-auto rounded-3xl border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Einstellungen</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-1 rounded-full border border-border/70 bg-background/35 p-1">
          {settingsTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-medium transition-colors",
                tab === item.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        {tab === "general" && (
          <div className="space-y-5">
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
      </DialogContent>
    </Dialog>
  );
}
