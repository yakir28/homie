"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import "./listing-map-board.css";

type Photo = { id: string; url: string; roomType: string; zoneId: string | null };
type Zone = { id: string; name: string };
type ListingMapBoardProps = {
  listingId: string;
  photos: Photo[];
  onMove: (photoId: string, zoneId: string | null) => void;
  onClose?: () => void;
};

export default function ListingMapBoard({ listingId, photos, onMove, onClose }: ListingMapBoardProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState("floor");
  const [dragging, setDragging] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); previous?.focus(); };
  }, []);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const { data, error } = await getSupabaseBrowserClient().from("listing_zones").select("id,name").eq("listing_id", listingId).order("sort_order");
        if (error) throw error;
        if (alive) { setZones((data ?? []).map((zone) => ({ id: String(zone.id), name: zone.name }))); setError(""); }
      } catch { if (alive) setError("Could not load the home map. Please retry."); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [listingId, reload]);
  async function move(photoId: string, zoneId: string | null) {
    if (lock.current || loading || !photos.some((photo) => photo.id === photoId) || (zoneId && !zones.some((zone) => zone.id === zoneId))) return;
    lock.current = true; setBusy(true); setError(""); setStatus("Saving…");
    try {
      const { data, error } = await getSupabaseBrowserClient().from("listing_photos").update({ zone_id: zoneId }).eq("id", photoId).eq("listing_id", listingId).select("id").single();
      if (error || !data) throw error ?? new Error("Not saved");
      onMove(photoId, zoneId); setStatus("Saved");
    } catch { setError("Photo was not moved. Please try again."); setStatus(""); }
    finally { lock.current = false; setBusy(false); }
  }
  async function addZone(presetName?: string, presetKind?: string) {
    const label = (presetName ?? name).trim();
    const zoneKind = presetKind ?? kind;
    if (!label || lock.current || loading) return;
    if (zones.some((zone) => zone.name.toLowerCase() === label.toLowerCase())) { setError("That space already exists."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      const { data, error } = await getSupabaseBrowserClient().from("listing_zones").insert({ listing_id: listingId, name: label, kind: zoneKind, sort_order: zones.length }).select("id,name").single();
      if (error || !data) throw error ?? new Error("Not saved");
      setZones((current) => [...current, { id: String(data.id), name: data.name }]); setName(""); setStatus("Space added");
    } catch { setError("Could not add this space. Please try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  const hasUnmappedPhotos = photos.some((photo) => !photo.zoneId || !zones.some((zone) => zone.id === photo.zoneId));
  const columns = [...(hasUnmappedPhotos ? [{ id: "", name: "Needs review" }] : []), ...zones];
  const presets = [{ name: "Exterior", kind: "outdoor" }, { name: "Living room", kind: "floor" }, { name: "Kitchen", kind: "floor" }, { name: "Bedroom", kind: "floor" }, { name: "Bathroom", kind: "floor" }];
  const content = <>
    <header className="house-map-header"><div><p>HOME MAP</p><h2 id="house-map-title">Arrange the viewing route.</h2><span>Drag photos between spaces. Every change saves automatically.</span></div><button type="button" onClick={onClose} disabled={busy} aria-label="Close home map">×</button></header>
    <div className="house-map-tools">
      <form className="house-map-add" onSubmit={(event) => { event.preventDefault(); void addZone(); }}>
        <input aria-label="New space name" placeholder="Name a room, floor or outdoor space…" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} disabled={busy || loading} />
        <select aria-label="Space type" value={kind} onChange={(event) => setKind(event.target.value)} disabled={busy || loading}><option value="floor">Room / floor</option><option value="outdoor">Outdoor</option><option value="amenity">Amenity</option><option value="structure">Structure</option></select>
        <button disabled={busy || loading || !name.trim()}><span aria-hidden="true">＋</span>Add space</button>
      </form>
      <div className="house-map-presets" aria-label="Quick add common spaces"><span>Quick add</span>{presets.filter((preset) => !zones.some((zone) => zone.name.toLowerCase() === preset.name.toLowerCase())).map((preset) => <button key={preset.name} type="button" disabled={busy || loading} onClick={() => void addZone(preset.name, preset.kind)}>＋ {preset.name}</button>)}</div>
    </div>
    {error && <p className="house-map-error" role="alert">{error} <button onClick={() => setReload((value) => value + 1)} disabled={busy}>Retry loading</button></p>}
    {loading ? <p role="status">Loading home map…</p> : <div className="house-map-columns">
      {columns.map((column) => {
        const items = photos.filter((photo) => (zones.some((zone) => zone.id === photo.zoneId) ? photo.zoneId : "") === column.id);
        return <section className={`${column.id ? "house-map-column" : "house-map-column unmapped"}${target === column.id ? " is-over" : ""}`} key={column.id} onDragOver={(event) => { if (!dragging || busy) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setTarget(column.id); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTarget(null); }} onDrop={(event) => { event.preventDefault(); setTarget(null); if (dragging) void move(dragging, column.id || null); setDragging(null); }}>
          <header><div><span aria-hidden="true">{column.id ? "⌂" : "◇"}</span><h3>{column.name}<small>{column.id ? "Tour space" : "Ready to organize"}</small></h3></div><b>{items.length}</b></header>
          <div className="house-map-stack">{items.map((photo) => <article className={dragging === photo.id ? "dragging" : ""} key={photo.id} draggable={!busy} onDragStart={(event) => { setDragging(photo.id); event.dataTransfer.setData("text/plain", photo.id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDragging(null); setTarget(null); }}>
            <div className="house-map-photo"><img src={photo.url} alt={photo.roomType || "Property photo"} draggable={false} loading="lazy" /><span aria-hidden="true">⋮⋮</span></div>
            <label><span>Move to</span><select aria-label={`Move ${photo.roomType || "photo"} to a space`} value={column.id} disabled={busy} onChange={(event) => void move(photo.id, event.target.value || null)}>{columns.map((destination) => <option value={destination.id} key={destination.id}>{destination.name}</option>)}</select></label>
          </article>)}
          {!items.length && <p className="house-map-empty"><span aria-hidden="true">＋</span><strong>Drop photos here</strong><small>Drag a card into this space</small></p>}</div>
        </section>;
      })}
    </div>}
    <footer><span role="status"><i aria-hidden="true" />{busy ? "Saving changes…" : status || "All changes saved"}</span><button onClick={onClose} disabled={busy}>Done <span aria-hidden="true">→</span></button></footer>
  </>;

  return <dialog ref={dialog} className="house-map-dialog" aria-labelledby="house-map-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose?.(); }}>{content}</dialog>;
}

export function ListingMapSummary({ listingId, photos, onEdit }: { listingId: string; photos: Photo[]; onEdit: () => void }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const { data } = await getSupabaseBrowserClient().from("listing_zones").select("id,name").eq("listing_id", listingId).order("sort_order");
      if (active) {
        setZones((data ?? []).map((zone) => ({ id: String(zone.id), name: zone.name })));
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [listingId]);

  const knownZoneIds = new Set(zones.map((zone) => zone.id));
  const unmapped = photos.filter((photo) => !photo.zoneId || !knownZoneIds.has(photo.zoneId));
  const rows = [...(unmapped.length ? [{ id: "", name: "Needs review", photos: unmapped }] : []), ...zones.map((zone) => ({ ...zone, photos: photos.filter((photo) => photo.zoneId === zone.id) }))];

  return <section className="listing-map-summary" aria-labelledby="listing-map-summary-title">
    <header><div><p>HOME MAP</p><h2 id="listing-map-summary-title">Viewing route</h2><span>{photos.length} photos across {zones.length} spaces</span></div><button type="button" onClick={onEdit}>Edit mapping <span aria-hidden="true">→</span></button></header>
    {loading ? <p className="listing-map-summary-loading" role="status">Loading home map…</p> : <div className="listing-map-summary-rows">
      {rows.map((row, index) => <article key={row.id || "unmapped"}>
        <span className="listing-map-row-index">{String(index + 1).padStart(2, "0")}</span>
        <div className="listing-map-row-name"><strong>{row.name}</strong><small>{row.photos.length} {row.photos.length === 1 ? "photo" : "photos"}</small></div>
        <div className="listing-map-row-photos">{row.photos.slice(0, 5).map((photo) => <img key={photo.id} src={photo.url} alt="" loading="lazy" />)}{row.photos.length > 5 && <span>+{row.photos.length - 5}</span>}</div>
      </article>)}
      {!rows.length && <p className="listing-map-summary-empty">No mapped spaces yet.</p>}
    </div>}
  </section>;
}
