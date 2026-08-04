import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  PlayCircle,
  Plus,
  Settings,
  Target,
  Trash2,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DEFAULT_BOOK_CATEGORY_ID,
  DEFAULT_YOUTUBE_CATEGORY_ID,
  LEARNING_STATE_EVENT,
  readLearningState,
  saveLearningState,
} from "@/lib/learning";
import type {
  BookSource,
  BookStatus,
  LearningBook,
  LearningCategory,
  LearningChannel,
  LearningConnectors,
  LearningMode,
  LearningState,
  LearningVideo,
  VideoStatus,
} from "@/lib/learning";

const modeOptions: Array<{ id: LearningMode; label: string; Icon: LucideIcon }> = [
  { id: "youtube", label: "YouTube", Icon: Youtube },
  { id: "books", label: "Buecher", Icon: BookOpen },
  { id: "analytics", label: "Auswertung", Icon: BarChart3 },
];

const categoryColors = [
  "bg-red-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-500",
] as const;

const videoStatusLabels: Record<VideoStatus, string> = {
  todo: "Offen",
  saved: "Merkliste",
  watched: "Gesehen",
};

const bookStatusLabels: Record<BookStatus, string> = {
  reading: "Liest du",
  paused: "Pausiert",
  done: "Fertig",
};

const bookSourceLabels: Record<BookSource, string> = {
  kindle: "Amazon Kindle",
  pdf: "PDF",
  epub: "EPUB",
  manual: "Manuell",
};

const coachPrompt = `Analysiere das folgende YouTube-Video wie ein kompakter Lern-Coach.

Ziel: Der Nutzer will die wichtigsten Inhalte verstehen, ohne das Video komplett zu sehen.

Lieferformat:
- Kernaussagen als kurze Ueberschriften mit klarer Erklaerung
- konkrete To-dos oder Regeln, falls vorhanden
- Karteikarten im Format Vorderseite;Rueckseite
- keine Floskeln, nur verwertbares Lernmaterial

Video:`;

type ChannelForm = {
  name: string;
  url: string;
  categoryId: string;
  dailyGoal: string;
};

type VideoForm = {
  title: string;
  url: string;
  durationMinutes: string;
  notes: string;
};

type BookForm = {
  title: string;
  author: string;
  source: BookSource;
  categoryId: string;
  totalPages: string;
  dailyGoal: string;
  notes: string;
};

function createChannelForm(): ChannelForm {
  return {
    name: "",
    url: "",
    categoryId: DEFAULT_YOUTUBE_CATEGORY_ID,
    dailyGoal: "2",
  };
}

function createVideoForm(): VideoForm {
  return {
    title: "",
    url: "",
    durationMinutes: "20",
    notes: "",
  };
}

function createBookForm(): BookForm {
  return {
    title: "",
    author: "",
    source: "kindle",
    categoryId: DEFAULT_BOOK_CATEGORY_ID,
    totalPages: "250",
    dailyGoal: "20",
    notes: "",
  };
}

export function LearningPanel({ userId }: { userId: string }) {
  const [state, setState] = useState<LearningState>(() => readLearningState(userId));
  const [mode, setMode] = useState<LearningMode>("youtube");
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [channelForm, setChannelForm] = useState<ChannelForm>(() => createChannelForm());
  const [videoForm, setVideoForm] = useState<VideoForm>(() => createVideoForm());
  const [bookForm, setBookForm] = useState<BookForm>(() => createBookForm());
  const [categoryDraft, setCategoryDraft] = useState("");
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [connectorForm, setConnectorForm] = useState<LearningConnectors>(() => state.connectors);

  useEffect(() => {
    setState(readLearningState(userId));
  }, [userId]);

  useEffect(() => {
    saveLearningState(userId, state);
  }, [state, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function syncFromSettings() {
      setState(readLearningState(userId));
    }

    window.addEventListener(LEARNING_STATE_EVENT, syncFromSettings);
    return () => window.removeEventListener(LEARNING_STATE_EVENT, syncFromSettings);
  }, [userId]);

  useEffect(() => {
    setConnectorForm(state.connectors);
  }, [state.connectors]);

  const categoryById = useMemo(() => {
    return new Map(state.categories.map((category) => [category.id, category]));
  }, [state.categories]);

  const activeChannel = useMemo(() => {
    const selected = state.channels.find((channel) => channel.id === selectedChannelId);
    return selected ?? state.channels[0] ?? null;
  }, [selectedChannelId, state.channels]);

  const visibleVideos = useMemo(() => {
    const activeChannelId = activeChannel?.id ?? "";
    return state.videos
      .filter((video) => !activeChannelId || video.channelId === activeChannelId)
      .filter((video) => video.status !== "todo" || video.durationMinutes >= state.minimumVideoMinutes)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }, [activeChannel?.id, state.minimumVideoMinutes, state.videos]);

  const openVideos = useMemo(() => {
    return visibleVideos.filter((video) => video.status === "todo");
  }, [visibleVideos]);

  const savedVideos = useMemo(() => {
    return state.videos.filter((video) => video.status === "saved");
  }, [state.videos]);

  const watchedToday = useMemo(() => {
    return state.videos.filter((video) => video.status === "watched" && isToday(video.watchedAt));
  }, [state.videos]);

  const channelStats = useMemo(() => {
    const stats = new Map<string, { open: number; saved: number; watched: number; minutes: number }>();

    for (const channel of state.channels) {
      stats.set(channel.id, { open: 0, saved: 0, watched: 0, minutes: 0 });
    }

    for (const video of state.videos) {
      const current = stats.get(video.channelId) ?? { open: 0, saved: 0, watched: 0, minutes: 0 };
      if (video.status === "watched") {
        current.watched += 1;
        current.minutes += video.durationMinutes;
      } else if (video.status === "saved") {
        current.saved += 1;
      } else {
        current.open += 1;
      }
      stats.set(video.channelId, current);
    }

    return stats;
  }, [state.channels, state.videos]);

  const totalLearningMinutes = useMemo(() => {
    return state.videos.reduce(
      (sum, video) => (video.status === "watched" ? sum + video.durationMinutes : sum),
      0,
    );
  }, [state.videos]);

  const pagesRead = useMemo(() => {
    return state.books.reduce((sum, book) => sum + book.currentPage, 0);
  }, [state.books]);

  const booksInProgress = useMemo(() => {
    return state.books.filter((book) => book.status === "reading").length;
  }, [state.books]);

  const categoryStats = useMemo(() => {
    return state.categories.map((category) => {
      const videoMinutes = state.videos.reduce(
        (sum, video) =>
          video.categoryId === category.id && video.status === "watched"
            ? sum + video.durationMinutes
            : sum,
        0,
      );
      const openVideoCount = state.videos.filter(
        (video) => video.categoryId === category.id && video.status === "todo",
      ).length;
      const pageCount = state.books.reduce(
        (sum, book) => (book.categoryId === category.id ? sum + book.currentPage : sum),
        0,
      );
      const bookCount = state.books.filter((book) => book.categoryId === category.id).length;

      return { category, videoMinutes, openVideoCount, pageCount, bookCount };
    });
  }, [state.books, state.categories, state.videos]);

  const recentWatchedVideos = useMemo(() => {
    return state.videos
      .filter((video) => video.status === "watched" && video.watchedAt)
      .sort((left, right) => right.watchedAt.localeCompare(left.watchedAt))
      .slice(0, 5);
  }, [state.videos]);

  function mutate(updater: (current: LearningState) => LearningState) {
    setState((current) => updater(current));
  }

  function addCategory() {
    const name = categoryDraft.trim();
    if (!name) return;
    const exists = state.categories.some((category) => category.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast.error("Diese Kategorie gibt es bereits.");
      return;
    }

    const color = categoryColors[state.categories.length % categoryColors.length] ?? "bg-foreground";
    const category: LearningCategory = {
      id: uid("category"),
      name,
      color,
    };

    mutate((current) => ({ ...current, categories: [...current.categories, category] }));
    setCategoryDraft("");
    toast.success("Kategorie angelegt.");
  }

  function addChannel() {
    const name = channelForm.name.trim();
    if (!name) {
      toast.error("Gib dem Kanal einen Namen.");
      return;
    }

    const channel: LearningChannel = {
      id: uid("channel"),
      name,
      url: channelForm.url.trim(),
      categoryId: channelForm.categoryId || DEFAULT_YOUTUBE_CATEGORY_ID,
      dailyGoal: parsePositiveInt(channelForm.dailyGoal, 1),
      createdAt: new Date().toISOString(),
    };

    mutate((current) => ({ ...current, channels: [...current.channels, channel] }));
    setSelectedChannelId(channel.id);
    setChannelForm(createChannelForm());
    toast.success("Kanal hinzugefuegt.");
  }

  function deleteChannel(channelId: string) {
    if (!confirmDanger("Kanal und zugehoerige Videos entfernen?")) return;
    mutate((current) => ({
      ...current,
      channels: current.channels.filter((channel) => channel.id !== channelId),
      videos: current.videos.filter((video) => video.channelId !== channelId),
    }));
    if (selectedChannelId === channelId) setSelectedChannelId("");
  }

  function addVideo() {
    if (!activeChannel) {
      toast.error("Lege zuerst einen Kanal oder eine Playlist an.");
      return;
    }

    const title = videoForm.title.trim();
    if (!title) {
      toast.error("Gib dem Video einen Titel.");
      return;
    }

    const video: LearningVideo = {
      id: uid("video"),
      channelId: activeChannel.id,
      title,
      url: videoForm.url.trim(),
      durationMinutes: parsePositiveInt(videoForm.durationMinutes, 0),
      categoryId: activeChannel.categoryId || DEFAULT_YOUTUBE_CATEGORY_ID,
      status: "todo",
      notes: videoForm.notes.trim(),
      createdAt: new Date().toISOString(),
      watchedAt: "",
    };

    mutate((current) => ({ ...current, videos: [...current.videos, video] }));
    setVideoForm(createVideoForm());
    toast.success("Video in den Lernplan gelegt.");
  }

  function setVideoStatus(videoId: string, status: VideoStatus) {
    const now = new Date().toISOString();
    mutate((current) => ({
      ...current,
      videos: current.videos.map((video) =>
        video.id === videoId
          ? {
              ...video,
              status,
              watchedAt: status === "watched" ? video.watchedAt || now : "",
            }
          : video,
      ),
    }));
  }

  function deleteVideo(videoId: string) {
    mutate((current) => ({
      ...current,
      videos: current.videos.filter((video) => video.id !== videoId),
    }));
  }

  async function copyNextVideos() {
    const nextVideos = openVideos.slice(0, 10);
    if (nextVideos.length === 0) {
      toast.message("Keine offenen Videos in dieser Ansicht.");
      return;
    }

    const links = nextVideos.map((video) => video.url || video.title).join("\n");
    const copied = await copyText(links);
    if (!copied) return;

    const ids = new Set(nextVideos.map((video) => video.id));
    const now = new Date().toISOString();
    mutate((current) => ({
      ...current,
      videos: current.videos.map((video) =>
        ids.has(video.id) ? { ...video, status: "watched", watchedAt: now } : video,
      ),
    }));
    toast.success(`${nextVideos.length} Links kopiert und als gesehen markiert.`);
  }

  async function copyCoachPrompt(video?: LearningVideo) {
    const value = video ? `${coachPrompt}\n${video.title}\n${video.url}` : coachPrompt;
    const copied = await copyText(value);
    if (copied) toast.success("Coach-Prompt kopiert.");
  }

  function openVideo(video: LearningVideo) {
    if (!video.url.trim()) {
      toast.message("Dieses Video hat noch keinen Link.");
      return;
    }
    openExternal(video.url);
  }

  function addBook() {
    const title = bookForm.title.trim();
    if (!title) {
      toast.error("Gib dem Buch einen Titel.");
      return;
    }

    const now = new Date().toISOString();
    const book: LearningBook = {
      id: uid("book"),
      title,
      author: bookForm.author.trim(),
      source: bookForm.source,
      categoryId: bookForm.categoryId || DEFAULT_BOOK_CATEGORY_ID,
      totalPages: parsePositiveInt(bookForm.totalPages, 0),
      currentPage: 0,
      dailyGoal: parsePositiveInt(bookForm.dailyGoal, 10),
      notes: bookForm.notes.trim(),
      status: "reading",
      createdAt: now,
      updatedAt: now,
    };

    mutate((current) => ({ ...current, books: [...current.books, book] }));
    setBookForm(createBookForm());
    toast.success("Buch in die Bibliothek gelegt.");
  }

  function updateBookProgress(bookId: string, currentPage: number) {
    mutate((current) => ({
      ...current,
      books: current.books.map((book) => {
        if (book.id !== bookId) return book;
        const nextPage = clamp(currentPage, 0, book.totalPages || Number.MAX_SAFE_INTEGER);
        const done = book.totalPages > 0 && nextPage >= book.totalPages;
        return {
          ...book,
          currentPage: nextPage,
          status: done ? "done" : book.status === "done" ? "reading" : book.status,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }

  function setBookStatus(bookId: string, status: BookStatus) {
    mutate((current) => ({
      ...current,
      books: current.books.map((book) =>
        book.id === bookId ? { ...book, status, updatedAt: new Date().toISOString() } : book,
      ),
    }));
  }

  function deleteBook(bookId: string) {
    if (!confirmDanger("Buch und Notizen entfernen?")) return;
    mutate((current) => ({
      ...current,
      books: current.books.filter((book) => book.id !== bookId),
    }));
  }

  function saveConnectors() {
    mutate((current) => ({ ...current, connectors: connectorForm }));
    setConnectorsOpen(false);
    toast.success("Lern-Connectoren gespeichert.");
  }

  function saveMinimumVideoMinutes(value: string) {
    mutate((current) => ({
      ...current,
      minimumVideoMinutes: parsePositiveInt(value, 0),
    }));
  }

  function sendBookToKindle(book: LearningBook) {
    const kindleEmail = state.connectors.kindleEmail.trim();
    if (!kindleEmail) {
      setConnectorsOpen(true);
      toast.message("Trage zuerst deine Kindle E-Mail ein.");
      return;
    }

    const subject = encodeURIComponent(`${state.connectors.kindleImportLabel}: ${book.title}`);
    const body = encodeURIComponent(createBookMarkdown(book, categoryById.get(book.categoryId)));
    openExternal(`mailto:${kindleEmail}?subject=${subject}&body=${body}`);
  }

  function exportBook(book: LearningBook) {
    const filename = `${sanitizeFileName(book.title)}-${localDayKey(new Date())}.md`;
    downloadMarkdown(filename, createBookMarkdown(book, categoryById.get(book.categoryId)));
  }

  function exportLearningArchive() {
    const date = localDayKey(new Date());
    const content = createLearningArchiveMarkdown(state, categoryById);
    downloadMarkdown(`connect-lernen-${date}.md`, content);
  }

  return (
    <div className="min-h-full bg-background px-4 pb-24 sm:px-6 md:px-8 md:pb-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 py-4 sm:py-6">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              Lernen
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-normal sm:text-3xl">
              Videos und Buecher als Lernsystem
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Kuratiere YouTube-Kanaele, lies Buecher weiter und exportiere aus Notizen direkte Markdown-Lerneinheiten.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border/70 bg-muted/45 p-1">
              {modeOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  aria-pressed={mode === item.id}
                  className={cn(
                    "flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition-colors sm:text-sm",
                    mode === item.id
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                  )}
                >
                  <item.Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={() => setConnectorsOpen(true)}>
              <Settings className="h-4 w-4" />
              Connectoren
            </Button>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Youtube} label="Heute gesehen" value={`${watchedToday.length} Videos`} detail={durationLabel(watchedToday.reduce((sum, video) => sum + video.durationMinutes, 0))} />
          <Metric icon={Target} label="Offene Lernvideos" value={`${openVideos.length}`} detail={`${savedVideos.length} in der Merkliste`} />
          <Metric icon={BookOpen} label="Lesefortschritt" value={`${pagesRead} Seiten`} detail={`${booksInProgress} aktive Buecher`} />
          <Metric icon={Clock3} label="Gesamte Lernzeit" value={durationLabel(totalLearningMinutes)} detail="aus markierten Videos" />
        </div>

        {mode === "youtube" && (
          <div className="grid gap-5 xl:grid-cols-[23rem_minmax(0,1fr)]">
            <section className="rounded-3xl border border-border/70 bg-card/65 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Kanaele und Playlists</h2>
                  <p className="text-sm text-muted-foreground">Aus FocusTube uebernommen: bewusst kuratieren statt Feed scrollen.</p>
                </div>
                <Youtube className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="learning-channel-name">Name</Label>
                  <Input
                    id="learning-channel-name"
                    placeholder="z. B. Marktstruktur"
                    value={channelForm.name}
                    onChange={(event) => setChannelForm((current) => ({ ...current, name: event.currentTarget.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="learning-channel-url">URL oder Handle</Label>
                  <Input
                    id="learning-channel-url"
                    placeholder="youtube.com/@kanal"
                    value={channelForm.url}
                    onChange={(event) => setChannelForm((current) => ({ ...current, url: event.currentTarget.value }))}
                  />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="learning-channel-category">Kategorie</Label>
                    <CategorySelect
                      id="learning-channel-category"
                      value={channelForm.categoryId}
                      categories={state.categories}
                      onChange={(categoryId) => setChannelForm((current) => ({ ...current, categoryId }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="learning-channel-goal">Ziel/Tag</Label>
                    <Input
                      id="learning-channel-goal"
                      type="number"
                      min="1"
                      value={channelForm.dailyGoal}
                      onChange={(event) => setChannelForm((current) => ({ ...current, dailyGoal: event.currentTarget.value }))}
                    />
                  </div>
                </div>
                <Button type="button" className="w-full" onClick={addChannel}>
                  <Plus className="h-4 w-4" />
                  Kanal hinzufuegen
                </Button>
              </div>

              <div className="mt-5 space-y-2">
                {state.channels.length === 0 ? (
                  <EmptyState icon={Youtube} title="Noch keine Kanaele" body="Fuege einen Kanal oder eine Playlist hinzu und lege danach konkrete Lernvideos ab." />
                ) : (
                  state.channels.map((channel) => {
                    const stats = channelStats.get(channel.id) ?? { open: 0, saved: 0, watched: 0, minutes: 0 };
                    const category = categoryById.get(channel.categoryId);
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => setSelectedChannelId(channel.id)}
                        aria-current={activeChannel?.id === channel.id}
                        className={cn(
                          "group w-full rounded-2xl border p-3 text-left transition-colors",
                          activeChannel?.id === channel.id
                            ? "border-foreground bg-foreground text-background"
                            : "border-border/70 bg-background/70 hover:border-foreground/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <CategoryDot category={category} />
                              <span className="truncate text-sm font-semibold">{channel.name}</span>
                            </div>
                            <p className={cn("mt-1 text-xs", activeChannel?.id === channel.id ? "text-background/72" : "text-muted-foreground")}>
                              {stats.open} offen | {stats.watched}/{channel.dailyGoal} Tagesziel
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label={`${channel.name} entfernen`}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteChannel(channel.id);
                            }}
                            className={cn(
                              "grid h-8 w-8 shrink-0 place-items-center rounded-full opacity-70 transition-opacity hover:opacity-100",
                              activeChannel?.id === channel.id ? "hover:bg-background/15" : "hover:bg-muted",
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="min-w-0 rounded-3xl border border-border/70 bg-card/65 p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{activeChannel?.name ?? "Lernvideos"}</h2>
                  <p className="text-sm text-muted-foreground">
                    Shorts-Filter ab {state.minimumVideoMinutes} Minuten. Aelteste Aufgaben bleiben oben.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => void copyCoachPrompt()}>
                    <Copy className="h-4 w-4" />
                    Coach-Prompt
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => void copyNextVideos()}>
                    <CheckCircle2 className="h-4 w-4" />
                    10 kopieren
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 lg:grid-cols-[minmax(0,1fr)_8rem_8rem]">
                <div className="space-y-1.5">
                  <Label htmlFor="learning-video-title">Video</Label>
                  <Input
                    id="learning-video-title"
                    placeholder="Titel des naechsten Lernvideos"
                    value={videoForm.title}
                    onChange={(event) => setVideoForm((current) => ({ ...current, title: event.currentTarget.value }))}
                    disabled={!activeChannel}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="learning-video-duration">Minuten</Label>
                  <Input
                    id="learning-video-duration"
                    type="number"
                    min="0"
                    value={videoForm.durationMinutes}
                    onChange={(event) => setVideoForm((current) => ({ ...current, durationMinutes: event.currentTarget.value }))}
                    disabled={!activeChannel}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="learning-min-filter">Filter</Label>
                  <Input
                    id="learning-min-filter"
                    type="number"
                    min="0"
                    value={state.minimumVideoMinutes}
                    onChange={(event) => saveMinimumVideoMinutes(event.currentTarget.value)}
                  />
                </div>
                <div className="space-y-1.5 lg:col-span-2">
                  <Label htmlFor="learning-video-url">URL</Label>
                  <Input
                    id="learning-video-url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoForm.url}
                    onChange={(event) => setVideoForm((current) => ({ ...current, url: event.currentTarget.value }))}
                    disabled={!activeChannel}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" className="w-full" onClick={addVideo} disabled={!activeChannel}>
                    <Plus className="h-4 w-4" />
                    Video
                  </Button>
                </div>
                <div className="space-y-1.5 lg:col-span-3">
                  <Label htmlFor="learning-video-notes">Notiz fuer die Analyse</Label>
                  <Textarea
                    id="learning-video-notes"
                    placeholder="Warum ist dieses Video relevant? Was soll der Coach daraus ziehen?"
                    value={videoForm.notes}
                    onChange={(event) => setVideoForm((current) => ({ ...current, notes: event.currentTarget.value }))}
                    disabled={!activeChannel}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleVideos.length === 0 ? (
                  <div className="md:col-span-2 xl:col-span-3">
                    <EmptyState icon={PlayCircle} title="Keine Videos in dieser Ansicht" body="Lege ein Video an oder senke den Minuten-Filter, falls kurze Clips ausgeblendet werden." />
                  </div>
                ) : (
                  visibleVideos.map((video) => (
                    <VideoTile
                      key={video.id}
                      video={video}
                      category={categoryById.get(video.categoryId)}
                      onOpen={() => openVideo(video)}
                      onWatched={() => setVideoStatus(video.id, "watched")}
                      onSave={() => setVideoStatus(video.id, video.status === "saved" ? "todo" : "saved")}
                      onCopyPrompt={() => void copyCoachPrompt(video)}
                      onDelete={() => deleteVideo(video.id)}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {mode === "books" && (
          <div className="grid gap-5 xl:grid-cols-[24rem_minmax(0,1fr)]">
            <section className="rounded-3xl border border-border/70 bg-card/65 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Bibliothek</h2>
                  <p className="text-sm text-muted-foreground">Aus Bockreader uebernommen: Fortschritt, Quelle, Notizen und Markdown-Lerneinheiten.</p>
                </div>
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="learning-book-title">Titel</Label>
                  <Input
                    id="learning-book-title"
                    placeholder="Buchtitel"
                    value={bookForm.title}
                    onChange={(event) => setBookForm((current) => ({ ...current, title: event.currentTarget.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="learning-book-author">Autor</Label>
                  <Input
                    id="learning-book-author"
                    placeholder="Autor oder Herausgeber"
                    value={bookForm.author}
                    onChange={(event) => setBookForm((current) => ({ ...current, author: event.currentTarget.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="learning-book-source">Quelle</Label>
                    <select
                      id="learning-book-source"
                      value={bookForm.source}
                      onChange={(event) => setBookForm((current) => ({ ...current, source: event.currentTarget.value as BookSource }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="kindle">Amazon Kindle</option>
                      <option value="pdf">PDF</option>
                      <option value="epub">EPUB</option>
                      <option value="manual">Manuell</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="learning-book-category">Kategorie</Label>
                    <CategorySelect
                      id="learning-book-category"
                      value={bookForm.categoryId}
                      categories={state.categories}
                      onChange={(categoryId) => setBookForm((current) => ({ ...current, categoryId }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="learning-book-pages">Seiten</Label>
                    <Input
                      id="learning-book-pages"
                      type="number"
                      min="0"
                      value={bookForm.totalPages}
                      onChange={(event) => setBookForm((current) => ({ ...current, totalPages: event.currentTarget.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="learning-book-goal">Ziel/Tag</Label>
                    <Input
                      id="learning-book-goal"
                      type="number"
                      min="1"
                      value={bookForm.dailyGoal}
                      onChange={(event) => setBookForm((current) => ({ ...current, dailyGoal: event.currentTarget.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="learning-book-notes">Startnotiz</Label>
                  <Textarea
                    id="learning-book-notes"
                    placeholder="Warum lesen? Welche Fragen soll das Buch beantworten?"
                    value={bookForm.notes}
                    onChange={(event) => setBookForm((current) => ({ ...current, notes: event.currentTarget.value }))}
                  />
                </div>
                <Button type="button" className="w-full" onClick={addBook}>
                  <Plus className="h-4 w-4" />
                  Buch hinzufuegen
                </Button>
              </div>

              <div className="mt-5 rounded-2xl border border-border/70 bg-background/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Amazon Kindle</div>
                    <div className="text-xs text-muted-foreground">
                      {state.connectors.kindleEmail ? "Send-to-Kindle E-Mail ist gesetzt." : "Kindle E-Mail fehlt noch."}
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setConnectorsOpen(true)}>
                    <Settings className="h-4 w-4" />
                    Setup
                  </Button>
                </div>
              </div>
            </section>

            <section className="min-w-0 rounded-3xl border border-border/70 bg-card/65 p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Leseliste</h2>
                  <p className="text-sm text-muted-foreground">Fortschritt nachhalten, Kindle-Mail vorbereiten und Markdown exportieren.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={exportLearningArchive}>
                  <Download className="h-4 w-4" />
                  Archiv
                </Button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {state.books.length === 0 ? (
                  <div className="lg:col-span-2">
                    <EmptyState icon={BookOpen} title="Noch keine Buecher" body="Fuege Kindle-, PDF-, EPUB- oder manuelle Titel hinzu und halte die Seitenziele direkt hier nach." />
                  </div>
                ) : (
                  state.books.map((book) => (
                    <BookTile
                      key={book.id}
                      book={book}
                      category={categoryById.get(book.categoryId)}
                      onProgress={(page) => updateBookProgress(book.id, page)}
                      onStatus={(status) => setBookStatus(book.id, status)}
                      onKindle={() => sendBookToKindle(book)}
                      onExport={() => exportBook(book)}
                      onDelete={() => deleteBook(book.id)}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {mode === "analytics" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <section className="rounded-3xl border border-border/70 bg-card/65 p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Kategorien und Fokus</h2>
                  <p className="text-sm text-muted-foreground">Sieh, welche Themen Zeit bekommen und wo offene Lernschulden liegen.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={exportLearningArchive}>
                  <FileText className="h-4 w-4" />
                  Markdown
                </Button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {categoryStats.map((row) => (
                  <div key={row.category.id} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <CategoryDot category={row.category} />
                        <span className="truncate font-semibold">{row.category.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{durationLabel(row.videoMinutes)}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <MiniStat label="Videos offen" value={`${row.openVideoCount}`} />
                      <MiniStat label="Seiten" value={`${row.pageCount}`} />
                      <MiniStat label="Buecher" value={`${row.bookCount}`} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-3xl border border-border/70 bg-card/65 p-4 shadow-sm">
                <h2 className="text-lg font-semibold">Kategorien</h2>
                <p className="text-sm text-muted-foreground">Neue Lernbereiche fuer Kanaele und Buecher.</p>
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Neue Kategorie"
                    value={categoryDraft}
                    onChange={(event) => setCategoryDraft(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCategory();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addCategory}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {state.categories.map((category) => (
                    <span key={category.id} className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 text-xs font-medium">
                      <CategoryDot category={category} />
                      {category.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-card/65 p-4 shadow-sm">
                <h2 className="text-lg font-semibold">Letzte Aktivitaet</h2>
                <div className="mt-3 space-y-2">
                  {recentWatchedVideos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Noch keine gesehenen Videos.</p>
                  ) : (
                    recentWatchedVideos.map((video) => (
                      <div key={video.id} className="rounded-2xl border border-border/70 bg-background/70 p-3">
                        <div className="line-clamp-2 text-sm font-medium">{video.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(video.watchedAt)} | {durationLabel(video.durationMinutes)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      <Dialog open={connectorsOpen} onOpenChange={setConnectorsOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl border border-border/80 bg-background/95 shadow-[0_24px_80px_oklch(0_0_0_/_0.18)] backdrop-blur-xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lern-Connectoren</DialogTitle>
            <DialogDescription>
              Kindle, YouTube und Drive Einstellungen nur fuer den Lernbereich von Connect.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
              <div className="flex items-center gap-2 font-semibold">
                <Mail className="h-4 w-4" />
                Amazon Kindle
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="learning-kindle-email">Send-to-Kindle E-Mail</Label>
                  <Input
                    id="learning-kindle-email"
                    placeholder="name_123@kindle.com"
                    value={connectorForm.kindleEmail}
                    onChange={(event) => setConnectorForm((current) => ({ ...current, kindleEmail: event.currentTarget.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="learning-amazon-email">Amazon Konto E-Mail</Label>
                  <Input
                    id="learning-amazon-email"
                    placeholder="konto@example.com"
                    value={connectorForm.amazonEmail}
                    onChange={(event) => setConnectorForm((current) => ({ ...current, amazonEmail: event.currentTarget.value }))}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="learning-kindle-url">Kindle Bibliothek</Label>
                  <Input
                    id="learning-kindle-url"
                    placeholder="https://read.amazon.com/kindle-library"
                    value={connectorForm.kindleLibraryUrl}
                    onChange={(event) => setConnectorForm((current) => ({ ...current, kindleLibraryUrl: event.currentTarget.value }))}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="learning-kindle-label">Import Label</Label>
                  <Input
                    id="learning-kindle-label"
                    value={connectorForm.kindleImportLabel}
                    onChange={(event) => setConnectorForm((current) => ({ ...current, kindleImportLabel: event.currentTarget.value }))}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => openExternal(connectorForm.kindleLibraryUrl)}>
                  <ExternalLink className="h-4 w-4" />
                  Kindle oeffnen
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
              <div className="flex items-center gap-2 font-semibold">
                <Youtube className="h-4 w-4" />
                YouTube Import
              </div>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="learning-youtube-key">YouTube API Key</Label>
                <Input
                  id="learning-youtube-key"
                  type="password"
                  placeholder="Optional fuer spaetere automatische Kanal-Syncs"
                  value={connectorForm.youtubeApiKey}
                  onChange={(event) => setConnectorForm((current) => ({ ...current, youtubeApiKey: event.currentTarget.value }))}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
              <div className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4" />
                Notizen Ablage
              </div>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="learning-drive-folder">Drive/Export Ordner</Label>
                <Input
                  id="learning-drive-folder"
                  value={connectorForm.googleDriveFolder}
                  onChange={(event) => setConnectorForm((current) => ({ ...current, googleDriveFolder: event.currentTarget.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConnectorsOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={saveConnectors}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card/65 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-normal">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/55 px-2 py-2">
      <div className="font-semibold">{value}</div>
      <div className="mt-0.5 text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-background/70 p-6 text-center">
      <Icon className="mx-auto h-6 w-6 text-muted-foreground" />
      <div className="mt-3 font-semibold">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function CategorySelect({
  id,
  value,
  categories,
  onChange,
}: {
  id: string;
  value: string;
  categories: LearningCategory[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
    >
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}

function CategoryDot({ category }: { category?: LearningCategory }) {
  return <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", category?.color ?? "bg-foreground")} />;
}

function VideoTile({
  video,
  category,
  onOpen,
  onWatched,
  onSave,
  onCopyPrompt,
  onDelete,
}: {
  video: LearningVideo;
  category?: LearningCategory;
  onOpen: () => void;
  onWatched: () => void;
  onSave: () => void;
  onCopyPrompt: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex min-h-[15rem] flex-col rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <CategoryDot category={category} />
            {category?.name ?? "Lernen"}
          </div>
          <h3 className="mt-2 line-clamp-3 text-base font-semibold leading-snug">{video.title}</h3>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold",
            video.status === "watched"
              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
              : video.status === "saved"
                ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
                : "bg-muted text-muted-foreground",
          )}
        >
          {videoStatusLabels[video.status]}
        </span>
      </div>

      {video.notes && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{video.notes}</p>}

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{durationLabel(video.durationMinutes)}</span>
          <span>{video.watchedAt ? formatDateTime(video.watchedAt) : "offen"}</span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1">
          <IconButton label="Oeffnen" onClick={onOpen} icon={PlayCircle} />
          <IconButton label="Gesehen" onClick={onWatched} icon={CheckCircle2} />
          <IconButton label="Merken" onClick={onSave} icon={Bookmark} active={video.status === "saved"} />
          <IconButton label="Prompt" onClick={onCopyPrompt} icon={Copy} />
          <IconButton label="Loeschen" onClick={onDelete} icon={Trash2} danger />
        </div>
      </div>
    </article>
  );
}

function BookTile({
  book,
  category,
  onProgress,
  onStatus,
  onKindle,
  onExport,
  onDelete,
}: {
  book: LearningBook;
  category?: LearningCategory;
  onProgress: (page: number) => void;
  onStatus: (status: BookStatus) => void;
  onKindle: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const progress = progressPercent(book.currentPage, book.totalPages);

  return (
    <article className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <CategoryDot category={category} />
            {category?.name ?? "Buch"} | {bookSourceLabels[book.source]}
          </div>
          <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug">{book.title}</h3>
          {book.author && <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
          {bookStatusLabels[book.status]}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{book.currentPage}/{book.totalPages || "?"} Seiten</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`book-page-${book.id}`}>Aktuelle Seite</Label>
          <Input
            id={`book-page-${book.id}`}
            type="number"
            min="0"
            max={book.totalPages || undefined}
            value={book.currentPage}
            onChange={(event) => onProgress(parsePositiveInt(event.currentTarget.value, 0))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`book-status-${book.id}`}>Status</Label>
          <select
            id={`book-status-${book.id}`}
            value={book.status}
            onChange={(event) => onStatus(event.currentTarget.value as BookStatus)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="reading">Liest du</option>
            <option value="paused">Pausiert</option>
            <option value="done">Fertig</option>
          </select>
        </div>
      </div>

      {book.notes && <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{book.notes}</p>}

      <div className="mt-4 grid grid-cols-4 gap-1">
        <IconButton label="Kindle" onClick={onKindle} icon={Mail} />
        <IconButton label="Export" onClick={onExport} icon={Download} />
        <IconButton label="Fertig" onClick={() => onStatus("done")} icon={CheckCircle2} />
        <IconButton label="Loeschen" onClick={onDelete} icon={Trash2} danger />
      </div>
    </article>
  );
}

function IconButton({
  label,
  icon: Icon,
  onClick,
  active = false,
  danger = false,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-9 place-items-center rounded-xl border border-border/70 transition-colors",
        active && "border-foreground bg-foreground text-background",
        danger && "text-destructive hover:border-destructive/40 hover:bg-destructive/10",
        !active && !danger && "hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function progressPercent(current: number, total: number): number {
  if (total <= 0) return 0;
  return clamp(Math.round((current / total) * 100), 0, 100);
}

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

function uid(prefix: string): string {
  const random = typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

function confirmDanger(message: string): boolean {
  if (typeof window === "undefined") return true;
  return window.confirm(message);
}

async function copyText(value: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    toast.error("Zwischenablage ist nicht verfuegbar.");
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    toast.error("Kopieren fehlgeschlagen.");
    return false;
  }
}

function openExternal(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  const href = /^(https?:|mailto:)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (typeof window !== "undefined") window.open(href, "_blank", "noopener,noreferrer");
}

function isToday(value: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return localDayKey(date) === localDayKey(new Date());
}

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sanitizeFileName(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").toLowerCase() || "lernen";
}

function downloadMarkdown(filename: string, content: string) {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 250);
}

function createBookMarkdown(book: LearningBook, category?: LearningCategory): string {
  return [
    `# ${book.title}`,
    "",
    `Datum: ${new Intl.DateTimeFormat("de-DE").format(new Date())}`,
    `Autor: ${book.author || "Unbekannt"}`,
    `Quelle: ${bookSourceLabels[book.source]}`,
    `Kategorie: ${category?.name ?? "Lernen"}`,
    `Fortschritt: ${book.currentPage}/${book.totalPages || "?"} Seiten`,
    `Status: ${bookStatusLabels[book.status]}`,
    "",
    "## Notizen",
    "",
    book.notes || "Noch keine Notizen.",
    "",
    "## Naechste Schritte",
    "",
    `- Weiter bei Seite ${book.currentPage + 1}`,
    `- Tagesziel: ${book.dailyGoal} Seiten`,
  ].join("\n");
}

function createLearningArchiveMarkdown(
  state: LearningState,
  categoryById: Map<string, LearningCategory>,
): string {
  const videos = state.videos
    .map((video) => {
      const category = categoryById.get(video.categoryId);
      return `- [${videoStatusLabels[video.status]}] ${video.title} (${durationLabel(video.durationMinutes)}) - ${category?.name ?? "Lernen"}${video.url ? ` - ${video.url}` : ""}`;
    })
    .join("\n");

  const books = state.books
    .map((book) => {
      const category = categoryById.get(book.categoryId);
      return `- [${bookStatusLabels[book.status]}] ${book.title} - ${book.currentPage}/${book.totalPages || "?"} Seiten - ${category?.name ?? "Buch"}`;
    })
    .join("\n");

  return [
    "# Connect Lernen Archiv",
    "",
    `Export: ${new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`,
    `Notizen-Ordner: ${state.connectors.googleDriveFolder}`,
    "",
    "## YouTube",
    "",
    videos || "Keine Videos erfasst.",
    "",
    "## Buecher",
    "",
    books || "Keine Buecher erfasst.",
  ].join("\n");
}
