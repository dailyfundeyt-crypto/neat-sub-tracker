import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "create_income",
  title: "Einkommen anlegen",
  description: "Legt eine neue Einkommensquelle für den angemeldeten Nutzer an.",
  inputSchema: {
    name: z.string().trim().describe("Bezeichnung der Einkommensquelle."),
    amount: z.number().describe("Betrag pro Intervall."),
    interval: z.enum(["monthly", "yearly", "once"]).describe("Zahlungsintervall."),
    category: z.string().optional().describe("Kategorie, z. B. Freelance."),
    group_name: z.string().optional().describe("Gruppe: Selbständig oder Arbeit."),
    next_payout: z.string().optional().describe("Nächste Auszahlung als YYYY-MM-DD."),
    note: z.string().optional().describe("Freie Notiz."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("incomes")
      .insert({ ...input, user_id: ctx.getUserId() })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return jsonResult({ income: data });
  },
});
