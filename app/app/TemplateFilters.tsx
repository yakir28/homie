"use client";

import { useEffect, useRef, useState } from "react";
import "./template-filters.css";

export default function TemplateFilters({ format, onFormat, formats, count }: {
  format: string; onFormat: (value: string) => void; formats: string[]; count: number;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const labels: Record<string, string> = { "9:16": "Vertical", "1:1": "Square", "16:9": "Landscape" };
  return <div className="template-tools" ref={root}>
    <button ref={trigger} data-onboarding="template-filters" className={`template-filter-trigger ${open || count ? "selected" : ""}`} aria-label={count ? `Filters (${count} active)` : "Filters"} aria-expanded={open} aria-controls="template-format-options" onClick={() => setOpen(!open)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h7m4 0h5M4 17h3m4 0h9" /><circle cx="13" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></svg>
      <span className="template-filter-label">Filters</span> {count > 0 && <b>{count}</b>}
    </button>
    {open && <section className="template-filter-popover" id="template-format-options" aria-label="Template filters" onBlur={(event) => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) setOpen(false); }}>
      <header><div><h2>Video format</h2><p>Choose where your video will live.</p></div><button aria-label="Close filters" onClick={() => { setOpen(false); trigger.current?.focus(); }}>×</button></header>
      <div className="format-choices" role="group" aria-label="Video format">
        {["All", ...formats.filter(Boolean)].map((value) => <button key={value} aria-pressed={format === value} className={format === value ? "selected" : ""} onClick={() => onFormat(value)}>
          <span className={`format-shape format-${value.replace(":", "-")}`} aria-hidden="true" />
          <span>{labels[value] ?? (value === "All" ? "All formats" : value)}{value !== "All" && <small>{value}</small>}</span>
          {format === value && <span className="format-check" aria-hidden="true">✓</span>}
        </button>)}
      </div>
      <footer><button disabled={format === "All"} onClick={() => onFormat("All")}>Reset format</button><button onClick={() => { setOpen(false); trigger.current?.focus(); }}>Done</button></footer>
    </section>}
  </div>;
}
