"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import HomieLogo from "./HomieLogo";
import { PUBLIC_ANNUAL_PRICES, PUBLIC_PRICES } from "../lib/public-pricing";
import GalleryMarquee from "./GalleryMarquee";
import "./landing-pricing.css";
import "./landing-typography.css";
import "./landing-glass.css";
import "./landing-trial-popup.css";
import previewAssets from "../lib/template-preview-assets.json";
import { resolveMediaUrl } from "../lib/media-url";

const navLinks = [
  { label: "Product", href: "#top" },
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const templatePreviews = [
  { title: "Reflection Reveal", tag: "Cinematic", video: "/api/media/template?key=templates/reflection-reveal/preview.mp4", poster: "/api/media/template?key=templates/reflection-reveal/thumbnail.jpg" },
  { title: "Pulse Tour", tag: "Fast-paced", video: "/api/media/template?key=templates/pulse-tour/preview.mp4", poster: "/api/media/template?key=templates/pulse-tour/thumbnail.jpg" },
  { title: "Foreground Reveal", tag: "Cinematic", video: "/api/media/template?key=templates/foreground-reveal/preview.mp4", poster: "/api/media/template?key=templates/foreground-reveal/thumbnail.jpg" },
  { title: "Find Your Way Home", tag: "Home tour", video: "/api/media/template?key=templates/find-your-way-home/preview.mp4", poster: "/api/media/template?key=templates/find-your-way-home/thumbnail.jpg" },
  { title: "Warm Threshold", tag: "Cinematic", video: "/api/media/template?key=templates/warm-threshold/preview.mp4", poster: "/api/media/template?key=templates/warm-threshold/thumbnail.jpg" },
];

const pricingTiers = [
  { slug: "first-video", name: "First Video", monthlyPrice: PUBLIC_PRICES["first-video"], yearlyPrice: null, monthlyVideos: 1, tagline: "Create your first property video for just $1.", features: ["1 watermarked video", "All video templates", "Use your own property photos", "First-video introductory offer"] },
  { slug: "starter", name: "Starter", monthlyPrice: PUBLIC_PRICES.starter, yearlyPrice: PUBLIC_ANNUAL_PRICES.starter, monthlyVideos: 3, tagline: "For agents starting to publish listing videos.", features: ["3 video generations each month", "Property photo uploads", "All video templates", "Social-ready exports"] },
  { slug: "pro", name: "Pro", monthlyPrice: PUBLIC_PRICES.pro, yearlyPrice: PUBLIC_ANNUAL_PRICES.pro, monthlyVideos: 10, tagline: "For solo agents publishing consistently.", features: ["10 video generations each month", "Everything in Starter", "Priority generation", "Commercial usage"], highlighted: true },
  { slug: "business", name: "Business", monthlyPrice: PUBLIC_PRICES.business, yearlyPrice: PUBLIC_ANNUAL_PRICES.business, monthlyVideos: 30, tagline: "For offices that need a shared, consistent workflow.", features: ["30 video generations each month", "10 agent seats", "Shared team workspace", "Priority support"] },
];


const faqs = [
  { q: "Do I need any video-editing experience?", a: "No. You choose a template and Homie handles the rest — no timelines, no prompts, no software to learn." },
  { q: "How does the $1 first-video offer work?", a: "Create your first watermarked property video for just $1 using your own photos and any cinematic template. This introductory price applies to your first video; additional videos are available through our paid plans." },
  { q: "How do video allowances work?", a: "Monthly plans refresh their video allowance every month. Annual plans include the full 12-month allowance upfront. Creating a video or another version uses one generation; browsing templates and uploading property photos are always free." },
  { q: "How do I add a property?", a: "Create a listing, add its title and property photos, then review the route Homie prepares before you generate the video." },
  { q: "Can I use photos I already have?", a: "Yes. Upload the listing photos from your phone or computer, arrange them if needed, and reuse them with any available template." },
  { q: "Will the video invent rooms or features the property doesn't have?", a: "Every shot is built from the photos you select, and Homie is built to preserve the real architecture, layout, materials, and lighting rather than imagine new ones. AI video is still probabilistic, which is exactly why no tour is ever final until you watch it and approve it." },
  { q: "Can I use the videos in my listings, ads, and social?", a: "Yes. You keep full ownership of your photos and of the tours you generate, and you can publish them to Reels, TikTok, Stories, listing pages, and paid campaigns. You stay responsible for confirming a tour represents the property accurately and meets your brokerage or MLS rules." },
  { q: "What if I don't like the result?", a: "Generate another version. You can rerun the same template or switch to a different one; each new version uses one video generation. Only the version you approve becomes the final tour." },
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

function AutoplayVideo({ video, poster, label, className = "" }: { video: string; poster: string; label: string; className?: string }) {
  const playerRef = useRef<HTMLVideoElement>(null);
  const assets = (previewAssets as Record<string, { preview: string; image: string }>)[video];
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.muted = true;
    player.defaultMuted = true;
    let visible = false;
    const start = () => {
      if (visible && !document.hidden) {
        player.muted = true;
        void player.play().catch(() => undefined);
      } else player.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    }, { threshold: 0.01 });
    observer.observe(player);
    player.addEventListener("canplay", start);
    document.addEventListener("visibilitychange", start);
    window.addEventListener("pointerdown", start);
    return () => {
      observer.disconnect();
      player.removeEventListener("canplay", start);
      document.removeEventListener("visibilitychange", start);
      window.removeEventListener("pointerdown", start);
      player.pause();
    };
  }, [video]);
  return (
      <video className={`landing-autoplay-video ${className}`} ref={playerRef} autoPlay muted loop playsInline controls={false} controlsList="nodownload nofullscreen noremoteplayback" disablePictureInPicture disableRemotePlayback preload="metadata" poster={assets?.image ?? resolveMediaUrl(poster)} aria-label={label}>
        <source src={assets?.preview ?? resolveMediaUrl(video)} type="video/mp4" />
      </video>
  );
}

function TemplateVideoCard({ title, video, poster, clone = false }: { title: string; tag: string; video: string; poster: string; clone?: boolean }) {
  return (
    <div className="template-preview-card" aria-hidden={clone || undefined}>
      <AutoplayVideo video={video} poster={poster} label={`${title} template preview`} />
    </div>
  );
}

const COOKIE_CONSENT_KEY = "homie_cookie_consent";
const TRIAL_POPUP_DISMISSED_KEY = "homie_trial_popup_dismissed_at";
const TRIAL_POPUP_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export default function Marketing() {
  const [announceOpen, setAnnounceOpen] = useState(true);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [trialPopupOpen, setTrialPopupOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const trialPopupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_CONSENT_KEY)) setCookieOpen(true);
  }, []);

  function chooseCookieConsent(choice: "accepted" | "declined") {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    setCookieOpen(false);
  }

  useEffect(() => {
    if (cookieOpen) return;
    const dismissedAt = Number(localStorage.getItem(TRIAL_POPUP_DISMISSED_KEY) ?? 0);
    if (Date.now() - dismissedAt < TRIAL_POPUP_COOLDOWN_MS) return;
    const timer = window.setTimeout(() => setTrialPopupOpen(true), 1400);
    return () => window.clearTimeout(timer);
  }, [cookieOpen]);

  useEffect(() => {
    if (!trialPopupOpen) return;
    const dialog = trialPopupRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        localStorage.setItem(TRIAL_POPUP_DISMISSED_KEY, String(Date.now()));
        setTrialPopupOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [trialPopupOpen]);

  function dismissTrialPopup() {
    localStorage.setItem(TRIAL_POPUP_DISMISSED_KEY, String(Date.now()));
    setTrialPopupOpen(false);
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

      {trialPopupOpen && (
        <div className="trial-popup-backdrop" onMouseDown={(event) => event.target === event.currentTarget && dismissTrialPopup()}>
          <div ref={trialPopupRef} className="trial-popup" role="dialog" aria-modal="true" aria-labelledby="trial-popup-title" aria-describedby="trial-popup-description">
            <button className="trial-popup-close" type="button" aria-label="Close first-video offer" onClick={dismissTrialPopup}>×</button>
            <div className="trial-popup-preview" aria-hidden="true">
              <AutoplayVideo video={templatePreviews[0].video} poster={templatePreviews[0].poster} label="" />
              <span>Made with Homie</span>
            </div>
            <div className="trial-popup-copy">
              <p className="trial-popup-kicker">Your first video. Just $1.</p>
              <h2 id="trial-popup-title">Turn one listing into a cinematic video. <i>Only $1.</i></h2>
              <p id="trial-popup-description">Upload your property photos, choose any template, and create your first video for just $1.</p>
              <ul>
                <li><span aria-hidden="true">✓</span> One watermarked property video</li>
                <li><span aria-hidden="true">✓</span> Every cinematic template</li>
                <li><span aria-hidden="true">✓</span> First-video price: $1</li>
              </ul>
              <a className="trial-popup-action" href="/login" onClick={() => localStorage.setItem(TRIAL_POPUP_DISMISSED_KEY, String(Date.now()))}>Create my first video for $1 <span aria-hidden="true">→</span></a>
              <button className="trial-popup-later" type="button" onClick={dismissTrialPopup}>Maybe later</button>
              <small>One free video per account.</small>
            </div>
          </div>
        </div>
      )}

      {announceOpen && (
        <div className="announce-bar">
          <p>Your first property video. Just $1. <a href="/login">Get started →</a></p>
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
            <p className="hero-sub hero-in" style={{ animationDelay: "280ms" }}><span className="hero-description-desktop">Upload your property photos, choose a cinematic direction, and turn them into a polished 25-second vertical tour—ready to publish everywhere.</span><span className="hero-description-mobile">Your property photos. A cinematic video tour. Ready to share.</span></p>
            <a className="hero-cta hero-in" style={{ animationDelay: "400ms" }} href="/login">Create your first video for $1 <span>→</span></a>
            <p className="hero-note hero-in" style={{ animationDelay: "500ms" }}><span aria-hidden="true">✓</span> Your photos. Any template. First video for $1.</p>
          </div>

          <figure className="compare-after hero-in" style={{ animationDelay: "680ms" }} onMouseMove={tiltMove} onMouseLeave={() => setTilt({ x: 0, y: 0 })}>
            <figcaption>The result</figcaption>
            <div className="compare-video" style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) rotate(2deg)` }}>
              <AutoplayVideo video={templatePreviews[0].video} poster={templatePreviews[0].poster} label="Homie generated property tour" />
            </div>
          </figure>
        </div>
      </section>

      <section className="marketing-templates" id="templates">
        <Reveal><p className="section-kicker">Templates</p></Reveal>
        <Reveal delay={80}><h2>A style for every<br /><i>listing and mood.</i></h2></Reveal>
        <div className="template-carousel">
          <div className="template-carousel-track">
            {[...templatePreviews, ...templatePreviews].map((template, index) => (
              <TemplateVideoCard {...template} clone={index >= templatePreviews.length} key={`${template.title}-${index}`} />
            ))}
          </div>
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
            <AutoplayVideo
              className="product-promo-video"
              video="/promo/homie-promo.mp4"
              poster="/promo/homie-promo-poster.jpg"
              label="Homie turns listing photos into a polished property video"
            />
          </div>
        </Reveal>
      </section>

      <section className="marketing-gallery" aria-label="The range of properties Homie handles">
        <Reveal><p className="section-kicker">The range</p></Reveal>
        <Reveal delay={80}><h2>Every listing,<br /><i>already cinematic.</i></h2></Reveal>
        <Reveal delay={140}><p className="gallery-lead">City apartments, family homes, new builds, waterfront villas — the same guided flow turns any set of listing photos into a tour worth watching.</p></Reveal>
        <GalleryMarquee />
      </section>

      <section className="marketing-pricing" id="pricing">
        <Reveal><p className="section-kicker">Pricing</p></Reveal>
        <Reveal delay={80}><h2>Simple plans that<br /><i>grow with you.</i></h2></Reveal>
        <div className="marketing-billing-toggle" role="group" aria-label="Billing period">
          <button type="button" className={billingPeriod === "monthly" ? "active" : ""} aria-pressed={billingPeriod === "monthly"} onClick={() => setBillingPeriod("monthly")}>Monthly</button>
          <button type="button" className={billingPeriod === "yearly" ? "active" : ""} aria-pressed={billingPeriod === "yearly"} onClick={() => setBillingPeriod("yearly")}>Annual <small>Save 17%</small></button>
        </div>
        <div className="plan-comparison">
          {pricingTiers.map((tier, index) => {
            const isIntro = tier.slug === "first-video";
            const annual = billingPeriod === "yearly" && tier.yearlyPrice !== null;
            const price = annual ? Math.round(tier.yearlyPrice! / 12) : tier.monthlyPrice;
            const videos = annual ? tier.monthlyVideos * 12 : tier.monthlyVideos;
            return <Reveal delay={index * 120} key={tier.name}>
              <article className={`plan-column${tier.highlighted ? " plan-column-featured" : ""}`}>
                {tier.highlighted && <div className="plan-ribbon">Most popular</div>}
                <header className="plan-heading"><h3>{tier.name}</h3>{tier.highlighted && <span className="plan-label">Recommended</span>}</header>
                <p className="plan-description">{tier.tagline}</p>
                <div className="plan-allowance">
                  <strong>{isIntro ? "1 video to try" : `${videos} videos / ${annual ? "year" : "month"}`}</strong>
                  <p>{["Try a tour with your own photos.", "Start your video publishing routine.", "Keep every new listing in the spotlight.", "One consistent workflow for your office."][index]}</p>
                  <span className="plan-allowance-note"><span aria-hidden="true">✓</span> {isIntro ? "First-video offer · just $1" : annual ? "2 months free · annual allowance" : index === 3 ? "Includes 10 agent seats" : "Monthly video allowance"}</span>
                </div>
                <div className="plan-price"><strong>${price.toLocaleString("en-US")}</strong><span>{isIntro ? "for your first video" : annual ? `per month · billed $${tier.yearlyPrice!.toLocaleString("en-US")} yearly` : "per month"}</span></div>
                <a className="plan-action" href="/login">{isIntro ? "Create for $1" : "Get started"} <span aria-hidden="true">→</span></a>
                <p className="plan-features-label">Included in {isIntro ? "your first video" : tier.name}</p>
                <ul className="plan-features">{tier.features.map((feature, featureIndex) => <li key={feature}><span aria-hidden="true">✓</span>{annual && featureIndex === 0 ? `${videos} video generations per year` : feature}</li>)}</ul>
              </article>
            </Reveal>;
          })}
        </div>
        <Reveal delay={200}><p className="pricing-note">Secure {billingPeriod === "yearly" ? "annual" : "monthly"} billing is handled by Polar. Cancel or change your plan anytime.</p></Reveal>
      </section>

      <section className="marketing-faq" id="faq">
        <div className="faq-layout">
          <div className="faq-intro">
            <Reveal><p className="section-kicker">FAQ</p></Reveal>
            <Reveal delay={80}><h2>Questions,<br /><i>answered.</i></h2></Reveal>
            <Reveal delay={140}><p>Everything you need to know before turning your first listing into a tour.</p></Reveal>
          </div>
          <div className="faq-list">
            {faqs.map((f, i) => <Reveal delay={i * 70} key={f.q}>
              <div className={openFaq === i ? "faq-item open" : "faq-item"}>
                <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}>
                  <span><b>{String(i + 1).padStart(2, "0")}</b>{f.q}</span>
                  <span className="faq-toggle-icon" aria-hidden="true"><i /><i /></span>
                </button>
                <div className="faq-answer"><div><p>{f.a}</p></div></div>
              </div>
            </Reveal>)}
          </div>
        </div>
      </section>

      <section className="marketing-cta-band">
        <Reveal><h2>Your next listing deserves<br /><i>more than a slideshow.</i></h2></Reveal>
        <Reveal delay={120}><a className="hero-cta" href="/login">Create your first video for $1 <span>→</span></a></Reveal>
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
