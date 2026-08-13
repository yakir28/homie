"use client";

import { useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import type { TemplateItem, VideoItem } from "./page";

type StagedPhoto = { file: File; previewUrl: string };

const MAX_UPLOAD_PHOTOS = 30;
const ACCEPTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function CreateVideoWizard({ template, workspaceId, walletBalance, onClose, onCreated, onListingsRefresh, flash }: {
  template: TemplateItem;
  workspaceId: string;
  walletBalance: number;
  onClose: () => void;
  onCreated: (project: VideoItem) => void;
  onListingsRefresh: () => Promise<void>;
  flash: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [newListingName, setNewListingName] = useState("");
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [uploadedListing, setUploadedListing] = useState<{ id: string; address: string; city: string; price: string; photos: number; image: string } | null>(null);
  const selectedListing = uploadedListing?.id === selectedId ? uploadedListing : null;
  const insufficientCredits = walletBalance < template.credits;
  const insufficientPhotos = selectedListing ? selectedListing.photos < template.minPhotos : false;

  function addPhotos(incoming: FileList | File[]) {
    const accepted = [...incoming].filter((file) => ACCEPTED_PHOTO_TYPES.has(file.type));
    if (!accepted.length) {
      setUploadError("Drop JPEG, PNG, or WEBP photos.");
      return;
    }
    setUploadError("");
    setStagedPhotos((current) => {
      const room = MAX_UPLOAD_PHOTOS - current.length;
      const next = accepted.slice(0, Math.max(room, 0)).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
      return [...current, ...next];
    });
  }

  function removeStagedPhoto(index: number) {
    setStagedPhotos((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }

  async function createListingFromUpload() {
    if (stagedPhotos.length < template.minPhotos || uploading) return;
    setUploading(true);
    setUploadError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: listing, error: listingError } = await supabase.from("listings").insert({
        workspace_id: workspaceId,
        source: "upload",
        status: "active",
        external_listing_id: `upload-${crypto.randomUUID()}`,
        address_line1: newListingName.trim() || `${template.title} project`,
        city: "Unknown",
      }).select("id").single();
      if (listingError) throw listingError;

      const uploaded: { storagePath: string; signedUrl: string }[] = [];
      for (let index = 0; index < stagedPhotos.length; index += 1) {
        const { file } = stagedPhotos[index];
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
        const storagePath = `${workspaceId}/upload/${listing.id}/${index}-${safeName}`;
        const { error: uploadPhotoError } = await supabase.storage.from("listing-photos").upload(storagePath, file, { contentType: file.type, upsert: true });
        if (uploadPhotoError) throw uploadPhotoError;
        const { data: signed, error: signError } = await supabase.storage.from("listing-photos").createSignedUrl(storagePath, 60 * 60 * 24 * 365);
        if (signError || !signed) throw signError ?? new Error("Could not prepare an uploaded photo");
        uploaded.push({ storagePath, signedUrl: signed.signedUrl });
      }

      const { error: photosError } = await supabase.from("listing_photos").insert(uploaded.map((photo, index) => ({
        listing_id: listing.id,
        storage_path: photo.storagePath,
        source_url: photo.signedUrl,
        thumbnail_url: photo.signedUrl,
        sort_order: index,
      })));
      if (photosError) throw photosError;

      const { error: coverError } = await supabase.from("listings").update({ cover_photo_url: uploaded[0].signedUrl }).eq("id", listing.id);
      if (coverError) throw coverError;

      stagedPhotos.forEach((staged) => URL.revokeObjectURL(staged.previewUrl));
      setStagedPhotos([]);
      setNewListingName("");
      await onListingsRefresh();
      setSelectedId(String(listing.id));
      setUploadedListing({
        id: String(listing.id),
        address: newListingName.trim() || `${template.title} project`,
        city: "Uploaded photos",
        price: "Price on request",
        photos: uploaded.length,
        image: uploaded[0].signedUrl,
      });
      flash("Photos uploaded — ready to generate");
    } catch (uploadRequestError) {
      setUploadError(uploadRequestError instanceof Error ? uploadRequestError.message : "Could not upload photos");
    } finally {
      setUploading(false);
    }
  }

  async function generate() {
    if (!selectedListing || insufficientCredits || insufficientPhotos || creating) return;
    setCreating(true);
    const supabase = getSupabaseBrowserClient();
    const { data: photoRows, error: photosError } = await supabase.from("listing_photos").select("id").eq("listing_id", selectedListing.id).order("sort_order").limit(template.maxPhotos);
    if (photosError || !photoRows || photoRows.length < template.minPhotos) {
      flash(photosError?.message ?? `This listing needs at least ${template.minPhotos} synced photos.`);
      setCreating(false);
      return;
    }

    const { data: project, error } = await supabase.rpc("queue_video_project", {
      target_workspace_id: workspaceId,
      target_listing_id: selectedListing.id,
      target_template_id: template.id,
      project_title: `${template.title} — ${selectedListing.address}`,
      selected_photo_ids: photoRows.map((row) => Number(row.id)),
    }).single();

    if (error || !project) {
      flash(error?.message ?? "Could not create video");
      setCreating(false);
      return;
    }

    onCreated({
      id: project.id,
      title: project.title,
      address: selectedListing.address,
      city: selectedListing.city,
      price: selectedListing.price,
      template: template.tag,
      format: project.output_format,
      duration: `${project.duration_seconds} sec`,
      credits: project.credits_cost,
      photosUsed: photoRows.length,
      totalPhotos: photoRows.length,
      created: new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(project.created_at)),
      status: "Generating",
      image: selectedListing.image || template.image,
      progress: 0,
      stage: "Waiting for generation",
    });
    setCreating(false);
  }

  return <div className="wizard-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="wizard-modal" role="dialog" aria-modal="true" aria-label={`Create video from ${template.title}`}>
      <button className="wizard-close" aria-label="Close" onClick={onClose}>×</button>
      <header className="wizard-head">
        <div className="wizard-template-chip"><img src={template.image} alt="" /><span><b>{template.title}</b><small>{template.tag} · {template.format} · {template.credits} credits</small></span></div>
      </header>

      <div className="wizard-body">
        <div className="wizard-source">
          {!selectedListing ? <div className="wizard-upload wizard-upload-primary">
            <p className="wizard-lead">Add photos for your video</p>
            <p className="wizard-upload-copy">Upload the property photos you want to use. You can drag them in or choose them from your device.</p>
            <label className="zillow-url-field" htmlFor="wizard-listing-name">Project name <span>(optional)</span>
              <input id="wizard-listing-name" value={newListingName} onChange={(event) => setNewListingName(event.target.value)} placeholder={`${template.title} project`} disabled={uploading} />
            </label>
            <div
              className={`dropzone ${dragActive ? "dragover" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inputRef.current?.click(); } }}
              onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => { event.preventDefault(); setDragActive(false); if (event.dataTransfer.files.length) addPhotos(event.dataTransfer.files); }}
            >
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { if (event.target.files?.length) addPhotos(event.target.files); event.target.value = ""; }} />
              <span className="wizard-upload-icon" aria-hidden="true">＋</span>
              <p>Drag &amp; drop your photos here</p>
              <small>or click to browse · JPEG, PNG, WEBP · up to {MAX_UPLOAD_PHOTOS}</small>
            </div>

            {stagedPhotos.length > 0 && <div className="dropzone-files">
              {stagedPhotos.map((staged, index) => <div className="dropzone-file" key={staged.previewUrl}>
                <img src={staged.previewUrl} alt="" />
                <button type="button" onClick={() => removeStagedPhoto(index)} aria-label="Remove photo" disabled={uploading}>×</button>
              </div>)}
            </div>}

            {uploadError && <p className="zillow-import-error">{uploadError}</p>}
            <p className={`wizard-count ${stagedPhotos.length >= template.minPhotos ? "ok" : ""}`}>
              {stagedPhotos.length} of at least {template.minPhotos} photos selected
            </p>
          </div> : <div className="wizard-upload-ready">
            <span>✓</span><div><b>{selectedListing.photos} photos ready</b><small>{selectedListing.address}</small></div>
          </div>}

          {selectedListing && <div className="wizard-confirm">
            <div className={insufficientCredits ? "credit-note warn" : "credit-note"}>
              <span>◒</span>
              <p><b>{template.credits} credits</b><small>{insufficientCredits ? `You have ${walletBalance} — top up before creating.` : `Wallet balance after: ${walletBalance - template.credits} credits.`}</small></p>
            </div>
          </div>}
        </div>
      </div>

      <footer className="wizard-footer">
        <button className="wizard-back" onClick={onClose}>Cancel</button>
        {selectedListing
          ? <button className="wizard-primary" disabled={insufficientCredits || insufficientPhotos || creating} onClick={() => void generate()}>{creating ? "Generating…" : "Generate →"}</button>
          : <button className="wizard-primary" disabled={uploading || stagedPhotos.length < template.minPhotos} onClick={() => void createListingFromUpload()}>{uploading ? "Uploading…" : `Continue with ${stagedPhotos.length} photos →`}</button>}
      </footer>
    </section>
  </div>;
}
