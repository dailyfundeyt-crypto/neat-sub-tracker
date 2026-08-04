import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/AuthScreen";
import { AppShell } from "@/components/AppShell";

const appTitle = "Connect – Abos, Kosten und Kündigungen im Blick";
const appDescription =
  "Connect bündelt deine Abos: Preise, nächste Zahlungen, Kündigungsfristen, Auswertungen und geteilte Rabatte – minimalistisch und mobil.";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: appTitle },
      {
        name: "description",
        content: appDescription,
      },
      { property: "og:title", content: appTitle },
      {
        property: "og:description",
        content: appDescription,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return <div className="min-h-dvh bg-background" />;
  }

  return session?.user ? <AppShell user={session.user} /> : <AuthScreen />;
}
