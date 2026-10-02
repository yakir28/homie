"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ListingItem } from "./page";
import "./listing-chooser.css";
import "./video-creation-controls.css";
import "./prompt-video-composer.css";

export type DirectorContext = { listingId: string | null; aspectRatio: string; duration: number; source?: "uploads" | "listing" };

export default function PromptVideoComposer({ onUploadFiles, onSend, busy = false, initialContext }: {
  onUploadFiles: (files: File[]) => Promise<ListingItem>;
  onSend: (text: string, context: DirectorContext) => Promise<void>;
  busy?: boolean; initialContext?: DirectorContext;
}) {
  const [prompt, setPrompt] = useState("");
  const promptInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const input = promptInput.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 144)}px`;
  }, [prompt]);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedListing, setUploadedListing] = useState<ListingItem | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    // Synchronize browser-owned preview URLs with the selected files.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const canCreate = !!prompt.trim() && !creating && !uploading && !busy;

  function addFiles(incoming: File[]) {
    if (!incoming.length || busy || creating || uploading) return;
    const normalized = incoming.map(file => {
      const type = file.type || ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[file.name.split(".").pop()?.toLowerCase() ?? ""]);
      return !file.type && type ? new File([file], file.name, { type, lastModified: file.lastModified }) : file;
    });
    if (files.length + normalized.length > 30) { setError("Attach up to 30 photos per video."); return; }
    if (normalized.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) { setError("Choose JPG, PNG, or WebP photos. Other file types are not supported yet."); return; }
    if (normalized.some(file => !file.size || file.size > 20 * 1024 * 1024)) { setError("Each photo must be between 1 byte and 20 MB."); return; }
    setFiles(current => [...current, ...normalized]);
    setUploadedListing(null); setError("");
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate || submitting.current) return;
    submitting.current = true;
    setCreating(true);
    setError("");
    try {
      let photoSourceId = uploadedListing?.id ?? initialContext?.listingId ?? null;
      if (files.length && !uploadedListing) {
        setUploading(true);
        const result = await onUploadFiles(files);
        setUploadedListing(result); photoSourceId = result.id;
        setUploading(false);
      }
      await onSend(prompt.trim(), { listingId: photoSourceId, aspectRatio: initialContext?.aspectRatio ?? "16:9", duration: initialContext?.duration ?? 30, source: files.length ? "uploads" : initialContext?.source });
      setPrompt(""); setFiles([]); setUploadedListing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send your message. Please try again.");
    } finally { submitting.current = false; setCreating(false); setUploading(false); }
  }

  return <div className="prompt-video-dock">
    <form onDragOver={(event) => { event.preventDefault(); if (!busy && !creating) setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }} onPaste={(event) => { const images = Array.from(event.clipboardData.files); if (images.length) { event.preventDefault(); addFiles(images); } }} className={`prompt-video-composer ${dragging ? "is-dragging" : ""}`} onSubmit={(event) => void generate(event)} aria-label="Message Homie Director" aria-busy={creating || uploading || busy}>
      {files.length > 0 && <div className="prompt-attachments" aria-label="Attached photos">{files.map((file, index) => <div key={`${file.name}-${index}`}><img src={previews[index] || undefined} alt={file.name} /><button type="button" aria-label={`Remove ${file.name}`} disabled={creating || busy} onClick={() => { setFiles(current => current.filter((_, i) => i !== index)); setUploadedListing(null); }}>×</button></div>)}</div>}
      <textarea ref={promptInput} aria-label="Video prompt" id="property-video-prompt" placeholder="Tell Director what you’d like to create…" rows={1} maxLength={2000} value={prompt} disabled={creating || uploading || busy}
        aria-describedby="prompt-video-context prompt-video-feedback" onChange={(event) => { setPrompt(event.target.value); setError(""); }}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
      <div className="prompt-video-toolbar">
        <div className="prompt-video-choices">
          <label className="prompt-video-upload" title="Attach photos or drag them into the prompt">
            <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple aria-label="Upload files" disabled={creating || uploading || busy} onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
            {uploading ? <span className="prompt-video-spinner" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m8 13 7-7a3 3 0 0 1 4 4l-9 9a5 5 0 0 1-7-7l9-9" /></svg>}
          </label>
          <span className="director-composer-label">Director</span>
        </div>
        <div className="prompt-video-submit-group">
          <button type="submit" className="prompt-video-submit" disabled={!canCreate} aria-label={creating || busy ? "Director is responding" : "Send message"} title="Send message (Enter)">
            {creating ? <span className="prompt-video-spinner" /> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>}
          </button>
        </div>
      </div>
      <div className="prompt-video-context" id="prompt-video-context">{prompt.length > 1600 && <span>{prompt.length}/2,000</span>}</div>
      <div id="prompt-video-feedback" className="prompt-video-feedback" aria-live="polite">
        {uploading && <p role="status">Uploading photos…</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </form>
  </div>;
}
