import { auth, defineMcp, type McpDefinitionInput } from "@lovable.dev/mcp-js";
import listSubscriptions from "./tools/list-subscriptions";
import createSubscription from "./tools/create-subscription";
import listIncomes from "./tools/list-incomes";
import createIncome from "./tools/create-income";
import listEvents from "./tools/list-events";
import createEvent from "./tools/create-event";
import listDeals from "./tools/list-deals";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "hyperlite-subs-tracker",
  title: "HyperLite Subs Tracker",
  version: "0.1.0",
  instructions:
    "Tools für HyperLite: Abos/Ausgaben, Einkommen, Kalendertermine und Community-Rabatte des angemeldeten Nutzers lesen und anlegen.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listSubscriptions,
    createSubscription,
    listIncomes,
    createIncome,
    listEvents,
    createEvent,
    listDeals,
  ],
});
