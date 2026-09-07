"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { resolveMediaUrl } from "../lib/media-url";
import "./how-it-works.css";

const scenes = [
  { title: "Bring your photos", copy: "Upload your property shoot. Review the rooms and route Homie prepares." },
  { title: "Find your style", copy: "Choose a cinematic template that fits the property." },
  { title: "Create. Review. Share.", copy: "Watch your finished tour, then download it when you’re happy." },
];
const previews = ["reflection-reveal", "pulse-tour", "blueprint-to-reality"];

export default function HowItWorks() {
  const root = useRef<HTMLElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const rows = root.current?.querySelectorAll<HTMLElement>(".tour-story-step");
    if (!rows) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
      }
    }, { rootMargin: "-30% 0px -40% 0px", threshold: 0 });
    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = player.current;
    if (!video) return;
    if (active === 2 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void video.play().catch(() => undefined);
    } else video.pause();
  }, [active]);

  return (
    <section ref={root} className="tour-story" id="how-it-works" aria-label="How Homie works">
      <div className="tour-story-intro">
        <p className="section-kicker">How it works</p>
        <h2>From photos<br />to a home tour.<br /><i>Three simple steps.</i></h2>
        <p>Your property. Your photos.<br />A whole new way to show them.</p>
        <nav className="tour-story-nav" aria-label="Creation steps">
          {scenes.map((scene, i) => <a key={scene.title} href={`#tour-step-${i}`} aria-current={active === i ? "step" : undefined}><span>{String(i + 1).padStart(2, "0")}</span>{["Upload", "Choose", "Create"][i]}</a>)}
        </nav>
      </div>
      <div className="tour-story-scenes">
        {scenes.map((scene, i) => (
          <article key={scene.title} id={`tour-step-${i}`} data-step={i} className={`tour-story-step${active === i ? " is-active" : ""}`}>
            <header><span className="tour-story-number">{String(i + 1).padStart(2, "0")}</span><div><h3>{scene.title}</h3><p>{scene.copy}</p></div></header>
            {i === 0 && <div className="tour-photo-stack" aria-label="Property photos ready to upload">
              {previews.map((key, index) => <img key={key} src={resolveMediaUrl(`/api/media/template?key=templates/${key}/thumbnail.jpg`)} alt="Property exterior" loading="lazy" style={{ "--photo-index": index } as CSSProperties} />)}
              <span className="tour-upload-label"><b>↑</b> Your next listing starts here</span>
            </div>}
            {i === 1 && <div className="tour-style-strip" aria-label="Cinematic template examples">
              {previews.map((key, index) => <figure key={key}><img src={resolveMediaUrl(`/api/media/template?key=templates/${key}/thumbnail.jpg`)} alt="" loading="lazy" /><figcaption>{["Cinematic", "Fast-paced", "Viral trends"][index]}</figcaption></figure>)}
            </div>}
            {i === 2 && <div className="tour-result-scene"><div className="tour-result-phone">
              <video ref={player} muted loop playsInline preload="none" poster={resolveMediaUrl("/api/media/template?key=templates/reflection-reveal/thumbnail.jpg")} src={resolveMediaUrl("/api/media/template?key=templates/reflection-reveal/preview.mp4")} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label="Example of a finished Homie property tour" />
              <button type="button" aria-label={playing ? "Pause example tour" : "Play example tour"} onClick={() => { const video = player.current; if (!video) return; if (video.paused) void video.play().catch(() => undefined); else video.pause(); }}>{playing ? "Ⅱ" : "▶"}</button>
            </div><div className="tour-result-caption"><span>Made from your photos</span><b>Ready for its<br />close-up.</b><a href="/login">Create your first tour →</a></div></div>}
          </article>
        ))}
      </div>
    </section>
  );
}
