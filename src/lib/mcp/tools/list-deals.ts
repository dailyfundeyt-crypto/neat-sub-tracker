import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_deals",
  title: "Rabatte auflisten",
  description: "Listet die von der Community geteilten Rabatte und Gutscheincodes.",
  inputSchema: {
    search: z.string().optional().describe("Optionaler Suchbegriff für den Dienstnamen."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("deals")
      .select("id, service_name, title, description, code, url, valid_until")
      .order("created_at", { ascending: false });
    if (search) query = query.ilike("service_name", `%${search}%`);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ deals: data ?? [] });
  },
});
