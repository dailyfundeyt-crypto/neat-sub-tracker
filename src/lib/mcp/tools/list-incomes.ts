import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_incomes",
  title: "Einkommen auflisten",
  description: "Listet die Einkommensquellen (Side Hustles, Arbeit) des angemeldeten Nutzers.",
  inputSchema: {
    group_name: z.string().optional().describe("Optional: nur Einträge dieser Gruppe."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ group_name }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("incomes")
      .select("id, name, category, group_name, amount, interval, next_payout, note")
      .order("created_at", { ascending: false });
    if (group_name) query = query.eq("group_name", group_name);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ incomes: data ?? [] });
  },
});
