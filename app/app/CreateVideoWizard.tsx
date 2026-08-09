"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import type { TemplateItem, ListingItem, VideoItem } from "./page";

export default function CreateVideoWizard({ template, workspaceId, listings, walletBalance, onClose, onCreated, flash }: {
  template: TemplateItem;
  workspaceId: string;
  listings: ListingItem[];
  walletBalance: number;
  onClose: () => void;
  onCreated: (project: VideoItem) => void;
  flash: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const usableListings = listings.filter((listing) => listing.id);
  const selectedListing = usableListings.find((listing) => listing.id === selectedId) ?? null;
  const insufficientCredits = walletBalance < template.credits;
  const insufficientPhotos = selectedListing ? selectedListing.photos < template.minPhotos : false;

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

  return <div className="wizard-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="wizard-modal" role="dialog" aria-modal="true" aria-label={`Create video from ${template.title}`}>
      <button className="wizard-close" aria-label="Close" onClick={onClose}>×</button>
      <header className="wizard-head">
        <div className="wizard-template-chip"><img src={template.image} alt="" /><span><b>{template.title}</b><small>{template.tag} · {template.format} · {template.credits} credits</small></span></div>
      </header>

      <div className="wizard-body">
        <div className="wizard-source">
          <p className="wizard-lead">Which listing is this video for?</p>
          {usableListings.length ? <div className="wizard-source-grid">
            {usableListings.map((listing) => {
              const disabled = listing.photos < template.minPhotos;
              return <button key={listing.id} className={`wizard-listing-option ${selectedId === listing.id ? "selected" : ""}`} disabled={disabled} onClick={() => setSelectedId(listing.id)}>
                <img src={listing.image} alt="" />
                <span><b>{listing.address}</b><small>{listing.city} · {listing.photos} photos synced{disabled ? ` · needs ${template.minPhotos}+` : ""}</small></span>
              </button>;
            })}
          </div> : <p className="wizard-hint">No imported listings yet — import your listings from Zillow or Airbnb first.</p>}

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
        <button className="wizard-primary" disabled={!selectedListing || insufficientCredits || insufficientPhotos || creating} onClick={() => void generate()}>{creating ? "Generating…" : "Generate →"}</button>
      </footer>
    </section>
  </div>;
}
