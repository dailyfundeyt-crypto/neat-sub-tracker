import { supabase } from "@/integrations/supabase/client";

type Tokens = { access_token: string; refresh_token: string };

function readTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const access_token = hash.get("access_token") ?? query.get("access_token");
  const refresh_token = hash.get("refresh_token") ?? query.get("refresh_token");
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

function cleanUrl() {
  const url = new URL(window.location.href);
  for (const key of ["access_token", "refresh_token", "expires_in", "token_type", "state", "provider_token"]) {
    url.searchParams.delete(key);
  }
  url.hash = "";
  window.history.replaceState({}, "", url.pathname + url.search);
}

/**
 * The full-page Google OAuth flow returns the tokens in the URL. Nobody
 * consumes them automatically, so exchange them for a Supabase session here
 * before deciding whether the visitor is signed in.
 */
export async function consumeOAuthRedirect(): Promise<boolean> {
  const tokens = readTokens();
  if (!tokens) return false;
  const { error } = await supabase.auth.setSession(tokens);
  cleanUrl();
  return !error;
}
