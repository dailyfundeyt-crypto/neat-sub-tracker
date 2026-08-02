import { useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { Wordmark } from "@/components/Wordmark";

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.15-3.2-.44-4.7H24v9h12.7c-.55 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 6.9-10.2 6.9-17.3z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.7-3.7-13.6-8.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

export function AuthScreen() {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
      return;
    }
    if (result.redirected) return;
    setLoading(false);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-xs text-center">
        <div className="flex justify-center">
          <Wordmark size={44} />
        </div>
        <h1 className="sr-only">HyperLite – Abos im Blick</h1>
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          Alle Abos, Kosten und Kündigungsfristen an einem ruhigen Ort.
        </p>

        <button
          type="button"
          onClick={signIn}
          disabled={loading}
          className="mt-10 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-background px-5 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <GoogleGlyph />
          {loading ? "Weiterleitung …" : "Mit Google anmelden"}
        </button>
      </div>
    </main>
  );
}
