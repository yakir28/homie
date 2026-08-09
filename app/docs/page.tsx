"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import HomieLogo from "../HomieLogo";
import styles from "./docs.module.css";

const SUPPORT_EMAIL = "supportbyhomie@gmail.com";

const sections = [
  { title: "GETTING STARTED", items: [["Introduction", "top"], ["Quickstart", "quickstart"], ["Your first tour", "your-first-tour"]] },
  { title: "CREATE", items: [["Overview", "create"], ["Upload photos", "create"], ["AI templates", "create"], ["Brand kit", "customize"], ["Music & voiceover", "customize"]] },
  { title: "PUBLISH", items: [["Export a video", "publish"], ["Share links", "publish"], ["Social formats", "publish"], ["MLS guidelines", "mls-guidelines"]] },
  { title: "INTEGRATIONS", items: [["Zillow", "integrations"], ["Airbnb", "integrations"]] },
] as const;

const toc: [string, string][] = [
  ["what-is-homie", "What is Homie?"],
  ["quickstart", "Quickstart"],
  ["your-first-tour", "Your first tour"],
  ["create", "Create a home tour"],
  ["customize", "Customize your video"],
  ["publish", "Publish anywhere"],
  ["integrations", "Integrations"],
  ["mls-guidelines", "MLS & compliance"],
  ["next", "Next steps"],
];

const sectionIds = ["top", ...toc.map(([id]) => id)];

export default function DocsPage() {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeId, setActiveId] = useState("top");
  const articleRef = useRef<HTMLElement>(null);

  const filtered = useMemo(() => sections.map((section) => ({
    ...section,
    items: section.items.filter(([label]) => label.toLowerCase().includes(query.toLowerCase())),
  })).filter((section) => section.items.length), [query]);

  useEffect(() => {
    const targets = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  async function copyPage() {
    await navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return <div className={styles.shell}>
    <header className={styles.header}>
      <a className={styles.brand} href="/" aria-label="Homie home"><HomieLogo /></a>
      <nav className={styles.topnav} aria-label="Primary navigation">
        <a className={styles.active} href="/docs">Documentation</a>
        <a href="#create">Guides</a>
        <a href="#integrations">Integrations</a>
        <a href="#publish">Resources</a>
      </nav>
      <div className={styles.actions}>
        <a className={styles.support} href={`mailto:${SUPPORT_EMAIL}`}>Contact support</a>
        <a className={styles.start} href="/app">Create a tour <span>↗</span></a>
      </div>
    </header>

    <aside className={styles.sidebar}>
      <label className={styles.search}>
        <span aria-hidden="true">⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search docs..." aria-label="Search documentation" />
        <kbd>⌘ K</kbd>
      </label>
      <nav className={styles.sideNav} aria-label="Documentation sections">
        {filtered.length ? filtered.map((section) => <section key={section.title}>
          <h2>{section.title}</h2>
          {section.items.map(([label, id]) => <a className={activeId === id ? styles.selected : ""} href={`#${id}`} key={label}>
            <span>{label}</span>
          </a>)}
        </section>) : <p className={styles.empty}>No results found.</p>}
      </nav>
      <div className={styles.sideFooter}><span>Docs v1.0</span><a href={`mailto:${SUPPORT_EMAIL}`}>Need help?</a></div>
    </aside>

    <main className={styles.main} id="top">
      <article className={styles.article} ref={articleRef}>
        <div className={styles.eyebrow}>GETTING STARTED <span>/</span> INTRODUCTION</div>
        <div className={styles.titleRow}>
          <div><h1>Introduction</h1><p>Turn listing photos into cinematic property tours with AI.</p></div>
          <button className={styles.copy} onClick={copyPage} aria-label="Copy page link"><span>▢</span>{copied ? "Copied" : "Copy page"}<i>⌄</i></button>
        </div>

        <section id="what-is-homie">
          <h2>What is Homie?</h2>
          <p>Homie is an AI video platform built for real estate. Upload a property&apos;s photos, choose a visual style, and turn them into a polished home tour—ready to publish in minutes.</p>
          <ul>
            <li>Create cinematic walkthroughs from ordinary listing photos</li>
            <li>Keep every video consistent with your personal or agency brand</li>
            <li>Generate voiceover, music, captions, and multiple social formats</li>
            <li>Share directly with clients or export for any channel</li>
          </ul>
        </section>

        <div className={styles.callout}><span>✦</span><div><strong>From listing photos to a finished tour</strong><p>No editing timeline, animation skills, or production team required.</p></div></div>

        <section id="quickstart">
          <h2>Quickstart</h2>
          <p>The fastest path to your first tour, start to finish:</p>
          <div className={styles.steps}>
            <div><b>01</b><strong>Connect a listing</strong><p>Import from Zillow or Airbnb, or add your own photos.</p></div>
            <div><b>02</b><strong>Choose a template</strong><p>Pick a curated style from Explore that fits the property.</p></div>
            <div><b>03</b><strong>Approve & share</strong><p>Review your tour, approve it, then export or share.</p></div>
          </div>
        </section>

        <section id="your-first-tour">
          <h2>Your first tour</h2>
          <p>A little more detail on each step above:</p>
          <ul>
            <li>Open <strong>My listings</strong> and import an address from Zillow or Airbnb — or create a listing and upload photos directly.</li>
            <li>Open <strong>Explore</strong> and pick a template. Each template lists its format, credit cost, and the minimum number of synced photos it needs.</li>
            <li>Select the listing you want to generate from and confirm the credit cost. Generation runs in the background — track progress from <strong>My videos</strong>.</li>
            <li>Every tour lands in an awaiting-approval state. Watch it, and only approve it once it&apos;s ready — nothing is published or shared before that.</li>
          </ul>
        </section>

        <section id="create">
          <h2>Create a home tour</h2>
          <p>A Homie project starts with a listing. Add the address and property details, then upload your best interior and exterior images. Homie analyzes the sequence and builds a natural visual flow through the home.</p>
          <div className={styles.steps}>
            <div><b>01</b><strong>Add a listing</strong><p>Import from Zillow or start with an address.</p></div>
            <div><b>02</b><strong>Choose a template</strong><p>Pick a cinematic style made for your audience.</p></div>
            <div><b>03</b><strong>Generate</strong><p>Review your tour, refine it, and publish.</p></div>
          </div>
        </section>

        <section id="customize"><h2>Customize your video</h2><p>Adjust the story, pacing, captions, music, and voiceover before you generate. Save your brand details once to automatically apply your colors, logo, and contact information to every project.</p></section>
        <section id="publish"><h2>Publish anywhere</h2><p>Export vertical, square, or landscape versions for Instagram, TikTok, YouTube, listing pages, and client presentations—all from the same project.</p></section>

        <section id="integrations">
          <h2>Integrations</h2>
          <p>Homie can pull a listing&apos;s address, price, and photos directly from <strong>Zillow</strong> so you don&apos;t have to re-upload anything, or start a listing imported from <strong>Airbnb</strong>. You can always add photos directly for listings outside of either source.</p>
        </section>

        <section id="mls-guidelines">
          <h2>MLS & compliance</h2>
          <p>Homie is a production tool, not a compliance check. Before you publish a generated tour, confirm it and any accompanying copy meet your MLS&apos;s advertising rules and fair housing requirements — see the{" "}
            <a href="/terms#fair-housing">Fair housing & advertising compliance</a> section of our Terms of Service for details.</p>
        </section>

        <section id="next"><h2>Next steps</h2><div className={styles.nextGrid}><a href="#your-first-tour"><small>NEXT GUIDE</small><strong>Create your first tour <span>→</span></strong></a><a href="/app"><small>OPEN HOMIE</small><strong>Start a new project <span>↗</span></strong></a></div></section>
      </article>

      <aside className={styles.toc} aria-label="On this page">
        <h2><span>☷</span> On this page</h2>
        {toc.map(([id, label]) => <a className={activeId === id ? styles.tocActive : ""} key={id} href={`#${id}`}>{label}</a>)}
        <div className={styles.tocLine} />
        <p>Was this page helpful?</p><div><button aria-label="Yes">☺</button><button aria-label="No">○</button></div>
      </aside>
    </main>

    <a className={styles.chat} href={`mailto:${SUPPORT_EMAIL}`}><span>◌</span> Ask Homie</a>
  </div>;
}
