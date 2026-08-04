import { createFileRoute } from "@tanstack/react-router";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: {
    protocolVersion?: string;
    name?: string;
    arguments?: Record<string, unknown>;
  };
};

type DataAccess = {
  user_id: string;
  expose_expenses: boolean;
  expose_income: boolean;
  expose_deals: boolean;
  expose_analysis: boolean;
};

type SubscriptionRow = {
  name: string;
  group_name: string;
  category: string;
  price: number;
  billing_interval: string;
  next_payment: string | null;
  cancel_by: string | null;
  credit: number;
  discount_title: string | null;
  discount_description: string | null;
  discount_code: string | null;
  discount_url: string | null;
  discount_valid_until: string | null;
};

type IncomeRow = {
  name: string;
  category: string;
  group_name: string;
  amount: number;
  interval: string;
  next_payout: string | null;
  note: string | null;
};

type DiscountRow = {
  subscription_name: string;
  title: string | null;
  description: string | null;
  code: string | null;
  url: string | null;
  valid_until: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function rpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result }, { headers: corsHeaders });
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string, status = 400) {
  return Response.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status, headers: corsHeaders },
  );
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

function monthlyExpense(row: SubscriptionRow): number {
  return row.billing_interval === "yearly" ? row.price / 12 : row.price;
}

function monthlyIncomeAmount(row: IncomeRow): number {
  if (row.interval === "yearly") return row.amount / 12;
  if (row.interval === "once") return 0;
  return row.amount;
}

function hasSubscriptionDiscount(row: SubscriptionRow): boolean {
  return Boolean(
    row.discount_title ||
      row.discount_description ||
      row.discount_code ||
      row.discount_url ||
      row.discount_valid_until,
  );
}

function toDiscount(row: SubscriptionRow): DiscountRow {
  return {
    subscription_name: row.name,
    title: row.discount_title,
    description: row.discount_description,
    code: row.discount_code,
    url: row.discount_url,
    valid_until: row.discount_valid_until,
  };
}

async function getAccess(request: Request): Promise<DataAccess | null> {
  const token = getBearerToken(request);
  if (!token) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const tokenHash = await hashToken(token);
  const { data } = await supabaseAdmin
    .from("mcp_data_access")
    .select("user_id, expose_expenses, expose_income, expose_deals, expose_analysis")
    .eq("enabled", true)
    .eq("token_hash", tokenHash)
    .maybeSingle();
  return data as DataAccess | null;
}

async function loadConnectData(access: DataAccess) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const payload: {
    expenses?: SubscriptionRow[];
    income?: IncomeRow[];
    deals?: DiscountRow[];
    analysis?: {
      monthly_expenses: number;
      monthly_income: number;
      net_cashflow: number;
      subscriptions: number;
      income_items: number;
      deals: number;
    };
  } = {};

  let expenses: SubscriptionRow[] = [];
  let income: IncomeRow[] = [];
  let deals: DiscountRow[] = [];

  if (access.expose_expenses || access.expose_deals || access.expose_analysis) {
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select(
        "name, group_name, category, price, billing_interval, next_payment, cancel_by, credit, discount_title, discount_description, discount_code, discount_url, discount_valid_until",
      )
      .eq("user_id", access.user_id)
      .order("created_at", { ascending: false });
    expenses = (data as SubscriptionRow[]) ?? [];
    if (access.expose_expenses) payload.expenses = expenses;
  }

  if (access.expose_income || access.expose_analysis) {
    const { data } = await supabaseAdmin
      .from("incomes")
      .select("name, category, group_name, amount, interval, next_payout, note")
      .eq("user_id", access.user_id)
      .order("created_at", { ascending: false });
    income = (data as IncomeRow[]) ?? [];
    if (access.expose_income) payload.income = income;
  }

  if (access.expose_deals || access.expose_analysis) {
    deals = expenses.filter(hasSubscriptionDiscount).map(toDiscount);
    if (access.expose_deals) payload.deals = deals;
  }

  if (access.expose_analysis) {
    const monthlyExpenses = expenses.reduce((sum, item) => sum + monthlyExpense(item), 0);
    const monthlyIncomeTotal = income.reduce((sum, item) => sum + monthlyIncomeAmount(item), 0);
    payload.analysis = {
      monthly_expenses: monthlyExpenses,
      monthly_income: monthlyIncomeTotal,
      net_cashflow: monthlyIncomeTotal - monthlyExpenses,
      subscriptions: expenses.length,
      income_items: income.length,
      deals: deals.length,
    };
  }

  return payload;
}

export const Route = createFileRoute("/api/mcp/data")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async () =>
        Response.json(
          {
            name: "Connect Daten MCP",
            endpoint: "/api/mcp/data",
            auth: "Authorization: Bearer <token>",
            methods: ["initialize", "tools/list", "tools/call"],
          },
          { headers: corsHeaders },
        ),
      POST: async ({ request }) => {
        let body: JsonRpcRequest;
        try {
          body = (await request.json()) as JsonRpcRequest;
        } catch {
          return rpcError(null, -32700, "Invalid JSON");
        }

        if (body.method === "initialize") {
          return rpcResult(body.id, {
            protocolVersion: body.params?.protocolVersion ?? "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "Connect Daten MCP", version: "0.1.0" },
          });
        }

        const access = await getAccess(request);
        if (!access) return rpcError(body.id, -32001, "Unauthorized", 401);

        if (body.method === "tools/list") {
          return rpcResult(body.id, {
            tools: [
              {
                name: "connect.get_data",
                description:
                  "Liest freigegebene Connect Ausgaben, Einkünfte, Abo-Rabatte und Analyse.",
                inputSchema: { type: "object", properties: {} },
              },
              {
                name: "connect.get_summary",
                description: "Liest eine kompakte Connect Monatsübersicht.",
                inputSchema: { type: "object", properties: {} },
              },
            ],
          });
        }

        if (body.method === "tools/call") {
          const toolName = body.params?.name;
          const data = await loadConnectData(access);
          const result =
            toolName === "connect.get_summary" ? { analysis: data.analysis ?? null } : data;
          return rpcResult(body.id, {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          });
        }

        return rpcError(body.id, -32601, "Method not found", 404);
      },
    },
  },
});