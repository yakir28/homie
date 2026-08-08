"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import type { TemplateItem, ListingItem, VideoItem } from "./page";

type WizardStep = "listing" | "photos" | "confirm";

type PhotoTile = {
  id: string;
  url: string;
  listingPhotoId: string | null;
  uploading: boolean;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export default function CreateVideoWizard({ template, workspaceId, userId, listings, walletBalance, onClose, onCreated, flash }: {
  template: TemplateItem;
  workspaceId: string;
  userId: string;
  listings: ListingItem[];
  walletBalance: number;
  onClose: () => void;
  onCreated: (project: VideoItem) => void;
  flash: (message: string) => void;
}) {
  const [step, setStep] = useState<WizardStep>("listing");
  const [mode, setMode] = useState<"existing" | "new" | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [addressLabel, setAddressLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [photos, setPhotos] = useState<PhotoTile[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const usableListings = listings.filter((listing) => listing.id);
  const readyPhotos = photos.filter((photo) => photo.listingPhotoId && !photo.uploading);
  const hasEnough = readyPhotos.length >= template.minPhotos && readyPhotos.length <= template.maxPhotos;
  const insufficientCredits = walletBalance < template.credits;

  async function selectExistingListing(listing: ListingItem) {
    setMode("existing");
    setListingId(listing.id);
    setAddressLabel(listing.address);
    setLoadingPhotos(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.from("listing_photos").select("id, thumbnail_url, source_url, sort_order").eq("listing_id", listing.id).order("sort_order");
    setLoadingPhotos(false);
    if (error) {
      flash(error.message);
      return;
    }
    setPhotos((data ?? []).map((row) => ({ id: row.id, listingPhotoId: row.id, url: row.thumbnail_url ?? row.source_url ?? "/homes/modern-villa.jpg", uploading: false })));
    setStep("photos");
  }

  function startNewListing() {
    setMode("new");
    setListingId(null);
    setAddressLabel("");
    setPhotos([]);
    setStep("photos");
  }

  async function ensureListingId(): Promise<string | null> {
    if (listingId) return listingId;
    const supabase = getSupabaseBrowserClient();
    const label = newAddress.trim() || "Untitled listing";
    const { data, error } = await supabase.from("listings").insert({
      workspace_id: workspaceId,
      source: "upload",
      status: "active",
      address_line1: label,
    }).select("id").single();
    if (error || !data) {
      flash(error?.message ?? "Could not create listing");
      return null;
    }
    setListingId(data.id);
    setAddressLabel(label);
    return data.id;
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || !fileList.length) return;
    const files = Array.from(fileList);
    const room = template.maxPhotos - photos.length;
    if (room <= 0) {
      flash(`This template uses at most ${template.maxPhotos} photos`);
      return;
    }
    const accepted = files.filter((file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_FILE_BYTES).slice(0, room);
    if (accepted.length < files.length) flash("Some files were skipped — use JPG, PNG or WEBP under 20MB");

    const targetListingId = await ensureListingId();
    if (!targetListingId) return;

    for (const file of accepted) {
      await uploadOne(file, targetListingId);
    }
  }

  async function uploadOne(file: File, targetListingId: string) {
    const supabase = getSupabaseBrowserClient();
    const tempId = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);
    setPhotos((current) => [...current, { id: tempId, url: previewUrl, listingPhotoId: null, uploading: true }]);

    const path = `${workspaceId}/${targetListingId}/${tempId}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("listing-photos").upload(path, file, { upsert: false });
    if (uploadError) {
      flash(uploadError.message);
      setPhotos((current) => current.filter((photo) => photo.id !== tempId));
      return;
    }

    const { data: signed } = await supabase.storage.from("listing-photos").createSignedUrl(path, 60 * 60 * 24 * 7);
    const { data: row, error: insertError } = await supabase.from("listing_photos").insert({
      listing_id: targetListingId,
      storage_path: path,
      thumbnail_url: signed?.signedUrl ?? null,
      sort_order: photos.length,
    }).select("id").single();

    if (insertError || !row) {
      flash(insertError?.message ?? "Upload failed");
      setPhotos((current) => current.filter((photo) => photo.id !== tempId));
      return;
    }
    setPhotos((current) => current.map((photo) => photo.id === tempId ? { ...photo, uploading: false, listingPhotoId: row.id } : photo));
  }

  function removePhoto(id: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }

  function moveTile(id: string, direction: -1 | 1) {
    setPhotos((current) => {
      const index = current.findIndex((photo) => photo.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function createProject() {
    if (!listingId || !hasEnough || insufficientCredits) return;
    setCreating(true);
    const supabase = getSupabaseBrowserClient();
    const { data: project, error } = await supabase.from("video_projects").insert({
      workspace_id: workspaceId,
      listing_id: listingId,
      template_id: template.id,
      created_by: userId,
      title: `${template.title} — ${addressLabel || "Untitled listing"}`,
      status: "queued",
      output_format: template.format,
      duration_seconds: parseInt(template.time, 10) || 20,
      credits_cost: template.credits,
    }).select("id, title, status, output_format, duration_seconds, credits_cost, created_at").single();

    if (error || !project) {
      flash(error?.message ?? "Could not create video");
      setCreating(false);
      return;
    }

    const photoRows = readyPhotos.map((photo, index) => ({
      video_project_id: project.id,
      listing_photo_id: photo.listingPhotoId,
      sort_order: index,
    }));
    if (photoRows.length) {
      const { error: linkError } = await supabase.from("video_project_photos").insert(photoRows);
      if (linkError) flash(linkError.message);
    }

    onCreated({
      title: project.title,
      address: addressLabel || "Untitled listing",
      city: "",
      price: "Price on request",
      template: template.tag,
      format: project.output_format,
      duration: `${project.duration_seconds} sec`,
      credits: project.credits_cost,
      photosUsed: photoRows.length,
      totalPhotos: photoRows.length,
      created: new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(project.created_at)),
      status: "Generating",
      image: readyPhotos[0]?.url || template.image,
    });
    setCreating(false);
  }

  const steps: { id: WizardStep; label: string }[] = [
    { id: "listing", label: "Listing" },
    { id: "photos", label: "Photos" },
    { id: "confirm", label: "Confirm" },
  ];

  return <div className="wizard-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="wizard-modal" role="dialog" aria-modal="true" aria-label={`Create video from ${template.title}`}>
      <button className="wizard-close" aria-label="Close" onClick={onClose}>×</button>
      <header className="wizard-head">
        <div className="wizard-template-chip"><img src={template.image} alt="" /><span><b>{template.title}</b><small>{template.tag} · {template.format} · {template.credits} credits</small></span></div>
        <div className="wizard-steps">
          {steps.map((item, index) => <div key={item.id} className={`wizard-step ${step === item.id ? "active" : ""} ${steps.findIndex((s) => s.id === step) > index ? "done" : ""}`}><span>{index + 1}</span>{item.label}</div>)}
        </div>
      </header>

      <div className="wizard-body">
        {step === "listing" && <div className="wizard-source">
          <p className="wizard-lead">Which home is this video for?</p>
          <div className="wizard-source-grid">
            {usableListings.map((listing) => <button key={listing.id} className="wizard-listing-option" onClick={() => void selectExistingListing(listing)}>
              <img src={listing.image} alt="" />
              <span><b>{listing.address}</b><small>{listing.city} · {listing.photos} photos synced</small></span>
            </button>)}
            <div className="wizard-listing-option new">
              <span className="wizard-new-icon">+</span>
              <input placeholder="New listing address (optional)" value={newAddress} onChange={(event) => setNewAddress(event.target.value)} />
              <button className="wizard-primary" onClick={startNewListing}>Upload new photos →</button>
            </div>
          </div>
        </div>}

        {step === "photos" && <div className="wizard-photos">
          <p className="wizard-lead">Choose {template.minPhotos === template.maxPhotos ? template.minPhotos : `${template.minPhotos}–${template.maxPhotos}`} photos, in the order you want them to appear.</p>
          <label
            className={dragOver ? "wizard-dropzone dragover" : "wizard-dropzone"}
            onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => { event.preventDefault(); setDragOver(false); void handleFiles(event.dataTransfer.files); }}
          >
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { void handleFiles(event.target.files); event.target.value = ""; }} />
            <span>⤒</span>
            <b>Drop photos here or click to upload</b>
            <small>JPG, PNG or WEBP · up to 20MB each</small>
          </label>
          {loadingPhotos && <p className="wizard-hint">Loading listing photos…</p>}
          {photos.length > 0 && <div className="wizard-photo-grid">
            {photos.map((photo, index) => <div className={photo.uploading ? "wizard-photo-tile uploading" : "wizard-photo-tile"} key={photo.id}>
              <img src={photo.url} alt="" />
              {photo.uploading && <span className="wizard-photo-spinner" />}
              <span className="wizard-photo-index">{index + 1}</span>
              <div className="wizard-photo-actions">
                <button aria-label="Move earlier" disabled={index === 0} onClick={() => moveTile(photo.id, -1)}>‹</button>
                <button aria-label="Remove photo" onClick={() => removePhoto(photo.id)}>×</button>
                <button aria-label="Move later" disabled={index === photos.length - 1} onClick={() => moveTile(photo.id, 1)}>›</button>
              </div>
            </div>)}
          </div>}
          <p className={hasEnough ? "wizard-count ok" : "wizard-count"}>{readyPhotos.length} of {template.minPhotos === template.maxPhotos ? template.minPhotos : `${template.minPhotos}–${template.maxPhotos}`} photos selected</p>
        </div>}

        {step === "confirm" && <div className="wizard-confirm">
          <p className="wizard-lead">Ready to queue your video.</p>
          <div className="wizard-confirm-row"><span>Listing</span><b>{addressLabel || "Untitled listing"}</b></div>
          <div className="wizard-confirm-row"><span>Template</span><b>{template.title}</b></div>
          <div className="wizard-confirm-row"><span>Format</span><b>{template.format} · {template.time}</b></div>
          <div className="wizard-confirm-row"><span>Photos used</span><b>{readyPhotos.length}</b></div>
          <div className="wizard-confirm-strip">{readyPhotos.slice(0, 8).map((photo) => <img key={photo.id} src={photo.url} alt="" />)}{readyPhotos.length > 8 && <span className="wizard-more">+{readyPhotos.length - 8}</span>}</div>
          <div className={insufficientCredits ? "credit-note warn" : "credit-note"}>
            <span>◒</span>
            <p><b>{template.credits} credits</b><small>{insufficientCredits ? `You have ${walletBalance} — top up before creating.` : `Wallet balance after: ${walletBalance - template.credits} credits.`}</small></p>
          </div>
        </div>}
      </div>

      <footer className="wizard-footer">
        <button className="wizard-back" onClick={() => step === "photos" ? setStep("listing") : step === "confirm" ? setStep("photos") : onClose()}>{step === "listing" ? "Cancel" : "← Back"}</button>
        {step === "photos" && <button className="wizard-primary" disabled={!hasEnough} onClick={() => setStep("confirm")}>Continue →</button>}
        {step === "confirm" && <button className="wizard-primary" disabled={creating || insufficientCredits} onClick={() => void createProject()}>{creating ? "Queuing…" : "Create video →"}</button>}
      </footer>
    </section>
  </div>;
}
