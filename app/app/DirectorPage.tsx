"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { parseDirectorReply } from "../../lib/director-chat";
import PromptVideoComposer, { type DirectorContext } from "./PromptVideoComposer";
import type { ListingItem, VideoItem } from "./page";
import "./director-page.css";

type Message = { id: string; role: "user" | "assistant"; content: string; brief?: string | null; ready?: boolean; context?: DirectorContext; projectId?: number; requestId?: string };
type Chat = { id: string; title: string; messages: Message[]; context: DirectorContext };
const defaults: DirectorContext = { listingId: null, aspectRatio: "16:9", duration: 30 };
const newChat = (): Chat => ({ id: crypto.randomUUID(), title: "New conversation", messages: [], context: { ...defaults } });
const starters = ["Make a cinematic listing tour", "Help me plan a standout property reel", "Give my listing a warm, inviting feel"];

export default function DirectorPage({ userId, workspaceId, listings, walletBalance, onAddListing, onUploadFiles, onCreated, onOpenVideos, onTopUp }: {
  userId: string; workspaceId: string; listings: ListingItem[]; walletBalance: number;
  onAddListing: () => void; onUploadFiles: (files: File[]) => Promise<ListingItem>;
  onCreated: (project: VideoItem) => void; onOpenVideos: () => void; onTopUp: () => void;
}) {
  const [chat, setChat] = useState<Chat>(newChat);
  const [history, setHistory] = useState<Chat[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [costs, setCosts] = useState<Record<number, number>>({});
  const lock = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const storageKey = `homie-director-v1:${workspaceId}:${userId}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      // Browser-only history is hydrated after mount to preserve server rendering.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(saved)) setHistory(saved.filter(c => c && typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.messages) && c.messages.every((m: Message) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role)) && c.context).slice(0, 20));
    } catch { setStorageError(true); }
    setLoaded(true);
    void getSupabaseBrowserClient().rpc("get_prompt_video_options").then(({ data }) => {
      if (data) setCosts(Object.fromEntries(data.map((row: { duration_seconds: number; credits_cost: number }) => [row.duration_seconds, row.credits_cost])));
    });
  }, [storageKey]);
  useEffect(() => {
    if (!loaded || !chat.messages.length) return;
    // Synchronize the active conversation into the locally persisted history.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(previous => {
      const next = [chat, ...previous.filter(c => c.id !== chat.id)].slice(0, 20);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { setStorageError(true); }
      return next;
    });
  }, [chat, loaded, storageKey]);
  useEffect(() => { if (chat.messages.length) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [chat.messages.length, busy]);
  const updateContext = useCallback((context: DirectorContext) => setChat(current => ({ ...current, context })), []);

  async function send(text: string, context: DirectorContext) {
    if (lock.current) return;
    if (chat.messages.length >= 38) throw new Error("Start a new conversation to keep creating.");
    lock.current = true; setBusy(true); setError("");
    const message: Message = { id: crypto.randomUUID(), role: "user", content: text, context };
    const next = [...chat.messages, message];
    // Commit only once the response succeeds: failed messages remain editable in the composer.
    try {
      const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
      if (!session) throw new Error("Please sign in again to continue.");
      const response = await fetch("/api/director/chat", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, signal: AbortSignal.timeout(55000), body: JSON.stringify({ workspaceId, context, messages: next.map(m => ({ role: m.role, content: m.content + (m.brief ? `\nVideo brief: ${m.brief}` : "") })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Director could not respond. Please try again.");
      const reply = parseDirectorReply(result);
      setChat(current => ({ ...current, context, title: current.messages.length ? current.title : text.slice(0, 64), messages: [...next, { id: crypto.randomUUID(), role: "assistant", content: reply.answer, brief: reply.brief, ready: reply.ready, context, requestId: crypto.randomUUID() }] }));
    } catch (cause) { throw new Error(cause instanceof Error ? cause.message : "Could not send your message."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function generate(message: Message) {
    if (lock.current || !message.brief || !message.context || message.projectId) return;
    const context = message.context;
    const listing = listings.find(l => l.id === context.listingId);
    const cost = costs[context.duration];
    if (!listing || listing.photos < 1 || listing.photos > 30) { setError("Choose a listing with 1–30 photos and ask Director to update the brief."); return; }
    if (cost == null) { setError("Could not load the generation price. Please reopen Director to retry."); return; }
    if (walletBalance < cost) { onTopUp(); return; }
    lock.current = true; setGenerating(true); setError("");
    try {
      const { data, error: queueError } = await getSupabaseBrowserClient().rpc("queue_prompt_video_project", { target_workspace_id: workspaceId, target_listing_id: listing.id, user_prompt: message.brief, target_aspect_ratio: context.aspectRatio, target_duration: context.duration, expected_credits: cost, request_id: message.requestId });
      if (queueError) throw new Error(queueError.message);
      const project = Array.isArray(data) ? data[0] : data;
      if (!project?.id) throw new Error("Could not confirm the video. Please retry.");
      setChat(current => ({ ...current, messages: current.messages.map(m => m.id === message.id ? { ...m, projectId: project.id } : m) }));
      onCreated({ id: project.id, title: project.title, address: listing.address, city: listing.city, price: listing.price, template: "Homie Director", format: context.aspectRatio, duration: `${context.duration}s`, credits: project.credits_cost, photosUsed: listing.photos, totalPhotos: listing.photos, created: "Just now", status: "Generating", image: listing.image, progress: 0, stage: "Queued" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not queue your video. Please retry."); }
    finally { lock.current = false; setGenerating(false); }
  }
  function openChat(value: Chat) { setChat(value); setError(""); setHistoryOpen(false); }
  const hasMessages = chat.messages.length > 0;
  return <section className={`director-page ${hasMessages ? "has-conversation" : "is-empty"}`} aria-label="Homie Director">
    <div className="director-actions">
      <button disabled={busy || generating} onClick={() => openChat(newChat())}><span aria-hidden="true">＋</span> New chat</button>
      <button disabled={busy || generating} aria-expanded={historyOpen} onClick={() => setHistoryOpen(value => !value)}>Recent chats <span aria-hidden="true">⌄</span></button>
    </div>
    {historyOpen && <aside className="director-history" aria-label="Recent chats"><header><strong>Recent chats</strong><small>{storageError ? "Chat history could not be saved" : "Saved on this device"}</small></header>{history.length ? history.map(item => <button key={item.id} aria-current={item.id === chat.id ? "true" : undefined} onClick={() => openChat(item)}>{item.title}</button>) : <p>Your conversations will appear here.</p>}</aside>}
    <div className="director-center">
      {!hasMessages && <div className="director-welcome"><div className="director-emblem" aria-hidden="true">✦</div><p className="director-eyebrow">MEET HOMIE DIRECTOR</p><h1>A great home.<br />An unforgettable film.</h1><p>Your real estate video specialist. Share an idea, shape it together,<br className="director-desktop-break" /> and turn your property photos into a film worth watching.</p></div>}
      {hasMessages && <div className="director-messages" role="log" aria-label="Conversation">{chat.messages.map((message, index) => <article key={message.id} className={`director-message ${message.role}`}><span className="director-author">{message.role === "user" ? "You" : "✦ Homie Director"}</span><div className="director-message-text">{message.content}</div>{message.brief && <div className="director-brief"><header><span>YOUR VIDEO DIRECTION</span><span>{message.context?.duration}s · {message.context?.aspectRatio} · 1080p</span></header><strong className="director-brief-property">{listings.find(l => l.id === message.context?.listingId)?.address ?? "Property direction"}</strong><p>{message.brief}</p>{message.projectId ? <div className="director-queued"><strong>Your film is queued</strong><button onClick={onOpenVideos}>Follow in My videos →</button></div> : message.ready && index === chat.messages.length - 1 ? <footer><span>{costs[message.context?.duration ?? 30] != null ? `${costs[message.context?.duration ?? 30]} credits` : "Loading price…"}</span><button disabled={busy || generating || costs[message.context?.duration ?? 30] == null} onClick={() => void generate(message)}>{generating ? "Queuing…" : "Generate film →"}</button></footer> : <small>{message.ready ? "A newer direction is available below." : "Select a property and continue the conversation to prepare your film."}</small>}</div>}</article>)}</div>}
      {busy && <p className="director-thinking" role="status"><span className="prompt-video-spinner" /> Director is thinking through your film…</p>}
      {error && <p className="director-error" role="alert">{error}</p>}
      <div className="director-composer-area"><PromptVideoComposer key={chat.id} initialContext={chat.context} listings={listings} onAddListing={onAddListing} onUploadFiles={onUploadFiles} onSend={send} onContextChange={updateContext} busy={busy || generating} /></div><div ref={bottom} />
      {!hasMessages && <div className="director-starters">{starters.map(text => <button key={text} disabled={busy || generating} onClick={() => void send(text, chat.context).catch(cause => setError(cause.message))}>{text}<span aria-hidden="true">↗</span></button>)}</div>}
    </div>
  </section>;
}
