"use client";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { parseDirectorReply } from "../../lib/director-chat";
import PromptVideoComposer, { type DirectorContext } from "./PromptVideoComposer";
import type { ListingItem, VideoItem } from "./page";
import "./director-page.css";
import { DIRECTOR_DEMO_USER_ID, DIRECTOR_DEMO_ID, directorDemoChat, directorDemoVideos } from "./director-demo";

type Message = { id: string; role: "user" | "assistant"; content: string; brief?: string | null; ready?: boolean; context?: DirectorContext; projectId?: number; requestId?: string };
type Chat = { id: string; title: string; messages: Message[]; context: DirectorContext };
const defaults: DirectorContext = { listingId: null, aspectRatio: "16:9", duration: 30 };
const newChat = (): Chat => ({ id: crypto.randomUUID(), title: "New conversation", messages: [], context: { ...defaults } });


function EditableProjectTitle({ title, onSave }: { title: string; onSave: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const input = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);
  useEffect(() => { if (editing) { input.current?.focus(); input.current?.select(); } }, [editing]);
  function save() {
    if (!cancelled.current) {
      const name = draft.trim();
      if (name && name !== title) onSave(name);
    }
    setEditing(false);
  }
  return editing ? <input ref={input} className="director-title-input" aria-label="Project name" maxLength={80} value={draft}
    onChange={event => setDraft(event.target.value)} onBlur={save}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === "Escape") { event.preventDefault(); cancelled.current = true; setEditing(false); }
    }} /> : <button type="button" className="director-title-button" title="Rename project" aria-label={`Rename project: ${title}`} onClick={() => { cancelled.current = false; setDraft(title); setEditing(true); }}>
      <strong>{title}</strong><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-3 3 5 5" /></svg>
    </button>;
}


export default function DirectorPage({ userId, workspaceId, listings, videos, walletBalance, onUploadFiles, onCreated, onOpenVideos, onTopUp }: {
  userId: string; workspaceId: string; listings: ListingItem[]; videos: VideoItem[]; walletBalance: number;
  onAddListing: () => void; onUploadFiles: (files: File[]) => Promise<ListingItem>;
  onCreated: (project: VideoItem) => void; onOpenVideos: () => void; onTopUp: () => void;
}) {
  const [chat, setChat] = useState<Chat>(newChat);
  const [history, setHistory] = useState<Chat[]>([]);
  const demoEnabled = userId === DIRECTOR_DEMO_USER_ID;
  const isDemo = demoEnabled && chat.id === DIRECTOR_DEMO_ID;
  const projects = demoEnabled ? [{ ...directorDemoChat, ...(history.find(item => item.id === DIRECTOR_DEMO_ID) ?? {}) }, ...history.filter(item => item.id !== DIRECTOR_DEMO_ID)] : history;
  const availableVideos = demoEnabled ? [...videos, ...directorDemoVideos] : videos;
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [mobilePane, setMobilePane] = useState<"chat" | "videos">("chat");
  const [panel, setPanel] = useState<"preview" | "plan">("preview");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planDrafts, setPlanDrafts] = useState<Record<string, string>>({});
  const [planNotice, setPlanNotice] = useState("");
  const planInput = useRef<HTMLTextAreaElement>(null);
  const selectedPlan = chat.messages.find(message => message.id === selectedPlanId && message.brief);
  const planDraft = selectedPlan ? (planDrafts[selectedPlan.id] ?? selectedPlan.brief ?? "") : "";
  const planChanged = !!selectedPlan && planDraft.trim() !== selectedPlan.brief;
  useEffect(() => { if (panel === "plan") planInput.current?.focus(); }, [panel, selectedPlanId]);
  useEffect(() => {
    const field = planInput.current;
    if (panel !== "plan" || !field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [planDraft, panel, selectedPlanId]);
  function openPlan(message: Message) {
    setSelectedPlanId(message.id); setPanel("plan"); setMobilePane("videos"); setPlanNotice("");
  }
  function savePlan() {
    if (!selectedPlan || !planDraft.trim() || !planChanged || busy || generating) return;
    const brief = planDraft.trim();
    // A rendered plan is a snapshot. Editing it creates a new direction for the next film.
    const revised: Message = { ...selectedPlan, id: selectedPlan.projectId ? crypto.randomUUID() : selectedPlan.id,
      brief, projectId: undefined, requestId: crypto.randomUUID(), content: selectedPlan.projectId ? "Updated video plan" : selectedPlan.content };
    setChat(current => ({ ...current, messages: selectedPlan.projectId ? [...current.messages, revised] : current.messages.map(message => message.id === selectedPlan.id ? revised : message) }));
    setPlanDrafts(current => { const next = { ...current }; delete next[selectedPlan.id]; return next; });
    setSelectedPlanId(revised.id);
    setPlanNotice(selectedPlan.projectId ? "Saved as a new plan. Your existing video is unchanged." : "Plan saved.");
  }
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


  async function send(text: string, context: DirectorContext) {
    if (isDemo) throw new Error("This is a preview project. Start a new project to create your own film.");
    if (lock.current) return;
    if (chat.messages.length >= 38) throw new Error("Start a new conversation to keep creating.");
    lock.current = true; setBusy(true); setError("");
    const message: Message = { id: crypto.randomUUID(), role: "user", content: text, context };
    const next = [...chat.messages, message];
    setPendingMessage(message);
    // Commit only once the response succeeds: failed messages remain editable in the composer.
    try {
      const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
      if (!session) throw new Error("Please sign in again to continue.");
      const response = await fetch("/api/director/chat", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, signal: AbortSignal.timeout(55000), body: JSON.stringify({ workspaceId, context, messages: next.map(m => ({ role: m.role, content: m.content + (m.brief ? `\nVideo brief: ${m.brief}` : "") })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result && typeof result === "object" && "error" in result && typeof result.error === "string" ? result.error : "Director could not respond. Please try again.");
      const reply = parseDirectorReply(result);
      const resolvedContext: DirectorContext = { ...context, ...reply.context };
      setChat(current => ({ ...current, context: resolvedContext, title: current.messages.length ? current.title : text.slice(0, 64), messages: [...next, { id: crypto.randomUUID(), role: "assistant", content: reply.answer, brief: reply.brief, ready: reply.ready, context: resolvedContext, requestId: crypto.randomUUID() }] }));
    } catch (cause) { throw new Error(cause instanceof Error ? cause.message : "Could not send your message."); }
    finally { lock.current = false; setBusy(false); setPendingMessage(null); }
  }
  async function generate(message: Message) {
    if (isDemo || lock.current || !message.brief || !message.context || message.projectId) return;
    const context = message.context;
    const listing = listings.find(l => l.id === context.listingId);
    const cost = costs[context.duration];
    if (!listing || listing.photos < 1 || listing.photos > 30) { setError("Tell Director which property to use, or attach 1–30 photos, then update the plan."); return; }
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
  function openChat(value: Chat) { setChat(value); setError(""); setMobilePane("chat"); setPanel("preview"); setSelectedPlanId(null); setPlanDrafts({}); setPlanNotice(""); }
  const hasMessages = chat.messages.length > 0;
  const versions = chat.messages.filter(message => message.projectId);
  const composer = <PromptVideoComposer key={chat.id} initialContext={chat.context} onUploadFiles={isDemo ? async () => { throw new Error("Start a new project to use your own photos."); } : onUploadFiles} onSend={send} busy={busy || generating} />;
  return <section className={`director-page ${hasMessages ? "director-workspace" : "director-home"}`} aria-label="Homie Director">
    {!hasMessages ? <>
      <div className="director-home-hero">
        <p className="director-eyebrow">HOMIE DIRECTOR</p>
        <h1>What’s the story of your next listing?</h1>
        <p className="director-home-subtitle">Your vision. A little direction. An extraordinary property film.</p>
        <div className="director-home-composer">{composer}</div>
        {busy && <p className="director-thinking" role="status">Director is shaping your idea…</p>}
        {error && <p className="director-error" role="alert">{error}</p>}
      </div>
      {projects.length > 0 && <section className="director-projects" aria-label="Your projects">
        <header><div><h2>Your projects</h2><p>{storageError ? "Project history could not be saved." : "Pick up where you left off. Saved on this device."}</p></div><span>{projects.length} {projects.length === 1 ? "project" : "projects"}</span></header>
        <div className="director-project-grid">{projects.map(item => {
          const listing = listings.find(l => l.id === item.context.listingId);
          const generated = item.messages.filter(m => m.projectId);
          const latest = availableVideos.find(v => v.id === generated.at(-1)?.projectId);
          const cover = latest?.image || listing?.image;
          return <button className="director-project-card" key={item.id} disabled={busy || generating} onClick={() => openChat(item)}>
            <div className="director-project-cover">{cover ? <img src={cover} alt="" loading="lazy" /> : <span aria-hidden="true">✦</span>}<span className="director-project-badge">{generated.length ? `${generated.length} video ${generated.length === 1 ? "version" : "versions"}` : "In development"}</span></div>
            <div className="director-project-copy"><strong>{item.title}</strong><span>{listing?.address ?? "Creative direction"}<span className="director-project-open" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg></span></span></div>
          </button>;
        })}</div>
      </section>}
    </> : <>
      <div className="director-mobile-tabs" aria-label="Workspace panels"><button aria-pressed={mobilePane === "chat"} onClick={() => setMobilePane("chat")}>Conversation</button><button aria-pressed={mobilePane === "videos"} onClick={() => setMobilePane("videos")}>{panel === "plan" ? "Video plan" : "Videos"}{versions.length ? ` (${versions.length})` : ""}</button></div>
      <section className={`director-chat-panel ${mobilePane === "chat" ? "mobile-visible" : ""}`} aria-label="Project conversation">
        <header className="director-project-header"><button aria-label="Back to Director projects" disabled={busy || generating} onClick={() => openChat(newChat())}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg></button><div><EditableProjectTitle title={chat.title} onSave={title => setChat(current => ({ ...current, title }))} /><span>{isDemo ? "Demo project · Example footage" : "Homie Director"}</span></div></header>
        <div className="director-chat-scroll"><div className="director-messages" role="log" aria-label="Conversation">{[...chat.messages, ...(pendingMessage ? [pendingMessage] : [])].map((message, index) => <article key={message.id} className={`director-message ${message.role}`}>
          <span className="director-author">{message.role === "user" ? "You" : <><span className="director-author-icon" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m4 9 16-4-1-4L3 5l1 4Zm0 0h17v12H4V9Z" /><path d="m8 4 3 3m3-5 3 3M4 13h17" /></svg></span>Director</>}</span><div className="director-message-text">{message.content}</div>
          {message.brief && <div className={`director-brief ${panel === "plan" && selectedPlanId === message.id ? "is-selected" : ""}`}><button type="button" className="director-brief-open" aria-label={`Open video plan ${chat.messages.filter(m => m.brief).findIndex(m => m.id === message.id) + 1}`} aria-pressed={panel === "plan" && selectedPlanId === message.id} onClick={() => openPlan(message)}><header><span className="director-brief-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 8h8M8 12h8M8 16h4" /></svg>Video plan</span><span className="director-brief-specs"><span>{message.context?.duration}s</span><span>{message.context?.aspectRatio}</span></span></header><p>{message.brief}</p><span className="director-brief-edit">Open plan <span aria-hidden="true">↗</span></span></button>
            {message.projectId ? <div className="director-sent"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg><span>Added to your video versions</span></div> : !isDemo && message.ready && index === chat.messages.length - 1 ? <footer><span>{costs[message.context?.duration ?? 30] != null ? `${costs[message.context?.duration ?? 30]} credits` : "Loading price…"}</span><button disabled={busy || generating || costs[message.context?.duration ?? 30] == null} onClick={() => void generate(message)}>{generating ? "Queuing…" : "Generate film →"}</button></footer> : <small>{isDemo ? "Demo plan · Edits saved on this device." : message.ready ? "Updated direction below." : "Tell Director which home to use or attach photos to continue."}</small>}
          </div>}
        </article>)}</div>
        {busy && <p className="director-thinking" role="status"><span className="prompt-video-spinner" /> Director is thinking…</p>}
        {error && <p className="director-error" role="alert">{error}</p>}<div ref={bottom} /></div>
        <div className="director-workspace-composer">{composer}</div>
      </section>
      <section className={`director-video-panel ${mobilePane === "videos" ? "mobile-visible" : ""}`} aria-label={panel === "plan" ? "Video plan editor" : "Video versions"}>
        <header className="director-video-header"><div><div className="director-view-switch" aria-label="Workspace view"><button type="button" aria-pressed={panel === "preview"} onClick={() => setPanel("preview")}>Preview</button><button type="button" aria-pressed={panel === "plan"} disabled={!chat.messages.some(message => message.brief)} onClick={() => { const plan = selectedPlan ?? [...chat.messages].reverse().find(message => message.brief); if (plan) openPlan(plan); }}>Video plan</button></div><h2><EditableProjectTitle title={chat.title} onSave={title => setChat(current => ({ ...current, title }))} /></h2></div><span>{versions.length} {versions.length === 1 ? "version" : "versions"}</span></header>
        {panel === "plan" && selectedPlan ? <div className="director-document-workspace">
          <div className="director-document-toolbar" aria-label="Document actions">
            <span role="status" className="director-document-status">{planNotice || (planChanged ? "Unsaved changes" : "Saved on this device")}</span>
            <div>
              <button type="button" disabled={!planChanged || busy || generating} onClick={() => { setPlanDrafts(current => { const next = { ...current }; delete next[selectedPlan.id]; return next; }); setPlanNotice(""); }}>Discard</button>
              <button type="button" className="director-plan-primary" disabled={!planChanged || !planDraft.trim() || busy || generating} onClick={savePlan}>{selectedPlan.projectId ? "Save as new plan" : "Save changes"}</button>
              {!selectedPlan.projectId && selectedPlan.ready && !isDemo && <button type="button" disabled={planChanged || busy || generating || costs[selectedPlan.context?.duration ?? 30] == null} onClick={() => void generate(selectedPlan)}>{generating ? "Queuing…" : `Generate film · ${costs[selectedPlan.context?.duration ?? 30] ?? "…"} credits`}</button>}
            </div>
          </div>
          <div className="director-document-scroll">
            {error && <p className="director-error" role="alert">{error}</p>}
            <article className="director-document-sheet" aria-label="Video plan document">
              <header><p>{chat.title}</p><h2>Video plan</h2><div className="director-document-specs"><span>{selectedPlan.context?.duration ?? 30} seconds</span><span>{selectedPlan.context?.aspectRatio ?? "16:9"}</span><span>1080p</span></div></header>
              <textarea ref={planInput} id="director-plan-direction" aria-label="Edit video plan" placeholder="Start writing your video plan…" value={planDraft} maxLength={1900} disabled={busy || generating} spellCheck onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "s") { event.preventDefault(); savePlan(); } }} onChange={event => { setPlanDrafts(current => ({ ...current, [selectedPlan.id]: event.target.value })); setPlanNotice(""); }} />
              <footer><span>HOMIE DIRECTOR</span><span>{planDraft.trim() ? planDraft.trim().split(/\s+/).length : 0} words · {planDraft.length} / 1900</span></footer>
            </article>
          </div>
        </div> : <div className="director-video-scroll">{versions.length ? versions.map((message, index) => {
          const video = availableVideos.find(v => v.id === message.projectId);
          const listing = listings.find(l => l.id === message.context?.listingId);
          return <article className="director-version" key={message.id}>
            <header><div><h3>{index === 0 ? "Video" : `Video v${index + 1}`}</h3><p>{listing?.address ?? chat.title}</p></div><span className={`director-version-status ${video?.status === "Failed" ? "failed" : ""}`}>{video?.status ?? "Checking status"}</span></header>
            <div className="director-video-stage" style={{ aspectRatio: (message.context?.aspectRatio ?? "16:9").replace(":", "/") }}>
              {video?.videoUrl && (video.status === "Ready" || video.status === "Approved") ? <video controls muted playsInline preload="metadata" src={video.videoUrl} poster={video.image || undefined} aria-label={`Video version ${index + 1}`} /> : <>
                {(video?.image || listing?.image) && <img src={video?.image || listing?.image} alt="" className="director-render-cover" />}
                <div className="director-render-state">{video?.status === "Generating" ? <><span className="prompt-video-spinner" /><strong>Your film is in the making</strong><p>{video.stage ?? "Waiting for generation"}</p><progress aria-label={`Video version ${index + 1} progress`} max={100} value={video.progress} /></> : <><span aria-hidden="true">{video?.status === "Failed" ? "!" : "▷"}</span><strong>{video?.status === "Failed" ? "This version couldn’t finish" : "Preview is not available yet"}</strong><p>{video?.error ?? "Your video will appear here when it is ready."}</p><button onClick={onOpenVideos}>Open My videos →</button></>}</div>
              </>}
            </div><footer><span>{message.context?.duration} sec · {message.context?.aspectRatio} · 1080p</span><span>Version {index + 1}</span></footer>
          </article>;
        }) : <div className="director-screen-empty"><span aria-hidden="true">▷</span><h3>A space for your vision.</h3><p>Shape the direction in chat. Your generated films<br />and every new version will appear here.</p><div className="director-empty-frame"><span aria-hidden="true">✦</span><span>Your first film</span></div></div>}</div>}
      </section>
    </>}
  </section>;
}
