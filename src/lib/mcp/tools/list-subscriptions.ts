import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_subscriptions",
  title: "Abos auflisten",
  description: "Listet die Abos/Ausgaben des angemeldeten Nutzers mit Preis, Intervall und Fristen.",
  inputSchema: {
    group_name: z.string().optional().describe("Optional: nur Abos dieser Gruppe."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ group_name }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("subscriptions")
      .select("id, name, category, group_name, price, billing_interval, next_payment, cancel_by, credit")
      .order("next_payment", { ascending: true });
    if (group_name) query = query.eq("group_name", group_name);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ subscriptions: data ?? [] });
  },
});
