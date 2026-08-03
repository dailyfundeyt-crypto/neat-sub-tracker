import { useState } from "react";
import { CURRENCIES, useCurrency } from "@/lib/currency";
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
import { Plus, X } from "lucide-react";

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

        <div className="space-y-5">
          <div>
            <Label>Währung</Label>
            <Select value={currency} onValueChange={(v) => void setCurrency(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Ausgaben-Gruppen</Label>
            <ul className="mt-2 flex flex-wrap gap-2">
              {expenseGroups.map((g) => (
                <li
                  key={g}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border py-1 pl-3 pr-1.5 text-xs"
                >
                  {g}
                  <button
                    type="button"
                    aria-label={`${g} entfernen`}
                    onClick={() => void setExpenseGroups(expenseGroups.filter((x) => x !== g))}
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
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addGroup();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addGroup}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <McpConnectionsSection userId={userId} active={open} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
