import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function json(body: unknown, status = 200) { return Response.json(body, { status }); }

function validAirbnbUrl(value: string, kind: "profile" | "property") {
  try {
    const url = new URL(value);
    const validHost = url.hostname === "airbnb.com" || url.hostname.endsWith(".airbnb.com");
    if (!validHost || url.protocol !== "https:") return null;
    const isRoom = /^\/rooms\/\d+/.test(url.pathname);
    if ((kind === "property" && !isRoom) || (kind === "profile" && isRoom)) return null;
    url.search = ""; url.hash = "";
    return url.toString();
  } catch { return null; }
}

function discoverRoomUrls(payload: unknown) {
  const source = JSON.stringify(payload).replaceAll("\\u002F", "/").replaceAll("\\/", "/");
  const matches = source.match(/(?:https:\/\/(?:www\.)?airbnb\.com)?\/rooms\/\d+/g) ?? [];
  return [...new Set(matches.map((match) => validAirbnbUrl(match.startsWith("http") ? match : `https://www.airbnb.com${match}`, "property")).filter((url): url is string => Boolean(url)))].slice(0, 50);
}

async function hasData(key: string, endpoint: string, init: RequestInit) {
  const response = await fetch(`https://api.hasdata.com${endpoint}`, { ...init, headers: { "Content-Type": "application/json", "x-api-key": key, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!response.ok) throw new Error(`HasData request failed (${response.status}): ${(await response.text()).slice(0, 400)}`);
  return response.json() as Promise<Record<string, unknown>>;
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
    const body = await request.json() as { action?: "discover" | "import" | "disconnect"; workspaceId?: string; profileUrl?: string; listingUrls?: string[]; rightsConfirmed?: boolean };
    if (!body.action || !body.workspaceId) return json({ error: "action and workspaceId are required" }, 400);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const apiKey = process.env.HASDATA_API_KEY;
    if (!supabaseUrl || !supabaseKey || !apiKey) throw new Error("HasData or Supabase server configuration is missing");
    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user } } = await supabase.auth.getUser(authorization.slice(7));
    if (!user) return json({ error: "Invalid session" }, 401);
    const { data: membership } = await supabase.from("workspace_members").select("role").eq("workspace_id", body.workspaceId).eq("user_id", user.id).maybeSingle();
    if (!membership) return json({ error: "Workspace access required" }, 403);
    const { data: existing } = await supabase.from("integrations").select("*").eq("workspace_id", body.workspaceId).eq("provider", "airbnb").limit(1).maybeSingle();
    if (body.action === "disconnect") {
      if (existing) await supabase.from("integrations").update({ status: "disconnected", last_error: null }).eq("id", existing.id);
      return json({ integration: existing ? { ...existing, status: "disconnected" } : null });
    }
    const profileUrl = validAirbnbUrl(body.profileUrl ?? "", "profile");
    if (!profileUrl) return json({ error: "Enter a valid public Airbnb host or profile URL" }, 400);
    if (body.action === "discover") {
      const page = await hasData(apiKey, "/scrape/web", { method: "POST", body: JSON.stringify({ url: profileUrl, outputFormat: ["json", "html"], extractLinks: true, proxyType: "residential", proxyCountry: "US", jsRendering: true, wait: 3000 }) });
      const urls = discoverRoomUrls(page);
      const blocked = /access denied|verify you are human|captcha|robot/i.test(JSON.stringify(page));
      return json({ profileUrl, listings: urls.map((url) => ({ url, label: `Airbnb ${url.match(/\/rooms\/(\d+)/)?.[1] ?? "listing"}` })), discoveryBlocked: blocked || !urls.length, message: blocked ? "Airbnb blocked automatic profile discovery. Paste your Airbnb property links." : !urls.length ? "No room links were visible on this profile. Paste your Airbnb property links." : undefined });
    }
    if (!body.rightsConfirmed) return json({ error: "You must confirm that you are authorized to use the listing media" }, 400);
    const urls = [...new Set(body.listingUrls ?? [])].map((url) => validAirbnbUrl(url, "property")).filter((url): url is string => Boolean(url));
    if (!urls.length || urls.length > 20) return json({ error: "Select between 1 and 20 valid Airbnb listings" }, 400);
    const values = { status: "syncing", external_account_id: profileUrl, external_account_name: new URL(profileUrl).pathname.split("/").filter(Boolean).pop() ?? "Airbnb host", connected_by: user.id, metadata: { source: "hasdata", profile_url: profileUrl }, last_error: null };
    const integrationResult = existing
      ? await supabase.from("integrations").update(values).eq("id", existing.id).select().single()
      : await supabase.from("integrations").insert({ workspace_id: body.workspaceId, provider: "airbnb", ...values }).select().single();
    if (integrationResult.error) throw integrationResult.error;
    const integration = integrationResult.data;
    try {
      let imported = 0;
      for (const listingUrl of urls) {
        const propertyResponse = await hasData(apiKey, `/scrape/airbnb/property?${new URLSearchParams({ url: listingUrl })}`, { method: "GET" });
        const property = (propertyResponse.property ?? propertyResponse) as Record<string, unknown>;
        const id = String(property.id ?? listingUrl.match(/\/rooms\/(\d+)/)?.[1] ?? listingUrl);
        const title = String(property.title ?? `Airbnb ${id}`);
        const location = String(property.address ?? "Location unavailable");
        const locationParts = location.split(",").map((part) => part.trim());
        const overview = Array.isArray(property.overview) ? property.overview.map(String) : [];
        const photos = Array.isArray(property.photos) ? [...new Set(property.photos.filter((url): url is string => typeof url === "string" && /^https:\/\//.test(url)))] : [];
        const bedrooms = Number(overview.find((item) => /bedroom/i.test(item))?.match(/[\d.]+/)?.[0] ?? 0) || null;
        const bathrooms = Number(overview.find((item) => /bath/i.test(item))?.match(/[\d.]+/)?.[0] ?? 0) || null;
        const now = new Date().toISOString();
        const { data: listing, error } = await supabase.from("listings").upsert({ workspace_id: body.workspaceId, integration_id: integration.id, external_listing_id: id, source: "airbnb", status: "active", address_line1: title, city: locationParts[0] || location, region: locationParts.slice(1).join(", ") || null, country_code: "US", bedrooms, bathrooms, listing_url: listingUrl, description: property.description ?? null, cover_photo_url: photos[0] ?? property.image ?? null, raw_data: propertyResponse, last_synced_at: now }, { onConflict: "workspace_id,source,external_listing_id" }).select("id").single();
        if (error) throw error;
        const { error: deleteError } = await supabase.from("listing_photos").delete().eq("listing_id", listing.id);
        if (deleteError) throw deleteError;
        if (photos.length) {
          const { error: photoError } = await supabase.from("listing_photos").insert(photos.slice(0, 50).map((url, index) => ({ listing_id: listing.id, source_url: url, thumbnail_url: url, sort_order: index, metadata: { imported_from: listingUrl } })));
          if (photoError) throw photoError;
        }
        imported += 1;
      }
      const { data: connected, error } = await supabase.from("integrations").update({ status: "connected", last_synced_at: new Date().toISOString(), last_error: null }).eq("id", integration.id).select().single();
      if (error) throw error;
      return json({ integration: connected, imported });
    } catch (importError) {
      await supabase.from("integrations").update({ status: "error", last_error: importError instanceof Error ? importError.message.slice(0, 1000) : "Import failed" }).eq("id", integration.id);
      throw importError;
    }
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Airbnb import failed" }, 500); }
}
