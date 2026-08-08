"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import CreateVideoWizard from "./CreateVideoWizard";

type View = "overview" | "templates" | "favorites" | "listings" | "videos" | "integrations" | "profile";

const nav = [
  { id: "overview" as View, label: "Overview", icon: "⌂" },
  { id: "templates" as View, label: "Templates", icon: "◇" },
  { id: "listings" as View, label: "Listings", icon: "▤" },
  { id: "videos" as View, label: "My videos", icon: "▷" },
];

const videoStatuses = ["All", "Generating", "Awaiting approval", "Approved"];

const myVideos = [
  { title: "Quiet Luxury", address: "814 Palisade Avenue", city: "Austin, TX", price: "$1,285,000", template: "Cinematic", format: "9:16", duration: "24 sec", credits: 18, photosUsed: 12, totalPhotos: 28, created: "Aug 6, 2026", status: "Awaiting approval", image: "/homes/modern-villa.jpg" },
  { title: "Sunday Light", address: "2904 Hollow Creek", city: "Austin, TX", price: "$925,000", template: "Warm & airy", format: "9:16", duration: "18 sec", credits: 14, photosUsed: 10, totalPhotos: 34, created: "Aug 5, 2026", status: "Awaiting approval", image: "/homes/living-room.jpg" },
  { title: "Welcome Home", address: "62 Juniper Lane", city: "Round Rock, TX", price: "$748,000", template: "Family", format: "9:16", duration: "22 sec", credits: 16, photosUsed: 14, totalPhotos: 22, created: "Aug 3, 2026", status: "Approved", image: "/homes/dining.jpg" },
  { title: "The Detail Edit", address: "814 Palisade Avenue", city: "Austin, TX", price: "$1,285,000", template: "Editorial", format: "1:1", duration: "20 sec", credits: 16, photosUsed: 9, totalPhotos: 28, created: "Aug 1, 2026", status: "Approved", image: "/homes/kitchen.jpg" },
  { title: "Modern Living", address: "2904 Hollow Creek", city: "Austin, TX", price: "$925,000", template: "Minimal", format: "16:9", duration: "30 sec", credits: 22, photosUsed: 16, totalPhotos: 34, created: "Aug 7, 2026", status: "Generating", image: "/homes/lounge.jpg" },
  { title: "City Edge", address: "62 Juniper Lane", city: "Round Rock, TX", price: "$748,000", template: "Urban", format: "16:9", duration: "26 sec", credits: 19, photosUsed: 11, totalPhotos: 22, created: "Jul 29, 2026", status: "Approved", image: "/homes/kitchen.jpg" },
];

const categoryOptions = ["All", "Luxury", "Modern", "Warm", "Cinematic", "Minimal", "Coastal", "Urban", "Family", "Fast-paced", "Zillow"];
const sortOptions = ["Recent", "Popular", "Top"];
const formatOptions = ["All", "9:16", "1:1", "16:9"];
const creditsOptions = ["All", "Under 15", "15+"];

export type TemplateItem = {
  id: number;
  title: string;
  tag: string;
  format: string;
  time: string;
  credits: number;
  image: string;
  preview?: string;
  size: string;
  minPhotos: number;
  maxPhotos: number;
};

const templates: TemplateItem[] = [
  { id: 10, title: "Mediterranean Light", tag: "Luxury", format: "9:16", time: "25 sec", credits: 24, image: "https://drjehibthvfvorkgiyse.supabase.co/storage/v1/object/public/template-previews/mediterranean-light/poster.jpg", preview: "https://drjehibthvfvorkgiyse.supabase.co/storage/v1/object/public/template-previews/mediterranean-light/preview.mp4", size: "tall", minPhotos: 6, maxPhotos: 30 },
  { id: 11, title: "Forest Stillness", tag: "Warm", format: "9:16", time: "25 sec", credits: 24, image: "https://drjehibthvfvorkgiyse.supabase.co/storage/v1/object/public/template-previews/forest-stillness/poster.jpg", preview: "https://drjehibthvfvorkgiyse.supabase.co/storage/v1/object/public/template-previews/forest-stillness/preview.mp4", size: "normal", minPhotos: 6, maxPhotos: 30 },
  { id: 12, title: "City After Dark", tag: "Urban", format: "9:16", time: "25 sec", credits: 24, image: "https://drjehibthvfvorkgiyse.supabase.co/storage/v1/object/public/template-previews/city-after-dark/poster.jpg", preview: "https://drjehibthvfvorkgiyse.supabase.co/storage/v1/object/public/template-previews/city-after-dark/preview.mp4", size: "normal", minPhotos: 6, maxPhotos: 30 },
];

const listings = [
  { id: "", address: "814 Palisade Avenue", city: "Austin, TX", price: "$1,285,000", photos: 28, videos: 2, image: "/homes/modern-villa.jpg", status: "Active" },
  { id: "", address: "2904 Hollow Creek", city: "Austin, TX", price: "$925,000", photos: 34, videos: 0, image: "/homes/living-room.jpg", status: "Active" },
  { id: "", address: "62 Juniper Lane", city: "Round Rock, TX", price: "$748,000", photos: 22, videos: 1, image: "/homes/dining.jpg", status: "Pending" },
];

export type VideoItem = (typeof myVideos)[number];
export type ListingItem = (typeof listings)[number];

export default function Home() {
  const [view, setView] = useState<View>("templates");
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Recent");
  const [formatFilter, setFormatFilter] = useState("All");
  const [creditsFilter, setCreditsFilter] = useState("All");
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>(templates);
  const [listingItems, setListingItems] = useState<ListingItem[]>(listings);
  const [videoItems, setVideoItems] = useState<VideoItem[]>(myVideos);
  const [creditBalance, setCreditBalance] = useState(0);
  const [displayName, setDisplayName] = useState("Agent");
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [wizardTemplate, setWizardTemplate] = useState<TemplateItem | null>(null);
  const [profileDetails, setProfileDetails] = useState({ email: "", displayName: "", bio: "", phone: "", jobTitle: "", companyName: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    async function loadWorkspace() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.replace("/login");
        return;
      }

      if (!active) return;
      setUserId(session.user.id);
      setDisplayName(session.user.user_metadata.display_name ?? session.user.email?.split("@")[0] ?? "Agent");
      setProfileDetails((current) => ({ ...current, email: session.user.email ?? "" }));
      const { data: workspaceId, error: workspaceError } = await supabase.rpc("bootstrap_workspace", { workspace_name: "My Homie Workspace" });
      if (workspaceError) flash(workspaceError.message);
      if (workspaceId) setWorkspaceId(workspaceId);

      const [{ data: catalog }, { data: wallet }, { data: homes }, { data: projects }, { data: savedFavorites }, { data: profile }] = await Promise.all([
        supabase.from("video_templates").select("id, name, style_label, format, duration_seconds, credits_cost, min_photos, max_photos, preview_url, thumbnail_url, is_featured, sort_order").eq("is_active", true).order("sort_order"),
        workspaceId ? supabase.from("credit_wallets").select("balance").eq("workspace_id", workspaceId).maybeSingle() : Promise.resolve({ data: null }),
        workspaceId ? supabase.from("listings").select("id, address_line1, city, region, price, cover_photo_url, status, listing_photos(count), video_projects(count)").eq("workspace_id", workspaceId).order("created_at", { ascending: false }) : Promise.resolve({ data: null }),
        workspaceId ? supabase.from("video_projects").select("title, status, output_format, duration_seconds, credits_cost, created_at, listings(address_line1, city, region, price, cover_photo_url, listing_photos(count)), video_templates(style_label, thumbnail_url)").eq("workspace_id", workspaceId).order("created_at", { ascending: false }) : Promise.resolve({ data: null }),
        supabase.from("template_favorites").select("template_id").eq("user_id", session.user.id),
        supabase.from("profiles").select("display_name, bio, phone, job_title, company_name").eq("id", session.user.id).maybeSingle(),
      ]);

      if (!active) return;
      if (catalog?.length) setTemplateItems(catalog.map((item, index) => ({
        id: item.id,
        title: item.name,
        tag: item.style_label,
        format: item.format,
        time: `${item.duration_seconds} sec`,
        credits: item.credits_cost,
        image: item.thumbnail_url ?? "/homes/modern-villa.jpg",
        preview: item.preview_url ?? undefined,
        size: index === 0 ? "tall" : item.format === "16:9" ? "wide" : "normal",
        minPhotos: item.min_photos ?? 6,
        maxPhotos: item.max_photos ?? 30,
      })));
      setFavoriteIds(new Set(savedFavorites?.map((favorite) => favorite.template_id) ?? []));
      if (profile) {
        const nextName = profile.display_name ?? session.user.email?.split("@")[0] ?? "Agent";
        setDisplayName(nextName);
        setProfileDetails({
          email: session.user.email ?? "",
          displayName: nextName,
          bio: profile.bio ?? "",
          phone: profile.phone ?? "",
          jobTitle: profile.job_title ?? "",
          companyName: profile.company_name ?? "",
        });
      }
      if (homes?.length) setListingItems(homes.map((home) => ({
        id: home.id,
        address: home.address_line1,
        city: [home.city, home.region].filter(Boolean).join(", "),
        price: home.price == null ? "Price on request" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(home.price)),
        photos: home.listing_photos?.[0]?.count ?? 0,
        videos: home.video_projects?.[0]?.count ?? 0,
        image: home.cover_photo_url ?? "/homes/modern-villa.jpg",
        status: home.status === "active" ? "Active" : "Pending",
      })));
      if (projects?.length) setVideoItems(projects.map((project) => {
        const home = Array.isArray(project.listings) ? project.listings[0] : project.listings;
        const template = Array.isArray(project.video_templates) ? project.video_templates[0] : project.video_templates;
        const status = project.status === "approved" ? "Approved" : project.status === "generating" || project.status === "queued" ? "Generating" : "Awaiting approval";
        return {
          title: project.title,
          address: home?.address_line1 ?? "Untitled listing",
          city: [home?.city, home?.region].filter(Boolean).join(", "),
          price: home?.price == null ? "Price on request" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(home.price)),
          template: template?.style_label ?? "Homie",
          format: project.output_format,
          duration: `${project.duration_seconds} sec`,
          credits: project.credits_cost,
          photosUsed: home?.listing_photos?.[0]?.count ?? 0,
          totalPhotos: home?.listing_photos?.[0]?.count ?? 0,
          created: new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(project.created_at)),
          status,
          image: template?.thumbnail_url ?? home?.cover_photo_url ?? "/homes/modern-villa.jpg",
        } as VideoItem;
      }));
      setCreditBalance(wallet?.balance ?? 0);
    }

    loadWorkspace();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace("/login");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function changeView(v: View) {
    setView(v);
    setSearch("");
    setFiltersOpen(false);
  }

  function clearAllFilters() {
    setSearch("");
    setCategory("All");
    setSort("Recent");
    setFormatFilter("All");
    setCreditsFilter("All");
  }

  async function toggleFavorite(templateId: number) {
    if (!userId) return;
    const supabase = getSupabaseBrowserClient();
    const isFavorite = favoriteIds.has(templateId);
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (isFavorite) next.delete(templateId); else next.add(templateId);
      return next;
    });
    const { error } = isFavorite
      ? await supabase.from("template_favorites").delete().eq("user_id", userId).eq("template_id", templateId)
      : await supabase.from("template_favorites").upsert({ user_id: userId, template_id: templateId }, { onConflict: "user_id,template_id" });
    if (error) {
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (isFavorite) next.add(templateId); else next.delete(templateId);
        return next;
      });
      flash(error.message);
      return;
    }
    flash(isFavorite ? "Removed from favorites" : "Saved to favorites");
  }

  async function saveProfile() {
    if (!userId) return;
    setSavingProfile(true);
    const { error } = await getSupabaseBrowserClient().from("profiles").update({
      display_name: profileDetails.displayName.trim() || null,
      bio: profileDetails.bio.trim() || null,
      phone: profileDetails.phone.trim() || null,
      job_title: profileDetails.jobTitle.trim() || null,
      company_name: profileDetails.companyName.trim() || null,
    }).eq("id", userId);
    setSavingProfile(false);
    if (error) return flash(error.message);
    setDisplayName(profileDetails.displayName.trim() || "Agent");
    flash("Profile saved");
  }

  async function changePassword(password: string) {
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
    if (error) return flash(error.message);
    flash("Password updated");
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <button className="brand" onClick={() => changeView("overview")} aria-label="Homie overview">homie<span>.</span></button>
        <nav aria-label="Main navigation">
          <button onClick={() => changeView("templates")} className={view === "templates" ? "active" : ""}><span>•</span>Explore</button>
          <button onClick={() => changeView("videos")} className={view === "videos" ? "active" : ""}><span>•</span>My videos</button>
          <button onClick={() => changeView("favorites")} className={view === "favorites" ? "active" : ""}><span>•</span>Favorites</button>
          <p className="nav-label">Business</p>
          <button onClick={() => changeView("listings")} className={view === "listings" ? "active" : ""}><span>•</span>My listings</button>
          <button onClick={() => changeView("integrations")} className={view === "integrations" ? "active" : ""}><span>•</span>Integrations</button>
          <div className="sidebar-divider" />
          <button onClick={() => flash("Subscription settings opened")}><span>•</span>Subscribe</button>
          <button onClick={() => flash("Credit top-ups are coming soon")}><span>•</span>Buy credits</button>
        </nav>
        <div className="sidebar-bottom">
          <button className="profile" onClick={() => setProfileOpen((v) => !v)} aria-expanded={profileOpen} aria-haspopup="menu">
            <span className="profile-avatar"><UserIcon /></span>
            <span><b>{displayName}</b><small>{creditBalance} credits</small></span>
            <i className={profileOpen ? "chevron up" : "chevron"}>⌃</i>
          </button>
          {profileOpen && <>
            <button className="menu-backdrop" aria-hidden="true" onClick={() => setProfileOpen(false)} />
            <div className="profile-menu" role="menu">
              <button role="menuitem" onClick={() => { changeView("profile"); setProfileOpen(false); }}><UserIcon />Profile</button>
              <button role="menuitem" onClick={() => { setSettingsOpen(true); setProfileOpen(false); }}><SettingsIcon />Settings</button>
              <button role="menuitem" onClick={() => { flash("Help opened"); setProfileOpen(false); }}><HelpIcon />Help</button>
              <button role="menuitem" onClick={() => { setTheme((t) => (t === "dark" ? "light" : "dark")); setProfileOpen(false); }}>{theme === "dark" ? <SunIcon /> : <MoonIcon />}{theme === "dark" ? "Light Mode" : "Dark Mode"}</button>
              <div className="profile-menu-divider" />
              <button role="menuitem" onClick={async () => { await getSupabaseBrowserClient().auth.signOut(); setProfileOpen(false); }}><SignOutIcon />Sign Out</button>
            </div>
          </>}
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => changeView("overview")}>homie<span>.</span></button>
          <label className="global-search">
            <SearchIcon />
            <input aria-label="Search Homie" placeholder={view === "templates" || view === "favorites" ? "Search templates..." : "Search Homie..."} value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setSearch("")}>×</button>}
          </label>
          <button className={filtersOpen ? "filter-square active" : "filter-square"} onClick={() => (view === "templates" || view === "favorites" ? setFiltersOpen((v) => !v) : flash("Filters opened"))} aria-label="Open filters" aria-expanded={view === "templates" || view === "favorites" ? filtersOpen : undefined}><SlidersIcon /></button>
        </header>

        {filtersOpen && (view === "templates" || view === "favorites") && (
          <div className="filters-panel">
            <div className="filters-head"><p className="eyebrow">Filters</p><button aria-label="Close filters" onClick={() => setFiltersOpen(false)}>×</button></div>
            <div className="filters-row">
              <div className="filters-group"><p className="filters-label">Sort</p><div className="filters-pills">{sortOptions.map((s) => <button key={s} className={sort === s ? "active" : ""} onClick={() => setSort(s)}>{s}</button>)}</div></div>
              <div className="filters-group"><p className="filters-label">Format</p><div className="filters-pills">{formatOptions.map((f) => <button key={f} className={formatFilter === f ? "active" : ""} onClick={() => setFormatFilter(f)}>{f}</button>)}</div></div>
              <div className="filters-group"><p className="filters-label">Credits</p><div className="filters-pills">{creditsOptions.map((c) => <button key={c} className={creditsFilter === c ? "active" : ""} onClick={() => setCreditsFilter(c)}>{c}</button>)}</div></div>
            </div>
            <div className="filters-divider" />
            <div className="filters-group"><p className="filters-label">Categories</p><div className="filters-pills wrap">{categoryOptions.map((name) => <button key={name} className={category === name ? "active" : ""} onClick={() => setCategory(name)}>{name}</button>)}</div></div>
          </div>
        )}

        {view === "overview" && <Overview setView={changeView} onOpenVideo={setSelectedVideo} />}
        {view === "templates" && <Templates items={templateItems} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} setView={setView} onUseTemplate={setWizardTemplate} search={search} onClearSearch={clearAllFilters} category={category} setCategory={setCategory} sort={sort} formatFilter={formatFilter} creditsFilter={creditsFilter} />}
        {view === "favorites" && <Templates items={templateItems} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} favoritesOnly setView={setView} onUseTemplate={setWizardTemplate} search={search} onClearSearch={clearAllFilters} category={category} setCategory={setCategory} sort={sort} formatFilter={formatFilter} creditsFilter={creditsFilter} />}
        {view === "listings" && <Listings items={listingItems} setView={setView} />}
        {view === "videos" && <MyVideos items={videoItems} onOpenVideo={setSelectedVideo} />}
        {view === "integrations" && <Integrations flash={flash} />}
        {view === "profile" && <ProfilePage details={profileDetails} onChange={setProfileDetails} onSave={saveProfile} saving={savingProfile} favoriteCount={favoriteIds.size} videoCount={videoItems.length} />}

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {nav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => changeView(item.id)}><span>{item.icon}</span>{item.label === "My videos" ? "Videos" : item.label}</button>)}
        </nav>
      </section>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {selectedVideo && <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} flash={flash} />}
      {settingsOpen && <SettingsModal details={profileDetails} onChange={setProfileDetails} onSave={saveProfile} saving={savingProfile} theme={theme} onThemeChange={setTheme} credits={creditBalance} onPasswordChange={changePassword} onClose={() => setSettingsOpen(false)} flash={flash} />}
      {wizardTemplate && workspaceId && <CreateVideoWizard
        template={wizardTemplate}
        workspaceId={workspaceId}
        userId={userId}
        listings={listingItems}
        walletBalance={creditBalance}
        onClose={() => setWizardTemplate(null)}
        onCreated={(project) => {
          setVideoItems((current) => [project, ...current]);
          setWizardTemplate(null);
          setView("videos");
          flash("Video queued — we'll notify you when it's ready");
        }}
        flash={flash}
      />}
    </main>
  );
}

function Overview({ setView, onOpenVideo }: { setView: (v: View) => void; onOpenVideo: (v: VideoItem) => void }) {
  return <div className="page overview-page">
    <div className="page-intro intro-row"><div><p className="eyebrow">Thursday, August 6</p><h1>Good evening, Yakir.</h1><p>Three listings are ready to turn into something worth watching.</p></div><button className="outline-btn" onClick={() => setView("listings")}>View all listings <span>→</span></button></div>
    <section className="hero-card">
      <img src="/homes/modern-villa.jpg" alt="Contemporary home at 814 Palisade Avenue" />
      <div className="hero-shade" />
      <div className="hero-copy"><span className="live-pill">● Zillow synced</span><p className="eyebrow">Featured listing</p><h2>814 Palisade Avenue</h2><p>Austin, TX · $1,285,000 · 28 photos</p><button onClick={() => setView("templates")}>Create a home tour <span>→</span></button></div>
      <div className="hero-count"><b>01</b><span /><small>03</small></div>
    </section>
    <div className="dashboard-grid">
      <section className="panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">In progress</p><h3>Your recent videos</h3></div><button onClick={() => setView("videos")}>View all →</button></div>
        <div className="video-row" onClick={() => onOpenVideo(myVideos[1])}><div className="video-thumb"><img src="/homes/living-room.jpg" alt="Bright living room" /><button aria-label="Play video">▶</button></div><div className="video-info"><span className="status amber">Awaiting approval</span><h4>Sunday Light</h4><p>2904 Hollow Creek</p><small>Story · 18 sec</small></div><button className="review-btn" onClick={(e) => { e.stopPropagation(); onOpenVideo(myVideos[1]); }}>Review</button></div>
        <div className="video-row compact" onClick={() => onOpenVideo(myVideos[2])}><div className="video-thumb"><img src="/homes/dining.jpg" alt="Modern dining room" /><button aria-label="Play video">▶</button></div><div className="video-info"><span className="status green">Approved</span><h4>Welcome Home</h4><p>62 Juniper Lane</p><small>Reel · 22 sec</small></div><button className="dots" onClick={(e) => e.stopPropagation()}>•••</button></div>
      </section>
      <aside className="panel setup-panel"><div className="panel-heading"><div><p className="eyebrow">Quick start</p><h3>You're almost set</h3></div><b>2/3</b></div><div className="progress"><i /></div>
        <div className="check-row done"><span>✓</span><div><b>Create your workspace</b><small>North & West Realty</small></div></div>
        <div className="check-row done"><span>✓</span><div><b>Connect Zillow</b><small>3 listings synced</small></div></div>
        <button className="check-row current" onClick={() => setView("templates")}><span>3</span><div><b>Create your first tour</b><small>Choose a template to begin</small></div><i>→</i></button>
      </aside>
    </div>
  </div>;
}

function Templates({ items, favoriteIds, onToggleFavorite, favoritesOnly = false, setView, onUseTemplate, search, onClearSearch, category, setCategory, sort, formatFilter, creditsFilter }: { items: TemplateItem[]; favoriteIds: Set<number>; onToggleFavorite: (templateId: number) => Promise<void>; favoritesOnly?: boolean; setView: (v: View) => void; onUseTemplate: (template: TemplateItem) => void; search: string; onClearSearch: () => void; category: string; setCategory: (v: string) => void; sort: string; formatFilter: string; creditsFilter: string }) {
  function playPreview(video: HTMLVideoElement) {
    void video.play().catch(() => undefined);
  }

  function stopPreview(video: HTMLVideoElement) {
    video.pause();
    if (video.readyState > 0) video.currentTime = 0;
  }

  const q = search.trim().toLowerCase();
  const filteredTemplates = items
    .filter((template) => !favoritesOnly || favoriteIds.has(template.id))
    .filter((t) => {
      const matchesCategory = category === "All" || t.tag.toLowerCase().includes(category.toLowerCase()) || t.title.toLowerCase().includes(category.toLowerCase());
      const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.tag.toLowerCase().includes(q);
      const matchesFormat = formatFilter === "All" || t.format === formatFilter;
      const matchesCredits = creditsFilter === "All" || (creditsFilter === "Under 15" ? t.credits < 15 : t.credits >= 15);
      return matchesCategory && matchesSearch && matchesFormat && matchesCredits;
    })
    .sort((a, b) => (sort === "Popular" ? b.credits - a.credits : sort === "Top" ? a.credits - b.credits : 0));
  const activeLabel = q ? `“${search.trim()}”` : category !== "All" ? `“${category}”` : formatFilter !== "All" ? `“${formatFilter}”` : `“${creditsFilter}”`;
  return <div className="page templates-page">
    <div className="content-tabs"><button className={!favoritesOnly ? "active" : ""} onClick={() => setView("templates")}>Templates</button><button onClick={() => setView("videos")}>My videos</button><button className={favoritesOnly ? "active" : ""} onClick={() => setView("favorites")}>Favorites <span>{favoriteIds.size}</span></button></div>
    <div className="filter-row">{categoryOptions.map((name) => <button key={name} onClick={() => setCategory(name)} className={category === name ? "active" : ""}>{name}</button>)}</div>
    <div className="template-grid">
      {!favoritesOnly && <article className="template-start"><span className="eyebrow">Not sure where to start?</span><h2>Let the home<br /><i>lead the way.</i></h2><p>Choose a listing and we'll recommend templates that fit its mood and architecture.</p><button onClick={() => setView("listings")}>Choose a listing →</button></article>}
      {filteredTemplates.map((template, index) => <article className={`template-card ${template.size}`} key={template.title} onClick={() => onUseTemplate(template)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onUseTemplate(template)}>
        {template.preview ? <video src={template.preview} poster={template.image} muted loop playsInline preload="metadata" aria-label={`${template.title} real estate video template preview`} onMouseEnter={(event) => playPreview(event.currentTarget)} onMouseLeave={(event) => stopPreview(event.currentTarget)} /> : <img src={template.image} alt={`${template.title} real estate video template`} />}<div className="card-shade" /><div className="card-top"><span>{index === 0 && !favoritesOnly ? "Featured" : template.tag}</span><div className="card-top-actions"><button className="use-badge" onClick={(e) => { e.stopPropagation(); onUseTemplate(template); }}>Use</button><button className={`fav-btn ${favoriteIds.has(template.id) ? "active" : ""}`} aria-label={`${favoriteIds.has(template.id) ? "Remove" : "Add"} ${template.title} ${favoriteIds.has(template.id) ? "from" : "to"} favorites`} aria-pressed={favoriteIds.has(template.id)} onClick={(e) => { e.stopPropagation(); void onToggleFavorite(template.id); }}>{favoriteIds.has(template.id) ? "♥" : "♡"}</button></div></div><button className="play" aria-label={`Preview ${template.title}`}>▶</button><div className="card-copy"><p className="eyebrow">{template.tag}</p><h3>{template.title}</h3><div><span>{template.time}</span><span>{template.format}</span><span>{template.credits} credits</span></div></div>
      </article>)}
      {filteredTemplates.length === 0 && <article className="template-empty">
        <p className="eyebrow">{favoritesOnly ? "Your favorites" : "No matches"}</p>
        <h3>{favoritesOnly && favoriteIds.size === 0 ? "No favorite templates yet." : `Nothing fits ${activeLabel} yet.`}</h3>
        <p>{favoritesOnly && favoriteIds.size === 0 ? "Tap the heart on any template to save it here for later." : "Try another category or clear your search."}</p>
        <button onClick={() => favoritesOnly && favoriteIds.size === 0 ? setView("templates") : onClearSearch()}>{favoritesOnly && favoriteIds.size === 0 ? "Explore templates" : "Clear filters"} →</button>
      </article>}
    </div>
  </div>;
}

function Listings({ items, setView }: { items: ListingItem[]; setView: (v: View) => void }) {
  return <div className="page listings-page">
    <div className="page-intro intro-row"><div><p className="eyebrow">Synced from Zillow</p><h1>My listings.</h1><p>Select a home and turn its photos into a polished video tour.</p></div><button className="outline-btn">↻ Sync listings</button></div>
    <div className="listings-grid">{items.map((listing) => <article className="listing-card" key={listing.address}><div className="listing-image"><img src={listing.image} alt={listing.address} /><span className={listing.status === "Active" ? "active" : "pending"}>● {listing.status}</span><button aria-label="More options">•••</button></div><div className="listing-copy"><p className="eyebrow">{listing.city}</p><h2>{listing.address}</h2><p className="price">{listing.price}</p><div className="listing-meta"><span><b>{listing.photos}</b> Photos</span><span><b>{listing.videos}</b> Videos</span></div><button onClick={() => setView("templates")}>{listing.videos ? "Create another video" : "Create video"}<span>→</span></button></div></article>)}</div>
  </div>;
}

function MyVideos({ items, onOpenVideo }: { items: VideoItem[]; onOpenVideo: (v: VideoItem) => void }) {
  const [status, setStatus] = useState("All");
  const filtered = status === "All" ? items : items.filter((v) => v.status === status);
  return <div className="page videos-page">
    <div className="page-intro intro-row"><div><p className="eyebrow">Your projects</p><h1>My videos.</h1><p>Every home tour you've generated, in one place.</p></div></div>
    <div className="listing-tools"><div>{videoStatuses.map((s) => <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>{s} <b>{s === "All" ? items.length : items.filter((v) => v.status === s).length}</b></button>)}</div></div>
    <div className="video-grid">
      {filtered.map((video) => <article className="myvideo-card" key={video.title} onClick={() => onOpenVideo(video)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpenVideo(video)}>
        <img src={video.image} alt={`${video.title} home tour`} /><div className="card-shade" />
        <span className={`video-status ${video.status === "Approved" ? "green" : video.status === "Generating" ? "blue" : "amber"}`}>● {video.status}</span>
        {video.status !== "Generating" && <button className="play" aria-label={`Play ${video.title}`}>▶</button>}
        <div className="card-copy"><p className="eyebrow">{video.template}</p><h3>{video.title}</h3><div><span>{video.address}</span><span>{video.duration}</span><span>{video.format}</span></div></div>
      </article>)}
      {filtered.length === 0 && <article className="template-empty">
        <p className="eyebrow">No matches</p>
        <h3>No videos are {status.toLowerCase()} yet.</h3>
        <p>Try another status filter.</p>
        <button onClick={() => setStatus("All")}>Show all →</button>
      </article>}
    </div>
  </div>;
}

function VideoModal({ video, onClose, flash }: { video: VideoItem; onClose: () => void; flash: (m: string) => void }) {
  const [approved, setApproved] = useState(video.status === "Approved");
  const generating = video.status === "Generating";
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="video-modal" onClick={(e) => e.stopPropagation()}>
      <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
      <div className="review-layout">
        <section className="player-wrap"><div className="phone-video"><img src={video.image} alt={`Video preview for ${video.address}`} /><div className="phone-shade" /><div className="video-brand">homie.</div><div className="video-overlay"><p>Now presenting</p><h2>{video.title}</h2><span>{video.address}</span></div>{!generating && <button aria-label="Play home tour">▶</button>}{generating && <div className="generating-note"><span className="spinner" />Generating your video…</div>}<div className="timeline"><i style={{ width: generating ? "40%" : "18%" }} /></div></div><div className="player-controls"><button>▶</button><span>00:00 / 00:{video.duration.replace(" sec", "")}</span><div><button>↗</button><button>⛶</button></div></div></section>
        <aside className="review-details">
          <div className="detail-block"><p className="eyebrow">Listing</p><div className="mini-listing"><img src={video.image} alt={video.address} /><span><b>{video.address}</b><small>{video.city} · {video.price}</small></span></div></div>
          <div className="detail-block"><p className="eyebrow">Template</p><div className="template-summary"><span><b>{video.title}</b><small>{video.template}</small></span></div></div>
          <div className="detail-grid"><span><small>Duration</small><b>{video.duration}</b></span><span><small>Format</small><b>{video.format}</b></span><span><small>Photos used</small><b>{video.photosUsed} of {video.totalPhotos}</b></span><span><small>Created</small><b>{video.created}</b></span></div>
          <div className="credit-note"><span>◒</span><p><b>{video.credits} credits used</b><small>Regenerating creates a new version for {video.credits} credits.</small></p></div>
          <div className="review-actions">
            {generating ? <p className="approval-note">We'll notify you when this video is ready to review.</p> : !approved ? <><button className="approve-btn" onClick={() => { setApproved(true); flash("Video approved — ready to download"); }}>✓ Approve video</button><button className="regenerate" onClick={() => flash(`A new version would cost ${video.credits} credits`)}>↻ Generate another version</button></> : <><button className="approve-btn" onClick={() => flash("Download started")}>↓ Download video</button><button className="regenerate" onClick={() => flash("Share options opened")}>↗ Share video</button></>}
          </div>
          {!generating && <p className="approval-note">Your video won't be published anywhere without your approval.</p>}
        </aside>
      </div>
    </div>
  </div>;
}

type ProfileDetails = { email: string; displayName: string; bio: string; phone: string; jobTitle: string; companyName: string };
type SettingsSection = "profile" | "preferences" | "billing" | "security" | "storage";

function SettingsModal({ details, onChange, onSave, saving, theme, onThemeChange, credits, onPasswordChange, onClose, flash }: { details: ProfileDetails; onChange: (details: ProfileDetails) => void; onSave: () => Promise<void>; saving: boolean; theme: "dark" | "light"; onThemeChange: (theme: "dark" | "light") => void; credits: number; onPasswordChange: (password: string) => Promise<void>; onClose: () => void; flash: (message: string) => void }) {
  const [section, setSection] = useState<SettingsSection>("profile");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const names = details.displayName.trim().split(/\s+/);
  const firstName = names[0] ?? "";
  const lastName = names.slice(1).join(" ");
  const initials = details.displayName.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "H";

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function updateName(first: string, last: string) {
    onChange({ ...details, displayName: `${first} ${last}`.trim() });
  }

  async function submitPassword() {
    if (password.length < 6) return flash("Password must contain at least 6 characters");
    if (password !== confirmPassword) return flash("Passwords do not match");
    setChangingPassword(true);
    await onPasswordChange(password);
    setChangingPassword(false);
    setPassword("");
    setConfirmPassword("");
  }

  const sections: { id: SettingsSection; label: string; icon: string }[] = [
    { id: "profile", label: "Profile", icon: "@" },
    { id: "preferences", label: "Preferences", icon: "☼" },
    { id: "billing", label: "Billing", icon: "▭" },
    { id: "security", label: "Security", icon: "♙" },
    { id: "storage", label: "Storage", icon: "▱" },
  ];

  return <div className="settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
      <aside className="settings-nav"><p className="eyebrow">Sections</p>{sections.map((item) => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}><span>{item.icon}</span>{item.label}</button>)}</aside>
      <div className="settings-content">
        <button className="settings-close" aria-label="Close settings" onClick={onClose}>×</button>

        {section === "profile" && <div className="settings-section">
          <h2>Profile</h2><p className="settings-lead">Your name, photo and identity across Homie.</p>
          <div className="settings-avatar-row"><div className="settings-avatar">{initials}</div><div><b>Profile Photo</b><small>Click to upload (max 5MB)</small></div><button onClick={() => flash("Profile photo upload is coming next")}>Upload →</button></div>
          <div className="settings-field"><label>Display name</label><input value={details.displayName} onChange={(event) => onChange({ ...details, displayName: event.target.value })} placeholder="Your name" /></div>
          <div className="settings-field-row"><div className="settings-field"><label>First name</label><input value={firstName} onChange={(event) => updateName(event.target.value, lastName)} /></div><div className="settings-field"><label>Last name</label><input value={lastName} onChange={(event) => updateName(firstName, event.target.value)} /></div></div>
          <div className="settings-field"><label>Email</label><input value={details.email} readOnly /><small>Email cannot be changed</small></div>
          <div className="settings-field"><label>Bio</label><textarea value={details.bio} onChange={(event) => onChange({ ...details, bio: event.target.value })} maxLength={280} rows={3} /></div>
          <div className="settings-actions"><button onClick={() => void onSave()} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div>
        </div>}

        {section === "preferences" && <div className="settings-section"><h2>Preferences</h2><p className="settings-lead">Appearance and language — how Homie feels for you.</p>
          <div className="settings-option"><div><b>Appearance</b><small>Switch between light and dark theme</small></div><div className="theme-choice"><button className={theme === "light" ? "active" : ""} onClick={() => onThemeChange("light")} aria-label="Light mode">☼</button><button className={theme === "dark" ? "active" : ""} onClick={() => onThemeChange("dark")} aria-label="Dark mode">◐</button></div></div>
          <div className="settings-option"><div><b>Language</b><small>Choose your interface language</small></div><div className="language-choice"><button className="active">EN</button><button onClick={() => flash("More languages are coming soon")}>HE</button></div></div>
        </div>}

        {section === "billing" && <div className="settings-section"><h2>Billing</h2><p className="settings-lead">Your subscription and what is left this cycle.</p>
          <div className="billing-card"><div><p className="eyebrow">Current plan</p><h3>Free Trial<span>.</span></h3><small>{credits} credits remaining</small></div><button onClick={() => flash("Plans opened")}>Upgrade →</button></div>
        </div>}

        {section === "security" && <div className="settings-section"><h2>Security</h2><p className="settings-lead">Password and connected accounts.</p>
          <div className="security-block"><div><b>Change password</b><small>Use at least 6 characters</small></div><div className="password-fields"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" /><button onClick={() => void submitPassword()} disabled={changingPassword}>{changingPassword ? "Saving…" : "Update →"}</button></div></div>
          <div className="settings-option"><div><b>Email</b><small>{details.email}</small></div><span className="connected-label">✓ Connected</span></div>
        </div>}

        {section === "storage" && <div className="settings-section"><h2>Storage</h2><p className="settings-lead">Used and remaining space for your listing media.</p>
          <div className="storage-heading"><div><b>0</b><span>GB of 5 GB</span></div><small>0%</small></div><div className="storage-bar"><i /></div><p className="storage-note">Free plan · Uploaded listing photos and generated videos will appear here.</p>
        </div>}
      </div>
    </section>
  </div>;
}

function ProfilePage({ details, onChange, onSave, saving, favoriteCount, videoCount }: { details: ProfileDetails; onChange: (details: ProfileDetails) => void; onSave: () => Promise<void>; saving: boolean; favoriteCount: number; videoCount: number }) {
  const initials = details.displayName.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "H";
  const update = (field: keyof ProfileDetails, value: string) => onChange({ ...details, [field]: value });

  return <div className="page profile-page">
    <section className="profile-cover">
      <div className="profile-cover-pattern" />
      <div className="profile-avatar-large" aria-label={`${details.displayName || "Homie agent"} avatar`}>{initials}</div>
    </section>

    <section className="profile-heading">
      <div>
        <p className="eyebrow">Agent profile</p>
        <h1>{details.displayName || "Your profile"}.</h1>
        <p>{details.jobTitle || "Real estate agent"}{details.companyName ? ` · ${details.companyName}` : ""}</p>
      </div>
      <button className="profile-save-top" onClick={() => void onSave()} disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
    </section>

    <div className="profile-layout">
      <section className="profile-form-card">
        <div className="profile-section-title"><div><p className="eyebrow">Personal details</p><h2>About you</h2></div><span>Visible to your workspace</span></div>
        <div className="profile-form-grid">
          <label><span>Display name</span><input value={details.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder="Your name" maxLength={120} /></label>
          <label><span>Email address</span><input value={details.email} readOnly aria-readonly="true" /></label>
          <label><span>Job title</span><input value={details.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} placeholder="Real estate agent" maxLength={100} /></label>
          <label><span>Company</span><input value={details.companyName} onChange={(event) => update("companyName", event.target.value)} placeholder="Your brokerage or office" maxLength={120} /></label>
          <label><span>Phone</span><input type="tel" value={details.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+1 555 000 0000" /></label>
          <label className="profile-bio"><span>Bio <small>{details.bio.length}/280</small></span><textarea value={details.bio} onChange={(event) => update("bio", event.target.value)} placeholder="Tell your team a little about yourself and the homes you represent." maxLength={280} rows={5} /></label>
        </div>
        <div className="profile-form-actions"><button onClick={() => void onSave()} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div>
      </section>

      <aside className="profile-side-card">
        <p className="eyebrow">Your Homie</p><h2>Workspace activity</h2>
        <div className="profile-stats"><span><b>{videoCount}</b><small>Videos</small></span><span><b>{favoriteCount}</b><small>Favorites</small></span></div>
        <div className="profile-completion"><div><b>Profile strength</b><small>{details.displayName && details.bio && details.jobTitle ? "Complete" : "Add more details"}</small></div><span>{details.displayName && details.bio && details.jobTitle ? "100%" : "60%"}</span></div>
        <div className="profile-progress"><i style={{ width: details.displayName && details.bio && details.jobTitle ? "100%" : "60%" }} /></div>
        <p className="profile-tip">A complete profile helps office teams recognize who created and approved each home tour.</p>
      </aside>
    </div>
  </div>;
}

function Integrations({ flash }: { flash: (m: string) => void }) {
  return <div className="page integrations-page">
    <div className="page-intro intro-row">
      <div><p className="eyebrow">Workspace</p><h1>Integrations.</h1><p>Connect your listing sources to import properties automatically.</p></div>
      <span className="sources-count">1/2 SOURCES</span>
    </div>

    <div className="panel-heading standalone"><p className="eyebrow">Platforms</p><h3>2 total · 1 connected</h3></div>
    <div className="integrations-grid">
      <article className="integration-card connected">
        <span className="source-icon"><img src="/integrations/zillow-logo.jpeg" alt="Zillow logo" /></span>
        <h3>Zillow</h3>
        <p>Connected as <b>North &amp; West Realty</b> · 3 listings synced</p>
        <small className="sync-time">Last synced 2 hours ago</small>
        <div className="card-actions">
          <button onClick={() => flash("Syncing your Zillow listings…")}>↻ Sync</button>
          <button className="danger" onClick={() => flash("Disconnecting Zillow would remove synced listings")}>Disconnect</button>
        </div>
      </article>
      <article className="integration-card disabled">
        <span className="source-icon"><img src="/integrations/airbnb-logo.webp" alt="Airbnb logo" /></span>
        <h3>Airbnb</h3>
        <p>Import your short-term rental listings and turn them into home tours.</p>
        <button disabled onClick={() => flash("Airbnb sync is coming soon")}>Coming soon</button>
      </article>
    </div>
  </div>;
}

function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.2" y2="16.2" /></svg>;
}

function SlidersIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" /><line x1="4" y1="12" x2="20" y2="12" /><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" /><line x1="4" y1="18" x2="20" y2="18" /><circle cx="12" cy="18" r="2" fill="currentColor" stroke="none" /></svg>;
}

function UserIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>;
}

function SettingsIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H20a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}

function HelpIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2-2.4 3.7" /><line x1="12" y1="17" x2="12" y2="17.1" /></svg>;
}

function SunIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}

function MoonIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>;
}

function SignOutIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}
