import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_events",
  title: "Termine auflisten",
  description: "Listet die Kalendertermine des angemeldeten Nutzers, optional in einem Zeitraum.",
  inputSchema: {
    from: z.string().optional().describe("Startdatum YYYY-MM-DD (inklusive)."),
    to: z.string().optional().describe("Enddatum YYYY-MM-DD (inklusive)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("events")
      .select("id, title, event_date, start_time, end_time, all_day, note, repeat_rule, repeat_until")
      .order("event_date", { ascending: true });
    if (from) query = query.gte("event_date", from);
    if (to) query = query.lte("event_date", to);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ events: data ?? [] });
  },
});
