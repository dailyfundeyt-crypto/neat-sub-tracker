import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "create_subscription",
  title: "Abo anlegen",
  description: "Legt ein neues Abo (Ausgabe) für den angemeldeten Nutzer an.",
  inputSchema: {
    name: z.string().trim().describe("Name des Dienstes, z. B. Adobe."),
    price: z.number().describe("Preis pro Abrechnungszeitraum."),
    billing_interval: z.enum(["monthly", "yearly"]).describe("Abrechnungsintervall."),
    category: z.string().optional().describe("Kategorie, z. B. Software."),
    group_name: z.string().optional().describe("Gruppe, z. B. Business."),
    next_payment: z.string().optional().describe("Nächste Zahlung als YYYY-MM-DD."),
    cancel_by: z.string().optional().describe("Kündigen bis als YYYY-MM-DD."),
    credit: z.number().optional().describe("Vorhandenes Guthaben."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({ ...input, user_id: ctx.getUserId() })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return jsonResult({ subscription: data });
  },
});
