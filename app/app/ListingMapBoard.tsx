"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import "./listing-map-board.css";

type Photo = { id: string; url: string; roomType: string; zoneId: string | null };
type Zone = { id: string; name: string };
export default function ListingMapBoard({ listingId, photos, onMove, onClose }: { listingId: string; photos: Photo[]; onMove: (photoId: string, zoneId: string | null) => void; onClose: () => void }) {
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
  async function addZone() {
    const label = name.trim();
    if (!label || lock.current || loading) return;
    if (zones.some((zone) => zone.name.toLowerCase() === label.toLowerCase())) { setError("That space already exists."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      const { data, error } = await getSupabaseBrowserClient().from("listing_zones").insert({ listing_id: listingId, name: label, kind, sort_order: zones.length }).select("id,name").single();
      if (error || !data) throw error ?? new Error("Not saved");
      setZones((current) => [...current, { id: String(data.id), name: data.name }]); setName(""); setStatus("Space added");
    } catch { setError("Could not add this space. Please try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  const columns = [{ id: "", name: "Unmapped" }, ...zones];
  return <dialog ref={dialog} className="house-map-dialog" aria-labelledby="house-map-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <header><div><p>HOME MAP</p><h2 id="house-map-title">Arrange your home.</h2><span>Drag photos into a floor or space, or use the menu beneath each photo.</span></div><button type="button" onClick={onClose} disabled={busy} aria-label="Close home map">×</button></header>
    <form className="house-map-add" onSubmit={(event) => { event.preventDefault(); void addZone(); }}>
      <input aria-label="New space name" placeholder="Floor three, Garden, Pool…" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} disabled={busy || loading} />
      <select aria-label="Space type" value={kind} onChange={(event) => setKind(event.target.value)} disabled={busy || loading}><option value="floor">Floor</option><option value="outdoor">Outdoor</option><option value="amenity">Amenity</option><option value="structure">Structure</option></select>
      <button disabled={busy || loading || !name.trim()}>+ Add space</button>
    </form>
    {error && <p className="house-map-error" role="alert">{error} <button onClick={() => setReload((value) => value + 1)} disabled={busy}>Retry loading</button></p>}
    {loading ? <p role="status">Loading home map…</p> : <div className="house-map-columns">
      {columns.map((column) => {
        const items = photos.filter((photo) => (zones.some((zone) => zone.id === photo.zoneId) ? photo.zoneId : "") === column.id);
        return <section className={target === column.id ? "house-map-column is-over" : "house-map-column"} key={column.id} onDragOver={(event) => { if (!dragging || busy) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setTarget(column.id); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTarget(null); }} onDrop={(event) => { event.preventDefault(); setTarget(null); if (dragging) void move(dragging, column.id || null); setDragging(null); }}>
          <h3>{column.name}<span>{items.length}</span></h3>
          {items.map((photo) => <article key={photo.id} draggable={!busy} onDragStart={(event) => { setDragging(photo.id); event.dataTransfer.setData("text/plain", photo.id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDragging(null); setTarget(null); }}>
            <img src={photo.url} alt={photo.roomType || "Property photo"} draggable={false} loading="lazy" />
            <select aria-label={`Move ${photo.roomType || "photo"} to a space`} value={column.id} disabled={busy} onChange={(event) => void move(photo.id, event.target.value || null)}>{columns.map((destination) => <option value={destination.id} key={destination.id}>{destination.name}</option>)}</select>
          </article>)}
          {!items.length && <p className="house-map-empty">Drop photos here</p>}
        </section>;
      })}
    </div>}
    <footer><span role="status">{busy ? "Saving…" : status || "Changes save automatically"}</span><button onClick={onClose} disabled={busy}>Done</button></footer>
  </dialog>;
}
