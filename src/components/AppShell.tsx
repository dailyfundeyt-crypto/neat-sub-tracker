import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/Wordmark";
import { SubscriptionsPanel } from "@/components/SubscriptionsPanel";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { DealsPanel } from "@/components/DealsPanel";
import { IncomePanel } from "@/components/IncomePanel";
import type { Subscription } from "@/lib/hyperlite";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings } from "lucide-react";
import { CurrencyProvider } from "@/lib/currency";
import { SettingsDialog } from "@/components/SettingsDialog";

const TABS = [
  { id: 0, label: "Ausgaben" },
  { id: 1, label: "Einkommen" },
  { id: 2, label: "Analyse" },
  { id: 3, label: "Rabatte" },
] as const;

export function AppShell({ user }: { user: User }) {
  return (
    <CurrencyProvider userId={user.id}>
      <AppShellInner user={user} />
    </CurrencyProvider>
  );
}

function AppShellInner({ user }: { user: User }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [tab, setTab] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const avatar =
    (user.user_metadata?.["avatar_url"] as string | undefined) ?? undefined;
  const fullName =
    (user.user_metadata?.["full_name"] as string | undefined) ??
    user.email ??
    "Profil";

  async function loadSubs() {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    setSubs((data as Subscription[]) ?? []);
  }

  useEffect(() => {
    void loadSubs();
  }, []);

  function goTo(index: number) {
    setTab(index);
    const track = trackRef.current;
    if (!track) return;
    syncing.current = true;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
    window.setTimeout(() => {
      syncing.current = false;
    }, 500);
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track || syncing.current) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setTab((current) => (current === index ? current : index));
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
        <Wordmark size={30} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Profil"
              className="shrink-0 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage src={avatar} alt="" />
                <AvatarFallback className="text-xs">
                  {fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate font-normal">
              <span className="block truncate text-sm font-medium">{fullName}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Einstellungen
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <section className="h-full w-full shrink-0 snap-center overflow-y-auto pt-4">
          <SubscriptionsPanel subs={subs} userId={user.id} onChanged={loadSubs} />
        </section>
        <section className="h-full w-full shrink-0 snap-center overflow-y-auto pt-4">
          <IncomePanel userId={user.id} />
        </section>
        <section className="h-full w-full shrink-0 snap-center overflow-y-auto pt-4">
          <AnalysisPanel subs={subs} />
        </section>
        <section className="h-full w-full shrink-0 snap-center overflow-y-auto pt-4">
          <DealsPanel userId={user.id} />
        </section>
      </div>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-background/90 p-1 shadow-sm backdrop-blur">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goTo(t.id)}
              aria-current={tab === t.id}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
