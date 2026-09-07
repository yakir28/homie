"use client";

import { useEffect, useRef } from "react";
import { resolveMediaUrl, responsiveImageProps } from "../../lib/media-url";
import assetManifest from "../../lib/template-preview-assets.json";

type CardAsset = { preview: string; image: string; srcSet: string };
const assets: Record<string, CardAsset> = assetManifest;
const pending: Array<() => void> = [];
let warming = 0;
function drain() {
  while (warming < 2 && pending.length) pending.shift()?.();
}

/** Only two nearby cards may warm at once; direct interaction bypasses the queue. */
function enqueueWarm(video: HTMLVideoElement, source: string, shortClip: boolean) {
  let started = false;
  let finished = false;
  let timeout: ReturnType<typeof setTimeout>;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    video.removeEventListener("suspend", finish);
    video.removeEventListener("error", finish);
    if (started) warming--;
    else { const index = pending.indexOf(start); if (index >= 0) pending.splice(index, 1); }
    drain();
  }
  function start() {
    started = true;
    warming++;
    if (video.getAttribute("src")) { finish(); return; }
    video.addEventListener("suspend", finish);
    video.addEventListener("error", finish);
    timeout = setTimeout(() => {
      // Abort a stalled background load before releasing its slot.
      if (video.paused) { video.removeAttribute("src"); video.load(); }
      finish();
    }, 8000);
    video.preload = shortClip ? "auto" : "metadata";
    video.src = source;
    video.load();
  }
  pending.push(start);
  drain();
  return finish;
}

export default function TemplateMedia({ image, preview, title, priority }: { image: string; preview?: string; title: string; priority: boolean }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Match legacy URLs even when a custom media origin is configured.
  const asset = preview ? assets[preview] ?? Object.entries(assets).find(([source]) => resolveMediaUrl(source) === preview)?.[1] : undefined;
  const source = asset?.preview ?? (preview ? resolveMediaUrl(preview) : undefined);

  useEffect(() => {
    const video = videoRef.current;
    const poster = imageRef.current;
    const card = poster?.parentElement;
    if (!video || !poster || !card || !source) return;
    let nearby = false;
    let hovered = false;
    let focused = false;
    let cancelWarm: (() => void) | undefined;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    function warm() {
      if (!nearby || !poster?.complete || cancelWarm || document.hidden || motion.matches || !window.matchMedia("(hover: hover)").matches || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
      cancelWarm = enqueueWarm(video!, source!, Boolean(asset));
    }
    function stop() { video!.pause(); video!.style.opacity = "0"; }
    function play() {
      if (motion.matches || document.hidden) return;
      if (!video!.getAttribute("src")) video!.src = source!;
      void video!.play().catch(() => { video!.style.opacity = "0"; });
    }
    function show() {
      if ((!hovered && !focused) || document.hidden || motion.matches) { stop(); return; }
      video!.style.opacity = "1";
    }
    function enter() { hovered = true; play(); }
    function leave() { hovered = false; if (!focused) stop(); }
    function focus() { focused = true; play(); }
    function blur(event: FocusEvent) { if (!card!.contains(event.relatedTarget as Node | null)) { focused = false; if (!hovered) stop(); } }
    function visibility() { if (document.hidden || motion.matches) stop(); else warm(); }
    const observer = new IntersectionObserver(entries => {
      nearby = entries[0].isIntersecting;
      if (nearby) warm();
      else {
        hovered = false;
        stop();
        // Release decoders and in-flight transfers for cards leaving the viewport.
        video.removeAttribute("src"); video.load();
        cancelWarm?.(); cancelWarm = undefined;
      }
    }, { rootMargin: "120px" });
    observer.observe(card);
    poster.addEventListener("load", warm);
    poster.addEventListener("error", warm);
    card.addEventListener("mouseenter", enter);
    card.addEventListener("mouseleave", leave);
    card.addEventListener("focusin", focus);
    card.addEventListener("focusout", blur);
    video.addEventListener("playing", show);
    video.addEventListener("error", stop);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", visibility);
    return () => {
      observer.disconnect();
      poster.removeEventListener("load", warm);
      poster.removeEventListener("error", warm);
      card.removeEventListener("mouseenter", enter);
      card.removeEventListener("mouseleave", leave);
      card.removeEventListener("focusin", focus);
      card.removeEventListener("focusout", blur);
      video.removeEventListener("playing", show);
      video.removeEventListener("error", stop);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", visibility);
      stop(); video.removeAttribute("src"); video.load(); cancelWarm?.();
    };
  }, [source, asset]);

  const sizes = "(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw";
  return <>
    <img ref={imageRef} {...(asset ? { src: asset.image, srcSet: asset.srcSet, sizes } : responsiveImageProps(image, sizes))} alt={`${title} real estate video template`} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" onError={(event) => { const img = event.currentTarget; if (!img.dataset.fallback) { img.dataset.fallback = "true"; img.removeAttribute("srcset"); img.src = resolveMediaUrl(image); } }} />
    {source && <video ref={videoRef} className="template-hover-video" muted loop playsInline preload="none" aria-label={`${title} real estate video template preview`} />}
  </>;
}
