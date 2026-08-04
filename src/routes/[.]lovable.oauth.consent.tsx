import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";

type OAuthDetails = {
  client?: { name?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: the Supabase client reads its session from localStorage.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "",
  }),
  loaderDeps: ({ search }) => ({ authorizationId: search.authorization_id }),
  loader: async ({ deps }) => {
    if (!deps.authorizationId) throw new Error("Missing authorization_id");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return { needsSignIn: true as const, details: null };
    const { data, error } = await oauthApi().getAuthorizationDetails(deps.authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
      return { needsSignIn: false as const, details: null };
    }
    return { needsSignIn: false as const, details: data };
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="grid min-h-dvh place-items-center px-6 text-center text-sm text-muted-foreground">
      Diese Autorisierung konnte nicht geladen werden: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const { needsSignIn, details } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href,
    });
    if (result.error) {
      setBusy(false);
      setError("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
      return;
    }
    if (!("redirected" in result && result.redirected)) window.location.reload();
  }

  async function decide(approve: boolean) {
    setBusy(true);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Der Autorisierungsserver hat keine Weiterleitung zurückgegeben.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "Diese App";

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6">
      <div className="w-full max-w-xs text-center">
        <div className="flex justify-center">
          <Wordmark size={40} />
        </div>

        {needsSignIn ? (
          <>
            <h1 className="mt-6 text-base font-medium">Anmeldung erforderlich</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Melde dich an, um den Zugriff zu bestätigen.
            </p>
            <Button className="mt-6 w-full" disabled={busy} onClick={() => void signIn()}>
              Mit Google anmelden
            </Button>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-base font-medium">{clientName} verbinden</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {clientName} darf dann in deinem Namen auf deine HyperLite-Daten zugreifen.
            </p>
            <div className="mt-6 grid gap-2">
              <Button disabled={busy} onClick={() => void decide(true)}>
                Erlauben
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => void decide(false)}>
                Ablehnen
              </Button>
            </div>
          </>
        )}

        {error ? (
          <p role="alert" className="mt-4 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
