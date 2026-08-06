"use client";

import { useState } from "react";

type View = "overview" | "templates" | "listings" | "review";

const nav = [
  { id: "overview" as View, label: "Overview", icon: "⌂" },
  { id: "templates" as View, label: "Templates", icon: "◇" },
  { id: "listings" as View, label: "Listings", icon: "▤" },
  { id: "review" as View, label: "My videos", icon: "▷" },
];

const templates = [
  { title: "Quiet Luxury", tag: "Cinematic", format: "9:16", time: "24 sec", credits: 18, image: "/homes/modern-villa.jpg", size: "tall" },
  { title: "Sunday Light", tag: "Warm & airy", format: "9:16", time: "18 sec", credits: 14, image: "/homes/living-room.jpg", size: "normal" },
  { title: "The Detail Edit", tag: "Editorial", format: "1:1", time: "20 sec", credits: 16, image: "/homes/kitchen.jpg", size: "normal" },
  { title: "Modern Living", tag: "Minimal", format: "16:9", time: "30 sec", credits: 22, image: "/homes/lounge.jpg", size: "wide" },
  { title: "Welcome Home", tag: "Family", format: "9:16", time: "22 sec", credits: 16, image: "/homes/dining.jpg", size: "normal" },
];

const listings = [
  { address: "814 Palisade Avenue", city: "Austin, TX", price: "$1,285,000", photos: 28, videos: 2, image: "/homes/modern-villa.jpg", status: "Active" },
  { address: "2904 Hollow Creek", city: "Austin, TX", price: "$925,000", photos: 34, videos: 0, image: "/homes/living-room.jpg", status: "Active" },
  { address: "62 Juniper Lane", city: "Round Rock, TX", price: "$748,000", photos: 22, videos: 1, image: "/homes/dining.jpg", status: "Pending" },
];

export default function Home() {
  const [view, setView] = useState<View>("templates");
  const [toast, setToast] = useState("");

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("overview")} aria-label="Homie overview">homie<span>.</span></button>
        <nav aria-label="Main navigation">
          <button onClick={() => setView("overview")} className={view === "overview" ? "active" : ""}><span>•</span>Getting started <small>2/3</small></button>
          <button onClick={() => setView("templates")} className={view === "templates" ? "active" : ""}><span>•</span>Explore</button>
          <button onClick={() => setView("review")} className={view === "review" ? "active" : ""}><span>•</span>My videos</button>
          <button onClick={() => flash("Favorites opened")}><span>•</span>Favorites</button>
          <p className="nav-label">Business</p>
          <button onClick={() => setView("listings")} className={view === "listings" ? "active" : ""}><span>•</span>My listings</button>
          <button onClick={() => flash("Zillow is connected and synced")}><span>•</span>Integrations</button>
          <p className="nav-label">Team</p>
          <button onClick={() => flash("Team management is coming next")}><span>•</span>Members</button>
          <div className="sidebar-divider" />
          <button onClick={() => flash("Subscription settings opened")}><span>•</span>Subscribe</button>
          <button onClick={() => flash("Credit top-ups are coming soon")}><span>•</span>Buy credits</button>
          <button onClick={() => flash("Activity opened")}><span className="activity-dot">•</span>Activity</button>
        </nav>
        <div className="sidebar-bottom">
          <button className="profile"><span className="profile-avatar">♙</span><span><b>yakir.15</b><small>142 credits</small></span><i>⌄</i></button>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => setView("overview")}>homie<span>.</span></button>
          <label className="global-search"><span>⌕</span><input aria-label="Search Homie" placeholder={view === "templates" ? "Search templates..." : "Search Homie..."} /></label>
          <button className="filter-square" onClick={() => flash("Filters opened")} aria-label="Open filters">☷</button>
        </header>

        {view === "overview" && <Overview setView={setView} />}
        {view === "templates" && <Templates setView={setView} flash={flash} />}
        {view === "listings" && <Listings setView={setView} />}
        {view === "review" && <Review flash={flash} />}

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {nav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label === "My videos" ? "Videos" : item.label}</button>)}
        </nav>
      </section>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

function Overview({ setView }: { setView: (v: View) => void }) {
  return <div className="page overview-page">
    <div className="page-intro intro-row"><div><p className="eyebrow">Thursday, August 6</p><h1>Good evening, Yakir.</h1><p>Three listings are ready to turn into something worth watching.</p></div><button className="outline-btn" onClick={() => setView("listings")}>View all listings <span>→</span></button></div>
    <section className="hero-card">
      <img src="/homes/modern-villa.jpg" alt="Contemporary home at 814 Palisade Avenue" />
      <div className="hero-shade" />
      <div className="hero-copy"><span className="live-pill">● Zillow synced</span><p className="eyebrow">Featured listing</p><h2>814 Palisade Avenue</h2><p>Austin, TX · $1,285,000 · 28 photos</p><button onClick={() => setView("templates")}>Create a home tour <span>→</span></button></div>
      <div className="hero-count"><b>01</b><span /><small>03</small></div>
    </section>
    <div className="dashboard-grid">
      <section className="panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">In progress</p><h3>Your recent videos</h3></div><button onClick={() => setView("review")}>View all →</button></div>
        <div className="video-row"><div className="video-thumb"><img src="/homes/kitchen.jpg" alt="Bright modern kitchen" /><button aria-label="Play video">▶</button></div><div className="video-info"><span className="status amber">Awaiting approval</span><h4>Sunday Light</h4><p>2904 Hollow Creek</p><small>Story · 18 sec</small></div><button className="review-btn" onClick={() => setView("review")}>Review</button></div>
        <div className="video-row compact"><div className="video-thumb"><img src="/homes/dining.jpg" alt="Modern dining room" /><button aria-label="Play video">▶</button></div><div className="video-info"><span className="status green">Approved</span><h4>Welcome Home</h4><p>62 Juniper Lane</p><small>Reel · 22 sec</small></div><button className="dots">•••</button></div>
      </section>
      <aside className="panel setup-panel"><div className="panel-heading"><div><p className="eyebrow">Quick start</p><h3>You're almost set</h3></div><b>2/3</b></div><div className="progress"><i /></div>
        <div className="check-row done"><span>✓</span><div><b>Create your workspace</b><small>North & West Realty</small></div></div>
        <div className="check-row done"><span>✓</span><div><b>Connect Zillow</b><small>3 listings synced</small></div></div>
        <button className="check-row current" onClick={() => setView("templates")}><span>3</span><div><b>Create your first tour</b><small>Choose a template to begin</small></div><i>→</i></button>
      </aside>
    </div>
  </div>;
}

function Templates({ setView, flash }: { setView: (v: View) => void; flash: (m: string) => void }) {
  const [filter, setFilter] = useState("All");
  return <div className="page templates-page">
    <div className="content-tabs"><button className="active">Templates</button><button onClick={() => setView("review")}>My videos</button><button onClick={() => flash("Favorites opened")}>Favorites</button></div>
    <div className="filter-row">{["All", "Luxury", "Modern", "Warm", "Cinematic", "Minimal", "Coastal", "Urban", "Family", "Fast-paced", "Zillow"].map((name) => <button key={name} onClick={() => setFilter(name)} className={filter === name ? "active" : ""}>{name}</button>)}</div>
    <div className="template-grid">
      <article className="template-start"><span className="eyebrow">Not sure where to start?</span><h2>Let the home<br /><i>lead the way.</i></h2><p>Choose a listing and we'll recommend templates that fit its mood and architecture.</p><button onClick={() => setView("listings")}>Choose a listing →</button></article>
      {templates.map((template, index) => <article className={`template-card ${template.size}`} key={template.title} onClick={() => setView("review")} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setView("review")}>
        <img src={template.image} alt={`${template.title} real estate video template`} /><div className="card-shade" /><div className="card-top"><span>{index === 0 ? "Featured" : template.tag}</span><button aria-label={`Favorite ${template.title}`} onClick={(e) => { e.stopPropagation(); flash("Saved to favorites"); }}>♡</button></div><button className="play" aria-label={`Preview ${template.title}`}>▶</button><div className="card-copy"><p className="eyebrow">{template.tag}</p><h3>{template.title}</h3><div><span>{template.time}</span><span>{template.format}</span><span>{template.credits} credits</span></div></div>
      </article>)}
    </div>
  </div>;
}

function Listings({ setView }: { setView: (v: View) => void }) {
  return <div className="page listings-page">
    <div className="page-intro intro-row"><div><p className="eyebrow">Synced from Zillow</p><h1>Your listings.</h1><p>Select a home and turn its photos into a polished video tour.</p></div><button className="outline-btn">↻ Sync listings</button></div>
    <div className="listing-tools"><label><span>⌕</span><input aria-label="Search listings" placeholder="Search by address or city" /></label><div><button className="active">All <b>3</b></button><button>Active <b>2</b></button><button>Pending <b>1</b></button></div></div>
    <div className="listings-grid">{listings.map((listing) => <article className="listing-card" key={listing.address}><div className="listing-image"><img src={listing.image} alt={listing.address} /><span className={listing.status === "Active" ? "active" : "pending"}>● {listing.status}</span><button aria-label="More options">•••</button></div><div className="listing-copy"><p className="eyebrow">{listing.city}</p><h2>{listing.address}</h2><p className="price">{listing.price}</p><div className="listing-meta"><span><b>{listing.photos}</b> Photos</span><span><b>{listing.videos}</b> Videos</span></div><button onClick={() => setView("templates")}>{listing.videos ? "Create another video" : "Create video"}<span>→</span></button></div></article>)}</div>
  </div>;
}

function Review({ flash }: { flash: (m: string) => void }) {
  const [approved, setApproved] = useState(false);
  return <div className="page review-page">
    <div className="review-heading"><button className="back-btn">←</button><div><p className="eyebrow">Video review</p><h1>{approved ? "Your tour is ready." : "One last look."}</h1><p>{approved ? "Approved and ready to download." : "Review the details, then approve your video when it feels right."}</p></div><span className={approved ? "approval-badge approved" : "approval-badge"}>● {approved ? "Approved" : "Awaiting approval"}</span></div>
    <div className="review-layout">
      <section className="player-wrap"><div className="phone-video"><img src="/homes/modern-villa.jpg" alt="Video preview for 814 Palisade Avenue" /><div className="phone-shade" /><div className="video-brand">homie.</div><div className="video-overlay"><p>Now presenting</p><h2>814 Palisade<br />Avenue</h2><span>Austin, Texas</span></div><button aria-label="Play home tour">▶</button><div className="timeline"><i /></div></div><div className="player-controls"><button>▶</button><span>00:00 / 00:24</span><div><button>↗</button><button>⛶</button></div></div></section>
      <aside className="review-details"><div className="detail-block"><p className="eyebrow">Listing</p><div className="mini-listing"><img src="/homes/modern-villa.jpg" alt="814 Palisade Avenue" /><span><b>814 Palisade Avenue</b><small>Austin, TX · $1,285,000</small></span></div></div><div className="detail-block"><p className="eyebrow">Template</p><div className="template-summary"><span><b>Quiet Luxury</b><small>Cinematic · Reel</small></span><button>Change</button></div></div><div className="detail-grid"><span><small>Duration</small><b>24 sec</b></span><span><small>Format</small><b>9:16</b></span><span><small>Photos used</small><b>12 of 28</b></span><span><small>Created</small><b>Aug 6, 2026</b></span></div><div className="credit-note"><span>◒</span><p><b>18 credits used</b><small>Regenerating creates a new version for 18 credits.</small></p></div><div className="review-actions">{!approved ? <><button className="approve-btn" onClick={() => { setApproved(true); flash("Video approved — ready to download"); }}>✓ Approve video</button><button className="regenerate" onClick={() => flash("A new version would cost 18 credits")}>↻ Generate another version</button></> : <><button className="approve-btn" onClick={() => flash("Download started")}>↓ Download video</button><button className="regenerate" onClick={() => flash("Share options opened")}>↗ Share video</button></>}</div><p className="approval-note">Your video won't be published anywhere without your approval.</p></aside>
    </div>
  </div>;
}
