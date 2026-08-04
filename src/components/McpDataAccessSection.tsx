import { useCallback, useEffect, useMemo, useState } from "react";
import { Clipboard, Database, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type DataAccessSettings = {
  enabled: boolean;
  expose_expenses: boolean;
  expose_income: boolean;
  expose_deals: boolean;
  expose_analysis: boolean;
  token_hash: string | null;
};

const defaultSettings: DataAccessSettings = {
  enabled: false,
  expose_expenses: true,
  expose_income: true,
  expose_deals: true,
  expose_analysis: true,
  token_hash: null,
};

const dataScopes = [
  { key: "expose_expenses", label: "Ausgaben" },
  { key: "expose_income", label: "Einkünfte" },
  { key: "expose_deals", label: "Abo-Rabatte" },
  { key: "expose_analysis", label: "Analyse" },
] as const;

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const encoded = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `hlt_${encoded}`;
}

export function McpDataAccessSection({ userId, active }: { userId: string; active: boolean }) {
  const [settings, setSettings] = useState<DataAccessSettings>(defaultSettings);
  const [plainToken, setPlainToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  const endpoint = useMemo(() => `${origin || ""}/api/mcp/data`, [origin]);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("mcp_data_access")
      .select("enabled, expose_expenses, expose_income, expose_deals, expose_analysis, token_hash")
      .eq("user_id", userId)
      .maybeSingle();
    setSettings(data ?? defaultSettings);
  }, [userId]);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!active) return;
    void loadSettings();
  }, [active, loadSettings]);

  async function updateSettings(patch: Partial<DataAccessSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error } = await supabase.from("mcp_data_access").upsert(
      {
        user_id: userId,
        enabled: next.enabled,
        expose_expenses: next.expose_expenses,
        expose_income: next.expose_income,
        expose_deals: next.expose_deals,
        expose_analysis: next.expose_analysis,
        token_hash: next.token_hash,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      toast.error("Datenfreigabe konnte nicht gespeichert werden.");
      void loadSettings();
    }
  }

  async function createAccessToken() {
    setSaving(true);
    const token = generateToken();
    const tokenHash = await hashToken(token);
    await updateSettings({ enabled: true, token_hash: tokenHash });
    setPlainToken(token);
    setSaving(false);
    toast.success("MCP Token erstellt.");
  }

  async function revokeAccess() {
    setSaving(true);
    await updateSettings({ enabled: false, token_hash: null });
    setPlainToken("");
    setSaving(false);
    toast.success("MCP Zugriff deaktiviert.");
  }

  async function copy(value: string, message: string) {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background">
            <Database className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <Label className="text-sm">Website-Daten MCP</Label>
            <p className="truncate text-xs text-muted-foreground">
              Zugriff für Claude, Codex und andere MCP-Clients.
            </p>
          </div>
          <Switch
            aria-label="Website-Daten MCP aktivieren"
            checked={settings.enabled}
            onCheckedChange={(checked) => void updateSettings({ enabled: checked })}
          />
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="mcp-data-endpoint">Server URL</Label>
            <div className="mt-1 flex gap-2">
              <Input id="mcp-data-endpoint" readOnly value={endpoint} />
              <Button
                type="button"
                variant="outline"
                aria-label="Server URL kopieren"
                onClick={() => void copy(endpoint, "Server URL kopiert.")}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {dataScopes.map((scope) => (
              <div
                key={scope.key}
                className="flex items-center justify-between gap-2 rounded-full border border-border/70 px-3 py-2 text-xs"
              >
                <span>{scope.label}</span>
                <Switch
                  aria-label={`${scope.label} im Website-MCP freigeben`}
                  checked={settings[scope.key]}
                  onCheckedChange={(checked) => void updateSettings({ [scope.key]: checked })}
                />
              </div>
            ))}
          </div>

          {plainToken ? (
            <div>
              <Label htmlFor="mcp-data-token">Token</Label>
              <div className="mt-1 flex gap-2">
                <Input id="mcp-data-token" readOnly value={plainToken} />
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Token kopieren"
                  onClick={() => void copy(plainToken, "Token kopiert.")}
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Der Token wird nur jetzt angezeigt. Danach kann er neu erstellt werden.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-border/70 px-3 py-2 text-xs text-muted-foreground">
              {settings.token_hash ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-foreground" />
                  Token ist eingerichtet.
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Noch kein Zugriffstoken erstellt.
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" onClick={createAccessToken} disabled={saving}>
            Token erstellen
          </Button>
          <Button type="button" variant="outline" onClick={revokeAccess} disabled={saving}>
            Deaktivieren
          </Button>
        </div>
      </div>
    </section>
  );
}