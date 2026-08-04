export const LEARNING_STORAGE_PREFIX = "connect-learning";
export const LEARNING_STATE_EVENT = "connect-learning-state-updated";

export const DEFAULT_YOUTUBE_CATEGORY_ID = "category-youtube";
export const DEFAULT_BOOK_CATEGORY_ID = "category-books";

export type LearningMode = "youtube" | "books" | "analytics";
export type VideoStatus = "todo" | "saved" | "watched";
export type BookStatus = "reading" | "paused" | "done";
export type BookSource = "kindle" | "pdf" | "epub" | "manual";

export type LearningCategory = {
  id: string;
  name: string;
  color: string;
};

export type LearningChannel = {
  id: string;
  name: string;
  url: string;
  categoryId: string;
  dailyGoal: number;
  createdAt: string;
};

export type LearningVideo = {
  id: string;
  channelId: string;
  title: string;
  url: string;
  durationMinutes: number;
  categoryId: string;
  status: VideoStatus;
  notes: string;
  createdAt: string;
  watchedAt: string;
};

export type LearningBook = {
  id: string;
  title: string;
  author: string;
  source: BookSource;
  categoryId: string;
  totalPages: number;
  currentPage: number;
  dailyGoal: number;
  notes: string;
  status: BookStatus;
  createdAt: string;
  updatedAt: string;
};

export type LearningConnectors = {
  kindleEmail: string;
  amazonEmail: string;
  kindleLibraryUrl: string;
  kindleImportLabel: string;
  youtubeApiKey: string;
  googleDriveFolder: string;
};

export type LearningState = {
  categories: LearningCategory[];
  channels: LearningChannel[];
  videos: LearningVideo[];
  books: LearningBook[];
  connectors: LearningConnectors;
  minimumVideoMinutes: number;
};

export const DEFAULT_LEARNING_CONNECTORS: LearningConnectors = {
  kindleEmail: "",
  amazonEmail: "",
  kindleLibraryUrl: "https://read.amazon.com/kindle-library",
  kindleImportLabel: "Connect Kindle Import",
  youtubeApiKey: "",
  googleDriveFolder: "/Connect/Lernen",
};

const DEFAULT_LEARNING_CATEGORIES: LearningCategory[] = [
  { id: DEFAULT_YOUTUBE_CATEGORY_ID, name: "YouTube", color: "bg-red-500" },
  { id: DEFAULT_BOOK_CATEGORY_ID, name: "Buecher", color: "bg-sky-500" },
  { id: "category-business", name: "Business", color: "bg-emerald-500" },
  { id: "category-trading", name: "Trading", color: "bg-amber-500" },
  { id: "category-systems", name: "Systeme", color: "bg-violet-500" },
];

export function createEmptyLearningState(): LearningState {
  return {
    categories: DEFAULT_LEARNING_CATEGORIES.map((category) => ({ ...category })),
    channels: [],
    videos: [],
    books: [],
    connectors: { ...DEFAULT_LEARNING_CONNECTORS },
    minimumVideoMinutes: 3,
  };
}

export function learningStorageKey(userId: string): string {
  return `${LEARNING_STORAGE_PREFIX}:${userId}`;
}

export function readLearningState(userId: string): LearningState {
  if (typeof window === "undefined") return createEmptyLearningState();

  try {
    const raw = window.localStorage.getItem(learningStorageKey(userId));
    if (!raw) return createEmptyLearningState();
    return normalizeLearningState(JSON.parse(raw) as unknown);
  } catch {
    return createEmptyLearningState();
  }
}

export function saveLearningState(userId: string, state: LearningState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(learningStorageKey(userId), JSON.stringify(state));
  } catch {
    // localStorage can fail in private mode or when the quota is full.
  }
}

export function updateLearningConnectors(
  userId: string,
  connectors: LearningConnectors,
): LearningState {
  const current = readLearningState(userId);
  const next = { ...current, connectors };
  saveLearningState(userId, next);
  return next;
}

function normalizeLearningState(value: unknown): LearningState {
  const defaults = createEmptyLearningState();
  if (!value || typeof value !== "object") return defaults;

  const item = value as Record<string, unknown>;
  const categories = normalizeList(item["categories"], normalizeCategory);
  const connectors = normalizeConnectors(item["connectors"], defaults.connectors);
  const minimumVideoMinutes = normalizeNumber(item["minimumVideoMinutes"], defaults.minimumVideoMinutes);

  return {
    categories: categories.length > 0 ? categories : defaults.categories,
    channels: normalizeList(item["channels"], normalizeChannel),
    videos: normalizeList(item["videos"], normalizeVideo),
    books: normalizeList(item["books"], normalizeBook),
    connectors,
    minimumVideoMinutes: Math.max(0, Math.round(minimumVideoMinutes)),
  };
}

function normalizeList<T>(value: unknown, normalize: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalize).filter((item): item is T => item !== null);
}

function normalizeCategory(value: unknown): LearningCategory | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = normalizeString(item["id"]);
  const name = normalizeString(item["name"]);
  if (!id || !name) return null;

  return {
    id,
    name,
    color: normalizeString(item["color"], "bg-foreground"),
  };
}

function normalizeChannel(value: unknown): LearningChannel | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = normalizeString(item["id"]);
  const name = normalizeString(item["name"]);
  if (!id || !name) return null;

  return {
    id,
    name,
    url: normalizeString(item["url"]),
    categoryId: normalizeString(item["categoryId"], DEFAULT_YOUTUBE_CATEGORY_ID),
    dailyGoal: Math.max(1, Math.round(normalizeNumber(item["dailyGoal"], 1))),
    createdAt: normalizeString(item["createdAt"], new Date().toISOString()),
  };
}

function normalizeVideo(value: unknown): LearningVideo | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = normalizeString(item["id"]);
  const channelId = normalizeString(item["channelId"]);
  const title = normalizeString(item["title"]);
  if (!id || !channelId || !title) return null;

  return {
    id,
    channelId,
    title,
    url: normalizeString(item["url"]),
    durationMinutes: Math.max(0, Math.round(normalizeNumber(item["durationMinutes"], 0))),
    categoryId: normalizeString(item["categoryId"], DEFAULT_YOUTUBE_CATEGORY_ID),
    status: normalizeVideoStatus(item["status"]),
    notes: normalizeString(item["notes"]),
    createdAt: normalizeString(item["createdAt"], new Date().toISOString()),
    watchedAt: normalizeString(item["watchedAt"]),
  };
}

function normalizeBook(value: unknown): LearningBook | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = normalizeString(item["id"]);
  const title = normalizeString(item["title"]);
  if (!id || !title) return null;

  const totalPages = Math.max(0, Math.round(normalizeNumber(item["totalPages"], 0)));
  const currentPage = Math.min(
    totalPages || Number.MAX_SAFE_INTEGER,
    Math.max(0, Math.round(normalizeNumber(item["currentPage"], 0))),
  );

  return {
    id,
    title,
    author: normalizeString(item["author"]),
    source: normalizeBookSource(item["source"]),
    categoryId: normalizeString(item["categoryId"], DEFAULT_BOOK_CATEGORY_ID),
    totalPages,
    currentPage,
    dailyGoal: Math.max(1, Math.round(normalizeNumber(item["dailyGoal"], 10))),
    notes: normalizeString(item["notes"]),
    status: normalizeBookStatus(item["status"]),
    createdAt: normalizeString(item["createdAt"], new Date().toISOString()),
    updatedAt: normalizeString(item["updatedAt"], new Date().toISOString()),
  };
}

function normalizeConnectors(value: unknown, fallback: LearningConnectors): LearningConnectors {
  if (!value || typeof value !== "object") return fallback;
  const item = value as Record<string, unknown>;

  return {
    kindleEmail: normalizeString(item["kindleEmail"], fallback.kindleEmail),
    amazonEmail: normalizeString(item["amazonEmail"], fallback.amazonEmail),
    kindleLibraryUrl: normalizeString(item["kindleLibraryUrl"], fallback.kindleLibraryUrl),
    kindleImportLabel: normalizeString(item["kindleImportLabel"], fallback.kindleImportLabel),
    youtubeApiKey: normalizeString(item["youtubeApiKey"], fallback.youtubeApiKey),
    googleDriveFolder: normalizeString(item["googleDriveFolder"], fallback.googleDriveFolder),
  };
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeVideoStatus(value: unknown): VideoStatus {
  switch (value) {
    case "saved":
    case "watched":
    case "todo":
      return value;
    default:
      return "todo";
  }
}

function normalizeBookStatus(value: unknown): BookStatus {
  switch (value) {
    case "paused":
    case "done":
    case "reading":
      return value;
    default:
      return "reading";
  }
}

function normalizeBookSource(value: unknown): BookSource {
  switch (value) {
    case "pdf":
    case "epub":
    case "manual":
    case "kindle":
      return value;
    default:
      return "manual";
  }
}
