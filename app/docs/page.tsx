"use client";

import { useMemo, useState } from "react";
import HomieLogo from "../HomieLogo";
import styles from "./docs.module.css";

const sections = [
  { title: "GETTING STARTED", items: ["Introduction", "Quickstart", "Your first tour"] },
  { title: "CREATE", items: ["Overview", "Upload photos", "AI templates", "Brand kit", "Music & voiceover"] },
  { title: "PUBLISH", items: ["Export a video", "Share links", "Social formats", "MLS guidelines"] },
  { title: "INTEGRATIONS", items: ["Zillow", "Airbnb", "API reference"] },
];

const toc = [
  ["what-is-homie", "What is Homie?"],
  ["create", "Create a home tour"],
  ["customize", "Customize your video"],
  ["publish", "Publish anywhere"],
  ["next", "Next steps"],
];

export default function DocsPage() {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const filtered = useMemo(() => sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.toLowerCase().includes(query.toLowerCase())),
  })).filter((section) => section.items.length), [query]);

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
        <a className={styles.support} href="mailto:support@homie.ai">Contact support</a>
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
          {section.items.map((item) => <a className={item === "Introduction" ? styles.selected : ""} href={item === "Introduction" ? "#top" : `#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>
            <span>{item}</span>{["Upload photos", "AI templates", "Brand kit", "Zillow", "Airbnb"].includes(item) && <b>›</b>}
          </a>)}
        </section>) : <p className={styles.empty}>No results found.</p>}
      </nav>
      <div className={styles.sideFooter}><span>Docs v1.0</span><a href="mailto:support@homie.ai">Need help?</a></div>
    </aside>

    <main className={styles.main} id="top">
      <article className={styles.article}>
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
        <section id="next"><h2>Next steps</h2><div className={styles.nextGrid}><a href="#your-first-tour"><small>NEXT GUIDE</small><strong>Create your first tour <span>→</span></strong></a><a href="/app"><small>OPEN HOMIE</small><strong>Start a new project <span>↗</span></strong></a></div></section>
      </article>

      <aside className={styles.toc} aria-label="On this page">
        <h2><span>☷</span> On this page</h2>
        {toc.map(([id, label], index) => <a className={index === 0 ? styles.tocActive : ""} key={id} href={`#${id}`}>{label}</a>)}
        <div className={styles.tocLine} />
        <p>Was this page helpful?</p><div><button aria-label="Yes">☺</button><button aria-label="No">○</button></div>
      </aside>
    </main>

    <a className={styles.chat} href="mailto:support@homie.ai"><span>◌</span> Ask Homie</a>
  </div>;
}
