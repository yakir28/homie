"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import RoomTierList, { type RoomTierValue } from "../../components/ui/room-tier-list";
import "./listing-map-board.css";

type Photo = { id: string; url: string; roomType: string; zoneId: string | null };
type Props = { listingId: string; photos: Photo[]; onMove: (photoId: string, zoneId: string | null) => void; onClose?: () => void; embedded?: boolean };
const empty: RoomTierValue = { rows: [], pool: [] };

export default function ListingMapBoard({ listingId, photos, onMove, onClose, embedded = false }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const baseline = useRef<RoomTierValue | null>(null);
  const [saved, setSaved] = useState<RoomTierValue>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (embedded) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, [embedded]);
  useEffect(() => {
    let alive = true;
    void (async () => {
      await Promise.resolve();
      if (!alive) return;
      setLoading(true);
      try {
        const client = getSupabaseBrowserClient();
        const [zones, images] = await Promise.all([
          client.from("listing_zones").select("id,name").eq("listing_id", listingId).order("sort_order").order("id"),
          client.from("listing_photos").select("id,zone_id").eq("listing_id", listingId).order("sort_order").order("id"),
        ]);
        if (zones.error || images.error) throw zones.error ?? images.error;
        const ids = new Set((zones.data ?? []).map(zone => String(zone.id)));
        const next: RoomTierValue = {
          rows: (zones.data ?? []).map(zone => ({ id: String(zone.id), name: zone.name, photoIds: (images.data ?? []).filter(photo => String(photo.zone_id) === String(zone.id)).map(photo => String(photo.id)) })),
          pool: (images.data ?? []).filter(photo => !photo.zone_id || !ids.has(String(photo.zone_id))).map(photo => String(photo.id)),
        };
        if (alive) { setSaved(next); baseline.current ??= next; }
      } catch { if (alive) setError("Could not load your saved photo list. Close and reopen the listing to retry."); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [listingId, reload]);

  // Include newly uploaded photos, and omit photos deleted through the gallery.
  const photoIds = new Set(photos.map(photo => photo.id));
  const known = new Set([...saved.rows.flatMap(row => row.photoIds), ...saved.pool]);
  const value: RoomTierValue = {
    rows: saved.rows.map(row => ({ ...row, photoIds: [...row.photoIds.filter(id => photoIds.has(id)), ...photos.filter(photo => !known.has(photo.id) && photo.zoneId === row.id).map(photo => photo.id)] })),
    pool: [...saved.pool.filter(id => photoIds.has(id)), ...photos.filter(photo => !known.has(photo.id) && !saved.rows.some(row => row.id === photo.zoneId)).map(photo => photo.id)],
  };

  async function save(next: RoomTierValue, resetting = false) {
    if (lock.current || loading) return;
    const names = next.rows.map(row => row.name.trim().toLowerCase());
    if (new Set(names).size !== names.length || names.some(name => !name)) { setError("Each room needs a unique name."); return; }
    lock.current = true; setBusy(true); setError(""); setStatus("");
    setSaved(next);
    const client = getSupabaseBrowserClient();
    const persisted: RoomTierValue = { rows: next.rows.map(row => ({ ...row, photoIds: [...row.photoIds] })), pool: [...next.pool] };
    try {
      // Create new rows first, then move photos, and only then remove unused rows.
      for (const [sort_order, row] of persisted.rows.entries()) {
        const previous = saved.rows.find(item => item.id === row.id);
        if (!previous) {
          const { data, error } = await client.from("listing_zones").insert({ listing_id: listingId, name: row.name, kind: "floor", sort_order }).select("id").single();
          if (error || !data) throw error;
          row.id = String(data.id);
        } else if (previous.name !== row.name || saved.rows.indexOf(previous) !== sort_order) {
          const { data, error } = await client.from("listing_zones").update({ name: row.name, sort_order }).eq("id", row.id).eq("listing_id", listingId).select("id").single();
          if (error || !data) throw error;
        }
      }
      const ordered = [...persisted.rows.flatMap(row => row.photoIds.map(id => ({ id, zoneId: row.id }))), ...persisted.pool.map(id => ({ id, zoneId: null }))];
      for (const [sort_order, photo] of ordered.entries()) {
        const { data, error } = await client.from("listing_photos").update({ zone_id: photo.zoneId, sort_order }).eq("id", photo.id).eq("listing_id", listingId).select("id").single();
        if (error || !data) throw error;
      }
      for (const row of saved.rows.filter(row => !persisted.rows.some(item => item.id === row.id))) {
        const { data, error } = await client.from("listing_zones").delete().eq("id", row.id).eq("listing_id", listingId).select("id").single();
        if (error || !data) throw error;
      }
      setSaved(persisted);
      if (resetting && baseline.current) baseline.current = { ...baseline.current, rows: baseline.current.rows.map(row => ({ ...row, id: persisted.rows.find(item => item.name === row.name)?.id ?? row.id })) };
      ordered.forEach(photo => onMove(photo.id, photo.zoneId));
      setStatus("Saved");
    } catch { setError("Some changes could not be saved. The list has been reloaded from your saved data; please try again."); setReload(count => count + 1); }
    finally { lock.current = false; setBusy(false); }
  }
  function reset() {
    if (!baseline.current) return;
    const initial = baseline.current;
    const initialIds = new Set([...initial.rows.flatMap(row => row.photoIds), ...initial.pool]);
    void save({ rows: initial.rows.map(row => ({ ...row, photoIds: row.photoIds.filter(id => photoIds.has(id)) })), pool: [...initial.pool.filter(id => photoIds.has(id)), ...photos.filter(photo => !initialIds.has(photo.id)).map(photo => photo.id)] }, true);
  }
  const content = <RoomTierList value={value} photos={photos} onChange={next => void save(next)} onReset={reset} busy={busy} loading={loading} error={error} status={status} />;
  if (embedded) return <section className="homie-tier-editor">{content}</section>;
  return <dialog ref={dialog} className="house-map-dialog homie-tier-editor" onCancel={event => { event.preventDefault(); if (!busy) onClose?.(); }}><button className="tier-editor-close" aria-label="Close photo list" onClick={onClose} disabled={busy}>×</button>{content}</dialog>;
}
