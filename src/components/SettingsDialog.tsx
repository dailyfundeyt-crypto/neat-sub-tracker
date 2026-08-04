import { useEffect, useState } from "react";
import {
  BookOpen,
  Database,
  ExternalLink,
  FileText,
  Mail,
  Moon,
  Plug,
  Plus,
  SlidersHorizontal,
  Sun,
  X,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  LEARNING_STATE_EVENT,
  readLearningState,
  updateLearningConnectors,
} from "@/lib/learning";
import type { LearningConnectors } from "@/lib/learning";

const settingsTabs = [
  { id: "general", label: "Allgemein", Icon: SlidersHorizontal },
  { id: "learning", label: "Lernen", Icon: BookOpen },
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
  const [learningConnectors, setLearningConnectors] = useState<LearningConnectors>(() =>
    readLearningState(userId).connectors,
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme: Theme = savedTheme === "dark" ? "dark" : "light";

    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLearningConnectors(readLearningState(userId).connectors);
  }, [open, userId]);

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

  function saveLearningConnectors() {
    updateLearningConnectors(userId, learningConnectors);
    if (typeof window !== "undefined") window.dispatchEvent(new Event(LEARNING_STATE_EVENT));
    toast.success("Lern-Connectoren gespeichert.");
  }

  function openExternal(value: string) {
    const trimmed = value.trim();
    if (!trimmed || typeof window === "undefined") return;
    const href = /^(https?:|mailto:)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    window.open(href, "_blank", "noopener,noreferrer");
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

            {tab === "learning" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <Mail className="h-4 w-4" />
                    Amazon Kindle
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="settings-kindle-email">Send-to-Kindle E-Mail</Label>
                      <Input
                        id="settings-kindle-email"
                        placeholder="name_123@kindle.com"
                        value={learningConnectors.kindleEmail}
                        onChange={(event) =>
                          setLearningConnectors((current) => ({
                            ...current,
                            kindleEmail: event.currentTarget.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="settings-amazon-email">Amazon Konto E-Mail</Label>
                      <Input
                        id="settings-amazon-email"
                        placeholder="konto@example.com"
                        value={learningConnectors.amazonEmail}
                        onChange={(event) =>
                          setLearningConnectors((current) => ({
                            ...current,
                            amazonEmail: event.currentTarget.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="settings-kindle-library">Kindle Bibliothek</Label>
                      <Input
                        id="settings-kindle-library"
                        value={learningConnectors.kindleLibraryUrl}
                        onChange={(event) =>
                          setLearningConnectors((current) => ({
                            ...current,
                            kindleLibraryUrl: event.currentTarget.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="settings-kindle-label">Import Label</Label>
                      <Input
                        id="settings-kindle-label"
                        value={learningConnectors.kindleImportLabel}
                        onChange={(event) =>
                          setLearningConnectors((current) => ({
                            ...current,
                            kindleImportLabel: event.currentTarget.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openExternal(learningConnectors.kindleLibraryUrl)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Kindle öffnen
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <Youtube className="h-4 w-4" />
                    YouTube Import
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="settings-youtube-key">YouTube API Key</Label>
                    <Input
                      id="settings-youtube-key"
                      type="password"
                      placeholder="Optional fuer spaetere automatische Kanal-Syncs"
                      value={learningConnectors.youtubeApiKey}
                      onChange={(event) =>
                        setLearningConnectors((current) => ({
                          ...current,
                          youtubeApiKey: event.currentTarget.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <FileText className="h-4 w-4" />
                    Notizen Ablage
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="settings-learning-folder">Drive/Export Ordner</Label>
                    <Input
                      id="settings-learning-folder"
                      value={learningConnectors.googleDriveFolder}
                      onChange={(event) =>
                        setLearningConnectors((current) => ({
                          ...current,
                          googleDriveFolder: event.currentTarget.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <Button type="button" className="w-full" onClick={saveLearningConnectors}>
                  Lern-Connectoren speichern
                </Button>
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
