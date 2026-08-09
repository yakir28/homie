"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import HomieLogo from "./HomieLogo";

const navLinks = [
  { label: "Product", href: "#top" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Templates", href: "#templates" },
  { label: "Use cases", href: "#use-cases" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const steps = [
  { n: "01", title: "Connect Zillow", body: "Import a listing and its photos in one click — no re-uploading, no re-typing." },
  { n: "02", title: "Choose a template", body: "Pick a curated visual style. No prompting, no video-editing experience needed." },
  { n: "03", title: "Approve & share", body: "Review your tour, approve it, and download it for Reels, TikTok, Stories, or Zillow." },
];

const templatePreviews = [
  { title: "Mediterranean Luxe", tag: "Cinematic", video: "/templates/mediterranean-luxe/preview.mp4", poster: "/templates/mediterranean-luxe/poster.jpg" },
  { title: "Scandinavian Calm", tag: "Warm & airy", video: "/templates/scandinavian-calm/preview.mp4", poster: "/templates/scandinavian-calm/poster.jpg" },
  { title: "Urban Penthouse", tag: "Fast-paced", video: "/templates/urban-penthouse/preview.mp4", poster: "/templates/urban-penthouse/poster.jpg" },
];

const proofPoints = [
  { value: "9:16", label: "Ready for Reels, TikTok & Stories" },
  { value: "3 steps", label: "From listing link to finished tour" },
  { value: "100%", label: "You approve before anything is shared" },
];

const useCases = [
  { title: "Solo agents", body: "Turn every new listing into a polished tour in minutes — no editing skills, no extra hires, no waiting on a videographer.", cta: "For solo agents" },
  { title: "Office teams", body: "Give every agent on your team the same premium look, synced straight from Zillow, with shared templates and brand-consistent output.", cta: "For teams" },
];

const pricingTiers = [
  { name: "Solo Agent", tagline: "For individual agents just getting started with video.", features: ["Zillow sync for one account", "Curated template library", "Reels, TikTok & Stories exports", "Included monthly credits"] },
  { name: "Office Team", tagline: "For real-estate teams who want a consistent, on-brand look.", features: ["Everything in Solo Agent", "Shared team workspace", "Multiple agent seats", "Priority support"], highlighted: true },
];

const faqs = [
  { q: "Do I need any video-editing experience?", a: "No. You choose a template and Homie handles the rest — no timelines, no prompts, no software to learn." },
  { q: "Will anything publish without my approval?", a: "Never. Every generated video goes into an awaiting-approval state. Nothing is published, downloaded, or shared until you explicitly approve it." },
  { q: "What happens during the free trial?", a: "You get a set number of credits to generate real tours from your own listings — no credit card required to start." },
  { q: "Can I use my own photos instead of Zillow?", a: "Zillow sync is the fastest way to start, and direct photo upload is on our roadmap for listings outside of Zillow." },
];

function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "li" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const Comp = Tag as "div";
  return (
    <Comp ref={ref} className={`reveal ${visible ? "is-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Comp>
  );
}

function TemplateVideoCard({ title, tag, video, poster }: { title: string; tag: string; video: string; poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  function play() {
    void videoRef.current?.play();
  }

  function pause() {
    const player = videoRef.current;
    if (!player) return;
    player.pause();
    player.currentTime = 0;
  }

  return (
    <button type="button" className="template-preview-card" onMouseEnter={play} onMouseLeave={pause} onFocus={play} onBlur={pause} aria-label={`Preview ${title} template`}>
      <video ref={videoRef} muted loop playsInline preload="metadata" poster={poster} aria-label={`${title} template preview`}>
        <source src={video} type="video/mp4" />
        <track kind="captions" src="/captions/no-dialogue.vtt" srcLang="en" label="No dialogue" default />
      </video>
      <div className="card-shade" />
      <span className="template-play-cue" aria-hidden="true">▶</span>
      <div className="card-copy"><p className="eyebrow">{tag}</p><h3>{title}</h3><small>Hover to watch</small></div>
    </button>
  );
}

const COOKIE_CONSENT_KEY = "homie_cookie_consent";

export default function Marketing() {
  const [announceOpen, setAnnounceOpen] = useState(true);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_CONSENT_KEY)) setCookieOpen(true);
  }, []);

  function chooseCookieConsent(choice: "accepted" | "declined") {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    setCookieOpen(false);
  }

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 40);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (y / max) * 100) : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function jumpTo(e: React.MouseEvent, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
    setNavOpen(false);
  }

  function tiltMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -10, y: px * 14 });
  }

  return (
    <main className="marketing-page" id="top">
      <div className="scroll-progress" style={{ width: `${progress}%` }} />

      {announceOpen && (
        <div className="announce-bar">
          <p><span className="announce-tag">● New</span>Zillow-synced templates are live. <a href="/login">Try it free →</a></p>
          <button aria-label="Dismiss announcement" onClick={() => setAnnounceOpen(false)}>×</button>
        </div>
      )}

      <header className={scrolled ? "marketing-nav scrolled" : "marketing-nav"}>
        <a className="marketing-brand" href="#top" onClick={(e) => jumpTo(e, "top")} aria-label="Homie home"><HomieLogo /></a>
        <nav className="marketing-links" aria-label="Main">
          {navLinks.map((l) => <a key={l.label} href={l.href} onClick={(e) => jumpTo(e, l.href.slice(1))}>{l.label}</a>)}
        </nav>
        <div className="marketing-actions">
          <a className="marketing-login" href="/login">Log in</a>
          <a className="marketing-cta" href="/login">Get started <span>→</span></a>
        </div>
        <button className="marketing-burger" aria-label="Open menu" aria-expanded={navOpen} onClick={() => setNavOpen((v) => !v)}><span /><span /><span /></button>
      </header>

      {navOpen && (
        <div className="marketing-mobile-menu">
          {navLinks.map((l) => <a key={l.label} href={l.href} onClick={(e) => jumpTo(e, l.href.slice(1))}>{l.label}</a>)}
          <div className="marketing-mobile-actions">
            <a href="/login">Log in</a>
            <a className="marketing-cta" href="/login">Get started <span>→</span></a>
          </div>
        </div>
      )}

      <section className="marketing-hero">
        <div className="hero-blob a" aria-hidden="true" />
        <div className="hero-blob b" aria-hidden="true" />
        <p className="hero-kicker hero-in" style={{ animationDelay: "40ms" }}>AI video studio for real estate</p>
        <h1 className="hero-in" style={{ animationDelay: "140ms" }}>Your listing already has a story.<br />Make people <i>feel it.</i></h1>
        <p className="hero-sub hero-in" style={{ animationDelay: "280ms" }}>Connect your listing, choose a cinematic direction, and turn property photos into a polished 25-second vertical tour—ready to publish everywhere.</p>
        <a className="hero-cta hero-in" style={{ animationDelay: "400ms" }} href="/login">Create your first tour <span>→</span></a>
        <p className="hero-note hero-in" style={{ animationDelay: "500ms" }}>Free trial · No credit card needed</p>

        <div className="compare-grid hero-in" style={{ animationDelay: "600ms" }}>
          <figure className="compare-before">
            <figcaption>Your listing</figcaption>
            <img src="/homes/modern-villa.jpg" alt="Original listing exterior" />
          </figure>
          <div className="compare-arrow" aria-hidden="true">→</div>
          <figure className="compare-after" onMouseMove={tiltMove} onMouseLeave={() => setTilt({ x: 0, y: 0 })}>
            <figcaption>The result</figcaption>
            <div className="compare-video" style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) rotate(2deg)` }}>
              <span className="compare-badge">9:16</span>
              <video autoPlay muted loop playsInline preload="metadata" poster="/templates/mediterranean-luxe/poster.jpg" aria-label="Homie generated Mediterranean property tour">
                <source src="/templates/mediterranean-luxe/preview.mp4" type="video/mp4" />
                <track kind="captions" src="/captions/no-dialogue.vtt" srcLang="en" label="No dialogue" default />
              </video>
              <div className="compare-shade" />
              <div className="compare-brand">homie.</div>
              <div className="compare-copy"><p>Now presenting</p><h3>814 Palisade<br />Avenue</h3></div>
              <span className="compare-live"><i /> Playing preview</span>
            </div>
          </figure>
        </div>
      </section>

      <section className="marketing-proof" aria-label="Product highlights">
        <div className="proof-grid">
          {proofPoints.map((point, i) => <Reveal delay={i * 90} key={point.value}>
            <div className="proof-point"><strong>{point.value}</strong><span>{point.label}</span></div>
          </Reveal>)}
        </div>
      </section>

      <section className="marketing-steps" id="how-it-works">
        <Reveal><p className="section-kicker">How it works</p></Reveal>
        <Reveal delay={80}><h2>From listing to home tour<br /><i>in three steps.</i></h2></Reveal>
        <div className="steps-grid">
          {steps.map((s, i) => <Reveal delay={i * 110} key={s.n}><div className="step-card"><span>{s.n}</span><h3>{s.title}</h3><p>{s.body}</p></div></Reveal>)}
        </div>
      </section>

      <section className="marketing-templates" id="templates">
        <Reveal><p className="section-kicker">Templates</p></Reveal>
        <Reveal delay={80}><h2>A style for every<br /><i>listing and mood.</i></h2></Reveal>
        <div className="templates-preview-grid">
          {templatePreviews.map((t, i) => <Reveal delay={i * 110} key={t.title}>
            <TemplateVideoCard {...t} />
          </Reveal>)}
        </div>
        <Reveal delay={200}><a className="marketing-inline-link" href="/login">Explore the full template library <span>→</span></a></Reveal>
      </section>

      <section className="marketing-use-cases" id="use-cases">
        <Reveal><p className="section-kicker">Use cases</p></Reveal>
        <Reveal delay={80}><h2>Built for solo agents<br /><i>and office teams.</i></h2></Reveal>
        <div className="use-cases-grid">
          {useCases.map((u, i) => <Reveal delay={i * 120} key={u.title}><div className="use-case-card"><span>{u.cta}</span><h3>{u.title}</h3><p>{u.body}</p></div></Reveal>)}
        </div>
      </section>

      <section className="marketing-pricing" id="pricing">
        <Reveal><p className="section-kicker">Pricing</p></Reveal>
        <Reveal delay={80}><h2>Simple plans that<br /><i>grow with you.</i></h2></Reveal>
        <div className="pricing-grid">
          {pricingTiers.map((t, i) => <Reveal delay={i * 120} key={t.name}>
            <div className={t.highlighted ? "pricing-card highlighted" : "pricing-card"}>
              {t.highlighted && <span className="pricing-badge">Most popular</span>}
              <h3>{t.name}</h3><p className="pricing-tagline">{t.tagline}</p>
              <ul>{t.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
              <a className={t.highlighted ? "hero-cta" : "outline-cta"} href="/login">Start free trial <span>→</span></a>
            </div>
          </Reveal>)}
        </div>
        <Reveal delay={200}><p className="pricing-note">Final pricing is confirmed before your trial ends — no surprise charges.</p></Reveal>
      </section>

      <section className="marketing-faq" id="faq">
        <Reveal><p className="section-kicker">FAQ</p></Reveal>
        <Reveal delay={80}><h2>Questions,<br /><i>answered.</i></h2></Reveal>
        <div className="faq-list">
          {faqs.map((f, i) => <Reveal delay={i * 70} key={f.q}>
            <div className={openFaq === i ? "faq-item open" : "faq-item"}>
              <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}>
                {f.q}
                <span className="faq-toggle-icon" aria-hidden="true"><i /><i /></span>
              </button>
              <div className="faq-answer"><div><p>{f.a}</p></div></div>
            </div>
          </Reveal>)}
        </div>
      </section>

      <section className="marketing-cta-band">
        <Reveal><h2>Your next listing deserves<br /><i>more than a slideshow.</i></h2></Reveal>
        <Reveal delay={120}><a className="hero-cta" href="/login">Start free <span>→</span></a></Reveal>
      </section>

      <footer className="marketing-footer">
        <div className="marketing-brand"><HomieLogo /></div>
        <p>© 2026 Homie. Listing photos in. Home tours out.</p>
        <div className="marketing-footer-links"><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/login">Log in</a></div>
      </footer>

      {cookieOpen && (
        <div className="cookie-banner">
          <p className="announce-tag">● Cookies</p>
          <p>We use cookies for authentication and analytics, to keep this studio running.</p>
          <div><button className="cookie-accept" onClick={() => chooseCookieConsent("accepted")}>Accept</button><button className="cookie-dismiss" onClick={() => chooseCookieConsent("declined")}>Dismiss</button></div>
        </div>
      )}
    </main>
  );
}
