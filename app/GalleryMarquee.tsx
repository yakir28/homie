"use client";

import { useEffect, useRef, useState } from "react";
import thumbnails from "../lib/gallery-thumbnails.json";

const entries = Object.entries(thumbnails);
const rows = [entries.filter((_, i) => i % 2 === 0), entries.filter((_, i) => i % 2 === 1)];

export default function GalleryMarquee() {
  const root = useRef<HTMLDivElement>(null);
  const completed = useRef(new Set<HTMLImageElement>());
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!root.current) return;
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setLoad(true); preload.disconnect(); }
    }, { rootMargin: "1000px" });
    const visibility = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    preload.observe(root.current);
    visibility.observe(root.current);
    return () => { preload.disconnect(); visibility.disconnect(); };
  }, []);

  async function finish(image: HTMLImageElement) {
    try { await image.decode(); } catch { /* A failed image must not block the remaining row. */ }
    completed.current.add(image);
    if (completed.current.size === entries.length * 2) setReady(true);
  }

  return <div ref={root} className="gallery-marquee" aria-hidden="true">
    {rows.map((row, r) => <div className="gallery-row" key={r}>
      <div className={r === 1 ? "gallery-track reverse" : "gallery-track"} style={{ animationPlayState: ready && visible ? "running" : "paused" }}>
        {[...row, ...row].map(([original, asset], i) => <img
          key={`${original}-${i}`}
          src={load ? asset.src : undefined}
          srcSet={load ? asset.srcSet : undefined}
          sizes={`(max-width: 760px) ${Math.ceil(172 * asset.width / asset.height)}px, ${Math.ceil(236 * asset.width / asset.height)}px`}
          width={asset.width}
          height={asset.height}
          style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
          alt=""
          loading="eager"
          decoding="async"
          onLoad={(event) => { void finish(event.currentTarget); }}
          onError={(event) => {
            const image = event.currentTarget;
            if (!image.dataset.fallback) {
              image.dataset.fallback = "true";
              image.removeAttribute("srcset");
              image.src = original;
            } else { void finish(image); }
          }}
        />)}
      </div>
    </div>)}
  </div>;
}
