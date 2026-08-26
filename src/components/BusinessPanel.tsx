import { useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  Bot,
  Building2,
  Check,
  ChevronDown,
  Clock,
  Mail,
  Plus,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "connect-business-chat";
const DEFAULT_COMPANY_ID = "company-connect";
const DEFAULT_AGENT_ID = "agent-connect-ai";

type Agent = {
  id: string;
  label: string;
  email: string;
  avatarUrl: string;
};

type Company = {
  id: string;
  name: string;
  agents: Agent[];
};

type ChatMessage = {
  id: string;
  companyId: string;
  role: "user" | "agent" | "system";
  body: string;
  createdAt: string;
  agentId?: string;
  agentLabel?: string;
  recipients?: string[];
};

type AgentTaskStatus = "queued" | "waiting" | "captured";

type AgentTask = {
  id: string;
  companyId: string;
  agentId: string;
  messageId: string;
  email: string;
  subject: string;
  body: string;
  status: AgentTaskStatus;
  createdAt: string;
  updatedAt: string;
};

type BusinessState = {
  activeCompanyId: string;
  selectedAgentIds: string[];
  companies: Company[];
  messages: ChatMessage[];
  tasks: AgentTask[];
};

type AgentForm = {
  label: string;
  email: string;
  avatarUrl: string;
};

type CompanyForm = {
  name: string;
};

type TaskAction =
  | { type: "MAIL_OPENED"; at: string }
  | { type: "REPLY_CAPTURED"; at: string };

function defaultCompany(): Company {
  return {
    id: DEFAULT_COMPANY_ID,
    name: "Connect",
    agents: [
      {
        id: DEFAULT_AGENT_ID,
        label: "Connect AI",
        email: "agent@connect.local",
        avatarUrl: "",
      },
    ],
  };
}

function defaultState(): BusinessState {
  const company = defaultCompany();
  return {
    activeCompanyId: company.id,
    selectedAgentIds: [DEFAULT_AGENT_ID],
    companies: [company],
    messages: [
      {
        id: "welcome-message",
        companyId: company.id,
        role: "system",
        body: "Business-Chat bereit.",
        createdAt: new Date().toISOString(),
      },
    ],
    tasks: [],
  };
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function initials(value: string): string {
  const compact = value.trim();
  const parts = compact.split(/\s+/).filter(Boolean);
  const first = parts[0]?.slice(0, 1) || compact.slice(0, 1) || "A";
  const second = parts[1]?.slice(0, 1) ?? parts[0]?.slice(1, 2) ?? "";
  return `${first}${second}`.toUpperCase();
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isAgent(value: unknown): value is Agent {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item['id'] === "string" &&
    typeof item['label'] === "string" &&
    typeof item['email'] === "string" &&
    typeof item['avatarUrl'] === "string"
  );
}

function isCompany(value: unknown): value is Company {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item['id'] === "string" &&
    typeof item['name'] === "string" &&
    Array.isArray(item['agents']) &&
    item['agents'].every(isAgent)
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item['id'] === "string" &&
    typeof item['companyId'] === "string" &&
    typeof item['role'] === "string" &&
    typeof item['body'] === "string" &&
    typeof item['createdAt'] === "string"
  );
}

function isAgentTask(value: unknown): value is AgentTask {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item['id'] === "string" &&
    typeof item['companyId'] === "string" &&
    typeof item['agentId'] === "string" &&
    typeof item['messageId'] === "string" &&
    typeof item['email'] === "string" &&
    typeof item['subject'] === "string" &&
    typeof item['body'] === "string" &&
    typeof item['status'] === "string" &&
    typeof item['createdAt'] === "string" &&
    typeof item['updatedAt'] === "string"
  );
}

function isBusinessState(value: unknown): value is BusinessState {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item['activeCompanyId'] === "string" &&
    Array.isArray(item['selectedAgentIds']) &&
    item['selectedAgentIds'].every((id) => typeof id === "string") &&
    Array.isArray(item['companies']) &&
    item['companies'].every(isCompany) &&
    Array.isArray(item['messages']) &&
    item['messages'].every(isChatMessage) &&
    Array.isArray(item['tasks']) &&
    item['tasks'].every(isAgentTask)
  );
}

function readState(userId: string): BusinessState {
  if (typeof window === "undefined") return defaultState();

  try {
    const stored = window.localStorage.getItem(storageKey(userId));
    if (!stored) return defaultState();
    const parsed: unknown = JSON.parse(stored);
    if (!isBusinessState(parsed) || parsed.companies.length === 0) return defaultState();
    return parsed;
  } catch {
    return defaultState();
  }
}

function persistState(userId: string, state: BusinessState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
}

function transitionTask(task: AgentTask, action: TaskAction): AgentTask {
  switch (task.status) {
    case "queued":
      if (action.type === "MAIL_OPENED") {
        return { ...task, status: "waiting", updatedAt: action.at };
      }
      return task;
    case "waiting":
      if (action.type === "REPLY_CAPTURED") {
        return { ...task, status: "captured", updatedAt: action.at };
      }
      return task;
    case "captured":
      return task;
    default:
      return task;
  }
}

function createMailSubject(company: Company, body: string): string {
  const shortBody = body.trim().replace(/\s+/g, " ").slice(0, 62);
  return `[${company.name}] ${shortBody || "Neue Aufgabe"}`;
}

function createMailBody(company: Company, agents: Agent[], body: string): string {
  return [
    `Unternehmen: ${company.name}`,
    `Agenten: ${agents.map((agent) => agent.label).join(", ")}`,
    "",
    "Nachricht:",
    body.trim(),
    "",
    "Bitte auf diese E-Mail antworten. Die Antwort wird danach in Connect erfasst.",
  ].join("\n");
}

function openMailDraft(company: Company, agents: Agent[], body: string) {
  const recipients = agents.map((agent) => agent.email.trim()).filter(Boolean).join(",");
  const subject = encodeURIComponent(createMailSubject(company, body));
  const mailBody = encodeURIComponent(createMailBody(company, agents, body));
  window.location.href = `mailto:${recipients}?subject=${subject}&body=${mailBody}`;
}

function agentImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

export function BusinessPanel({ userId }: { userId: string }) {
  const [state, setState] = useState<BusinessState>(() => readState(userId));
  const [draft, setDraft] = useState("");
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [replyTaskId, setReplyTaskId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [agentForm, setAgentForm] = useState<AgentForm>({ label: "", email: "", avatarUrl: "" });
  const [companyForm, setCompanyForm] = useState<CompanyForm>({ name: "" });

  useEffect(() => {
    persistState(userId, state);
  }, [state, userId]);

  const activeCompany =
    state.companies.find((company) => company.id === state.activeCompanyId) ??
    state.companies[0] ??
    defaultCompany();
  const activeMessages = useMemo(
    () => state.messages.filter((message) => message.companyId === activeCompany.id),
    [activeCompany.id, state.messages],
  );
  const openTasks = useMemo(
    () =>
      state.tasks.filter(
        (task) => task.companyId === activeCompany.id && task.status !== "captured",
      ),
    [activeCompany.id, state.tasks],
  );
  const selectedAgents = activeCompany.agents.filter((agent) =>
    state.selectedAgentIds.includes(agent.id),
  );
  const busyAgentIds = new Set(openTasks.map((task) => task.agentId));
  const replyTask = replyTaskId ? state.tasks.find((task) => task.id === replyTaskId) : null;
  const replyAgent = replyTask
    ? activeCompany.agents.find((agent) => agent.id === replyTask.agentId)
    : null;

  function selectCompany(companyId: string) {
    const company = state.companies.find((item) => item['id'] === companyId);
    if (!company) return;
    const firstAgentId = company.agents[0]?.id;
    setState((current) => ({
      ...current,
      activeCompanyId: company.id,
      selectedAgentIds: firstAgentId ? [firstAgentId] : [],
    }));
  }

  function toggleAgent(agentId: string) {
    setState((current) => {
      const selected = current.selectedAgentIds.includes(agentId)
        ? current.selectedAgentIds.filter((id) => id !== agentId)
        : [...current.selectedAgentIds, agentId];
      return { ...current, selectedAgentIds: selected };
    });
  }

  function saveCompany() {
    const name = companyForm.name.trim();
    if (!name) {
      toast.error("Unternehmen fehlt.");
      return;
    }

    const company: Company = {
      id: uid("company"),
      name,
      agents: [],
    };

    setState((current) => ({
      ...current,
      companies: [...current.companies, company],
      activeCompanyId: company.id,
      selectedAgentIds: [],
      messages: [
        ...current.messages,
        {
          id: uid("message"),
          companyId: company.id,
          role: "system",
          body: "Business-Chat bereit.",
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setCompanyForm({ name: "" });
    setCompanyDialogOpen(false);
  }

  function saveAgent() {
    const label = agentForm.label.trim();
    const email = agentForm.email.trim();

    if (!label) {
      toast.error("Bezeichnung fehlt.");
      return;
    }

    if (!email.includes("@")) {
      toast.error("E-Mail fehlt.");
      return;
    }

    const agent: Agent = {
      id: uid("agent"),
      label,
      email,
      avatarUrl: agentForm.avatarUrl.trim(),
    };

    setState((current) => ({
      ...current,
      selectedAgentIds: current.selectedAgentIds.length === 0 ? [agent.id] : current.selectedAgentIds,
      companies: current.companies.map((company) =>
        company.id === activeCompany.id
          ? { ...company, agents: [...company.agents, agent] }
          : company,
      ),
    }));
    setAgentForm({ label: "", email: "", avatarUrl: "" });
    setAgentDialogOpen(false);
    toast.success("Agent gespeichert.");
  }

  function sendMessage() {
    const body = draft.trim();
    const agents = selectedAgents.filter((agent) => agent.email.trim());

    if (!body) return;
    if (agents.length === 0) {
      toast.error("Bitte mindestens einen Agenten auswählen.");
      return;
    }

    const createdAt = new Date().toISOString();
    const messageId = uid("message");
    const subject = createMailSubject(activeCompany, body);
    const nextTasks: AgentTask[] = agents.map((agent) => ({
      id: uid("task"),
      companyId: activeCompany.id,
      agentId: agent.id,
      messageId,
      email: agent.email,
      subject,
      body,
      status: "queued",
      createdAt,
      updatedAt: createdAt,
    }));
    const waitingTasks = nextTasks.map((task) =>
      transitionTask(task, { type: "MAIL_OPENED", at: createdAt }),
    );

    setState((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: messageId,
          companyId: activeCompany.id,
          role: "user",
          body,
          createdAt,
          recipients: agents.map((agent) => agent.label),
        },
      ],
      tasks: [...current.tasks, ...waitingTasks],
    }));
    setDraft("");
    openMailDraft(activeCompany, agents, body);
    toast.success("Mail-Entwurf geöffnet.");
  }

  function reopenMail(task: AgentTask) {
    const agent = activeCompany.agents.find((item) => item['id'] === task.agentId);
    if (!agent) return;
    openMailDraft(activeCompany, [agent], task.body);
  }

  function openReply(task: AgentTask) {
    setReplyTaskId(task.id);
    setReplyDraft("");
  }

  function captureReply() {
    if (!replyTask || !replyAgent) return;
    const body = replyDraft.trim();
    if (!body) {
      toast.error("Antwort fehlt.");
      return;
    }

    const createdAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === replyTask.id
          ? transitionTask(task, { type: "REPLY_CAPTURED", at: createdAt })
          : task,
      ),
      messages: [
        ...current.messages,
        {
          id: uid("message"),
          companyId: activeCompany.id,
          role: "agent",
          agentId: replyAgent.id,
          agentLabel: replyAgent.label,
          body,
          createdAt,
        },
      ],
    }));
    setReplyTaskId(null);
    setReplyDraft("");
    toast.success("Antwort abgefangen.");
  }

  async function loadAgentImage(file: File | undefined) {
    if (!file) return;
    try {
      const avatarUrl = await agentImageToDataUrl(file);
      setAgentForm((current) => ({ ...current, avatarUrl }));
    } catch {
      toast.error("Bild konnte nicht geladen werden.");
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-none flex-col px-4 pb-32 pt-2 sm:px-6 md:h-[calc(100dvh-57px)] md:px-5 md:pb-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-border px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-muted"
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{activeCompany.name}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 rounded-2xl p-2">
              <DropdownMenuLabel>Unternehmen</DropdownMenuLabel>
              {state.companies.map((company) => (
                <DropdownMenuItem key={company.id} onSelect={() => selectCompany(company.id)}>
                  {company.id === activeCompany.id ? <Check className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  <span className="truncate">{company.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setCompanyDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Unternehmen hinzufügen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <h2 className="mt-3 truncate font-display text-2xl font-bold tracking-tight md:text-3xl">
            Business
          </h2>
        </div>

        <Button type="button" size="icon" variant="outline" onClick={() => setAgentDialogOpen(true)}>
          <UserPlus className="h-4 w-4" />
          <span className="sr-only">Agent hinzufügen</span>
        </Button>
      </div>

      <div className="mt-5 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-background">
          <div className="border-b border-border bg-muted/30 px-3 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {activeCompany.agents.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setAgentDialogOpen(true)}
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-dashed border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Agent
                </button>
              ) : (
                activeCompany.agents.map((agent) => {
                  const selected = state.selectedAgentIds.includes(agent.id);
                  const busy = busyAgentIds.has(agent.id);
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => toggleAgent(agent.id)}
                      aria-pressed={selected}
                      className={cn(
                        "flex h-14 min-w-[13rem] shrink-0 items-center gap-3 rounded-2xl border px-3 text-left transition-colors",
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      <span className="relative shrink-0">
                        <Avatar className="h-9 w-9 border border-border/60">
                          <AvatarImage src={agent.avatarUrl} alt="" />
                          <AvatarFallback className="text-xs font-bold">
                            {initials(agent.label)}
                          </AvatarFallback>
                        </Avatar>
                        {busy && (
                          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-blue-500" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{agent.label}</span>
                        <span
                          className={cn(
                            "block truncate text-[11px]",
                            selected ? "text-background/70" : "text-muted-foreground",
                          )}
                        >
                          {busy ? "arbeitet" : agent.email}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              {activeMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start",
                    message.role === "system" && "justify-center",
                  )}
                >
                  <article
                    className={cn(
                      "max-w-[min(44rem,88%)] rounded-2xl px-4 py-3 text-sm shadow-sm",
                      message.role === "user" && "bg-foreground text-background",
                      message.role === "agent" && "border border-border bg-muted/45 text-foreground",
                      message.role === "system" && "bg-muted/60 text-muted-foreground shadow-none",
                    )}
                  >
                    {message.role === "agent" && (
                      <p className="mb-1 text-xs font-bold text-muted-foreground">
                        {message.agentLabel}
                      </p>
                    )}
                    {message.recipients && message.recipients.length > 0 && (
                      <p className="mb-1 text-xs font-semibold text-background/70">
                        An {message.recipients.join(", ")}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
                    <p
                      className={cn(
                        "mt-2 text-[10px]",
                        message.role === "user" ? "text-background/55" : "text-muted-foreground",
                      )}
                    >
                      {formatTime(message.createdAt)}
                    </p>
                  </article>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border bg-background p-3 sm:p-4">
            <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[1.75rem] border border-border bg-muted/25 p-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) sendMessage();
                }}
                rows={1}
                className="max-h-36 min-h-10 flex-1 resize-none border-0 bg-transparent px-3 py-2 shadow-none focus-visible:ring-0"
                placeholder="Nachricht an ausgewählte Agenten"
              />
              <button
                type="button"
                aria-label="Senden"
                onClick={sendMessage}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#171717] text-white transition-colors hover:bg-black disabled:opacity-45"
                disabled={!draft.trim() || selectedAgents.length === 0}
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Arbeit</h3>
            <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-bold text-muted-foreground">
              {openTasks.length}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {openTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Keine offenen Antworten.
              </div>
            ) : (
              openTasks.map((task) => {
                const agent = activeCompany.agents.find((item) => item['id'] === task.agentId);
                return (
                  <div key={task.id} className="rounded-2xl border border-border p-3">
                    <div className="flex items-start gap-3">
                      <span className="relative shrink-0">
                        <Avatar className="h-9 w-9 border border-border/60">
                          <AvatarImage src={agent?.avatarUrl ?? ""} alt="" />
                          <AvatarFallback className="text-xs font-bold">
                            {initials(agent?.label ?? "AI")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-blue-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{agent?.label ?? "Agent"}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {task.status === "queued" ? "bereit" : "wartet"} · {formatTime(task.updatedAt)}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => reopenMail(task)}>
                        <Mail className="h-4 w-4" />
                        Mail
                      </Button>
                      <Button type="button" size="sm" onClick={() => openReply(task)}>
                        <Bot className="h-4 w-4" />
                        Antwort
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agent</DialogTitle>
            <DialogDescription className="sr-only">
              Agentenbild, Bezeichnung und E-Mail einstellen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="agent-label">Bezeichnung</Label>
              <Input
                id="agent-label"
                value={agentForm.label}
                onChange={(event) => setAgentForm((current) => ({ ...current, label: event.target.value }))}
                placeholder="z. B. Sales AI"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-email">E-Mail</Label>
              <Input
                id="agent-email"
                type="email"
                value={agentForm.email}
                onChange={(event) => setAgentForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="agent@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-avatar-url">Bild-URL</Label>
              <Input
                id="agent-avatar-url"
                value={agentForm.avatarUrl}
                onChange={(event) =>
                  setAgentForm((current) => ({ ...current, avatarUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-avatar-file">Bild hochladen</Label>
              <Input
                id="agent-avatar-file"
                type="file"
                accept="image/*"
                onChange={(event) => void loadAgentImage(event.target.files?.[0])}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" className="w-full" onClick={saveAgent}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unternehmen</DialogTitle>
            <DialogDescription className="sr-only">
              Neues Unternehmen für Business-Agenten anlegen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="company-name">Name</Label>
            <Input
              id="company-name"
              value={companyForm.name}
              onChange={(event) => setCompanyForm({ name: event.target.value })}
              placeholder="Unternehmen"
            />
          </div>
          <DialogFooter>
            <Button type="button" className="w-full" onClick={saveCompany}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(replyTask)} onOpenChange={(open) => !open && setReplyTaskId(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Antwort</DialogTitle>
            <DialogDescription className="sr-only">
              Eingegangene E-Mail-Antwort als Agentenantwort im Chat erfassen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/30 p-3">
              <p className="text-sm font-bold">{replyAgent?.label ?? "Agent"}</p>
              <p className="mt-1 max-h-16 overflow-hidden text-xs text-muted-foreground">
                {replyTask?.body}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reply-body">Antworttext</Label>
              <Textarea
                id="reply-body"
                rows={6}
                value={replyDraft}
                onChange={(event) => setReplyDraft(event.target.value)}
                placeholder="Antwort aus der E-Mail einfügen"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" className="w-full" onClick={captureReply}>
              Antwort speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
