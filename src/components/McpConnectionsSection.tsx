import { useCallback, useEffect, useState } from "react";
import { Server, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type McpConnection = {
  id: string;
  tool_name: string;
  server_url: string;
  sync_salary: boolean;
  sync_income: boolean;
  sync_expenses: boolean;
  status: string;
  last_sync_at: string | null;
};

type McpDraft = {
  tool_name: string;
  server_url: string;
  sync_salary: boolean;
  sync_income: boolean;
  sync_expenses: boolean;
};

const emptyDraft: McpDraft = {
  tool_name: "",
  server_url: "",
  sync_salary: true,
  sync_income: true,
  sync_expenses: true,
};

const syncFields = [
  { key: "sync_salary", label: "Lohn" },
  { key: "sync_income", label: "Einkünfte" },
  { key: "sync_expenses", label: "Ausgaben" },
] as const;

export function McpConnectionsSection({ userId, active }: { userId: string; active: boolean }) {
  const [connections, setConnections] = useState<McpConnection[]>([]);
  const [draft, setDraft] = useState<McpDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const loadConnections = useCallback(async () => {
    const { data } = await supabase
      .from("mcp_connections")
      .select(
        "id, tool_name, server_url, sync_salary, sync_income, sync_expenses, status, last_sync_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setConnections((data as McpConnection[]) ?? []);
  }, [userId]);

  useEffect(() => {
    if (!active) return;
    void loadConnections();
  }, [active, loadConnections]);

  async function addConnection() {
    const toolName = draft.tool_name.trim();
    const serverUrl = draft.server_url.trim();
    if (!toolName || !serverUrl) {
      toast.error("Tool und MCP Server sind nötig.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("mcp_connections").insert({
      user_id: userId,
      tool_name: toolName,
      server_url: serverUrl,
      sync_salary: draft.sync_salary,
      sync_income: draft.sync_income,
      sync_expenses: draft.sync_expenses,
    });
    setSaving(false);
    if (error) {
      toast.error("Verbindung konnte nicht gespeichert werden.");
      return;
    }
    setDraft(emptyDraft);
    void loadConnections();
    toast.success("Tool verbunden.");
  }

  async function updateConnection(id: string, patch: Partial<McpDraft>) {
    setConnections((current) =>
      current.map((connection) =>
        connection.id === id ? { ...connection, ...patch } : connection,
      ),
    );
    const { error } = await supabase.from("mcp_connections").update(patch).eq("id", id);
    if (error) {
      toast.error("Änderung konnte nicht gespeichert werden.");
      void loadConnections();
    }
  }

  async function removeConnection(id: string) {
    const { error } = await supabase.from("mcp_connections").delete().eq("id", id);
    if (error) {
      toast.error("Verbindung konnte nicht entfernt werden.");
      return;
    }
    setConnections((current) => current.filter((connection) => connection.id !== id));
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm">MCP Server</Label>
        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1 text-[11px] text-muted-foreground">
          <Zap className="h-3 w-3" />
          Auto-Sync
        </span>
      </div>

      <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <Label htmlFor="mcp-tool">Tool</Label>
            <Input
              id="mcp-tool"
              placeholder="z. B. Bank, Payroll"
              value={draft.tool_name}
              onChange={(event) => setDraft({ ...draft, tool_name: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="mcp-server">Server</Label>
            <Input
              id="mcp-server"
              placeholder="https://..."
              value={draft.server_url}
              onChange={(event) => setDraft({ ...draft, server_url: event.target.value })}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {syncFields.map((field) => (
            <div
              key={field.key}
              className="flex items-center justify-between gap-2 rounded-full border border-border/70 px-3 py-2 text-xs"
            >
              <span>{field.label}</span>
              <Switch
                aria-label={`${field.label} synchronisieren`}
                checked={draft[field.key]}
                onCheckedChange={(checked) => setDraft({ ...draft, [field.key]: checked })}
              />
            </div>
          ))}
        </div>

        <Button type="button" className="mt-3 w-full" onClick={addConnection} disabled={saving}>
          Verbinden
        </Button>
      </div>

      {connections.length > 0 && (
        <ul className="space-y-2">
          {connections.map((connection) => (
            <li
              key={connection.id}
              className="rounded-2xl border border-border/70 bg-background/35 p-3"
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background">
                  <Server className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{connection.tool_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{connection.server_url}</p>
                </div>
                <button
                  type="button"
                  aria-label={`${connection.tool_name} entfernen`}
                  onClick={() => void removeConnection(connection.id)}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {syncFields.map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between gap-2 rounded-full border border-border/70 px-3 py-2 text-xs"
                  >
                    <span>{field.label}</span>
                    <Switch
                      aria-label={`${connection.tool_name}: ${field.label} synchronisieren`}
                      checked={connection[field.key]}
                      onCheckedChange={(checked) =>
                        void updateConnection(connection.id, { [field.key]: checked })
                      }
                    />
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
