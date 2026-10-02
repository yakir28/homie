"use client";

import { useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import styles from "./room-tier-list.module.css";

export type RoomTierValue = { rows: { id: string; name: string; photoIds: string[] }[]; pool: string[] };
export type RoomTierPhoto = { id: string; url: string; roomType: string };
type Target = { zone: string; index: number };
const POOL = "unassigned";

export function moveTierPhoto(value: RoomTierValue, id: string, target: Target): RoomTierValue {
  if (![...value.rows.flatMap(row => row.photoIds), ...value.pool].includes(id)) return value;
  if (target.zone !== POOL && !value.rows.some(row => row.id === target.zone)) return value;
  const next = { rows: value.rows.map(row => ({ ...row, photoIds: row.photoIds.filter(photo => photo !== id) })), pool: value.pool.filter(photo => photo !== id) };
  const ids = target.zone === POOL ? next.pool : next.rows.find(row => row.id === target.zone)!.photoIds;
  ids.splice(Math.max(0, Math.min(target.index, ids.length)), 0, id);
  return next;
}

export default function RoomTierList({ value, photos, onChange, onReset, busy = false, error, status, loading = false }: {
  value: RoomTierValue; photos: RoomTierPhoto[]; onChange: (value: RoomTierValue) => void;
  onReset: () => void; busy?: boolean; error?: string; status?: string; loading?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; active: boolean; target: Target | null; node: HTMLElement; pointerId: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Target | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const disabled = busy || loading;
  const photoById = new Map(photos.map(photo => [photo.id, photo]));

  function cancelDrag() { drag.current = null; setDragId(null); setOver(null); }
  function pointerDown(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (disabled || event.button !== 0) return;
    drag.current = { id, x: event.clientX, y: event.clientY, active: false, target: null, node: event.currentTarget, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) return;
    if (!current.active && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5) return;
    current.active = true;
    current.x = event.clientX; current.y = event.clientY;
    setDragId(current.id); setMenu(null);
    if (ghost.current) ghost.current.style.transform = `translate3d(${event.clientX - 28}px,${event.clientY - 35}px,0) rotate(-4deg) scale(1.08)`;
    const zone = document.elementsFromPoint(event.clientX, event.clientY).map(el => el.closest<HTMLElement>("[data-room-zone]")).find(el => el && root.current?.contains(el));
    let target: Target | null = null;
    if (zone) {
      const tiles = [...zone.querySelectorAll<HTMLElement>("[data-photo-id]")].filter(el => el.dataset.photoId !== current.id);
      const index = tiles.findIndex(el => { const rect = el.getBoundingClientRect(); return event.clientY < rect.top || (event.clientY <= rect.bottom && event.clientX < rect.left + rect.width / 2); });
      target = { zone: zone.dataset.roomZone!, index: index === -1 ? tiles.length : index };
    }
    current.target = target;
    setOver(previous => previous?.zone === target?.zone && previous?.index === target?.index ? previous : target);
    const scroll = root.current?.parentElement;
    if (scroll) { const rect = scroll.getBoundingClientRect(); if (event.clientY < rect.top + 45) scroll.scrollTop -= 12; else if (event.clientY > rect.bottom - 45) scroll.scrollTop += 12; }
  }
  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (current.active && current.target) {
      onChange(moveTierPhoto(value, current.id, current.target));
      setAnnouncement("Photo moved.");
    } else if (!current.active) setMenu(previous => previous === current.id ? null : current.id);
    cancelDrag();
  }
  function updateRow(id: string, name: string) {
    const trimmed = name.trim();
    if (trimmed && value.rows.find(row => row.id === id)?.name !== trimmed) onChange({ ...value, rows: value.rows.map(row => row.id === id ? { ...row, name: trimmed } : row) });
  }
  function reorderRow(index: number, direction: number) {
    const rows = [...value.rows];
    [rows[index], rows[index + direction]] = [rows[index + direction], rows[index]];
    onChange({ ...value, rows });
  }
  function removeRow(id: string) {
    const row = value.rows.find(row => row.id === id)!;
    onChange({ rows: value.rows.filter(row => row.id !== id), pool: [...value.pool, ...row.photoIds] });
  }
  function renderTiles(ids: string[], zone: string) {
    // Keep the captured tile mounted during pointer dragging.
    const visible = ids.filter(id => id !== dragId);
    const indicator = over?.zone === zone ? over.index : -1;
    return <div className={`${styles.tiles} ${over?.zone === zone ? styles.over : ""}`} data-room-zone={zone}>
      {ids.map(id => {
        const photo = photoById.get(id);
        if (!photo) return null;
        const index = visible.indexOf(id);
        return <div key={id} className={`${styles.tileSlot} ${id === dragId ? styles.dragSource : ""}`}>
          {index === indicator && <span className={styles.indicator} aria-hidden="true" />}
          <button className={styles.tile} data-photo-id={id} disabled={disabled} aria-label={`Photo ${photos.indexOf(photo) + 1}: ${photo.roomType || "Property"}. Move photo`} aria-expanded={menu === id}
            onPointerDown={event => pointerDown(event, id)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelDrag}
            onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); cancelDrag(); setMenu(null); } }}
            onClick={event => { if (event.detail === 0) setMenu(previous => previous === id ? null : id); }}>
            <img src={photo.url} alt="" draggable={false} /><span>{photo.roomType || `Photo ${photos.indexOf(photo) + 1}`}</span>
          </button>
          {menu === id && <div className={styles.menu}>
            <label>Move to<select aria-label="Destination room" value={zone} onChange={event => { onChange(moveTierPhoto(value, id, { zone: event.target.value, index: Number.MAX_SAFE_INTEGER })); setMenu(null); }}><option value={POOL}>Unassigned</option>{value.rows.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <div><button disabled={disabled || index <= 0} onClick={() => { onChange(moveTierPhoto(value, id, { zone, index: index - 1 })); setMenu(null); }}>← Earlier</button><button disabled={disabled || index >= ids.length - 1} onClick={() => { onChange(moveTierPhoto(value, id, { zone, index: index + 1 })); setMenu(null); }}>Later →</button></div>
            <button onClick={() => setMenu(null)}>Close</button>
          </div>}
        </div>;
      })}
      {indicator >= visible.length && <span className={styles.indicator} aria-hidden="true" />}
    </div>;
  }
  const draggingPhoto = dragId ? photoById.get(dragId) : null;
  return <div className={styles.organizer} ref={root}>
    <header className={styles.header}><div><span>PHOTO LIST</span><h2>Arrange your photos</h2><p>Drag photos into a room. Rename, reorder, or add your own.</p></div><button onClick={onReset} disabled={disabled}>Reset</button></header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {loading ? <p role="status">Loading photos…</p> : <>
      <div className={styles.board}>
        {value.rows.map((row, index) => <div className={styles.row} key={row.id}>
          <div className={styles.label} data-tone={index % 5}>
            <input key={row.name} defaultValue={row.name} disabled={disabled} maxLength={80} aria-label={`Rename ${row.name}`} onBlur={event => { const name = event.target.value; event.target.value = row.name; updateRow(row.id, name); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
            <div className={styles.rowTools}><button aria-label={`Move ${row.name} up`} disabled={disabled || index === 0} onClick={() => reorderRow(index, -1)}>↑</button><button aria-label={`Move ${row.name} down`} disabled={disabled || index === value.rows.length - 1} onClick={() => reorderRow(index, 1)}>↓</button><button aria-label={`Remove ${row.name} row`} disabled={disabled} onClick={() => removeRow(row.id)}>×</button></div>
          </div>
          {renderTiles(row.photoIds, row.id)}
        </div>)}
      </div>
      <div className={styles.add}><button disabled={disabled} onClick={() => { let name = "New room"; let count = 2; while (value.rows.some(row => row.name.toLowerCase() === name.toLowerCase())) name = `New room ${count++}`; onChange({ ...value, rows: [...value.rows, { id: `new-${crypto.randomUUID()}`, name, photoIds: [] }] }); }}>＋ Add row</button></div>
      {value.pool.length > 0 && renderTiles(value.pool, POOL)}
    </>}
    <p className={styles.status} role="status">{busy ? "Saving…" : status || announcement}</p>
    {draggingPhoto && createPortal(<div ref={node => { ghost.current = node; if (node && drag.current) node.style.transform = `translate3d(${drag.current.x - 28}px,${drag.current.y - 35}px,0) rotate(-4deg) scale(1.08)`; }} className={styles.ghost}><img src={draggingPhoto.url} alt="" /><span>{draggingPhoto.roomType}</span></div>, document.body)}
  </div>;
}
