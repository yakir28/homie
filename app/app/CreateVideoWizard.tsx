"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import type { TemplateItem, VideoItem } from "./page";
import "./listing-chooser.css";
import "./video-creation-controls.css";

type WizardListing = { id: string; address: string; city: string; price: string; source: string; photos: number; image: string };
type Price = { resolution: string; multiplier: number; credits_cost: number };
type QueuedVideoProject = { id: number; title: string; output_format: string; duration_seconds: number; credits_cost: number; created_at: string };
const formats = ["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"];

export default function CreateVideoWizard({ template, initialListings, workspaceId, walletBalance, onCreated }: {
  template: TemplateItem; initialListings: WizardListing[]; workspaceId: string; walletBalance: number;
  onCreated: (project: VideoItem) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picker, setPicker] = useState<"listing" | "format" | "resolution" | null>(null);
  const [search, setSearch] = useState("");
  const [aspectRatio, setAspectRatio] = useState(formats.includes(template.format) ? template.format : "9:16");
  const [resolution, setResolution] = useState("1080p");
  const [prices, setPrices] = useState<Price[]>([]);
  const [priceError, setPriceError] = useState("");
  const [reloadPrice, setReloadPrice] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const requestIds = useRef(new Map<string, string>());
  const submitting = useRef(false);
  const selected = initialListings.find((listing) => listing.id === selectedId);
  const visibleListings = initialListings.filter((listing) => (listing.address + " " + listing.city).toLowerCase().includes(search.trim().toLowerCase()));
  const cost = prices.find((price) => price.resolution === resolution)?.credits_cost;
  const insufficientCredits = cost !== undefined && walletBalance < cost;
  const needsPhotos = !!selected && selected.photos < template.minPhotos;
  const missingPrompt = template.generationConfig !== undefined && Object.keys(template.generationConfig).length === 0;

  useEffect(() => {
    let active = true;
    setPrices([]);
    setPriceError("");
    void (async () => {
      try {
        const { data, error } = await getSupabaseBrowserClient().rpc("get_video_pricing", { target_template_id: template.id });
        if (!active) return;
        if (error || !Array.isArray(data) || !data.length) throw new Error(error?.message ?? "Pricing is unavailable.");
        if (data.some((row: Price) => !Number.isInteger(row.credits_cost) || row.credits_cost < 1)) throw new Error("Invalid video pricing.");
        setPrices(data as Price[]);
      } catch (error) {
        if (active) setPriceError(error instanceof Error ? error.message : "Could not load pricing.");
      }
    })();
    return () => { active = false; };
  }, [template.id, reloadPrice]);

  useEffect(() => {
    if (picker && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [picker]);

  function closePicker() { dialog.current?.close(); setPicker(null); }
  function choose(action: () => void) { action(); setError(""); closePicker(); }

  async function generate() {
    if (!selected) { setPicker("listing"); return; }
    if (cost === undefined || insufficientCredits || needsPhotos || missingPrompt || submitting.current) return;
    submitting.current = true;
    setCreating(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: photoRows, error: photosError } = await supabase.from("listing_photos").select("id").eq("listing_id", selected.id).order("sort_order").limit(template.maxPhotos);
      if (photosError || !photoRows || photoRows.length < template.minPhotos) throw new Error(photosError?.message ?? `This listing needs at least ${template.minPhotos} photos.`);
      const key = [workspaceId, template.id, selected.id, aspectRatio, resolution].join(":");
      if (!requestIds.current.has(key)) requestIds.current.set(key, crypto.randomUUID());
      const { data: project, error } = await supabase.rpc("queue_priced_video_project", {
        target_workspace_id: workspaceId, target_listing_id: selected.id, target_template_id: template.id,
        project_title: `${template.title} — ${selected.address}`,
        selected_photo_ids: photoRows.map((row) => Number(row.id)),
        target_aspect_ratio: aspectRatio, target_resolution: resolution,
        expected_credits: cost, request_id: requestIds.current.get(key),
      }).single();
      if (error || !project) throw new Error(error?.message ?? "Could not create video.");
      const queued = project as QueuedVideoProject;
      onCreated({
        id: queued.id, title: queued.title, address: selected.address, city: selected.city, price: "",
        template: template.tag, format: queued.output_format, duration: `${queued.duration_seconds} sec`,
        credits: queued.credits_cost, photosUsed: photoRows.length, totalPhotos: photoRows.length,
        created: new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(queued.created_at)),
        status: "Generating", image: selected.image || template.image, progress: 0, stage: "Waiting for generation",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create video. Please try again.";
      setError(message);
      if (message.includes("Price changed")) setReloadPrice((value) => value + 1);
    } finally {
      submitting.current = false;
      setCreating(false);
    }
  }

  return <div className="video-creation-controls">
    <div className="creation-choices">
      <button disabled={creating} onClick={() => setPicker("listing")} title={selected?.address}><small>Listing</small><strong>{selected ? selected.address : "Choose listing"}</strong><span aria-hidden="true">⌄</span></button>
      <button disabled={creating} onClick={() => setPicker("format")}><small>Format</small><strong>{aspectRatio}</strong><span aria-hidden="true">⌄</span></button>
      <button disabled={creating} onClick={() => setPicker("resolution")}><small>Resolution</small><strong>{resolution === "4k" ? "4K" : resolution}</strong><span aria-hidden="true">⌄</span></button>
    </div>
    {needsPhotos && <p className="creation-warning">This listing needs {template.minPhotos - selected!.photos} more photos.</p>}
    {missingPrompt && <p className="creation-warning">This template is not ready for creation yet.</p>}
    {insufficientCredits && <p className="creation-warning">You need {cost! - walletBalance} more credits. Choose a lower resolution or top up your balance.</p>}
    {priceError && <p className="creation-warning">Could not load pricing. <button onClick={() => setReloadPrice((value) => value + 1)}>Retry</button></p>}
    {error && <p className="creation-warning" role="alert">{error}</p>}
    <button className="template-detail-create" disabled={creating || cost === undefined || insufficientCredits || needsPhotos || missingPrompt} onClick={() => void generate()}>
      <span>{creating ? "Creating…" : "Create"}</span><span>{cost === undefined ? "Loading price…" : `${cost} ${cost === 1 ? "credit" : "credits"}`} <span aria-hidden="true">→</span></span>
    </button>
    <p className="creation-balance" aria-live="polite">{cost === undefined ? "Checking current pricing" : `${walletBalance} credits available${insufficientCredits ? "" : ` · ${walletBalance - cost} after creation`}`}</p>
    {picker && <dialog ref={dialog} className="creation-picker" aria-labelledby="creation-picker-title" onCancel={(event) => { event.preventDefault(); closePicker(); }} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePicker(); } }}>
      <header><div><h2 id="creation-picker-title">{picker === "listing" ? "Choose a listing" : picker === "format" ? "Choose a format" : "Choose resolution"}</h2><p>{picker === "listing" ? "Which property would you like to bring to life?" : picker === "format" ? "Choose the frame that fits your audience." : "Higher resolution uses more credits."}</p></div><button aria-label="Close selection" onClick={closePicker}>×</button></header>
      {picker === "listing" ? <>
        <label className="chooser-search"><input aria-label="Search listings" placeholder="Search by address or city…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="creation-listings">
          {visibleListings.map((listing) => <button key={listing.id} aria-pressed={selectedId === listing.id} className={selectedId === listing.id ? "selected" : ""} onClick={() => choose(() => setSelectedId(listing.id))}>
            <img src={listing.image} alt="" loading="lazy" /><strong>{listing.address}</strong><small>{listing.photos < template.minPhotos ? `Needs ${template.minPhotos - listing.photos} more photos` : `${listing.photos} photos ready`}</small>
          </button>)}
        </div>
        {!visibleListings.length && <p className="creation-empty">{initialListings.length ? "No matching listings. Try another search." : "No listings yet. Add a property from My listings first."}</p>}
      </> : <div className="creation-options">
        {picker === "format" ? formats.map((format) => <button key={format} className={aspectRatio === format ? "selected" : ""} aria-pressed={aspectRatio === format} onClick={() => choose(() => setAspectRatio(format))}>
          <span className="creation-format-icon" style={{ aspectRatio: format.replace(":", "/") }} aria-hidden="true" /><strong>{format}</strong><small>{format === template.format ? "Recommended" : format === "1:1" ? "Square" : Number(format.split(":")[0]) < Number(format.split(":")[1]) ? "Portrait" : "Landscape"}</small>
        </button>) : prices.map((price) => <button key={price.resolution} className={resolution === price.resolution ? "selected" : ""} aria-pressed={resolution === price.resolution} onClick={() => choose(() => setResolution(price.resolution))}>
          <strong>{price.resolution === "4k" ? "4K" : price.resolution}</strong><small>{price.credits_cost} {price.credits_cost === 1 ? "credit" : "credits"}</small>{walletBalance < price.credits_cost && <small>Not enough credits</small>}
        </button>)}
      </div>}
    </dialog>}
  </div>;
}
