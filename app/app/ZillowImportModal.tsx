"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type DiscoveredListing = { url: string; label: string };

export default function ZillowImportModal({ workspaceId, source = "zillow", onClose, onImported }: { workspaceId: string; source?: "zillow" | "airbnb"; onClose: () => void; onImported: (count: number) => Promise<void> | void }) {
  const isAirbnb = source === "airbnb";
  const brand = isAirbnb ? "Airbnb" : "Zillow";
  const [profileUrl, setProfileUrl] = useState("");
  const [listings, setListings] = useState<DiscoveredListing[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualUrls, setManualUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function callApi(payload: Record<string, unknown>) {
    const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
    if (!session) throw new Error("Your session expired. Please sign in again.");
    const response = await fetch(`/api/integrations/${source}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ...payload, workspaceId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `${brand} import failed`);
    return result;
  }

  async function discover() {
    setLoading(true);
    setError("");
    try {
      const result = await callApi({ action: "discover", profileUrl }) as { listings: DiscoveredListing[]; discoveryBlocked?: boolean; message?: string };
      if (result.discoveryBlocked) {
        setManualMode(true);
        setError(result.message ?? "Zillow blocked automatic profile discovery.");
        return;
      }
      setListings(result.listings);
      setSelected(new Set(result.listings.map((listing) => listing.url)));
      if (!result.listings.length) setError("No public listings were found on this profile. Make sure its listings are visible on Zillow.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Could not read this ${brand} profile`);
    } finally {
      setLoading(false);
    }
  }

  async function importSelected() {
    if (!selected.size || !rightsConfirmed) return;
    setLoading(true);
    setError("");
    try {
      const result = await callApi({ action: "import", profileUrl, listingUrls: [...selected], rightsConfirmed }) as { imported: number; failed?: { url: string; error: string }[] };
      await onImported(result.imported);
      if (result.failed?.length) {
        const failedUrls = new Set(result.failed.map((failure) => failure.url));
        setListings((current) => current.filter((listing) => failedUrls.has(listing.url)));
        setSelected(failedUrls);
        setError(`${result.imported} imported successfully. ${result.failed.length} failed and remain selected — wait a moment, then try them again.`);
        return;
      }
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not import the selected listings");
    } finally {
      setLoading(false);
    }
  }

  function toggle(url: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  }

  function useManualUrls() {
    const urls = [...new Set(manualUrls.split(/[\s,]+/).map((value) => value.trim()).filter((value) => {
      try {
        const url = new URL(value);
        return isAirbnb
          ? (url.hostname === "airbnb.com" || url.hostname.endsWith(".airbnb.com")) && /^\/rooms\/\d+/.test(url.pathname)
          : (url.hostname === "zillow.com" || url.hostname.endsWith(".zillow.com")) && url.pathname.includes("/homedetails/");
      } catch {
        return false;
      }
    }))];
    if (!urls.length) {
      setError(isAirbnb ? "Paste at least one valid Airbnb URL containing /rooms/." : "Paste at least one valid Zillow property URL containing /homedetails/.");
      return;
    }
    const next = urls.slice(0, 20).map((url) => ({
      url,
      label: isAirbnb
        ? `Airbnb ${new URL(url).pathname.match(/\/rooms\/(\d+)/)?.[1] ?? "listing"}`
        : decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean)[1] ?? "Zillow listing").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    }));
    setListings(next);
    setSelected(new Set(next.map((listing) => listing.url)));
    setError("");
  }

  return <div className="zillow-import-backdrop" role="presentation">
    <section className="zillow-import-modal" role="dialog" aria-modal="true" aria-labelledby="zillow-import-title">
      <button className="zillow-import-close" onClick={onClose} aria-label="Close">×</button>
      <p className="eyebrow">Import source</p>
      <h2 id="zillow-import-title">Import from {brand}.</h2>
      {!listings.length ? <>
        {!manualMode ? <>
          <p className="zillow-import-lead">Paste the public {brand} {isAirbnb ? "host" : "profile"} URL that displays your listings.</p>
          <label className="zillow-url-field" htmlFor="zillow-profile-url">{brand} {isAirbnb ? "host" : "profile"} URL
            <input id="zillow-profile-url" type="url" value={profileUrl} onChange={(event) => setProfileUrl(event.target.value)} placeholder={isAirbnb ? "https://www.airbnb.com/users/show/..." : "https://www.zillow.com/profile/your-profile"} />
          </label>
        </> : <>
          <p className="zillow-import-lead">Open the listings on the {brand} profile, copy their property URLs, and paste them below. You can paste up to 20 links.</p>
          <label className="zillow-url-field" htmlFor="zillow-property-urls">{brand} property URLs
            <textarea id="zillow-property-urls" value={manualUrls} onChange={(event) => setManualUrls(event.target.value)} placeholder={isAirbnb ? "https://www.airbnb.com/rooms/123456\nhttps://www.airbnb.com/rooms/789012" : "https://www.zillow.com/homedetails/...\nhttps://www.zillow.com/homedetails/..."} rows={6} />
          </label>
        </>}
        {error && <p className="zillow-import-error">{error}</p>}
        <div className="zillow-import-actions"><button className="outline-btn" onClick={manualMode ? () => { setManualMode(false); setError(""); } : onClose}>{manualMode ? "Back" : "Cancel"}</button><button className="primary-btn" disabled={loading || (manualMode ? !manualUrls.trim() : !profileUrl.trim())} onClick={manualMode ? useManualUrls : () => void discover()}>{loading ? "Finding listings…" : manualMode ? "Review listings →" : "Find my listings →"}</button></div>
      </> : <>
        <div className="zillow-import-summary"><span><b>{listings.length}</b> listings found</span><button onClick={() => setSelected(selected.size === listings.length ? new Set() : new Set(listings.map((listing) => listing.url)))}>{selected.size === listings.length ? "Clear all" : "Select all"}</button></div>
        <div className="zillow-listing-picker">
          {listings.map((listing, index) => <div key={listing.url} className={`zillow-listing-choice ${selected.has(listing.url) ? "selected" : ""}`}>
            <input aria-label={`Select ${listing.label}`} id={`zillow-listing-${index}`} type="checkbox" checked={selected.has(listing.url)} onChange={() => toggle(listing.url)} />
            <span><b>{listing.label}</b><small>{listing.url}</small></span>
          </div>)}
        </div>
        <label className="zillow-rights-confirm"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /><span>I confirm that I own or am authorized to use these listing details and photos.</span></label>
        {error && <p className="zillow-import-error">{error}</p>}
        <div className="zillow-import-actions"><button className="outline-btn" disabled={loading} onClick={() => { setListings([]); setSelected(new Set()); setError(""); }}>Back</button><button className="primary-btn" disabled={loading || !selected.size || !rightsConfirmed} onClick={() => void importSelected()}>{loading ? `Importing ${selected.size}…` : `Import ${selected.size} listing${selected.size === 1 ? "" : "s"} →`}</button></div>
      </>}
    </section>
  </div>;
}
