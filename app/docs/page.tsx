"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import HomieLogo from "../HomieLogo";
import styles from "./docs.module.css";

const SUPPORT_EMAIL = "supportbyhomie@gmail.com";

const sections = [
  { title: "GETTING STARTED", items: [["Introduction", "top"], ["Quickstart", "quickstart"], ["Your first video", "your-first-video"]] },
  { title: "CREATE", items: [["Add a home", "add-a-home"], ["Templates", "templates"], ["Formats & quality", "formats"], ["Sound & music", "sound"]] },
  { title: "YOUR VIDEOS", items: [["Track progress", "my-videos"], ["Download & share", "download"], ["MLS & compliance", "mls-guidelines"]] },
  { title: "ACCOUNT", items: [["Credits & plans", "credits"], ["Zillow & Airbnb", "integrations"]] },
] as const;

const toc: [string, string][] = [
  ["what-is-homie", "What is Homie?"],
  ["quickstart", "Quickstart"],
  ["your-first-video", "Your first video"],
  ["add-a-home", "Add a home"],
  ["templates", "Templates"],
  ["formats", "Formats & quality"],
  ["sound", "Sound & music"],
  ["my-videos", "Track progress"],
  ["download", "Download & share"],
  ["credits", "Credits & plans"],
  ["integrations", "Zillow & Airbnb"],
  ["mls-guidelines", "MLS & compliance"],
  ["next", "Next steps"],
];

const sectionIds = ["top", ...toc.map(([id]) => id)];

export default function DocsPage() {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeId, setActiveId] = useState("top");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const articleRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => sections.map((section) => ({
    ...section,
    items: section.items.filter(([label]) => label.toLowerCase().includes(query.toLowerCase())),
  })).filter((section) => section.items.length), [query]);

  // Highlight the sidebar link for whichever section is in view, unless the
  // user explicitly clicked one.
  const defaultLabel = useMemo(() => {
    for (const section of sections) {
      const match = section.items.find(([, id]) => id === activeId);
      if (match) return match[0];
    }
    return null;
  }, [activeId]);
  const currentLabel = activeLabel ?? defaultLabel;

  useEffect(() => {
    const targets = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) {
          setActiveId(visible[0].target.id);
          setActiveLabel(null);
        }
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
      <Link className={styles.brand} href="/" aria-label="Homie home"><HomieLogo /></Link>
      <nav className={styles.topnav} aria-label="Primary navigation">
        <a className={styles.active} href="/docs">Documentation</a>
        <a href="#add-a-home">Guides</a>
        <a href="#credits">Credits & plans</a>
        <a href="#integrations">Integrations</a>
      </nav>
      <div className={styles.actions}>
        <a className={styles.support} href={`mailto:${SUPPORT_EMAIL}`}>Contact support</a>
        <a className={styles.start} href="/app">Create a video <span>↗</span></a>
      </div>
    </header>

    <aside className={styles.sidebar}>
      <label className={styles.search}>
        <span aria-hidden="true">⌕</span>
        <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search docs..." aria-label="Search documentation" />
        <kbd>⌘ K</kbd>
      </label>
      <nav className={styles.sideNav} aria-label="Documentation sections">
        {filtered.length ? filtered.map((section) => <section key={section.title}>
          <h2>{section.title}</h2>
          {section.items.map(([label, id]) => <a
            className={label === currentLabel ? styles.selected : ""}
            href={`#${id}`}
            key={label}
            onClick={() => { setActiveId(id); setActiveLabel(label); }}
          >
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
          <div><h1>Introduction</h1><p>Turn your property photos into a cinematic home tour with AI.</p></div>
          <button className={styles.copy} onClick={copyPage} aria-label="Copy link to this page"><span>▢</span>{copied ? "Copied" : "Copy link"}</button>
        </div>

        <section id="what-is-homie">
          <h2>What is Homie?</h2>
          <p>Homie is an AI video studio for real estate. Add a home&apos;s photos, pick a template, and Homie films a polished property tour from them, with music, in a few minutes.</p>
          <ul>
            <li>Turn ordinary photos of a house into a moving, cinematic walkthrough</li>
            <li>Choose from curated templates, each with its own camera style and mood</li>
            <li>Every video comes with original instrumental music and ambient sound</li>
            <li>Export vertical, square, or landscape videos for social media and property pages</li>
          </ul>
        </section>

        <div className={styles.callout}><span>✦</span><div><strong>No editing required</strong><p>No timeline, no prompts, and no production team. Homie plans the shots and edits the video for you.</p></div></div>

        <section id="quickstart">
          <h2>Quickstart</h2>
          <p>The fastest path to your first video:</p>
          <div className={styles.steps}>
            <div><b>01</b><strong>Add a home</strong><p>Import it from Zillow or Airbnb, or upload your own photos.</p></div>
            <div><b>02</b><strong>Choose a template</strong><p>Pick a style in Explore, then choose the home, format, and resolution.</p></div>
            <div><b>03</b><strong>Watch &amp; download</strong><p>Your video appears in My videos, ready to play and download.</p></div>
          </div>
        </section>

        <section id="your-first-video">
          <h2>Your first video</h2>
          <ul>
            <li>Open <strong>My listings</strong> and add a home: import an address from Zillow or Airbnb, or create one and upload photos.</li>
            <li>Open <strong>Explore</strong>, pick a template, and press <strong>Create</strong>. The button shows how many credits the video uses before you confirm.</li>
            <li>Generation runs in the background and usually takes about five minutes. You can close the window and follow it in <strong>My videos</strong>.</li>
            <li>When it&apos;s done, the video is marked <strong>Ready</strong>. Watch it before you post it anywhere.</li>
          </ul>
        </section>

        <section id="add-a-home">
          <h2>Add a home</h2>
          <p>Every video starts from a home and its photos. You can upload up to 50 photos per home; the first one becomes the cover.</p>
          <ul>
            <li><strong>One photo is enough</strong> to create a video with any template.</li>
            <li><strong>Seven or more photos</strong> give the smoothest, richest tour. Homie shows a reminder on homes with fewer.</li>
            <li>Use your best interior and exterior shots, in the order you&apos;d walk a buyer through the house.</li>
            <li>Homie keeps the property exactly as photographed: it never invents rooms, furniture, or features.</li>
          </ul>
        </section>

        <section id="templates">
          <h2>Templates</h2>
          <p>Each template in <strong>Explore</strong> has its own length (15 to 30 seconds), camera movement, and mood. Open one to watch a preview before you create. A template uses up to a set number of your photos, in the order they&apos;re saved on the home.</p>
        </section>

        <section id="formats">
          <h2>Formats &amp; quality</h2>
          <p>Choose the frame that fits where you&apos;ll post the video:</p>
          <ul>
            <li><strong>9:16</strong> vertical, for Reels, TikTok, and Stories</li>
            <li><strong>1:1</strong> square and <strong>3:4</strong> portrait, for feeds</li>
            <li><strong>16:9</strong> and <strong>21:9</strong> landscape, and <strong>4:3</strong>, for YouTube, websites, and presentations</li>
          </ul>
          <p>Every plan exports in 720p. Pro and Business plans can also export in 1080p, which uses twice the credits.</p>
        </section>

        <section id="sound">
          <h2>Sound &amp; music</h2>
          <p>Every video is generated with original instrumental music and subtle ambient sound that match the template&apos;s mood. There&apos;s no narration or spoken claims about the property. Videos play muted in the browser by default; use the speaker button in the player to listen.</p>
        </section>

        <section id="my-videos">
          <h2>Track progress</h2>
          <p><strong>My videos</strong> shows every video you&apos;ve created. While a video is in production, its card shows the current step and progress; open it for more detail. Use the filters to see only videos that are generating or ready. If something goes wrong, the video is marked as failed with a short explanation.</p>
        </section>

        <section id="download">
          <h2>Download &amp; share</h2>
          <p>Open a ready video and use the download button, or choose <strong>Download</strong> from the card&apos;s menu. You get an MP4 file you can post to any social network, add to a property page, or send to clients. Your first video, made with the introductory offer, includes a watermark.</p>
        </section>

        <section id="credits">
          <h2>Credits &amp; plans</h2>
          <p>Videos are priced by length: <strong>one credit per second</strong> at 720p, and two per second at 1080p. An 18-second template uses 18 credits; a 30-second one uses 30. You always see the exact cost on the <strong>Create</strong> button before you confirm.</p>
          <ul>
            <li><strong>First video ($1):</strong> 30 credits, enough for one video with any template, with the Homie watermark</li>
            <li><strong>Starter:</strong> 150 credits a month, about five 30-second videos, in 720p</li>
            <li><strong>Pro:</strong> 400 credits a month, about thirteen 30-second videos, with 1080p</li>
            <li><strong>Business:</strong> 1,000 credits a month, about thirty-three 30-second videos, with 1080p and team seats</li>
          </ul>
          <p>Your balance and plan are under <strong>Settings → Plan &amp; billing</strong>, where you can upgrade or manage billing.</p>
        </section>

        <section id="integrations">
          <h2>Zillow &amp; Airbnb</h2>
          <p>Import a home from <strong>Zillow</strong> to bring in its address, price, and photos automatically, or import a property from <strong>Airbnb</strong>. You can always upload photos directly for homes from any other source.</p>
        </section>

        <section id="mls-guidelines">
          <h2>MLS &amp; compliance</h2>
          <p>Homie is a production tool, not a compliance check. Before you publish a video, confirm that it and any text you post with it meet your MLS&apos;s advertising rules and fair housing requirements. See the{" "}
            <a href="/terms#fair-housing">Fair housing &amp; advertising compliance</a> section of our Terms of Service for details.</p>
        </section>

        <section id="next"><h2>Next steps</h2><div className={styles.nextGrid}><a href="#your-first-video"><small>NEXT GUIDE</small><strong>Create your first video <span>→</span></strong></a><a href="/app"><small>OPEN HOMIE</small><strong>Start a new video <span>↗</span></strong></a></div></section>
      </article>

      <aside className={styles.toc} aria-label="On this page">
        <h2><span>☷</span> On this page</h2>
        {toc.map(([id, label]) => <a className={activeId === id ? styles.tocActive : ""} key={id} href={`#${id}`}>{label}</a>)}
        <div className={styles.tocLine} />
        {feedback ? <p>Thanks for the feedback.{feedback === "no" && <> <a href={`mailto:${SUPPORT_EMAIL}?subject=Docs%20feedback`}>Tell us what was missing</a></>}</p> : <><p>Was this page helpful?</p><div><button aria-label="Yes" onClick={() => setFeedback("yes")}>☺</button><button aria-label="No" onClick={() => setFeedback("no")}>○</button></div></>}
      </aside>
    </main>

    <a className={styles.chat} href={`mailto:${SUPPORT_EMAIL}`}><span>◌</span> Ask Homie</a>
  </div>;
}
