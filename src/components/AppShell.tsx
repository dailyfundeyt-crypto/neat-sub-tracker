import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/Wordmark";
import { SubscriptionsPanel } from "@/components/SubscriptionsPanel";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { IncomePanel } from "@/components/IncomePanel";
import { CalendarPanel } from "@/components/CalendarPanel";
import { BusinessPanel } from "@/components/BusinessPanel";
import { LearningPanel } from "@/components/LearningPanel";
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
import {
  Bot,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  GraduationCap,
  LogOut,
  ReceiptText,
  Settings,
} from "lucide-react";
import { CurrencyProvider } from "@/lib/currency";
import { SettingsDialog } from "@/components/SettingsDialog";

const TABS = [
  { id: 0, label: "Ausgaben", Icon: ReceiptText },
  { id: 1, label: "Kalender", Icon: CalendarDays },
  { id: 2, label: "Einkommen", Icon: CircleDollarSign },
  { id: 3, label: "Analyse", Icon: ChartNoAxesColumnIncreasing },
  { id: 4, label: "Business", Icon: Bot },
  { id: 5, label: "Lernen", Icon: GraduationCap },
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

  const avatar = (user.user_metadata?.["avatar_url"] as string | undefined) ?? undefined;
  const fullName =
    (user.user_metadata?.["full_name"] as string | undefined) ?? user.email ?? "Profil";

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
              className="liquid-glass shrink-0 rounded-full border p-0.5 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="h-8 w-8 border border-border/70">
                <AvatarImage src={avatar} alt="" />
                <AvatarFallback className="text-xs">
                  {fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="liquid-glass w-56 rounded-3xl border p-2">
            <DropdownMenuLabel className="truncate font-normal">
              <span className="block truncate text-sm font-medium">{fullName}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
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

      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:top-[57px] md:z-10 md:flex md:w-64 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar md:px-3 md:py-4 md:text-sidebar-foreground">
        <nav className="space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goTo(t.id)}
              aria-current={tab === t.id}
              className={cn(
                "flex h-12 w-full items-center gap-5 rounded-xl px-4 text-left text-sm font-semibold transition-colors",
                tab === t.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/68 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <t.Icon className="h-5 w-5 shrink-0" strokeWidth={2.1} />
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] md:pl-64 [&::-webkit-scrollbar]:hidden"
      >
        <section className="h-full w-full shrink-0 snap-center overflow-y-auto pt-4">
          <SubscriptionsPanel subs={subs} userId={user.id} onChanged={loadSubs} />
        </section>
        <section className="h-full w-full shrink-0 snap-center overflow-y-auto pt-4">
          <CalendarPanel userId={user.id} />
        </section>
        <section className="h-full w-full shrink-0 snap-center overflow-y-auto pt-4">
          <IncomePanel userId={user.id} />
        </section>
        <section className="h-full w-full shrink-0 snap-center overflow-y-auto pt-4">
          <AnalysisPanel subs={subs} />
        </section>
        <section className="h-full w-full shrink-0 snap-center overflow-y-auto pt-4">
          <BusinessPanel userId={user.id} />
        </section>
        <section className="h-full w-full shrink-0 snap-center overflow-y-auto pt-4">
          <LearningPanel userId={user.id} />
        </section>
      </div>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="liquid-tabbar pointer-events-auto grid h-[3.75rem] w-[min(96vw,32rem)] grid-cols-6 items-center gap-1 rounded-[2rem] border p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goTo(t.id)}
              aria-current={tab === t.id}
              className={cn(
                "flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.65rem] px-1 text-[10px] font-semibold leading-none transition-all duration-300 sm:text-[11px]",
                tab === t.id ? "liquid-tab-active text-white" : "text-white/58 hover:text-white/86",
              )}
            >
              <t.Icon
                className={cn("transition-all duration-300", tab === t.id ? "h-6 w-6" : "h-5 w-5")}
                strokeWidth={tab === t.id ? 2.4 : 2.1}
              />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} userId={user.id} />
    </div>
  );
}
