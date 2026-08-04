import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "create_event",
  title: "Termin anlegen",
  description: "Legt einen Kalendertermin für den angemeldeten Nutzer an, optional wiederkehrend.",
  inputSchema: {
    title: z.string().trim().describe("Titel des Termins."),
    event_date: z.string().describe("Datum als YYYY-MM-DD."),
    all_day: z.boolean().optional().describe("Ganztägiger Termin."),
    start_time: z.string().optional().describe("Startzeit HH:MM."),
    end_time: z.string().optional().describe("Endzeit HH:MM."),
    note: z.string().optional().describe("Notiz zum Termin."),
    repeat_rule: z
      .enum(["none", "daily", "weekly", "biweekly", "monthly"])
      .optional()
      .describe("Wiederholung."),
    repeat_until: z.string().optional().describe("Wiederholen bis YYYY-MM-DD."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("events")
      .insert({ ...input, user_id: ctx.getUserId() })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return jsonResult({ event: data });
  },
});
