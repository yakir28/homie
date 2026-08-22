"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import type { TemplateItem, VideoItem } from "./page";

type WizardListing = {
  id: string;
  address: string;
  city: string;
  price: string;
  source: string;
  photos: number;
  image: string;
};

function sourceLabel(source: string | null) {
  if (source === "zillow") return "Zillow";
  if (source === "airbnb") return "Airbnb";
  return "Manual upload";
}

export default function CreateVideoWizard({ template, workspaceId, walletBalance, onClose, onCreated, flash }: {
  template: TemplateItem;
  workspaceId: string;
  walletBalance: number;
  onClose: () => void;
  onCreated: (project: VideoItem) => void;
  flash: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listings, setListings] = useState<WizardListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadListings() {
      setListingsLoading(true);
      const { data, error } = await getSupabaseBrowserClient()
        .from("listings")
        .select("id,address_line1,city,region,source,cover_photo_url,listing_photos(count)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) {
        setListingsError(error.message);
        setListingsLoading(false);
        return;
      }

      setListings((data ?? []).map((listing) => ({
        id: String(listing.id),
        address: listing.address_line1 || "Untitled listing",
        city: [listing.city, listing.region].filter(Boolean).join(", "),
        price: "",
        source: sourceLabel(listing.source),
        photos: Array.isArray(listing.listing_photos) ? Number(listing.listing_photos[0]?.count ?? 0) : 0,
        image: listing.cover_photo_url || template.image,
      })));
      setListingsLoading(false);
    }
    void loadListings();
    return () => { active = false; };
  }, [template.image, workspaceId]);

  const selectedListing = listings.find((listing) => listing.id === selectedId) ?? null;
  const insufficientCredits = walletBalance < template.credits;
  const insufficientPhotos = selectedListing ? selectedListing.photos < template.minPhotos : false;
  const missingTemplatePrompt = template.generationConfig !== undefined && Object.keys(template.generationConfig).length === 0;

  async function generate() {
    if (!selectedListing || insufficientCredits || insufficientPhotos || missingTemplatePrompt || creating) return;
    setCreating(true);
    const supabase = getSupabaseBrowserClient();
    const { data: photoRows, error: photosError } = await supabase.from("listing_photos").select("id").eq("listing_id", selectedListing.id).order("sort_order").limit(template.maxPhotos);
    if (photosError || !photoRows || photoRows.length < template.minPhotos) {
      flash(photosError?.message ?? `This listing needs at least ${template.minPhotos} photos.`);
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
      price: "",
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
    <section className="wizard-modal wizard-listing-modal" role="dialog" aria-modal="true" aria-label={`Create video from ${template.title}`}>
      <button className="wizard-close" aria-label="Close" onClick={onClose}>×</button>
      <header className="wizard-head">
        <div className="wizard-template-chip"><img src={template.image} alt="" /><span><b>{template.title}</b><small>{template.tag} · {template.format} · {template.credits} credits</small></span></div>
      </header>

      <div className="wizard-body">
        <div className="wizard-source">
          <div className="wizard-listings-heading">
            <div><p className="wizard-lead">Choose a listing</p><p>Select the property you want to turn into this video.</p></div>
            {!listingsLoading && <span>{listings.length} listing{listings.length === 1 ? "" : "s"}</span>}
          </div>

          {listingsLoading ? <div className="wizard-listing-state">Loading your listings…</div>
            : listingsError ? <div className="wizard-listing-state error">Could not load listings. {listingsError}</div>
            : listings.length === 0 ? <div className="wizard-listing-state"><b>No listings yet</b><span>Add a listing from My Listings first, then return to this template.</span></div>
            : <div className="wizard-listing-grid">
              {listings.map((listing) => {
                const selected = listing.id === selectedId;
                const needsPhotos = listing.photos < template.minPhotos;
                return <button key={listing.id} type="button" className={`wizard-listing-card ${selected ? "selected" : ""}`} onClick={() => setSelectedId(listing.id)} aria-pressed={selected}>
                  <span className="wizard-listing-image">
                    <img src={listing.image} alt="" />
                    {selected && <i aria-hidden="true">✓</i>}
                  </span>
                  <span className="wizard-listing-copy">
                    <small>{listing.source}</small>
                    <b>{listing.address}</b>
                    <em>{needsPhotos ? `Needs ${template.minPhotos - listing.photos} more photo${template.minPhotos - listing.photos === 1 ? "" : "s"}` : `${listing.photos} photos ready`}</em>
                  </span>
                </button>;
              })}
            </div>}

          {selectedListing && <div className="wizard-confirm">
            {insufficientPhotos && <p className="zillow-import-error">This listing needs at least {template.minPhotos} photos before you can use this template.</p>}
            {missingTemplatePrompt && <p className="zillow-import-error">This template is missing its generation prompt and cannot be used yet.</p>}
          </div>}
        </div>
      </div>

      <footer className="wizard-footer">
        <button className="wizard-back" onClick={onClose}>Cancel</button>
        <button className="wizard-primary" disabled={!selectedListing || insufficientCredits || insufficientPhotos || missingTemplatePrompt || creating} onClick={() => void generate()}>
          {creating ? "Creating…" : selectedListing ? "Create video →" : "Select a listing"}
        </button>
      </footer>
    </section>
  </div>;
}
