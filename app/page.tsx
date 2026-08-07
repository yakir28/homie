"use client";

import { useState } from "react";

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

const logos = ["Compass", "Redfin Partners", "eXp Realty", "North & West", "Century Realty"];

const templatePreviews = [
  { title: "Quiet Luxury", tag: "Cinematic", image: "/homes/modern-villa.jpg" },
  { title: "Sunday Light", tag: "Warm & airy", image: "/homes/living-room.jpg" },
  { title: "The Detail Edit", tag: "Editorial", image: "/homes/kitchen.jpg" },
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

export default function Marketing() {
  const [announceOpen, setAnnounceOpen] = useState(true);
  const [cookieOpen, setCookieOpen] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  function jumpTo(e: React.MouseEvent, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
    setNavOpen(false);
  }

  return (
    <main className="marketing-page" id="top">
      {announceOpen && (
        <div className="announce-bar">
          <p><span className="announce-tag">● New</span>Zillow-synced templates are live. <a href="/login">Try it free →</a></p>
          <button aria-label="Dismiss announcement" onClick={() => setAnnounceOpen(false)}>×</button>
        </div>
      )}

      <header className="marketing-nav">
        <a className="marketing-brand" href="#top" onClick={(e) => jumpTo(e, "top")}>homie<span>.</span></a>
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
        <p className="hero-kicker">— The listing video, rewritten —</p>
        <h1>Turn listing photos into<br />home tours that <i>move.</i></h1>
        <p className="hero-sub">Turn ordinary listing photos into scroll-stopping video tours that get more views, saves, and offers.</p>
        <a className="hero-cta" href="/login">Create your first tour <span>→</span></a>
        <p className="hero-note">Free trial · No credit card needed</p>

        <div className="compare-grid">
          <figure className="compare-before">
            <figcaption>Your listing</figcaption>
            <img src="/homes/modern-villa.jpg" alt="Original listing photo" />
          </figure>
          <div className="compare-arrow" aria-hidden="true">→</div>
          <figure className="compare-after">
            <figcaption>The result</figcaption>
            <div className="compare-video">
              <span className="compare-badge">9:16</span>
              <img src="/homes/modern-villa.jpg" alt="Generated home tour video" />
              <div className="compare-shade" />
              <div className="compare-brand">homie.</div>
              <div className="compare-copy"><p>Now presenting</p><h3>814 Palisade<br />Avenue</h3></div>
              <button aria-label="Play preview">▶</button>
            </div>
          </figure>
        </div>
      </section>

      <section className="marketing-logos">
        <p>Trusted by agents and teams at</p>
        <div>{logos.map((l) => <span key={l}>{l}</span>)}</div>
      </section>

      <section className="marketing-steps" id="how-it-works">
        <p className="section-kicker">How it works</p>
        <h2>From listing to home tour<br /><i>in three steps.</i></h2>
        <div className="steps-grid">
          {steps.map((s) => <div className="step-card" key={s.n}><span>{s.n}</span><h3>{s.title}</h3><p>{s.body}</p></div>)}
        </div>
      </section>

      <section className="marketing-templates" id="templates">
        <p className="section-kicker">Templates</p>
        <h2>A style for every<br /><i>listing and mood.</i></h2>
        <div className="templates-preview-grid">
          {templatePreviews.map((t) => <article className="template-preview-card" key={t.title}>
            <img src={t.image} alt={`${t.title} template preview`} /><div className="card-shade" />
            <div className="card-copy"><p className="eyebrow">{t.tag}</p><h3>{t.title}</h3></div>
          </article>)}
        </div>
        <a className="marketing-inline-link" href="/login">Explore the full template library <span>→</span></a>
      </section>

      <section className="marketing-use-cases" id="use-cases">
        <p className="section-kicker">Use cases</p>
        <h2>Built for solo agents<br /><i>and office teams.</i></h2>
        <div className="use-cases-grid">
          {useCases.map((u) => <div className="use-case-card" key={u.title}><span>{u.cta}</span><h3>{u.title}</h3><p>{u.body}</p></div>)}
        </div>
      </section>

      <section className="marketing-pricing" id="pricing">
        <p className="section-kicker">Pricing</p>
        <h2>Simple plans that<br /><i>grow with you.</i></h2>
        <div className="pricing-grid">
          {pricingTiers.map((t) => <div className={t.highlighted ? "pricing-card highlighted" : "pricing-card"} key={t.name}>
            {t.highlighted && <span className="pricing-badge">Most popular</span>}
            <h3>{t.name}</h3><p className="pricing-tagline">{t.tagline}</p>
            <ul>{t.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            <a className={t.highlighted ? "hero-cta" : "outline-cta"} href="/login">Start free trial <span>→</span></a>
          </div>)}
        </div>
        <p className="pricing-note">Final pricing is confirmed before your trial ends — no surprise charges.</p>
      </section>

      <section className="marketing-faq" id="faq">
        <p className="section-kicker">FAQ</p>
        <h2>Questions,<br /><i>answered.</i></h2>
        <div className="faq-list">
          {faqs.map((f, i) => <div className={openFaq === i ? "faq-item open" : "faq-item"} key={f.q}>
            <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}>{f.q}<span>{openFaq === i ? "−" : "+"}</span></button>
            {openFaq === i && <p>{f.a}</p>}
          </div>)}
        </div>
      </section>

      <section className="marketing-cta-band">
        <h2>Your next listing deserves<br /><i>more than a slideshow.</i></h2>
        <a className="hero-cta" href="/login">Start free <span>→</span></a>
      </section>

      <footer className="marketing-footer">
        <div className="marketing-brand">homie<span>.</span></div>
        <p>© 2026 Homie. Listing photos in. Home tours out.</p>
        <div className="marketing-footer-links"><a href="#">Terms</a><a href="#">Privacy</a><a href="/login">Log in</a></div>
      </footer>

      {cookieOpen && (
        <div className="cookie-banner">
          <p className="announce-tag">● Cookies</p>
          <p>We use cookies for authentication and analytics, to keep this studio running. <a href="#">Learn more</a></p>
          <div><button className="cookie-accept" onClick={() => setCookieOpen(false)}>Accept</button><button className="cookie-dismiss" onClick={() => setCookieOpen(false)}>Dismiss</button></div>
        </div>
      )}
    </main>
  );
}
