"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ListingItem } from "./page";
import "./listing-chooser.css";
import "./video-creation-controls.css";
import "./prompt-video-composer.css";

export type DirectorContext = { listingId: string | null; aspectRatio: string; duration: number };

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function PromptVideoComposer({ listings, onAddListing, onUploadFiles, onSend, onContextChange, busy = false, initialContext }: {
  listings: ListingItem[]; onAddListing: () => void;
  onUploadFiles: (files: File[]) => Promise<ListingItem>;
  onSend: (text: string, context: DirectorContext) => Promise<void>;
  onContextChange: (context: DirectorContext) => void; busy?: boolean; initialContext?: DirectorContext;
}) {
  const [prompt, setPrompt] = useState("");
  const promptInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const input = promptInput.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 144)}px`;
  }, [prompt]);
  const [listingId, setListingId] = useState<string | null>(initialContext?.listingId ?? null);
  const [aspectRatio, setAspectRatio] = useState(initialContext?.aspectRatio ?? "16:9");
  const [duration, setDuration] = useState(initialContext?.duration ?? 30);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadInFlight = useRef(false);
  const [error, setError] = useState("");
  const picker = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const selected = listings.find((listing) => listing.id === listingId);
  const visibleListings = listings.filter((listing) => `${listing.address} ${listing.city}`.toLowerCase().includes(search.trim().toLowerCase()));
  const canCreate = !!prompt.trim() && !creating && !uploading && !busy;

  useEffect(() => { onContextChange({ listingId, aspectRatio, duration }); }, [listingId, aspectRatio, duration, onContextChange]);

  useEffect(() => {
    if (pickerOpen && !picker.current?.open) picker.current?.showModal();
  }, [pickerOpen]);

  function closePicker() { picker.current?.close(); setPickerOpen(false); }

  async function uploadFiles(files: File[]) {
    if (!files.length || uploadInFlight.current || submitting.current) return;
    if (files.length > 30) { setError("Upload up to 30 photos at a time."); return; }
    if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setError("Choose JPG, PNG, or WebP photos."); return;
    }
    if (files.some((file) => !file.size || file.size > 20 * 1024 * 1024)) {
      setError("Each photo must be between 1 byte and 20 MB."); return;
    }
    uploadInFlight.current = true;
    setUploading(true);
    setError("");
    try {
      const listing = await onUploadFiles(files);
      setListingId(listing.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload photos. Please try again.");
    } finally {
      uploadInFlight.current = false;
      setUploading(false);
    }
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate || submitting.current) return;
    submitting.current = true;
    setCreating(true);
    setError("");
    try {
      await onSend(prompt.trim(), { listingId, aspectRatio, duration });
      setPrompt("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send your message. Please try again.");
    } finally { submitting.current = false; setCreating(false); }
  }

  return <div className="prompt-video-dock">
    <form className="prompt-video-composer" onSubmit={(event) => void generate(event)} aria-label="Message Homie Director" aria-busy={creating || uploading || busy}>
      <textarea ref={promptInput} aria-label="Video prompt" id="property-video-prompt" placeholder="Describe the video you have in mind…" rows={1} maxLength={2000} value={prompt} disabled={creating || uploading || busy}
        aria-describedby="prompt-video-context prompt-video-feedback" onChange={(event) => { setPrompt(event.target.value); setError(""); }}
        onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
      <div className="prompt-video-toolbar">
        <div className="prompt-video-choices">
          <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,image/webp" multiple aria-label="Upload property photos" onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void uploadFiles(files);
          }} />
          <button type="button" className="prompt-video-upload" aria-label="Upload files" title="Upload photos (JPG, PNG, WebP)" disabled={creating || uploading || busy} onClick={() => fileInput.current?.click()}>
            {uploading ? <span className="prompt-video-spinner" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>}
          </button>
          <button type="button" className="prompt-video-listing" onClick={() => { setSearch(""); setPickerOpen(true); }} disabled={creating || uploading || busy} aria-label={selected ? `Listing: ${selected.address}` : "Choose listing"} aria-haspopup="dialog">
            {selected ? <img src={selected.image} alt="" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m3 10 9-7 9 7v10H3z" /><path d="M9 20v-7h6v7" /></svg>}
            <span>{selected?.address ?? "Listing"}</span><Chevron />
          </button>
          <label className="prompt-video-select prompt-video-format"><span className="prompt-video-sr-only">Aspect ratio</span><select aria-label="Aspect ratio" value={aspectRatio} disabled={creating || uploading || busy} onChange={(event) => { setAspectRatio(event.target.value); setError(""); }}>
            {["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].map((format) => <option key={format}>{format}</option>)}
          </select><Chevron /></label>
          <label className="prompt-video-select prompt-video-duration"><span className="prompt-video-sr-only">Duration</span><select aria-label="Duration" value={duration} disabled={creating || uploading || busy} onChange={(event) => { setDuration(Number(event.target.value)); setError(""); }}>
            <option value={15}>15 sec</option><option value={30}>30 sec</option>
          </select><Chevron /></label>
        </div>
        <div className="prompt-video-submit-group">
          <button type="submit" className="prompt-video-submit" disabled={!canCreate} aria-label={creating || busy ? "Director is responding" : "Send message"} title="Send message (⌘/Ctrl + Enter)">
            {creating ? <span className="prompt-video-spinner" /> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>}
          </button>
        </div>
      </div>
      <div className="prompt-video-context" id="prompt-video-context">{selected && <span>{selected.photos} {selected.photos === 1 ? "photo" : "photos"} in your saved order · 1080p</span>}{prompt.length > 1600 && <span>{prompt.length}/2,000</span>}</div>
      <div id="prompt-video-feedback" className="prompt-video-feedback" aria-live="polite">
        {uploading && <p role="status">Uploading photos…</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </form>
    {pickerOpen && <dialog ref={picker} className="creation-picker prompt-video-picker" aria-labelledby="prompt-listing-title" onCancel={(event) => { event.preventDefault(); closePicker(); }}>
      <header><div><h2 id="prompt-listing-title">Choose a listing</h2><p>Your photos set the scene. Your prompt directs the film.</p></div><button type="button" aria-label="Close listing picker" onClick={closePicker}>×</button></header>
      {!!listings.length && <label className="chooser-search"><input aria-label="Search listings" placeholder="Search by address or city…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>}
      <div className="creation-listings">
        {visibleListings.map((listing) => <button type="button" key={listing.id} aria-pressed={listingId === listing.id} className={listingId === listing.id ? "selected" : ""} onClick={() => { setListingId(listing.id); setError(""); closePicker(); }}>
          <img src={listing.image} alt="" loading="lazy" /><strong>{listing.address}</strong><small>{listing.photos === 0 ? "Add photos to create a video" : `${listing.photos} ${listing.photos === 1 ? "photo" : "photos"}`}</small>
        </button>)}
      </div>
      {!visibleListings.length && <p className="creation-empty">{listings.length ? "No matching listings. Try another search." : "Add your first listing to start creating videos."}</p>}
      {!listings.length && <button type="button" className="prompt-video-add-listing" onClick={() => { closePicker(); onAddListing(); }}>Add a listing <span aria-hidden="true">→</span></button>}
    </dialog>}
  </div>;
}
