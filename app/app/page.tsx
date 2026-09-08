"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import CreateVideoWizard from "./CreateVideoWizard";
import ZillowImportModal from "./ZillowImportModal";
import HomieLogo from "../HomieLogo";
import { useWorkspaceLoading } from "../SiteLoading";
import TemplateMedia from "./TemplateMedia";
import ListingMapBoard, { ListingMapSummary } from "./ListingMapBoard";
import TemplateFilters from "./TemplateFilters";
import "./template-detail.css";
import "./responsive.css";
import { PUBLIC_ANNUAL_PRICES, PUBLIC_PRICES } from "../../lib/public-pricing";
import { resolveMediaUrl, responsiveImageProps } from "../../lib/media-url";

type View = "templates" | "favorites" | "listings" | "videos" | "integrations" | "profile" | "subscribe";

const nav = [
  { id: "templates" as const, label: "Templates" },
  { id: "listings" as const, label: "Listings" },
  { id: "videos" as const, label: "My videos" },
];

function MobileNavIcon({ name }: { name: "templates" | "listings" | "videos" | "more" }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {name === "templates" && <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>}
      {name === "listings" && <><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 21v-8h6v8" /></>}
      {name === "videos" && <><rect x="3" y="4" width="18" height="16" rx="4" /><path d="m10 8 6 4-6 4z" /></>}
      {name === "more" && <><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" /></>}
    </svg>
  );
}

const categoryOptions = ["All", "Luxury", "Viral Trends", "Casual", "Timelapse", "Effects", "Cinematic", "Fast-paced"];
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
  generationConfig?: Record<string, unknown>;
};

function getTemplateCategories(template: TemplateItem) {
  const text = `${template.title} ${template.tag}`.toLowerCase();
  const categories = new Set<string>();

  if (/luxury|mediterranean|estate|premium/.test(text)) categories.add("Luxury");
  if (/viral|trend|social|city|urban/.test(text)) categories.add("Viral Trends");
  if (/casual|warm|family|coastal|forest|lifestyle/.test(text)) categories.add("Casual");
  if (/timelapse|time-lapse|sunset|day to night|city/.test(text)) categories.add("Timelapse");
  if (/effect|transition|modern|city|after dark/.test(text)) categories.add("Effects");
  if (/cinematic|luxury|mediterranean|forest|city|after dark/.test(text)) categories.add("Cinematic");
  if (/fast|viral|trend|city|urban/.test(text)) categories.add("Fast-paced");

  return categories;
}

function friendlyGenerationError(error?: string | null) {
  if (!error) return "The provider did not create a video file.";
  if (/Pro.*Ultimate.*plan required/i.test(error)) return "The selected Higgsfield model was not available on this workspace plan.";
  if (/HTTP 503|Service Unavailable/i.test(error)) return "Higgsfield was temporarily unavailable. Please retry the generation.";
  return "Video generation stopped before a playable file was created.";
}

export type VideoItem = {
  id: number;
  title: string;
  address: string;
  city: string;
  price: string;
  template: string;
  format: string;
  duration: string;
  credits: number;
  photosUsed: number;
  totalPhotos: number;
  created: string;
  status: "Generating" | "Ready" | "Approved" | "Failed";
  image: string;
  videoUrl?: string;
  progress: number;
  stage?: string;
  error?: string;
};
export type ListingItem = {
  id: string;
  address: string;
  city: string;
  price: string;
  photos: number;
  videos: number;
  image: string;
  status: string;
  source: string;
};
type MappedListingPhoto = { file: File; roomType: string; isHero: boolean };
type ListingPhotoItem = {
  id: string;
  url: string;
  roomType: string;
  zoneId: string | null;
  isHero: boolean;
  storagePath?: string | null;
};
function listingSourceLabel(source: string | null | undefined) {
  if (source === "upload" || source === "manual") return "Manual upload";
  if (source === "zillow") return "Zillow";
  if (source === "airbnb") return "Airbnb";
  return source ? source.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Imported listing";
}
type ZillowIntegration = {
  id: number;
  status: string;
  external_account_name: string | null;
  last_synced_at: string | null;
  last_error: string | null;
};
type BillingPlan = {
  id: number;
  name: string;
  slug: string;
  audience: "solo" | "team";
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  monthlyCredits: number;
  seatLimit: number | null;
  features: string[];
};
type WorkspaceSubscription = {
  planId: number;
  status: string;
  billingInterval: "monthly" | "yearly";
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
};

export default function Home() {
  const [appLoading, setAppLoading] = useState(true);
  const [appLoadError, setAppLoadError] = useState("");
  useWorkspaceLoading(appLoading, appLoadError);
  const [view, setView] = useState<View>("templates");
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [profileOpen, setProfileOpen] = useState(false);
  const mobileMoreRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Recent");
  const [formatFilter, setFormatFilter] = useState("All");
  const [creditsFilter, setCreditsFilter] = useState("All");
  const [listingSourceFilter, setListingSourceFilter] = useState("All");
  const [listingPhotoFilter, setListingPhotoFilter] = useState("All");
  const [listingSort, setListingSort] = useState("Recent");
  const [videoStatusFilter, setVideoStatusFilter] = useState("All");
  const [videoFormatFilter, setVideoFormatFilter] = useState("All");
  const [integrationFilter, setIntegrationFilter] = useState("All");
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
  const [listingItems, setListingItems] = useState<ListingItem[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [selectedListingPhotos, setSelectedListingPhotos] = useState<ListingPhotoItem[]>([]);
  const [listingNavOpen, setListingNavOpen] = useState(true);
  const [showAllSidebarListings, setShowAllSidebarListings] = useState(false);
  const [listingCreateOpen, setListingCreateOpen] = useState(false);
  const [zillowIntegration, setZillowIntegration] = useState<ZillowIntegration | null>(null);
  const [airbnbIntegration, setAirbnbIntegration] = useState<ZillowIntegration | null>(null);
  const [zillowBusy, setZillowBusy] = useState(false);
  const [zillowImportOpen, setZillowImportOpen] = useState(false);
  const [airbnbImportOpen, setAirbnbImportOpen] = useState(false);
  const [videoItems, setVideoItems] = useState<VideoItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState("");
  const [creditBalance, setCreditBalance] = useState(0);
  const [displayName, setDisplayName] = useState("Agent");
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [wizardTemplate, setWizardTemplate] = useState<TemplateItem | null>(null);
  const [profileDetails, setProfileDetails] = useState({
    email: "",
    displayName: "",
    bio: "",
    phone: "",
    jobTitle: "",
    companyName: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<WorkspaceSubscription | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;
    let projectsChannel: ReturnType<typeof supabase.channel> | null = null;
    let videosPoll: ReturnType<typeof window.setInterval> | null = null;

    async function loadWorkspace() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        window.location.replace("/login");
        return;
      }
      const currentUser = session.user;

      if (!active) return;
      setUserId(session.user.id);
      setDisplayName(session.user.user_metadata.display_name ?? session.user.email?.split("@")[0] ?? "Agent");
      setProfileDetails((current) => ({
        ...current,
        email: session.user.email ?? "",
      }));
      // Publish the catalog independently of workspace setup and account requests.
      void (async () => {
        const { data: catalog, error } = await supabase.from("video_templates").select("id, name, style_label, format, duration_seconds, credits_cost, min_photos, max_photos, preview_url, thumbnail_url, generation_config, is_featured, sort_order").eq("is_active", true).order("sort_order");
        if (!active) return;
        if (error) { flash("Could not refresh templates. Please reload to try again."); return; }
        if (catalog?.length)
          setTemplateItems(
            catalog
              .map((item, index) => ({
                id: item.id,
                title: item.name,
                tag: item.style_label,
                format: item.format,
                time: `${item.duration_seconds} sec`,
                credits: item.credits_cost,
                image: resolveMediaUrl(item.thumbnail_url ?? "/homes/modern-villa.jpg"),
                preview: item.preview_url && /\.(mp4|webm|mov)$/i.test(item.preview_url) ? resolveMediaUrl(item.preview_url) : undefined,
                size: index === 0 ? "tall" : item.format === "16:9" ? "wide" : "normal",
                minPhotos: item.min_photos ?? 6,
                maxPhotos: item.max_photos ?? 30,
                generationConfig: item.generation_config && typeof item.generation_config === "object" ? (item.generation_config as Record<string, unknown>) : undefined,
              }))
              .filter((template) => Boolean(template.preview)),
          );
      })().catch(() => { if (active) flash("Could not refresh templates. Please reload to try again."); });
      const { data: workspaceId, error: workspaceError } = await supabase.rpc("bootstrap_workspace", { workspace_name: "My Homie Workspace" });
      if (workspaceError) flash(workspaceError.message);
      if (workspaceId) setWorkspaceId(workspaceId);

      const [{ data: wallet }, { data: homes }, { data: savedFavorites }, { data: profile }, { data: zillow }, { data: airbnb }, { data: plans }, { data: currentSubscription }] = await Promise.all([workspaceId ? supabase.from("credit_wallets").select("balance").eq("workspace_id", workspaceId).maybeSingle() : Promise.resolve({ data: null }), workspaceId ? supabase.from("listings").select("id, address_line1, city, region, price, cover_photo_url, status, source, listing_photos(count), video_projects(count)").eq("workspace_id", workspaceId).order("created_at", { ascending: false }) : Promise.resolve({ data: null }), supabase.from("template_favorites").select("template_id").eq("user_id", session.user.id), supabase.from("profiles").select("display_name, bio, phone, job_title, company_name").eq("id", session.user.id).maybeSingle(), workspaceId ? supabase.from("integrations").select("id, status, external_account_name, last_synced_at, last_error").eq("workspace_id", workspaceId).eq("provider", "zillow").maybeSingle() : Promise.resolve({ data: null }), workspaceId ? supabase.from("integrations").select("id, status, external_account_name, last_synced_at, last_error").eq("workspace_id", workspaceId).eq("provider", "airbnb").maybeSingle() : Promise.resolve({ data: null }), supabase.from("plans").select("id,name,slug,audience,monthly_price,yearly_price,monthly_credits,seat_limit,features").eq("is_active", true).order("sort_order"), workspaceId ? supabase.from("subscriptions").select("plan_id,status,billing_interval,trial_ends_at,current_period_ends_at").eq("workspace_id", workspaceId).maybeSingle() : Promise.resolve({ data: null })]);

      if (!active) return;
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
      setZillowIntegration(zillow ?? null);
      setAirbnbIntegration(airbnb ?? null);
      setBillingPlans(
        (plans ?? []).map((plan) => ({
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          audience: plan.audience as "solo" | "team",
          monthlyPrice: plan.monthly_price == null ? null : Number(plan.monthly_price),
          yearlyPrice: plan.yearly_price == null ? null : Number(plan.yearly_price),
          monthlyCredits: plan.monthly_credits,
          seatLimit: plan.seat_limit,
          features: Array.isArray(plan.features) ? plan.features.filter((feature): feature is string => typeof feature === "string") : [],
        })),
      );
      if (currentSubscription)
        setSubscription({
          planId: currentSubscription.plan_id,
          status: currentSubscription.status,
          billingInterval: currentSubscription.billing_interval as "monthly" | "yearly",
          trialEndsAt: currentSubscription.trial_ends_at,
          currentPeriodEndsAt: currentSubscription.current_period_ends_at,
        });
      setListingItems(
        (homes ?? []).map((home) => ({
          id: home.id,
          address: home.address_line1,
          city: [home.city, home.region].filter(Boolean).join(", "),
          price:
            home.price == null
              ? "Price on request"
              : new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(Number(home.price)),
          photos: home.listing_photos?.[0]?.count ?? 0,
          videos: home.video_projects?.[0]?.count ?? 0,
          image: home.cover_photo_url ?? "/homes/modern-villa.jpg",
          status: home.status === "active" ? "Active" : "Pending",
          source: listingSourceLabel(home.source),
        })),
      );
      async function loadUserVideos(background = false) {
        if (!background) setVideosLoading(true);
        const { data: projects, error: projectsError } = workspaceId ? await supabase.from("video_projects").select("id, title, status, output_format, duration_seconds, credits_cost, generation_progress, generation_error, created_at, generation_events(stage, message, progress, created_at), video_project_photos(count), video_versions(status, video_url, thumbnail_url, version_number, provider_metadata), listings(address_line1, city, region, price, cover_photo_url, listing_photos(count)), video_templates(style_label, thumbnail_url)").eq("workspace_id", workspaceId).eq("created_by", currentUser.id).order("created_at", { ascending: false }) : { data: [], error: null };
        if (!active) return;
        if (projectsError) {
          setVideosError(projectsError.message);
          setVideoItems([]);
          setVideosLoading(false);
          return;
        }
        setVideosError("");
        const mappedVideos = (projects ?? []).map((project) => {
          const home = Array.isArray(project.listings) ? project.listings[0] : project.listings;
          const template = Array.isArray(project.video_templates) ? project.video_templates[0] : project.video_templates;
          const versions = [...(project.video_versions ?? [])].sort((a, b) => b.version_number - a.version_number);
          const readyVersion = versions.find((version) => version.status === "ready") ?? versions[0];
          const latestEvent = [...(project.generation_events ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          const status = project.status === "generating" || project.status === "queued" || project.status === "draft"
            ? "Generating"
            : project.status === "failed"
              ? "Failed"
              : project.status === "approved"
                ? "Approved"
                : "Ready";
          return {
            id: project.id,
            title: project.title,
            address: home?.address_line1 ?? "Untitled listing",
            city: [home?.city, home?.region].filter(Boolean).join(", "),
            price:
              home?.price == null
                ? "Price on request"
                : new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(Number(home.price)),
            template: template?.style_label ?? "Homie",
            format: project.output_format,
            duration: `${project.duration_seconds} sec`,
            credits: project.credits_cost,
            photosUsed: project.video_project_photos?.[0]?.count ?? 0,
            totalPhotos: home?.listing_photos?.[0]?.count ?? 0,
            created: new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
            }).format(new Date(project.created_at)),
            status,
            image: readyVersion?.thumbnail_url ?? home?.cover_photo_url ?? template?.thumbnail_url ?? "/homes/modern-villa.jpg",
            videoUrl: readyVersion?.video_url ?? undefined,
            progress: project.generation_progress ?? 0,
            stage: latestEvent?.message ?? (project.status === "queued" ? "Waiting for generation" : undefined),
            error: project.status === "failed" ? friendlyGenerationError(project.generation_error) : undefined,
          } as VideoItem;
        });
        const videosWithPlayback = await Promise.all(
          mappedVideos.map(async (video) => {
            if (video.videoUrl || video.status === "Generating" || video.status === "Failed") return video;
            const response = await fetch("/api/media/video-url", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ projectId: video.id }),
            });
            if (!response.ok) return video;
            const payload = (await response.json()) as { url?: string };
            return payload.url ? { ...video, videoUrl: payload.url } : video;
          }),
        );
        if (active) setVideoItems(videosWithPlayback);
        setVideosLoading(false);
      }
      await loadUserVideos();

      projectsChannel = supabase
        .channel(`my-video-projects-${currentUser.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "video_projects",
            filter: `created_by=eq.${currentUser.id}`,
          },
          () => {
            void loadUserVideos();
          },
        )
        .subscribe();
      videosPoll = window.setInterval(() => {
        void loadUserVideos(true);
      }, 5000);
      setCreditBalance(wallet?.balance ?? 0);
      if (active) setAppLoading(false);
    }

    void loadWorkspace().catch(() => {
      if (!active) return;
      setAppLoadError("We couldn’t load your workspace. Please try again.");
      setAppLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace("/login");
    });
    return () => {
      active = false;
      if (projectsChannel) void supabase.removeChannel(projectsChannel);
      if (videosPoll) window.clearInterval(videosPoll);
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") !== "success") return;
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    const timeout = window.setTimeout(() => {
      setView("subscribe");
      flash("Payment received — your plan will be active in a moment");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function openPolarBilling(path: "checkout" | "portal", planSlug?: string, billingInterval: "monthly" | "yearly" = "monthly") {
    if (!workspaceId) return flash("Your workspace is still loading");
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return window.location.replace("/login");
    try {
      const response = await fetch(`/api/billing/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ workspaceId, ...(planSlug ? { planSlug, billingInterval } : {}) }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Billing is unavailable");
      window.location.assign(result.url);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Billing is unavailable");
    }
  }

  function changeView(v: View) {
    mobileMoreRef.current?.hidePopover();
    setView(v);
    if (v !== "listings") setSelectedListingId(null);
    setSearch("");
    setFiltersOpen(false);
  }

  async function openListing(listingId: string) {
    setSelectedListingId(listingId);
    setView("listings");
    setSearch("");
    setFiltersOpen(false);
    const supabase = getSupabaseBrowserClient();
    const photoResult = await supabase.from("listing_photos").select("id, source_url, thumbnail_url, room_type, zone_id, metadata, storage_path").eq("listing_id", listingId).order("sort_order");
    if (photoResult.error) return flash(photoResult.error.message);
    setSelectedListingPhotos(
      (photoResult.data ?? []).map((photo) => ({
        id: String(photo.id),
        url: photo.thumbnail_url ?? photo.source_url ?? "/homes/modern-villa.jpg",
        roomType: photo.room_type ?? "Unsorted",
        zoneId: photo.zone_id == null ? null : String(photo.zone_id),
        isHero: Boolean(photo.metadata && typeof photo.metadata === "object" && "is_room_hero" in photo.metadata && photo.metadata.is_room_hero),
        storagePath: photo.storage_path,
      })),
    );
  }

  function clearAllFilters() {
    setSearch("");
    setCategory("All");
    setSort("Recent");
    setFormatFilter("All");
    setCreditsFilter("All");
    setListingSourceFilter("All");
    setListingPhotoFilter("All");
    setListingSort("Recent");
    setVideoStatusFilter("All");
    setVideoFormatFilter("All");
    setIntegrationFilter("All");
  }

  async function toggleFavorite(templateId: number) {
    if (!userId) return;
    const supabase = getSupabaseBrowserClient();
    const isFavorite = favoriteIds.has(templateId);
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (isFavorite) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
    const { error } = isFavorite ? await supabase.from("template_favorites").delete().eq("user_id", userId).eq("template_id", templateId) : await supabase.from("template_favorites").upsert({ user_id: userId, template_id: templateId }, { onConflict: "user_id,template_id" });
    if (error) {
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (isFavorite) next.add(templateId);
        else next.delete(templateId);
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
    const { error } = await getSupabaseBrowserClient()
      .from("profiles")
      .update({
        display_name: profileDetails.displayName.trim() || null,
        bio: profileDetails.bio.trim() || null,
        phone: profileDetails.phone.trim() || null,
        job_title: profileDetails.jobTitle.trim() || null,
        company_name: profileDetails.companyName.trim() || null,
      })
      .eq("id", userId);
    setSavingProfile(false);
    if (error) return flash(error.message);
    setDisplayName(profileDetails.displayName.trim() || "Agent");
    flash("Profile saved");
  }

  async function changePassword(password: string) {
    const { error } = await getSupabaseBrowserClient().auth.updateUser({
      password,
    });
    if (error) return flash(error.message);
    flash("Password updated");
  }

  async function runZillowAction(action: "connect" | "sync" | "disconnect") {
    if (!workspaceId || zillowBusy) return;
    setZillowBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/integrations/zillow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, workspaceId }),
      });
      const result = (await response.json()) as {
        integration?: ZillowIntegration | null;
        synced?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Zillow request failed");
      setZillowIntegration(result.integration ?? null);
      if (action !== "disconnect") {
        const { data: homes, error } = await supabase.from("listings").select("id, address_line1, city, region, price, cover_photo_url, status, source, listing_photos(count), video_projects(count)").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
        if (error) throw error;
        setListingItems(
          (homes ?? []).map((home) => ({
            id: home.id,
            address: home.address_line1,
            city: [home.city, home.region].filter(Boolean).join(", "),
            price:
              home.price == null
                ? "Price on request"
                : new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(Number(home.price)),
            photos: home.listing_photos?.[0]?.count ?? 0,
            videos: home.video_projects?.[0]?.count ?? 0,
            image: home.cover_photo_url ?? "/homes/modern-villa.jpg",
            status: home.status === "active" ? "Active" : "Pending",
            source: listingSourceLabel(home.source),
          })),
        );
      }
      flash(action === "disconnect" ? "Zillow disconnected" : `${result.synced ?? 0} listings synced from Zillow Bridge`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Zillow request failed");
    } finally {
      setZillowBusy(false);
    }
  }

  async function refreshListings() {
    if (!workspaceId) return;
    const { data: homes, error } = await getSupabaseBrowserClient().from("listings").select("id, address_line1, city, region, price, cover_photo_url, status, source, listing_photos(count), video_projects(count)").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) return flash(error.message);
    setListingItems(
      (homes ?? []).map((home) => ({
        id: home.id,
        address: home.address_line1,
        city: [home.city, home.region].filter(Boolean).join(", "),
        price:
          home.price == null
            ? "Price on request"
            : new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(Number(home.price)),
        photos: home.listing_photos?.[0]?.count ?? 0,
        videos: home.video_projects?.[0]?.count ?? 0,
        image: home.cover_photo_url ?? "/homes/modern-villa.jpg",
        status: home.status === "active" ? "Active" : "Pending",
        source: listingSourceLabel(home.source),
      })),
    );
  }

  async function deleteListing(listingId: string) {
    if (!workspaceId) throw new Error("Your workspace is still loading. Please try again.");
    const supabase = getSupabaseBrowserClient();
    const { data: photoRows, error: photosError } = await supabase.from("listing_photos").select("storage_path").eq("listing_id", listingId);
    if (photosError) throw photosError;
    const { data: deletedRows, error: deleteError } = await supabase.from("listings").delete().eq("id", listingId).eq("workspace_id", workspaceId).select("id");
    if (deleteError) throw new Error(deleteError.code === "23503" ? "This listing has video projects and cannot be deleted yet." : deleteError.message);
    if (!deletedRows?.length) throw new Error("You do not have permission to delete this listing.");

    const storagePaths = (photoRows ?? []).map((photo) => photo.storage_path).filter((path): path is string => Boolean(path));
    if (storagePaths.length) {
      const { error: storageError } = await supabase.storage.from("listing-photos").remove(storagePaths);
      if (storageError) console.warn("Listing deleted, but some stored photos could not be removed", storageError);
    }
    setListingItems((current) => current.filter((listing) => listing.id !== listingId));
    if (selectedListingId === listingId) setSelectedListingId(null);
    flash("Listing deleted");
  }

  async function deleteVideoProject(projectId: number) {
    if (!workspaceId) throw new Error("Your workspace is still loading. Please try again.");
    const { data: deletedRows, error: deleteError } = await getSupabaseBrowserClient()
      .from("video_projects")
      .delete()
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .select("id");
    if (deleteError) throw new Error(deleteError.message);
    if (!deletedRows?.length) throw new Error("You do not have permission to delete this video.");
    setVideoItems((current) => current.filter((video) => video.id !== projectId));
    if (selectedVideo?.id === projectId) setSelectedVideo(null);
    flash("Video deleted");
  }

  async function createListing(values: { title: string; photos: MappedListingPhoto[] }) {
    if (!workspaceId) throw new Error("Your workspace is still loading. Please try again.");
    const supabase = getSupabaseBrowserClient();
    const { data: listing, error } = await supabase
      .from("listings")
      .insert({
        workspace_id: workspaceId,
        source: "upload",
        status: "active",
        external_listing_id: `upload-${crypto.randomUUID()}`,
        address_line1: values.title.trim(),
        city: "Homie upload",
      })
      .select("id")
      .single();
    if (error) throw error;
    const uploaded: { storagePath: string; signedUrl: string }[] = [];
    for (let index = 0; index < values.photos.length; index += 1) {
      const file = values.photos[index].file;
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
      const storagePath = `${workspaceId}/upload/${listing.id}/${index}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("listing-photos").upload(storagePath, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: signed, error: signError } = await supabase.storage.from("listing-photos").createSignedUrl(storagePath, 60 * 60 * 24 * 365);
      if (signError || !signed) throw signError ?? new Error("Could not prepare an uploaded photo");
      uploaded.push({ storagePath, signedUrl: signed.signedUrl });
    }
    const zoneDefinitions = [...new Map(values.photos.map((photo) => {
      const zone = mappingZoneForRoom(photo.roomType);
      return [zone.name, zone] as const;
    })).values()].sort((a, b) => a.sortOrder - b.sortOrder);
    const { data: createdZones, error: zonesError } = await supabase
      .from("listing_zones")
      .insert(zoneDefinitions.map((zone, index) => ({ listing_id: listing.id, name: zone.name, kind: zone.kind, sort_order: index })))
      .select("id, name");
    if (zonesError) throw zonesError;
    const zoneIdByName = new Map((createdZones ?? []).map((zone) => [zone.name, zone.id]));
    const { error: photosError } = await supabase.from("listing_photos").insert(
      uploaded.map((photo, index) => ({
        listing_id: listing.id,
        storage_path: photo.storagePath,
        source_url: photo.signedUrl,
        thumbnail_url: photo.signedUrl,
        room_type: values.photos[index].roomType,
        zone_id: zoneIdByName.get(mappingZoneForRoom(values.photos[index].roomType).name),
        sort_order: index,
        metadata: { is_room_hero: values.photos[index].isHero },
      })),
    );
    if (photosError) throw photosError;
    const { error: coverError } = await supabase.from("listings").update({ cover_photo_url: uploaded[0].signedUrl }).eq("id", listing.id);
    if (coverError) throw coverError;
    await refreshListings();
    setListingCreateOpen(false);
    flash("Listing created");
  }

  async function refreshAirbnbIntegration() {
    if (!workspaceId) return;
    const { data } = await getSupabaseBrowserClient().from("integrations").select("id, status, external_account_name, last_synced_at, last_error").eq("workspace_id", workspaceId).eq("provider", "airbnb").limit(1).maybeSingle();
    setAirbnbIntegration(data ?? null);
  }

  const searchPlaceholder = view === "templates" || view === "favorites" ? "Search templates by name or style…" : view === "listings" ? "Search listings by title or source…" : view === "videos" ? "Search videos, listings or templates…" : view === "integrations" ? "Search integrations…" : "Search Homie…";
  const activeFilterCount = view === "templates" || view === "favorites" ? [category !== "All", sort !== "Recent", formatFilter !== "All", creditsFilter !== "All"].filter(Boolean).length : view === "listings" ? [listingSourceFilter !== "All", listingPhotoFilter !== "All", listingSort !== "Recent"].filter(Boolean).length : view === "videos" ? [videoStatusFilter !== "All", videoFormatFilter !== "All"].filter(Boolean).length : view === "integrations" ? Number(integrationFilter !== "All") : 0;


  return (
    <>
    {!appLoading && !appLoadError && <main className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <button className="brand" onClick={() => changeView("templates")} aria-label="Homie overview">
          <HomieLogo variant="mark-adaptive" />
        </button>
        <nav aria-label="Main navigation">
          <button onClick={() => changeView("templates")} className={view === "templates" ? "active" : ""}>
            <span>
              <ExploreIcon />
            </span>
            Explore
          </button>
          <button onClick={() => changeView("videos")} className={view === "videos" ? "active" : ""}>
            <span>
              <VideoIcon />
            </span>
            My videos
          </button>
          <button onClick={() => changeView("favorites")} className={view === "favorites" ? "active" : ""}>
            <span>
              <HeartIcon />
            </span>
            Favorites
          </button>
          <p className="nav-label">Business</p>
          <button
            onClick={() => {
              setListingNavOpen((open) => !open);
              setSelectedListingId(null);
              changeView("listings");
            }}
            className={view === "listings" ? "active sidebar-listings-parent" : "sidebar-listings-parent"}
          >
            <span>
              <ListingsIcon />
            </span>
            My listings{" "}
            <i>
              <ChevronIcon open={listingNavOpen} />
            </i>
          </button>
          {listingNavOpen && (
            <div className="sidebar-listing-tree">
              {(showAllSidebarListings ? listingItems : listingItems.slice(0, 3)).map((listing) => (
                <button key={listing.id} className={selectedListingId === listing.id ? "active" : ""} onClick={() => void openListing(listing.id)} title={listing.address}>
                  {listing.address}
                </button>
              ))}
              {listingItems.length > 3 && (
                <button className="sidebar-add-listing" aria-expanded={showAllSidebarListings} onClick={() => setShowAllSidebarListings((expanded) => !expanded)}>
                  {showAllSidebarListings ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}
          <button onClick={() => changeView("integrations")} className={view === "integrations" ? "active" : ""}>
            <span>
              <IntegrationsIcon />
            </span>
            Integrations
          </button>
          <div className="sidebar-divider" />
          <button onClick={() => changeView("subscribe")} className={view === "subscribe" ? "active" : ""}>
            <span>
              <SubscribeIcon />
            </span>
            Subscribe
          </button>
          <button onClick={() => setTopUpOpen(true)}>
            <span>
              <CreditsIcon />
            </span>
            Top up credits <small>{creditBalance}</small>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="profile" onClick={() => setProfileOpen((v) => !v)} aria-expanded={profileOpen} aria-haspopup="menu">
            <span className="profile-avatar">
              <UserIcon />
            </span>
            <span>
              <b>{displayName}</b>
              <small>{creditBalance} videos left</small>
            </span>
            <i className={profileOpen ? "chevron up" : "chevron"}>⌃</i>
          </button>
          {profileOpen && (
            <>
              <button className="menu-backdrop" aria-hidden="true" onClick={() => setProfileOpen(false)} />
              <div className="profile-menu" role="menu">
                <button
                  role="menuitem"
                  onClick={() => {
                    changeView("profile");
                    setProfileOpen(false);
                  }}
                >
                  <UserIcon />
                  Profile
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setSettingsOpen(true);
                    setProfileOpen(false);
                  }}
                >
                  <SettingsIcon />
                  Settings
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    window.location.assign("/docs");
                  }}
                >
                  <HelpIcon />
                  Help
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setTheme((t) => (t === "dark" ? "light" : "dark"));
                    setProfileOpen(false);
                  }}
                >
                  {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
                <div className="profile-menu-divider" />
                <button
                  role="menuitem"
                  onClick={async () => {
                    await getSupabaseBrowserClient().auth.signOut();
                    setProfileOpen(false);
                  }}
                >
                  <SignOutIcon />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      <section className="main-panel">
        <header className={view === "subscribe" ? "topbar subscribe-topbar" : "topbar"}>
          <button className="mobile-brand" onClick={() => changeView("templates")} aria-label="Homie overview">
            <HomieLogo variant="mark-adaptive" />
          </button>
          {view === "subscribe" ? (
            <div className="subscribe-topbar-title">
              <p className="eyebrow">Billing</p>
              <b>Plans & subscription</b>
            </div>
          ) : (
            <>
              <label className="global-search">
                <SearchIcon />
                <input aria-label={`Search ${view}`} placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && (
                  <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setSearch("")}>
                    ×
                  </button>
                )}
              </label>
              {(view === "templates" || view === "favorites") ? <TemplateFilters format={formatFilter} onFormat={setFormatFilter} formats={[...new Set(templateItems.filter((item) => item.preview && (view !== "favorites" || favoriteIds.has(item.id))).map((item) => item.format))]} count={Number(category !== "All") + Number(formatFilter !== "All")} /> : <button className={filtersOpen ? "filter-square active" : "filter-square"} onClick={() => setFiltersOpen((value) => !value)} aria-label="Open filters" aria-expanded={filtersOpen}>
                <SlidersIcon />
                {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              </button>}
            </>
          )}
        </header>

        {filtersOpen && view !== "profile" && view !== "templates" && view !== "favorites" && (
          <div className="filters-panel">
            <div className="filters-head">
              <div>
                <p className="eyebrow">Refine results</p>
                <h2>{view === "listings" ? "Find a property" : view === "videos" ? "Find a video" : "Find a connection"}</h2>
              </div>
              <div>
                <button className="filters-reset" onClick={clearAllFilters}>
                  Reset
                </button>
                <button aria-label="Close filters" onClick={() => setFiltersOpen(false)}>
                  ×
                </button>
              </div>
            </div>
            {view === "listings" && (
              <div className="filters-row">
                <div className="filters-group">
                  <p className="filters-label">Source</p>
                  <div className="filters-pills">
                    {["All", "Manual upload", "Zillow", "Airbnb"].map((value) => (
                      <button key={value} className={listingSourceFilter === value ? "active" : ""} onClick={() => setListingSourceFilter(value)}>
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filters-group">
                  <p className="filters-label">Photos</p>
                  <div className="filters-pills">
                    {["All", "With photos", "Needs photos"].map((value) => (
                      <button key={value} className={listingPhotoFilter === value ? "active" : ""} onClick={() => setListingPhotoFilter(value)}>
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filters-group">
                  <p className="filters-label">Sort</p>
                  <div className="filters-pills">
                    {["Recent", "Title A–Z"].map((value) => (
                      <button key={value} className={listingSort === value ? "active" : ""} onClick={() => setListingSort(value)}>
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {view === "videos" && (
              <div className="filters-row">
                <div className="filters-group">
                  <p className="filters-label">Status</p>
                  <div className="filters-pills">
                    {["All", "Generating", "Ready", "Approved"].map((value) => (
                      <button key={value} className={videoStatusFilter === value ? "active" : ""} onClick={() => setVideoStatusFilter(value)}>
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filters-group">
                  <p className="filters-label">Format</p>
                  <div className="filters-pills">
                    {["All", "9:16", "1:1", "16:9"].map((value) => (
                      <button key={value} className={videoFormatFilter === value ? "active" : ""} onClick={() => setVideoFormatFilter(value)}>
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {view === "integrations" && (
              <div className="filters-row">
                <div className="filters-group">
                  <p className="filters-label">Availability</p>
                  <div className="filters-pills">
                    {["All", "Connected", "Available", "Coming soon"].map((value) => (
                      <button key={value} className={integrationFilter === value ? "active" : ""} onClick={() => setIntegrationFilter(value)}>
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {(view === "templates" || view === "favorites") && <Templates items={templateItems} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} favoritesOnly={view === "favorites"} onUseTemplate={setWizardTemplate} search={search} onClearSearch={clearAllFilters} onRemoveFilter={(key) => { if (key === "search") setSearch(""); else if (key === "format") setFormatFilter("All"); else setCreditsFilter("All"); }} category={category} setCategory={setCategory} sort={sort} formatFilter={formatFilter} creditsFilter={creditsFilter} />}
        {view === "listings" && <Listings items={listingItems} search={search} sourceFilter={listingSourceFilter} photoFilter={listingPhotoFilter} sort={listingSort} onClear={clearAllFilters} onOpen={openListing} onCreateVideo={() => changeView("templates")} onDelete={deleteListing} onAdd={() => setListingCreateOpen(true)} flash={flash} />}
        {view === "videos" && <MyVideos items={videoItems} search={search} statusFilter={videoStatusFilter} formatFilter={videoFormatFilter} loading={videosLoading} error={videosError} onBrowseTemplates={() => changeView("templates")} onOpenVideo={setSelectedVideo} onDelete={deleteVideoProject} flash={flash} />}
        {view === "integrations" && <Integrations search={search} availability={integrationFilter} />}
        {view === "profile" && <ProfilePage details={profileDetails} onChange={setProfileDetails} onSave={saveProfile} saving={savingProfile} favoriteCount={favoriteIds.size} videoCount={videoItems.length} />}
        {view === "subscribe" && <SubscribePage plans={billingPlans} subscription={subscription} creditBalance={creditBalance} onChoose={(plan, billingInterval) => openPolarBilling("checkout", plan.slug, billingInterval)} onManage={() => openPolarBilling("portal")} />}

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {nav.map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} aria-current={view === item.id ? "page" : undefined} onClick={() => changeView(item.id)}>
              <span className="mobile-nav-icon"><MobileNavIcon name={item.id} /></span>
              {item.label === "My videos" ? "Videos" : item.label}
            </button>
          ))}
          <button popoverTarget="mobile-more" className={!nav.some((item) => item.id === view) ? "active" : ""}>
            <span className="mobile-nav-icon"><MobileNavIcon name="more" /></span>
            More
          </button>
        </nav>
        <div id="mobile-more" ref={mobileMoreRef} popover="auto" className="mobile-more">
          <nav aria-label="More navigation">
            <button onClick={() => changeView("favorites")}>Favorites</button>
            <button onClick={() => changeView("integrations")}>Integrations</button>
            <button onClick={() => changeView("profile")}>Profile</button>
            <button onClick={() => { mobileMoreRef.current?.hidePopover(); setSettingsOpen(true); }}>Settings</button>
            <button onClick={() => changeView("subscribe")}>Plans & subscription</button>
            <button onClick={() => { mobileMoreRef.current?.hidePopover(); setTopUpOpen(true); }}>Top up credits · {creditBalance}</button>
            <a href="/docs">Help</a>
          </nav>
        </div>
      </section>
      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
      {selectedListingId && workspaceId && <ListingDetail listing={listingItems.find((item) => item.id === selectedListingId) ?? null} photos={selectedListingPhotos} workspaceId={workspaceId} onBack={() => setSelectedListingId(null)} flash={flash} />}
      {selectedVideo && <VideoModal video={videoItems.find((video) => video.id === selectedVideo.id) ?? selectedVideo} onClose={() => setSelectedVideo(null)} flash={flash} />}
      {settingsOpen && <SettingsModal details={profileDetails} onChange={setProfileDetails} onSave={saveProfile} saving={savingProfile} theme={theme} onThemeChange={setTheme} credits={creditBalance} onPasswordChange={changePassword} onClose={() => setSettingsOpen(false)} flash={flash} />}
      {topUpOpen && (
        <TopUpCreditsModal
          currentCredits={creditBalance}
          onClose={() => setTopUpOpen(false)}
          onUpgrade={() => {
            setTopUpOpen(false);
            changeView("subscribe");
          }}
          onPurchase={(credits) => flash(`Checkout for ${credits} credits is coming next`)}
        />
      )}
      {wizardTemplate && workspaceId && (
        <TemplatePreviewModal template={wizardTemplate} onClose={() => setWizardTemplate(null)} creationControls={
        <CreateVideoWizard
          template={wizardTemplate}
          initialListings={listingItems}
          workspaceId={workspaceId}
          walletBalance={creditBalance}
          onCreated={(project) => {
            setVideoItems((current) => [project, ...current]);
            setCreditBalance((current) => Math.max(0, current - project.credits));
            setWizardTemplate(null);
            setView("videos");
            flash("Video queued — we'll notify you when it's ready");
          }}
        />
        } />
      )}
      {zillowImportOpen && workspaceId && (
        <ZillowImportModal
          workspaceId={workspaceId}
          onClose={() => setZillowImportOpen(false)}
          onImported={async (count) => {
            await refreshListings();
            flash(`${count} Zillow listing${count === 1 ? "" : "s"} imported`);
          }}
        />
      )}
      {airbnbImportOpen && workspaceId && (
        <ZillowImportModal
          source="airbnb"
          workspaceId={workspaceId}
          onClose={() => setAirbnbImportOpen(false)}
          onImported={async (count) => {
            await Promise.all([refreshListings(), refreshAirbnbIntegration()]);
            flash(`${count} Airbnb listing${count === 1 ? "" : "s"} imported`);
          }}
        />
      )}
      {listingCreateOpen && <CreateListingModal onClose={() => setListingCreateOpen(false)} onCreate={createListing} />}
    </main>}
    </>
  );
}

function Templates({ items, favoriteIds, onToggleFavorite, favoritesOnly = false, onUseTemplate, search, onClearSearch, onRemoveFilter, category, setCategory, sort, formatFilter, creditsFilter }: { items: TemplateItem[]; favoriteIds: Set<number>; onToggleFavorite: (templateId: number) => Promise<void>; favoritesOnly?: boolean; onUseTemplate: (template: TemplateItem) => void; search: string; onClearSearch: () => void; onRemoveFilter: (key: string) => void; category: string; setCategory: (v: string) => void; sort: string; formatFilter: string; creditsFilter: string }) {

  const q = search.trim().toLowerCase();
  const filteredTemplates = items
    .filter((template) => Boolean(template.preview))
    .filter((template) => !favoritesOnly || favoriteIds.has(template.id))
    .filter((t) => {
      const templateCategories = getTemplateCategories(t);
      const matchesCategory = category === "All" || templateCategories.has(category);
      const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.tag.toLowerCase().includes(q) || [...templateCategories].some((name) => name.toLowerCase().includes(q));
      const matchesFormat = formatFilter === "All" || t.format === formatFilter;
      const matchesCredits = creditsFilter === "All" || (creditsFilter === "Under 15" ? t.credits < 15 : t.credits >= 15);
      return matchesCategory && matchesSearch && matchesFormat && matchesCredits;
    })
    .sort((a, b) => (sort === "Name" ? a.title.localeCompare(b.title) : sort === "Credits" ? a.credits - b.credits : 0));
  const activeLabel = q ? `“${search.trim()}”` : category !== "All" ? `“${category}”` : formatFilter !== "All" ? `“${formatFilter}”` : `“${creditsFilter}”`;
  function openTemplate(template: TemplateItem) {
    onUseTemplate(template);
  }

  return (
    <div className="page templates-page">
      <div className="filter-row">
        {categoryOptions.map((name) => (
          <button key={name} aria-pressed={category === name} onClick={() => setCategory(name)} className={category === name ? "active" : ""}>
            {name}
          </button>
        ))}
      </div>
      <div className="template-results-bar">
        <span role="status" aria-live="polite">{filteredTemplates.length} {filteredTemplates.length === 1 ? "template" : "templates"}{favoritesOnly ? " in favorites" : ""}</span>
        <div className="template-active-filters">
          {category !== "All" && <button onClick={() => setCategory("All")} aria-label={`Remove ${category} filter`}>{category} <span aria-hidden="true">×</span></button>}
          {formatFilter !== "All" && <button onClick={() => onRemoveFilter("format")} aria-label={`Remove ${formatFilter} filter`}>{formatFilter} <span aria-hidden="true">×</span></button>}
          {q && <button onClick={() => onRemoveFilter("search")} aria-label="Remove search filter">“{search.trim()}” <span aria-hidden="true">×</span></button>}
          {creditsFilter !== "All" && <button onClick={() => onRemoveFilter("credits")}>{creditsFilter} credits ×</button>}
          {(category !== "All" || formatFilter !== "All" || q || creditsFilter !== "All") && <button className="clear-template-filters" onClick={onClearSearch}>Clear all</button>}
        </div>
      </div>
      <div className="template-grid">
        {filteredTemplates.map((template, index) => (
          <article
            className={`template-card ${template.size}`}
            key={template.title}
            onClick={() => openTemplate(template)}
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openTemplate(template)}
          >
            <TemplateMedia image={template.image} preview={template.preview} title={template.title} priority={index < 4} />
            <div className="card-shade" />
            <div className="card-top">
              <span>{index === 0 && !favoritesOnly ? "Featured" : template.tag}</span>
              <div className="card-top-actions">
                <button
                  className="use-badge"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUseTemplate(template);
                  }}
                >
                  Use
                </button>
                <button
                  className={`fav-btn ${favoriteIds.has(template.id) ? "active" : ""}`}
                  aria-label={`${favoriteIds.has(template.id) ? "Remove" : "Add"} ${template.title} ${favoriteIds.has(template.id) ? "from" : "to"} favorites`}
                  aria-pressed={favoriteIds.has(template.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onToggleFavorite(template.id);
                  }}
                >
                  <HeartIcon />
                </button>
              </div>
            </div>
            {template.preview && (
              <button
                className="play"
                aria-label={`Preview ${template.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onUseTemplate(template);
                }}
              >
                ▶
              </button>
            )}
            <div className="card-copy">
              <p className="eyebrow">{template.tag}</p>
              <h3>{template.title}</h3>
              <div>
                <span>{template.time}</span>
                <span>{template.format}</span>
                <span>1 generation</span>
              </div>
            </div>
          </article>
        ))}
        {filteredTemplates.length === 0 && (
          <article className="template-empty">
            <p className="eyebrow">{favoritesOnly ? "Your favorites" : "No matches"}</p>
            <h3>{favoritesOnly && favoriteIds.size === 0 ? "No favorite templates yet." : "No matching templates."}</h3>
            <p>{favoritesOnly && favoriteIds.size === 0 ? "Tap the heart on any template to save it here for later." : "Try another category or clear your search."}</p>
            {favoritesOnly && favoriteIds.size === 0 ? <a href="/app">Explore templates →</a> : <button onClick={onClearSearch}>Clear filters →</button>}
          </article>
        )}
      </div>
    </div>
  );
}

function TemplatePreviewModal({ template, onClose, creationControls }: { template: TemplateItem; onClose: () => void; creationControls: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(template.time ? Number.parseFloat(template.time) || 0 : 0);
  const categories = getTemplateCategories(template);
  const recommendation = categories.has("Luxury")
    ? "A polished choice for luxury homes, spacious villas, and premium estates. Let distinctive architecture and carefully styled interiors lead the story."
    : categories.has("Fast-paced") || categories.has("Viral Trends")
      ? "A lively choice for city apartments, modern homes, and attention-grabbing property highlights. Use your strongest photos to make a quick first impression."
      : categories.has("Casual")
        ? "A welcoming choice for family homes, cozy apartments, and vacation properties. Highlight comfortable living spaces and the details that make a house feel like home."
        : "A versatile choice for residential homes and apartments. Showcase the exterior, main living spaces, and standout details for a clear introduction to the property.";
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>(".template-preview-close")?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (dialogRef.current?.querySelector("dialog[open]")) return;
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trapFocus);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", trapFocus); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      const playback = video.play();
      if (playback)
        void playback.catch((error: unknown) => {
          const name = error instanceof DOMException ? error.name : "";
          if (name !== "AbortError" && name !== "NotAllowedError") console.warn("Could not play template preview", error);
        });
    } else video.pause();
  }

  function seek(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  async function toggleFullscreen() {
    const modal = videoRef.current?.closest(".template-preview-modal");
    if (!modal) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await modal.requestFullscreen();
  }

  function formatVideoTime(value: number) {
    if (!Number.isFinite(value)) return "0:00";
    const minutes = Math.floor(value / 60);
    return `${minutes}:${Math.floor(value % 60)
      .toString()
      .padStart(2, "0")}`;
  }

  return (
    <div className="template-preview-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="template-preview-modal template-detail" role="dialog" aria-modal="true" aria-labelledby="template-detail-title">
        <div className="template-detail-media">
        <div className="template-preview-stage">
          <video ref={videoRef} src={template.preview} poster={template.image} autoPlay loop muted playsInline preload="metadata" aria-label={`${template.title} template video`} onClick={togglePlayback} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} />
        </div>
        <div className="template-video-controls" aria-label="Video controls">
          <button onClick={togglePlayback} aria-label={playing ? "Pause video" : "Play video"}>
            {playing ? "Ⅱ" : "▶"}
          </button>
          <span>{formatVideoTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.05"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Video progress"
            style={
              {
                "--video-progress": `${duration ? (currentTime / duration) * 100 : 0}%`,
              } as CSSProperties
            }
          />
          <span>{formatVideoTime(duration)}</span>
          <button onClick={toggleMute} aria-label={muted ? "Unmute video" : "Mute video"}>
            {muted ? "⌁" : "◖"}
          </button>
          <button onClick={() => void toggleFullscreen()} aria-label="Toggle fullscreen">
            ⛶
          </button>
        </div>
        </div>
        <aside className="template-detail-info">
          <button className="template-preview-close" aria-label="Close template preview" onClick={onClose}>×</button>
          <p className="eyebrow">{template.tag || "Property tour"}</p>
          <h2 id="template-detail-title">{template.title}</h2>
          <div className="template-detail-format"><span>Recommended format</span><strong>{template.format || "Not specified"}</strong></div>
          <h3>Best suited for</h3>
          <p className="template-detail-description">{recommendation}</p>
          {creationControls}
        </aside>
      </section>
    </div>
  );
}

function ListingActionIcon({ type }: { type: "open" | "video" | "delete" }) {
  if (type === "open")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 5H5v14h14v-4M13 5h6v6M19 5l-9 9" />
      </svg>
    );
  if (type === "video")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="14" height="14" rx="2.5" />
        <path d="m17 10 4-2v8l-4-2" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
    </svg>
  );
}

function VideoActionIcon({ type }: { type: "open" | "download" | "delete" }) {
  if (type === "open")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m10 9 5 3-5 3Z" />
      </svg>
    );
  if (type === "download")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12m-4-4 4 4 4-4M5 20h14" />
      </svg>
    );
  return <ListingActionIcon type="delete" />;
}

function Listings({ items, search, sourceFilter, photoFilter, sort, onClear, onOpen, onCreateVideo, onDelete, onAdd, flash }: { items: ListingItem[]; search: string; sourceFilter: string; photoFilter: string; sort: string; onClear: () => void; onOpen: (id: string) => Promise<void>; onCreateVideo: (id: string) => void; onDelete: (id: string) => Promise<void>; onAdd: () => void; flash: (message: string) => void }) {
  const pageSize = 9;
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const q = search.trim().toLowerCase();
  const filteredItems = items.filter((listing) => (!q || `${listing.address} ${listing.city} ${listing.source}`.toLowerCase().includes(q)) && (sourceFilter === "All" || listing.source === sourceFilter) && (photoFilter === "All" || (photoFilter === "With photos" ? listing.photos > 0 : listing.photos === 0))).sort((a, b) => (sort === "Title A–Z" ? a.address.localeCompare(b.address) : 0));
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pageItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  useEffect(() => setPage(1), [search, sourceFilter, photoFilter, sort]);

  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = () => {
      setOpenMenuId(null);
      setConfirmDeleteId(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && closeMenu();
    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenuId]);

  return (
    <div className="page listings-page">
      <div className="page-intro intro-row">
        <div>
          <p className="eyebrow">Your properties</p>
          <h1>My listings.</h1>
          <p>Select a home and turn its photos into a polished video tour.</p>
        </div>
        <div className="listing-header-actions">
          <button className="create-listing-btn" onClick={onAdd}>
            <span>＋</span> Add listing
          </button>
        </div>
      </div>
      <div className="listings-grid">
        {pageItems.map((listing) => (
          <article className="listing-card" key={listing.id} tabIndex={0} onClick={() => void onOpen(listing.id)} onKeyDown={(e) => e.key === "Enter" && void onOpen(listing.id)}>
            <div className="listing-image">
              <img {...responsiveImageProps(listing.image, "(max-width: 720px) 100vw, 33vw")} alt={listing.address} loading="lazy" decoding="async" />
              <button
                className={openMenuId === listing.id ? "active" : ""}
                aria-label={`More options for ${listing.address}`}
                aria-haspopup="menu"
                aria-expanded={openMenuId === listing.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteId(null);
                  setOpenMenuId((current) => (current === listing.id ? null : listing.id));
                }}
              >
                •••
              </button>
            </div>
            {openMenuId === listing.id && (
              <div className="listing-card-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                <p>{listing.address}</p>
                {confirmDeleteId === listing.id ? (
                  <div className="listing-delete-confirm">
                    <b>Delete this listing?</b>
                    <small>This removes its photos and cannot be undone.</small>
                    <div>
                      <button onClick={() => setConfirmDeleteId(null)} disabled={deletingId === listing.id}>
                        Cancel
                      </button>
                      <button
                        className="danger"
                        disabled={deletingId === listing.id}
                        onClick={async () => {
                          setDeletingId(listing.id);
                          try {
                            await onDelete(listing.id);
                            setOpenMenuId(null);
                            setConfirmDeleteId(null);
                          } catch (error) {
                            flash(error instanceof Error ? error.message : "Could not delete listing");
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                      >
                        {deletingId === listing.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setOpenMenuId(null);
                        void onOpen(listing.id);
                      }}
                    >
                      <span>
                        <ListingActionIcon type="open" />
                      </span>
                      <div>
                        <b>Open listing</b>
                        <small>View and manage photos</small>
                      </div>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setOpenMenuId(null);
                        onCreateVideo(listing.id);
                      }}
                    >
                      <span>
                        <ListingActionIcon type="video" />
                      </span>
                      <div>
                        <b>Create video</b>
                        <small>Choose a template</small>
                      </div>
                    </button>
                    <button className="danger" role="menuitem" onClick={() => setConfirmDeleteId(listing.id)}>
                      <span>
                        <ListingActionIcon type="delete" />
                      </span>
                      <div>
                        <b>Delete listing</b>
                        <small>Remove listing and photos</small>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
            <div className="listing-copy">
              <p className="eyebrow">{listing.source}</p>
              <h2>{listing.address}</h2>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void onOpen(listing.id);
                }}
              >
                View listing<span>→</span>
              </button>
            </div>
          </article>
        ))}
      </div>
      {!pageItems.length && (
        <article className="search-empty">
          <SearchIcon />
          <h2>No listings found.</h2>
          <p>Try another title, source, or photo filter.</p>
          <button onClick={onClear}>Clear search and filters</button>
        </article>
      )}
      {filteredItems.length > pageSize && (
        <nav className="listings-pagination" aria-label="Listings pages">
          <p>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length}
          </p>
          <div>
            <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label="Previous page">
              ←
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
              <button key={number} className={number === page ? "active" : ""} onClick={() => setPage(number)} aria-label={`Page ${number}`} aria-current={number === page ? "page" : undefined}>
                {number}
              </button>
            ))}
            <button onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} aria-label="Next page">
              →
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

function ListingDetail({ listing, photos, workspaceId, onBack, flash }: { listing: ListingItem | null; photos: ListingPhotoItem[]; workspaceId: string; onBack: () => void; flash: (message: string) => void }) {
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mapRevision, setMapRevision] = useState(0);
  const [localPhotos, setLocalPhotos] = useState(photos);
  const [photoBusy, setPhotoBusy] = useState(false);
  const gallery = localPhotos.length
    ? localPhotos
    : listing
      ? [
          {
            id: "cover",
            url: listing.image,
            roomType: "Exterior",
            zoneId: null,
            isHero: true,
            storagePath: null,
          },
        ]
      : [];
  const [activePhotoId, setActivePhotoId] = useState(gallery[0]?.id ?? "");
  const activePhoto = gallery.find((photo) => photo.id === activePhotoId) ?? gallery[0];

  useEffect(() => {
    setLocalPhotos(photos);
    setActivePhotoId(gallery[0]?.id ?? "");
  }, [listing?.id, photos]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && !mappingOpen && onBack();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onBack, mappingOpen]);

  async function deletePhoto(photo: ListingPhotoItem) {
    if (!listing || photo.id === "cover" || photoBusy) return;
    setPhotoBusy(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("listing_photos").delete().eq("id", photo.id).eq("listing_id", listing.id);
    if (!error) {
      if (photo.storagePath) await supabase.storage.from("listing-photos").remove([photo.storagePath]);
      const next = localPhotos.filter((item) => item.id !== photo.id);
      setLocalPhotos(next);
      if (activePhotoId === photo.id) setActivePhotoId(next[0]?.id ?? "cover");
      flash("Photo removed");
    } else flash(error.message);
    setPhotoBusy(false);
  }

  async function addPhotos(files: FileList | null) {
    if (!listing || !files?.length || photoBusy) return;
    setPhotoBusy(true);
    const supabase = getSupabaseBrowserClient();
    const added: ListingPhotoItem[] = [];
    const { data: lastPhoto, error: orderError } = await supabase.from("listing_photos").select("sort_order").eq("listing_id", listing.id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    if (orderError) {
      flash(orderError.message);
      setPhotoBusy(false);
      return;
    }
    const nextSortOrder = (lastPhoto?.sort_order ?? -1) + 1;
    for (const [offset, file] of Array.from(files).entries()) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${workspaceId}/upload/${listing.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("listing-photos").upload(storagePath, file, { contentType: file.type });
      if (uploadError) {
        flash(uploadError.message);
        continue;
      }
      const { data: signed, error: signError } = await supabase.storage.from("listing-photos").createSignedUrl(storagePath, 60 * 60 * 24 * 365);
      if (signError || !signed) {
        flash(signError?.message ?? "Could not prepare the photo");
        continue;
      }
      const { data: row, error: insertError } = await supabase
        .from("listing_photos")
        .insert({
          listing_id: listing.id,
          storage_path: storagePath,
          source_url: signed.signedUrl,
          thumbnail_url: signed.signedUrl,
          room_type: "Unsorted",
          sort_order: nextSortOrder + offset,
          metadata: { is_room_hero: false },
        })
        .select("id")
        .single();
      if (insertError) {
        await supabase.storage.from("listing-photos").remove([storagePath]);
        flash(insertError.message);
      } else if (row)
        added.push({
          id: String(row.id),
          url: signed.signedUrl,
          roomType: "Unsorted",
          zoneId: null,
          isHero: false,
          storagePath,
        });
    }
    if (added.length) {
      setLocalPhotos((current) => [...current, ...added]);
      setActivePhotoId(added[0].id);
      flash(`${added.length} photo${added.length === 1 ? "" : "s"} added`);
    }
    setPhotoBusy(false);
  }

  if (!listing) return null;
  return (
    <div className="listing-showcase-backdrop" role="presentation">
      <section className="listing-showcase" role="dialog" aria-modal="true" aria-label={listing.address}>
        <button className="listing-showcase-close" aria-label="Close listing" onClick={onBack}>
          ×
        </button>
        <div className="listing-showcase-copy listing-showcase-copy-mapped">
          <div className="listing-showcase-title">
            <span>{listing.city || "Your property"}</span>
            <h1>{listing.address}</h1>
          </div>
          <ListingMapSummary key={mapRevision} listingId={listing.id} photos={localPhotos} onEdit={() => setMappingOpen(true)} />
        </div>
        <div className="listing-showcase-visual">
          {activePhoto && <img key={activePhoto.id} {...responsiveImageProps(activePhoto.url, "(max-width: 900px) 100vw, 70vw", [640, 960, 1280, 1600])} alt={`${activePhoto.roomType} at ${listing.address}`} decoding="async" />}
          <div className="listing-showcase-thumbs" aria-label="Listing photos">
            {gallery.map((photo, index) => (
              <div className={`listing-showcase-thumb ${photo.id === activePhoto?.id ? "active" : ""}`} key={photo.id}>
                <button className="listing-thumb-select" onClick={() => setActivePhotoId(photo.id)} aria-label={`View photo ${index + 1}, ${photo.roomType}`}>
                  <img {...responsiveImageProps(photo.url, "160px", [160, 320])} alt="" loading="lazy" decoding="async" />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </button>
                {photo.id !== "cover" && (
                  <button className="listing-thumb-delete" disabled={photoBusy} onClick={() => void deletePhoto(photo)} aria-label={`Delete photo ${index + 1}`}>
                    ×
                  </button>
                )}
              </div>
            ))}
            <label className={photoBusy ? "listing-thumb-add busy" : "listing-thumb-add"} aria-label="Add photos">
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={photoBusy}
                onChange={(event) => {
                  void addPhotos(event.target.files);
                  event.target.value = "";
                }}
              />
              <span>{photoBusy ? "…" : "+"}</span>
              <small>Add</small>
            </label>
          </div>
        </div>
      </section>
      {mappingOpen && <ListingMapBoard listingId={listing.id} photos={localPhotos} onClose={() => { setMappingOpen(false); setMapRevision((value) => value + 1); }} onMove={(photoId, zoneId) => setLocalPhotos((current) => current.map((photo) => photo.id === photoId ? { ...photo, zoneId } : photo))} />}
    </div>
  );
}

function inferRoomType(fileName: string) {
  const name = fileName.toLowerCase();
  const matches: [string, string[]][] = [
    ["Exterior", ["exterior", "front", "facade", "street", "aerial"]],
    ["Entry", ["entry", "foyer", "hall"]],
    ["Living room", ["living", "lounge", "family"]],
    ["Kitchen", ["kitchen"]],
    ["Dining room", ["dining"]],
    ["Bedroom", ["bed", "primary", "master"]],
    ["Bathroom", ["bath", "shower", "vanity"]],
    ["Outdoor", ["yard", "garden", "pool", "patio", "terrace", "balcony", "deck"]],
  ];
  return matches.find(([, keywords]) => keywords.some((keyword) => name.includes(keyword)))?.[0] ?? "Unsorted";
}

function mappingZoneForRoom(roomType: string) {
  if (["Exterior", "Outdoor"].includes(roomType)) return { name: "Exterior", kind: "outdoor" as const, sortOrder: 0 };
  if (["Bedroom", "Primary bedroom", "Bathroom", "Office"].includes(roomType)) return { name: "Floor two", kind: "floor" as const, sortOrder: 2 };
  return { name: "Floor one", kind: "floor" as const, sortOrder: 1 };
}

function autoOrganizeListingPhotos(photos: MappedListingPhoto[]) {
  const fallbackRoute = ["Exterior", "Entry", "Living room", "Kitchen", "Dining room", "Bedroom", "Bathroom", "Outdoor"];
  const assigned = photos.map((photo, index) => {
    const inferred = inferRoomType(photo.file.name);
    return {
      ...photo,
      roomType: inferred === "Unsorted" ? fallbackRoute[index % fallbackRoute.length] : inferred,
      isHero: false,
    };
  });
  const firstByRoom = new Set<string>();
  return assigned.map((photo) => {
    if (firstByRoom.has(photo.roomType)) return photo;
    firstByRoom.add(photo.roomType);
    return { ...photo, isHero: true };
  });
}

function CreateListingModal({ onClose, onCreate }: { onClose: () => void; onCreate: (values: { title: string; photos: MappedListingPhoto[] }) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string; roomType: string; isHero: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files)
      .filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type))
      .slice(0, Math.max(0, 50 - photos.length))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        roomType: inferRoomType(file.name),
        isHero: false,
      }));
    setPhotos((current) => [...current, ...next]);
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return setError("Add a listing title");
    if (!photos.length) return setError("Add at least one property photo");
    setSaving(true);
    setError("");
    try {
      await onCreate({ title, photos: autoOrganizeListingPhotos(photos) });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create listing");
      setSaving(false);
    }
  }

  return (
    <div className="create-listing-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="create-listing-modal" onSubmit={submit}>
        <button type="button" className="create-listing-close" aria-label="Close" onClick={onClose}>×</button>
        <p className="eyebrow">New listing</p>
        <h2>Add your photos.</h2>
        <p className="create-listing-lead">Upload the property photos and Homie will organize the rooms and tour route automatically.</p>
        <div className="create-listing-grid">
          <label className="wide">
            <span>Listing title *</span>
            <input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Oak Park Cottage" />
          </label>
        </div>
        <label className="create-listing-dropzone">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => {
              addPhotos(event.target.files);
              event.target.value = "";
            }}
          />
          <span>＋</span>
          <b>Add property photos</b>
          <small>JPG, PNG or WebP · up to 50 photos</small>
        </label>
        {photos.length > 0 && (
          <>
            <div className="create-listing-photo-head">
              <b>{photos.length} photo{photos.length === 1 ? "" : "s"}</b>
              <span>The first image becomes the cover</span>
            </div>
            <div className="create-listing-photos">
              {photos.map((photo, index) => (
                <div key={`${photo.file.name}-${index}`}>
                  <img src={photo.preview} alt="" />
                  {index === 0 && <span>Cover</span>}
                  <button type="button" aria-label={`Remove ${photo.file.name}`} onClick={() => removePhoto(index)}>×</button>
                </div>
              ))}
            </div>
          </>
        )}
        {error && <p className="create-listing-error" role="alert">{error}</p>}
        <div className="create-listing-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary" disabled={saving || !title.trim() || !photos.length}>
            {saving ? `Creating ${photos.length}-photo listing…` : "Create listing"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MyVideos({ items, search, statusFilter, formatFilter, loading, error, onBrowseTemplates, onOpenVideo, onDelete, flash }: { items: VideoItem[]; search: string; statusFilter: string; formatFilter: string; loading: boolean; error: string; onBrowseTemplates: () => void; onOpenVideo: (v: VideoItem) => void; onDelete: (id: number) => Promise<void>; flash: (message: string) => void }) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const q = search.trim().toLowerCase();
  const filteredItems = items.filter((video) => (!q || `${video.title} ${video.address} ${video.city} ${video.template}`.toLowerCase().includes(q)) && (statusFilter === "All" || video.status === statusFilter) && (formatFilter === "All" || video.format === formatFilter));
  function startCardPreview(card: HTMLElement) {
    const preview = card.querySelector("video");
    if (!preview) return;
    const playback = preview.play();
    if (playback) void playback.catch(() => undefined);
  }
  function stopCardPreview(card: HTMLElement) {
    const preview = card.querySelector("video");
    if (!preview) return;
    preview.pause();
    preview.currentTime = 0;
  }
  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = () => {
      setOpenMenuId(null);
      setConfirmDeleteId(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && closeMenu();
    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenuId]);
  return (
    <div className="page videos-page">
      <div className="page-intro intro-row">
        <div>
          <p className="eyebrow">Your projects</p>
          <h1>My videos.</h1>
          <p>Every home tour you've generated, in one place.</p>
        </div>
      </div>
      <div className="video-grid">
        {loading && (
          <article className="template-empty">
            <p className="eyebrow">Your projects</p>
            <h3>Loading your videos…</h3>
            <p>Fetching the latest generation status.</p>
          </article>
        )}
        {!loading && error && (
          <article className="template-empty">
            <p className="eyebrow">Could not load videos</p>
            <h3>Your projects are temporarily unavailable.</h3>
            <p>{error}</p>
          </article>
        )}
        {!loading &&
          !error &&
          filteredItems.map((video) => (
            <article className={`myvideo-card ${video.status === "Generating" ? "is-generating" : ""}`} key={video.id} onClick={() => onOpenVideo(video)} tabIndex={0} onMouseEnter={(event) => startCardPreview(event.currentTarget)} onMouseLeave={(event) => stopCardPreview(event.currentTarget)} onFocus={(event) => startCardPreview(event.currentTarget)} onBlur={(event) => stopCardPreview(event.currentTarget)} onKeyDown={(e) => e.key === "Enter" && onOpenVideo(video)}>
              {video.status === "Generating" ? (
                <div className="video-card-loading" aria-label={`${video.title} is generating`}>
                  <div className="video-generating-pill">
                    <span className="video-card-loader" aria-hidden="true" />
                    <b>Generating</b>
                  </div>
                </div>
              ) : video.videoUrl ? (
                <video src={video.videoUrl} poster={video.image} muted loop playsInline preload="metadata" aria-label={`${video.title} video preview`} />
              ) : <img src={video.image} alt={`${video.title} home tour`} />}
              {video.status !== "Generating" && video.status !== "Failed" && (
                <button className="play" aria-label={`Play ${video.title}`}>
                  ▶
                </button>
              )}
              {video.status !== "Generating" && <button
                className={`myvideo-more ${openMenuId === video.id ? "active" : ""}`}
                aria-label={`More options for ${video.title}`}
                aria-haspopup="menu"
                aria-expanded={openMenuId === video.id}
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmDeleteId(null);
                  setOpenMenuId((current) => (current === video.id ? null : video.id));
                }}
              >
                •••
              </button>}
              {video.status !== "Generating" && openMenuId === video.id && (
                <div className="listing-card-menu myvideo-card-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                  <p>{video.title}</p>
                  {confirmDeleteId === video.id ? (
                    <div className="listing-delete-confirm">
                      <b>Delete this video?</b>
                      <small>This removes the project and cannot be undone.</small>
                      <div>
                        <button onClick={() => setConfirmDeleteId(null)} disabled={deletingId === video.id}>Cancel</button>
                        <button className="danger" disabled={deletingId === video.id} onClick={async () => {
                          setDeletingId(video.id);
                          try {
                            await onDelete(video.id);
                            setOpenMenuId(null);
                            setConfirmDeleteId(null);
                          } catch (error) {
                            flash(error instanceof Error ? error.message : "Could not delete video");
                          } finally {
                            setDeletingId(null);
                          }
                        }}>{deletingId === video.id ? "Deleting…" : "Delete"}</button>
                      </div>
                    </div>
                  ) : <>
                    <button role="menuitem" onClick={() => { setOpenMenuId(null); onOpenVideo(video); }}>
                      <span><VideoActionIcon type="open" /></span><div><b>Open video</b><small>View and share this project</small></div>
                    </button>
                    {video.videoUrl && <button role="menuitem" onClick={() => {
                      const link = document.createElement("a");
                      link.href = video.videoUrl!;
                      link.download = `${video.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "homie-video"}.mp4`;
                      link.click();
                      setOpenMenuId(null);
                    }}>
                      <span><VideoActionIcon type="download" /></span><div><b>Download</b><small>Save the finished video</small></div>
                    </button>}
                    <button className="danger" role="menuitem" onClick={() => setConfirmDeleteId(video.id)}>
                      <span><VideoActionIcon type="delete" /></span><div><b>Delete video</b><small>Remove this project</small></div>
                    </button>
                  </>}
                </div>
              )}
            </article>
          ))}
        {!loading && !error && items.length === 0 && (
          <article className="template-empty">
            <p className="eyebrow">Your projects</p>
            <h3>No videos yet.</h3>
            <p>Choose a template and turn your first listing into a home tour.</p>
            <button onClick={onBrowseTemplates}>Browse templates →</button>
          </article>
        )}
        {!loading && !error && items.length > 0 && filteredItems.length === 0 && (
          <article className="template-empty">
            <p className="eyebrow">No matches</p>
            <h3>No videos fit these filters.</h3>
            <p>Try another status, format, or search term.</p>
          </article>
        )}
      </div>
    </div>
  );
}

function VideoModal({ video, onClose, flash }: { video: VideoItem; onClose: () => void; flash: (m: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const generating = video.status === "Generating";
  const failed = video.status === "Failed";
  const [playing, setPlaying] = useState(Boolean(video.videoUrl));
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(Number.parseFloat(video.duration) || 0);

  function togglePlayback() {
    const player = videoRef.current;
    if (!player) return;
    if (player.paused) {
      const playback = player.play();
      if (playback) void playback.catch(() => undefined);
    } else player.pause();
  }

  function seek(value: number) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value;
    setCurrentTime(value);
  }

  function toggleMute() {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  }

  async function toggleFullscreen() {
    const modal = videoRef.current?.closest(".template-preview-modal");
    if (!modal) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await modal.requestFullscreen();
  }

  function formatVideoTime(value: number) {
    if (!Number.isFinite(value)) return "0:00";
    return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, "0")}`;
  }

  function absoluteVideoUrl() {
    return video.videoUrl ? new URL(video.videoUrl, window.location.origin).toString() : "";
  }

  function downloadVideo() {
    const url = absoluteVideoUrl();
    if (!url) return flash("The video is not ready to download yet");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${video.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "homie-video"}.mp4`;
    link.click();
  }

  return (
    <div className="template-preview-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="template-preview-modal video-only my-video-preview" role="dialog" aria-modal="true" aria-label={`${video.title} video preview`}>
        <button className="template-preview-close" aria-label="Close video preview" onClick={onClose}>
          ×
        </button>
        <div className="template-preview-stage">
          {video.videoUrl && <button className="video-preview-download" onClick={downloadVideo} aria-label="Download video">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v11m-4-4 4 4 4-4M5 20h14" />
            </svg>
          </button>}
          {video.videoUrl ? (
            <video ref={videoRef} src={video.videoUrl} poster={video.image} autoPlay loop muted playsInline preload="metadata" aria-label={`${video.title} video`} onClick={togglePlayback} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} />
          ) : (
            <div className="my-video-preview-state">
              {generating && <span className="spinner" />}
              <b>{failed ? "Generation failed" : "Creating your video"}</b>
              <small>{failed ? video.error : `${video.stage ?? "Waiting for generation"} · ${video.progress}%`}</small>
            </div>
          )}
          {video.videoUrl && <div className="template-video-controls" aria-label="Video controls">
            <button onClick={togglePlayback} aria-label={playing ? "Pause video" : "Play video"}>{playing ? "Ⅱ" : "▶"}</button>
            <span>{formatVideoTime(currentTime)}</span>
            <input type="range" min="0" max={duration || 0} step="0.05" value={Math.min(currentTime, duration || 0)} onChange={(event) => seek(Number(event.target.value))} aria-label="Video progress" style={{ "--video-progress": `${duration ? (currentTime / duration) * 100 : 0}%` } as CSSProperties} />
            <span>{formatVideoTime(duration)}</span>
            <button onClick={toggleMute} aria-label={muted ? "Unmute video" : "Mute video"}>{muted ? "⌁" : "◖"}</button>
            <button onClick={() => void toggleFullscreen()} aria-label="Toggle fullscreen">⛶</button>
          </div>}
        </div>
      </section>
    </div>
  );
}

function SubscriptionIcon({ name }: { name: "video" | "home" | "publish" | "check" | "arrow" | "minus" }) {
  return (
    <svg className="subscription-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {name === "video" && <><rect x="3" y="4" width="18" height="16" rx="4" /><path d="m10 9 5 3-5 3Z" /></>}
      {name === "home" && <><path d="m3 10 9-7 9 7M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" /><path d="M9 21v-7h6v7" /></>}
      {name === "publish" && <><path d="M12 15V3m-4 4 4-4 4 4M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></>}
      {name === "check" && <path d="m5 12 4 4L19 6" />}
      {name === "arrow" && <path d="M4 12h16m-6-6 6 6-6 6" />}
      {name === "minus" && <path d="M6 12h12" />}
    </svg>
  );
}

function SubscribePage({ plans, subscription, creditBalance, onChoose, onManage }: { plans: BillingPlan[]; subscription: WorkspaceSubscription | null; creditBalance: number; onChoose: (plan: BillingPlan, billingInterval: "monthly" | "yearly") => Promise<void>; onManage: () => Promise<void> }) {
  const [planGroup, setPlanGroup] = useState<"individual" | "business">("individual");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const currentPlan = plans.find((plan) => plan.id === subscription?.planId) ?? plans.find((plan) => plan.slug === "free-trial") ?? null;
  const renewalDate = subscription?.currentPeriodEndsAt ?? subscription?.trialEndsAt;
  const statusLabel = subscription?.status === "trialing" ? "Trial active" : subscription?.status ? subscription.status.replace(/_/g, " ") : "Active";
  const visiblePlans = plans.filter((plan) => (planGroup === "business" ? plan.audience === "team" : plan.audience === "solo"));

  return (
    <div className="page subscribe-page">
      <section className="subscribe-heading">
        <div>
          <p className="eyebrow">Plans & subscription</p>
          <h1>Explore all plans.</h1>
          <p>Compare every plan side by side and pick the right fit.</p>
        </div>
      </section>

      <section className="subscribe-plans-section">
        <header>
          <div className="plan-group-tabs" aria-label="Plan type">
            <button className={planGroup === "individual" ? "active" : ""} onClick={() => setPlanGroup("individual")}>
              Individual plans
            </button>
            <button className={planGroup === "business" ? "active" : ""} onClick={() => setPlanGroup("business")}>
              Business plans
            </button>
          </div>
          <div className="billing-toggle" role="group" aria-label="Billing period">
            <button className={billingInterval === "monthly" ? "active" : ""} aria-pressed={billingInterval === "monthly"} onClick={() => setBillingInterval("monthly")}>Monthly</button>
            <button className={billingInterval === "yearly" ? "active" : ""} aria-pressed={billingInterval === "yearly"} onClick={() => setBillingInterval("yearly")}>Annual <small>Save 17%</small></button>
          </div>
        </header>
        {visiblePlans.length ? (
          <div className="subscribe-plan-grid">
            {visiblePlans.map((plan) => {
              const isCurrent = plan.id === currentPlan?.id;
              const featured = plan.slug === "pro";
              const firstVideo = plan.slug === "free-trial" || plan.slug === "first-video";
              const yearlyPrice = PUBLIC_ANNUAL_PRICES[plan.slug] ?? plan.yearlyPrice;
              const annual = billingInterval === "yearly" && !firstVideo && yearlyPrice != null;
              const price = firstVideo ? PUBLIC_PRICES["first-video"] : annual ? Math.round(yearlyPrice / 12) : PUBLIC_PRICES[plan.slug] ?? plan.monthlyPrice;
              const includedVideos = annual ? plan.monthlyCredits * 12 : plan.monthlyCredits;
              const displayName = firstVideo ? "First Video" : plan.name;
              return (
                <article className={`subscribe-plan-card ${featured ? "featured" : ""} ${isCurrent ? "current" : ""}`} key={plan.id}>
                  <div className="subscribe-plan-top">
                    <span>{plan.audience === "team" ? "For teams" : "For agents"}</span>
                    {isCurrent ? <b>Current plan</b> : featured ? <b>Recommended</b> : null}
                  </div>
                  <h3>{displayName}</h3>
                  <p>{firstVideo ? "Create your first property video for just $1." : plan.audience === "team" ? "A shared creative workflow for the whole office." : "Everything a solo agent needs to publish consistently."}</p>
                  <div className="subscribe-plan-credits">
                    <div>
                      <span><SubscriptionIcon name="video" /></span>
                      <strong>{firstVideo ? "1 first video" : `${includedVideos.toLocaleString()} video generations / ${annual ? "yr." : "mo."}`}</strong>
                    </div>
                    <p>{firstVideo ? "First-video introductory offer" : `Create ${includedVideos.toLocaleString()} complete listing tours ${annual ? "per year" : "per month"}`}</p>
                    <small><SubscriptionIcon name="check" /> Every new version uses one generation</small>
                  </div>
                  <div className="subscribe-price">
                    {price == null ? (
                      <>
                        <strong>Custom</strong>
                        <small>tailored to your team</small>
                      </>
                    ) : (
                      <>
                        <strong>
                          $
                          {price.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </strong>
                        <small>{firstVideo ? "for your first video" : annual ? `per month · $${yearlyPrice.toLocaleString("en-US")} billed yearly` : "per month"}</small>
                      </>
                    )}
                  </div>
                  <button disabled={busyPlan !== null || firstVideo} onClick={async () => {
                    setBusyPlan(plan.slug);
                    try { if (isCurrent) await onManage(); else await onChoose(plan, billingInterval); } finally { setBusyPlan(null); }
                  }}>
                    {firstVideo ? "$1 checkout coming soon" : busyPlan === plan.slug ? "Opening secure billing…" : isCurrent ? "Manage billing" : `Choose ${displayName}`}
                    {!isCurrent && <SubscriptionIcon name="arrow" />}
                  </button>
                  <section className="subscribe-benefit-panel">
                    <header>
                      <span><SubscriptionIcon name="home" /></span>
                      <b>Listing video workflow</b>
                    </header>
                    <ul>
                      {(firstVideo ? ["1 watermarked video", "All video templates", "Use your own property photos", "First-video introductory offer"] : plan.features).map((feature, featureIndex) => (
                        <li key={feature}>
                          <span><SubscriptionIcon name="check" /></span>
                          {annual && featureIndex === 0 ? `${includedVideos.toLocaleString()} video generations per year` : feature}
                        </li>
                      ))}
                      {plan.seatLimit && (
                        <li>
                          <span><SubscriptionIcon name="check" /></span>
                          {plan.seatLimit} {plan.seatLimit === 1 ? "seat" : "seats"} included
                        </li>
                      )}
                    </ul>
                  </section>
                  <section className="subscribe-benefit-panel secondary">
                    <header>
                      <span><SubscriptionIcon name="publish" /></span>
                      <b>Publishing & approval</b>
                    </header>
                    <ul>
                      <li>
                        <span><SubscriptionIcon name="check" /></span>Preview every tour before publishing
                      </li>
                      <li>
                        <span><SubscriptionIcon name="check" /></span>Vertical 9:16 social-ready export
                      </li>
                      <li>
                        <span><SubscriptionIcon name={plan.slug === "free-trial" ? "minus" : "check"} /></span>
                        {plan.slug === "free-trial" ? "Priority generation on paid plans" : "Priority generation queue"}
                      </li>
                    </ul>
                  </section>
                  <footer className="subscribe-plan-footer">
                    <span>
                      <i />
                      {firstVideo ? "First video only · not a subscription" : isCurrent ? statusLabel : annual ? "Two months free · billed annually" : plan.audience === "team" ? "Built for teams" : "Cancel or change anytime"}
                    </span>
                    {isCurrent && (
                      <small>
                        {creditBalance} video generations available
                        {renewalDate ? ` · ${subscription?.status === "trialing" ? "Trial ends" : "Renews"} ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(renewalDate))}` : ""}
                      </small>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="subscribe-loading">
            <span />
            <span />
            <span />
          </div>
        )}
      </section>
    </div>
  );
}

const creditBundles = [
  { credits: 600, videos: 10, price: 80, label: "Best value" },
  { credits: 300, videos: 5, price: 45, label: "Most popular" },
  { credits: 180, videos: 3, price: 30, label: "" },
  { credits: 60, videos: 1, price: 12, label: "" },
];

function TopUpCreditsModal({ currentCredits, onClose, onUpgrade, onPurchase }: { currentCredits: number; onClose: () => void; onUpgrade: () => void; onPurchase: (credits: number) => void }) {
  const [selectedCredits, setSelectedCredits] = useState(300);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="topup-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="topup-modal" role="dialog" aria-modal="true" aria-labelledby="topup-title">
        <button className="topup-close" aria-label="Close top up credits" onClick={onClose}>
          ×
        </button>
        <div className="topup-switch" role="tablist">
          <button role="tab" aria-selected="false" onClick={onUpgrade}>
            Upgrade plan
          </button>
          <button className="active" role="tab" aria-selected="true">
            Top up credits
          </button>
        </div>
        <header>
          <p className="eyebrow">One-time credit packs</p>
          <h2 id="topup-title">Create more, whenever you need.</h2>
          <p>
            Add extra credits without changing your monthly plan. Your current balance is <b>{currentCredits} credits</b>.
          </p>
        </header>
        <div className="topup-bundles">
          {creditBundles.map((bundle) => {
            const selected = selectedCredits === bundle.credits;
            return (
              <article className={`${selected ? "selected" : ""} ${bundle.label === "Most popular" ? "popular" : ""}`} key={bundle.credits} onClick={() => setSelectedCredits(bundle.credits)}>
                <button className="topup-bundle-select" aria-label={`Select ${bundle.credits} credits`} aria-pressed={selected}>
                  <i />
                </button>
                <div className="topup-bundle-copy">
                  <div>
                    <h3>{bundle.credits.toLocaleString()} credits</h3>
                    {bundle.label && <span>{bundle.label}</span>}
                  </div>
                  <p>
                    Up to {bundle.videos} complete {bundle.videos === 1 ? "listing video" : "listing videos"}
                  </p>
                  <small>Credits never replace your monthly allowance</small>
                </div>
                <div className="topup-bundle-price">
                  <strong>${bundle.price}</strong>
                  <small>${(bundle.price / bundle.videos).toFixed(0)} per video</small>
                </div>
                <button
                  className="topup-purchase"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedCredits(bundle.credits);
                    onPurchase(bundle.credits);
                  }}
                >
                  Purchase <span>→</span>
                </button>
              </article>
            );
          })}
        </div>
        <footer>
          <span>Secure one-time purchase</span>
          <p>Credits are added to your workspace immediately after payment.</p>
        </footer>
      </section>
    </div>
  );
}

type ProfileDetails = {
  email: string;
  displayName: string;
  bio: string;
  phone: string;
  jobTitle: string;
  companyName: string;
};
type SettingsSection = "profile" | "preferences" | "billing" | "security" | "storage";

function SettingsSectionIcon({ section }: { section: SettingsSection }) {
  const paths: Record<SettingsSection, ReactNode> = {
    profile: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M6 19c.6-3 2.6-5 6-5s5.4 2 6 5" />
      </>
    ),
    preferences: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19" />
      </>
    ),
    billing: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18M7 15h4" />
      </>
    ),
    security: (
      <>
        <path d="M6 10V7a6 6 0 0 1 12 0v3" />
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M12 14v3" />
      </>
    ),
    storage: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {paths[section]}
    </svg>
  );
}

function SettingsModal({ details, onChange, onSave, saving, theme, onThemeChange, credits, onPasswordChange, onClose, flash }: { details: ProfileDetails; onChange: (details: ProfileDetails) => void; onSave: () => Promise<void>; saving: boolean; theme: "dark" | "light"; onThemeChange: (theme: "dark" | "light") => void; credits: number; onPasswordChange: (password: string) => Promise<void>; onClose: () => void; flash: (message: string) => void }) {
  const [section, setSection] = useState<SettingsSection>("profile");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const names = details.displayName.trim().split(/\s+/);
  const firstName = names[0] ?? "";
  const lastName = names.slice(1).join(" ");
  const initials =
    details.displayName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "H";

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

  const sections: { id: SettingsSection; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "preferences", label: "Preferences" },
    { id: "billing", label: "Billing" },
    { id: "security", label: "Security" },
    { id: "storage", label: "Storage" },
  ];

  return (
    <div className="settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
        <aside className="settings-nav">
          <div className="settings-nav-head">
            <p className="eyebrow">Workspace</p>
            <b>Settings</b>
          </div>
          {sections.map((item) => (
            <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}>
              <span>
                <SettingsSectionIcon section={item.id} />
              </span>
              {item.label}
            </button>
          ))}
        </aside>
        <div className="settings-content">
          <button className="settings-close" aria-label="Close settings" onClick={onClose}>
            ×
          </button>

          {section === "profile" && (
            <div className="settings-section">
              <h2>Profile</h2>
              <p className="settings-lead">Your name, photo and identity across Homie.</p>
              <div className="settings-avatar-row">
                <div className="settings-avatar">{initials}</div>
                <div>
                  <b>Profile Photo</b>
                  <small>Click to upload (max 5MB)</small>
                </div>
                <button onClick={() => flash("Profile photo upload is coming next")}>Upload →</button>
              </div>
              <div className="settings-field">
                <label>Display name</label>
                <input value={details.displayName} onChange={(event) => onChange({ ...details, displayName: event.target.value })} placeholder="Your name" />
              </div>
              <div className="settings-field-row">
                <div className="settings-field">
                  <label>First name</label>
                  <input value={firstName} onChange={(event) => updateName(event.target.value, lastName)} />
                </div>
                <div className="settings-field">
                  <label>Last name</label>
                  <input value={lastName} onChange={(event) => updateName(firstName, event.target.value)} />
                </div>
              </div>
              <div className="settings-field">
                <label>Email</label>
                <input value={details.email} readOnly />
                <small>Email cannot be changed</small>
              </div>
              <div className="settings-field">
                <label>Bio</label>
                <textarea value={details.bio} onChange={(event) => onChange({ ...details, bio: event.target.value })} maxLength={280} rows={3} />
              </div>
              <div className="settings-actions">
                <button onClick={() => void onSave()} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          )}

          {section === "preferences" && (
            <div className="settings-section">
              <h2>Preferences</h2>
              <p className="settings-lead">Appearance and language — how Homie feels for you.</p>
              <div className="settings-option">
                <div>
                  <b>Appearance</b>
                  <small>Switch between light and dark theme</small>
                </div>
                <div className="theme-choice">
                  <button className={theme === "light" ? "active" : ""} onClick={() => onThemeChange("light")} aria-label="Light mode">
                    ☼
                  </button>
                  <button className={theme === "dark" ? "active" : ""} onClick={() => onThemeChange("dark")} aria-label="Dark mode">
                    ◐
                  </button>
                </div>
              </div>
              <div className="settings-option">
                <div>
                  <b>Language</b>
                  <small>Choose your interface language</small>
                </div>
                <div className="language-choice">
                  <button className="active">EN</button>
                  <button onClick={() => flash("More languages are coming soon")}>HE</button>
                </div>
              </div>
            </div>
          )}

          {section === "billing" && (
            <div className="settings-section">
              <h2>Billing</h2>
              <p className="settings-lead">Your subscription and what is left this cycle.</p>
              <div className="billing-card">
                <div>
                  <p className="eyebrow">Current plan</p>
                  <h3>
                    Free Trial<span>.</span>
                  </h3>
                  <small>
                    {credits} video {credits === 1 ? "generation" : "generations"} remaining
                  </small>
                </div>
                <button onClick={() => flash("Plans opened")}>Upgrade →</button>
              </div>
            </div>
          )}

          {section === "security" && (
            <div className="settings-section">
              <h2>Security</h2>
              <p className="settings-lead">Password and connected accounts.</p>
              <div className="security-block">
                <div>
                  <b>Change password</b>
                  <small>Use at least 6 characters</small>
                </div>
                <div className="password-fields">
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" />
                  <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" />
                  <button onClick={() => void submitPassword()} disabled={changingPassword}>
                    {changingPassword ? "Saving…" : "Update →"}
                  </button>
                </div>
              </div>
              <div className="settings-option">
                <div>
                  <b>Email</b>
                  <small>{details.email}</small>
                </div>
                <span className="connected-label">✓ Connected</span>
              </div>
            </div>
          )}

          {section === "storage" && (
            <div className="settings-section">
              <h2>Storage</h2>
              <p className="settings-lead">Used and remaining space for your listing media.</p>
              <div className="storage-heading">
                <div>
                  <b>0</b>
                  <span>GB of 5 GB</span>
                </div>
                <small>0%</small>
              </div>
              <div className="storage-bar">
                <i />
              </div>
              <p className="storage-note">Free plan · Uploaded listing photos and generated videos will appear here.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProfilePage({ details, onChange, onSave, saving, favoriteCount, videoCount }: { details: ProfileDetails; onChange: (details: ProfileDetails) => void; onSave: () => Promise<void>; saving: boolean; favoriteCount: number; videoCount: number }) {
  const initials =
    details.displayName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "H";
  const update = (field: keyof ProfileDetails, value: string) => onChange({ ...details, [field]: value });

  return (
    <div className="page profile-page">
      <section className="profile-cover">
        <div className="profile-cover-pattern" />
        <div className="profile-avatar-large" aria-label={`${details.displayName || "Homie agent"} avatar`}>
          {initials}
        </div>
      </section>

      <section className="profile-heading">
        <div>
          <p className="eyebrow">Agent profile</p>
          <h1>{details.displayName || "Your profile"}.</h1>
          <p>
            {details.jobTitle || "Real estate agent"}
            {details.companyName ? ` · ${details.companyName}` : ""}
          </p>
        </div>
        <button className="profile-save-top" onClick={() => void onSave()} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </section>

      <div className="profile-layout">
        <section className="profile-form-card">
          <div className="profile-section-title">
            <div>
              <p className="eyebrow">Personal details</p>
              <h2>About you</h2>
            </div>
            <span>Visible to your workspace</span>
          </div>
          <div className="profile-form-grid">
            <label>
              <span>Display name</span>
              <input value={details.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder="Your name" maxLength={120} />
            </label>
            <label>
              <span>Email address</span>
              <input value={details.email} readOnly aria-readonly="true" />
            </label>
            <label>
              <span>Job title</span>
              <input value={details.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} placeholder="Real estate agent" maxLength={100} />
            </label>
            <label>
              <span>Company</span>
              <input value={details.companyName} onChange={(event) => update("companyName", event.target.value)} placeholder="Your brokerage or office" maxLength={120} />
            </label>
            <label>
              <span>Phone</span>
              <input type="tel" value={details.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+1 555 000 0000" />
            </label>
            <label className="profile-bio">
              <span>
                Bio <small>{details.bio.length}/280</small>
              </span>
              <textarea value={details.bio} onChange={(event) => update("bio", event.target.value)} placeholder="Tell your team a little about yourself and the homes you represent." maxLength={280} rows={5} />
            </label>
          </div>
          <div className="profile-form-actions">
            <button onClick={() => void onSave()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </section>

        <aside className="profile-side-card">
          <p className="eyebrow">Your Homie</p>
          <h2>Workspace activity</h2>
          <div className="profile-stats">
            <span>
              <b>{videoCount}</b>
              <small>Videos</small>
            </span>
            <span>
              <b>{favoriteCount}</b>
              <small>Favorites</small>
            </span>
          </div>
          <div className="profile-completion">
            <div>
              <b>Profile strength</b>
              <small>{details.displayName && details.bio && details.jobTitle ? "Complete" : "Add more details"}</small>
            </div>
            <span>{details.displayName && details.bio && details.jobTitle ? "100%" : "60%"}</span>
          </div>
          <div className="profile-progress">
            <i
              style={{
                width: details.displayName && details.bio && details.jobTitle ? "100%" : "60%",
              }}
            />
          </div>
          <p className="profile-tip">A complete profile helps office teams recognize who created and approved each home tour.</p>
        </aside>
      </div>
    </div>
  );
}

function Integrations({ search, availability }: { search: string; availability: string }) {
  const q = search.trim().toLowerCase();
  const integrations = [
    {
      name: "Zillow",
      image: "/integrations/zillow-logo.jpeg",
      description: "Automatic sync from your public Zillow profile is coming soon.",
      status: "Coming soon",
    },
    {
      name: "Airbnb",
      image: "/integrations/airbnb-logo.webp",
      description: "Automatic sync from your public Airbnb host profile is coming soon.",
      status: "Coming soon",
    },
    {
      name: "Booking.com",
      image: "/integrations/booking-logo.png",
      description: "Automatic sync from your Booking.com property account is coming soon.",
      status: "Coming soon",
    },
    {
      name: "Realtor.com",
      image: "/integrations/realtor-logo.png",
      description: "Automatic sync from your Realtor.com listings profile is coming soon.",
      status: "Coming soon",
    },
  ].filter((item) => (!q || `${item.name} ${item.description}`.toLowerCase().includes(q)) && (availability === "All" || item.status === availability));
  return (
    <div className="page integrations-page">
      <div className="page-intro intro-row">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Integrations.</h1>
          <p>Connect your listing sources to import properties automatically.</p>
        </div>
        <span className="sources-count">0/4 SOURCES</span>
      </div>

      <div className="panel-heading standalone">
        <p className="eyebrow">Platforms</p>
      </div>
      <div className="integrations-grid">
        {integrations.map((item) => (
          <article className="integration-card soon disabled" key={item.name}>
            <span className="soon-badge">Soon</span>
            <span className="source-icon">
              <img src={item.image} alt={`${item.name} logo`} />
            </span>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <small className="sync-time">Not available yet</small>
            <div className="card-actions">
              <button disabled>Use</button>
            </div>
          </article>
        ))}
        {!integrations.length && (
          <article className="search-empty">
            <SearchIcon />
            <h2>No integrations found.</h2>
            <p>Try another provider or availability filter.</p>
          </article>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.2" y2="16.2" />
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="14" height="14" rx="2.5" />
      <path d="m17 10 4-2v8l-4-2" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function ListingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function IntegrationsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v5M16 3v5" />
      <path d="M6 8h12v3a6 6 0 0 1-12 0V8Z" />
      <path d="M12 17v4" />
    </svg>
  );
}

function SubscribeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h14v12H5z" />
      <path d="m5 8 7 5 7-5M8 4h8" />
    </svg>
  );
}

function CreditsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={open ? "m6 9 6 6 6-6" : "m9 6 6 6-6 6"} />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="12" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H20a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2-2.4 3.7" />
      <line x1="12" y1="17" x2="12" y2="17.1" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
