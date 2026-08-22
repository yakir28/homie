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
  { title: "Reflection Reveal", tag: "Cinematic", video: "/api/media/template?key=templates/reflection-reveal/preview.mp4", poster: "/api/media/template?key=templates/reflection-reveal/thumbnail.jpg" },
  { title: "Pulse Tour", tag: "Fast-paced", video: "/api/media/template?key=templates/pulse-tour/preview.mp4", poster: "/api/media/template?key=templates/pulse-tour/thumbnail.jpg" },
  { title: "Magic Build Reveal", tag: "Viral Trends", video: "/api/media/template?key=templates/cinematic-second/preview.mp4", poster: "/api/media/template?key=templates/cinematic-second/thumbnail.jpg" },
];

const proofPoints = [
  { icon: "↗", value: "9:16", label: "Ready for Reels, TikTok & Stories" },
  { icon: "03", value: "3 steps", label: "From listing link to finished tour" },
  { icon: "✓", value: "100%", label: "You approve before anything is shared" },
];

const useCases = [
  { title: "Solo agents", body: "Turn every new listing into a polished tour in minutes — no editing skills, no extra hires, no waiting on a videographer.", cta: "For solo agents" },
  { title: "Office teams", body: "Give every agent on your team the same premium look, synced straight from Zillow, with shared templates and brand-consistent output.", cta: "For teams" },
];

const pricingTiers = [
  { name: "Solo Agent", tagline: "For individual agents just getting started with video.", features: ["Zillow sync for one account", "Curated template library", "Reels, TikTok & Stories exports", "Included monthly credits"] },
  { name: "Office Team", tagline: "For real-estate teams who want a consistent, on-brand look.", features: ["Everything in Solo Agent", "Shared team workspace", "Multiple agent seats", "Priority support"], highlighted: true },
];

// Only Zillow and Airbnb have an import path today; Booking is shown as pending
// rather than implied to work.
const integrations = [
  { name: "Zillow", logo: "/integrations/zillow-logo.png", live: true },
  { name: "Airbnb", logo: "/integrations/airbnb-logo.png", live: true },
  { name: "Booking", logo: null, live: false },
];

const gallery = [
  ...Array.from({ length: 14 }, (_, i) => `/gallery/gallery-${String(i + 1).padStart(2, "0")}.jpg`),
  ...Array.from({ length: 31 }, (_, i) => `/gallery/gallery-${String(i + 15).padStart(2, "0")}.webp`),
];
// Alternate the complete collection between the two directions. Each row is
// duplicated when rendered so the marquee stays seamless at every viewport.
const galleryTop = gallery.filter((_, i) => i % 2 === 0);
const galleryBottom = gallery.filter((_, i) => i % 2 === 1);

const faqs = [
  { q: "Do I need any video-editing experience?", a: "No. You choose a template and Homie handles the rest — no timelines, no prompts, no software to learn." },
  { q: "What happens during the free trial?", a: "You get a set number of credits to generate real tours from your own listings — no credit card required to start." },
  { q: "How do credits work?", a: "Every template shows its credit cost before you generate, and your balance stays visible while you work. Credits come with your plan and are only spent when you create a video — browsing templates and importing listings never cost anything." },
  { q: "Can I connect my Zillow listings?", a: "Yes. Connect your public Zillow profile and Homie imports your listings along with their photos, address, and details. If a listing doesn't come through automatically, paste its Zillow link and Homie will import it directly." },
  { q: "Can I use my own photos instead of Zillow?", a: "Zillow sync is the fastest way to start, and direct photo upload is on our roadmap for listings outside of Zillow." },
  { q: "Will the video invent rooms or features the property doesn't have?", a: "Every shot is built from the photos you select, and Homie is built to preserve the real architecture, layout, materials, and lighting rather than imagine new ones. AI video is still probabilistic, which is exactly why no tour is ever final until you watch it and approve it." },
  { q: "Can I use the videos in my listings, ads, and social?", a: "Yes. You keep full ownership of your photos and of the tours you generate, and you can publish them to Reels, TikTok, Stories, listing pages, and paid campaigns. You stay responsible for confirming a tour represents the property accurately and meets your brokerage or MLS rules." },
  { q: "What if I don't like the result?", a: "Generate another version. You can rerun the same template or switch to a different one, and the credit cost is always shown before you confirm. Only the version you approve becomes the final tour." },
  { q: "Will anything publish without my approval?", a: "Never. Every generated video goes into an awaiting-approval state. Nothing is published, downloaded, or shared until you explicitly approve it." },
  { q: "How long does one tour take?", a: "Usually a few minutes, because each shot is generated on its own and then assembled into the final cut. You don't have to keep the page open — Homie keeps working and the tour is waiting for review when it's ready." },
  { q: "Can my whole office work in one account?", a: "Yes. Office plans add a shared workspace with seats for your agents, shared listings and templates, and a record of who created and who approved every tour." },
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
          <a href="/docs">Docs</a>
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
          <a href="/docs">Docs</a>
          <div className="marketing-mobile-actions">
            <a href="/login">Log in</a>
            <a className="marketing-cta" href="/login">Get started <span>→</span></a>
          </div>
        </div>
      )}

      <section className="marketing-hero">
        <div className="hero-layout">
          <figure className="compare-before hero-in" style={{ animationDelay: "620ms" }}>
            <figcaption>Your listing</figcaption>
            <img src="/homes/green-cottage-listing.png" alt="Green cottage listing exterior on a rainy day" />
          </figure>

          <div className="hero-copy">
            <p className="hero-kicker hero-in" style={{ animationDelay: "40ms" }}>AI video studio for real estate</p>
            <h1 className="hero-in" style={{ animationDelay: "140ms" }}>Create hyper-realistic videos for your properties <i>in seconds</i></h1>
            <p className="hero-sub hero-in" style={{ animationDelay: "280ms" }}>Connect your listing, choose a cinematic direction, and turn property photos into a polished 25-second vertical tour—ready to publish everywhere.</p>
            <a className="hero-cta hero-in" style={{ animationDelay: "400ms" }} href="/login">Create your first tour <span>→</span></a>
            <p className="hero-note hero-in" style={{ animationDelay: "500ms" }}><span aria-hidden="true">✓</span> Start free. No credit card required.</p>
          </div>

          <figure className="compare-after hero-in" style={{ animationDelay: "680ms" }} onMouseMove={tiltMove} onMouseLeave={() => setTilt({ x: 0, y: 0 })}>
            <figcaption>The result</figcaption>
            <div className="compare-video" style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) rotate(2deg)` }}>
              <video autoPlay muted loop playsInline preload="metadata" poster={templatePreviews[0].poster} aria-label="Homie generated property tour">
                <source src={templatePreviews[0].video} type="video/mp4" />
              </video>
            </div>
          </figure>
        </div>
      </section>

      <section className="marketing-proof" aria-label="Product highlights">
        <div className="proof-grid">
          {proofPoints.map((point, i) => <Reveal delay={i * 90} key={point.value}>
            <div className="proof-point"><i aria-hidden="true">{point.icon}</i><div><strong>{point.value}</strong><span>{point.label}</span></div></div>
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

      <section className="marketing-product" id="product">
        <Reveal><p className="section-kicker">Inside Homie</p></Reveal>
        <Reveal delay={80}><h2>A library of ready-to-use tour styles.<br /><i>Zero learning curve.</i></h2></Reveal>
        <Reveal delay={140}><p className="product-lead">Open the library, pick a style, choose a listing. No timeline, no settings, nothing to learn — the studio does the rest.</p></Reveal>
        <Reveal delay={200}>
          <div className="product-frame">
            <div className="product-chrome" aria-hidden="true">
              <span /><span /><span />
              <div className="product-url">app.homie.com/templates</div>
            </div>
            <img src="/screens/explore-placeholder.jpg" alt="The Homie template library, where every tour starts" loading="lazy" decoding="async" />
          </div>
        </Reveal>
      </section>

      <section className="marketing-gallery" aria-label="The range of properties Homie handles">
        <Reveal><p className="section-kicker">The range</p></Reveal>
        <Reveal delay={80}><h2>Every listing,<br /><i>already cinematic.</i></h2></Reveal>
        <Reveal delay={140}><p className="gallery-lead">City apartments, family homes, new builds, waterfront villas — the same guided flow turns any set of listing photos into a tour worth watching.</p></Reveal>
        <div className="gallery-marquee" aria-hidden="true">
          {[galleryTop, galleryBottom].map((row, r) => (
            <div className="gallery-row" key={r}>
              <div className={r === 1 ? "gallery-track reverse" : "gallery-track"}>
                {[...row, ...row].map((src, i) => <img key={`${src}-${i}`} src={src} alt="" loading="lazy" decoding="async" />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-integrations" id="integrations">
        <div className="connect-grid">
          <div className="connect-copy">
            <Reveal><p className="section-kicker">Where your listings live</p></Reveal>
            <Reveal delay={80}><h2>Connect your <i>listings.</i></h2></Reveal>
            <Reveal delay={140}><p>Import a listing and its photos in one click. Connect the platform you already work in and start turning listings into tours the same day.</p></Reveal>
            <Reveal delay={200}>
              <ul className="connect-points">
                <li>Import listings and photos automatically</li>
                <li>Bring in a whole profile, or just one link</li>
                <li>Re-sync whenever a listing changes</li>
              </ul>
            </Reveal>
            <Reveal delay={260}><a className="hero-cta" href="/login">Connect your account <span>→</span></a></Reveal>
          </div>
          <Reveal delay={180}>
            <div className="connect-panel">
              <div className="connect-logos">
                {integrations.map((item, i) => (
                  <div className={item.live ? "connect-tile" : "connect-tile soon"} key={item.name}>
                    <span className="connect-status"><i aria-hidden="true" />{item.live ? "Available" : "Coming soon"}</span>
                    {item.logo
                      ? <img src={item.logo} alt={`${item.name} logo`} loading="lazy" />
                      : <span className="connect-wordmark">{item.name}</span>}
                    <span className="connect-name">{item.name}</span>
                  </div>
                ))}
              </div>
              <p className="connect-note">More integrations coming soon</p>
            </div>
          </Reveal>
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
        <div className="marketing-footer-links"><a href="/docs">Docs</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/login">Log in</a></div>
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
