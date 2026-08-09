import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function requiredConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const hasDataKey = process.env.HASDATA_API_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase server configuration is missing");
  if (!hasDataKey) throw new Error("HasData is not configured. Set HASDATA_API_KEY.");
  return { supabaseUrl, supabaseKey, hasDataKey };
}

function validZillowUrl(value: string, kind: "profile" | "property") {
  try {
    const url = new URL(value);
    const validHost = url.hostname === "zillow.com" || url.hostname.endsWith(".zillow.com");
    if (!validHost || url.protocol !== "https:") return null;
    if (kind === "property" && !url.pathname.includes("/homedetails/")) return null;
    if (kind === "profile" && url.pathname.includes("/homedetails/")) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function discoverPropertyUrls(payload: unknown) {
  const source = JSON.stringify(payload)
    .replaceAll("\\u002F", "/")
    .replaceAll("\\/", "/");
  const matches = source.match(/(?:https:\/\/(?:www\.)?zillow\.com)?\/homedetails\/[A-Za-z0-9%._~!$&'()*+,;=:@/-]+/g) ?? [];
  const urls = new Set<string>();
  for (const match of matches) {
    const absolute = match.startsWith("http") ? match : `https://www.zillow.com${match}`;
    const zpidEnd = absolute.match(/\/\d+_zpid\/?/i);
    const normalized = zpidEnd ? absolute.slice(0, (zpidEnd.index ?? 0) + zpidEnd[0].length) : absolute;
    const valid = validZillowUrl(normalized, "property");
    if (valid) urls.add(valid);
    if (urls.size >= 50) break;
  }
  return [...urls];
}

function labelFromPropertyUrl(value: string) {
  const parts = new URL(value).pathname.split("/").filter(Boolean);
  const slug = parts[1] ?? "Zillow listing";
  return decodeURIComponent(slug).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function objectAt(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as JsonObject)[key] : undefined, value);
}

function first(value: unknown, paths: string[]) {
  for (const path of paths) {
    const candidate = objectAt(value, path);
    if (candidate !== undefined && candidate !== null && candidate !== "") return candidate;
  }
  return null;
}

function photoUrls(value: unknown) {
  const candidates = first(value, ["property.photos", "property.responsivePhotos", "responsivePhotos", "photos", "images", "data.responsivePhotos", "data.photos"]);
  if (!Array.isArray(candidates)) {
    const cover = first(value, ["property.image", "image", "data.image"]);
    return typeof cover === "string" && /^https:\/\//.test(cover) ? [cover] : [];
  }
  const urls = candidates.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (!item || typeof item !== "object") return [];
    const photo = item as JsonObject;
    const mixed = photo.mixedSources as JsonObject | undefined;
    const jpeg = Array.isArray(mixed?.jpeg) ? mixed.jpeg : [];
    const webp = Array.isArray(mixed?.webp) ? mixed.webp : [];
    const largest = [...jpeg, ...webp]
      .filter((source): source is JsonObject => Boolean(source && typeof source === "object"))
      .sort((a, b) => Number(b.width ?? 0) - Number(a.width ?? 0))[0];
    return [largest?.url, photo.url, photo.href].filter((url): url is string => typeof url === "string");
  });
  return [...new Set(urls.filter((url) => /^https:\/\//.test(url)))];
}

function mapStatus(value: unknown) {
  const status = String(value ?? "").toLowerCase();
  if (status.includes("sale") || status.includes("active") || status.includes("coming")) return "active";
  if (status.includes("pending")) return "pending";
  if (status.includes("sold") || status.includes("off")) return "off_market";
  return "inactive";
}

async function hasDataRequest(key: string, endpoint: string, init: RequestInit, attempts = 1) {
  let lastError = "HasData request failed";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(`https://api.hasdata.com${endpoint}`, {
      ...init,
      headers: { "Content-Type": "application/json", "x-api-key": key, ...(init.headers ?? {}) },
      cache: "no-store",
    });
    if (response.ok) return response.json() as Promise<unknown>;
    const detail = (await response.text()).slice(0, 500);
    lastError = `HasData request failed (${response.status})${detail ? `: ${detail}` : ""}`;
    const retryable = [400, 408, 429, 500, 502, 503].includes(response.status);
    if (!retryable || attempt === attempts) break;
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
  throw new Error(lastError);
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
    const body = await request.json() as { action?: "discover" | "import" | "disconnect"; workspaceId?: string; profileUrl?: string; listingUrls?: string[]; rightsConfirmed?: boolean };
    if (!body.action || !body.workspaceId) return json({ error: "action and workspaceId are required" }, 400);

    const config = requiredConfig();
    const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser(authorization.slice(7));
    if (userError || !user) return json({ error: "Invalid session" }, 401);
    const { data: membership } = await supabase.from("workspace_members").select("role").eq("workspace_id", body.workspaceId).eq("user_id", user.id).maybeSingle();
    if (!membership) return json({ error: "Workspace access required" }, 403);

    const { data: integration } = await supabase.from("integrations").select("*").eq("workspace_id", body.workspaceId).eq("provider", "zillow").limit(1).maybeSingle();
    if (body.action === "disconnect") {
      if (integration) await supabase.from("integrations").update({ status: "disconnected", last_error: null }).eq("id", integration.id);
      return json({ integration: integration ? { ...integration, status: "disconnected" } : null });
    }

    const profileUrl = validZillowUrl(body.profileUrl ?? "", "profile");
    if (!profileUrl) return json({ error: "Enter a valid public Zillow profile URL" }, 400);

    if (body.action === "discover") {
      const page = await hasDataRequest(config.hasDataKey, "/scrape/web", {
        method: "POST",
        body: JSON.stringify({
          url: profileUrl,
          outputFormat: ["json", "html"],
          extractLinks: true,
          proxyType: "residential",
          proxyCountry: "US",
          jsRendering: true,
          wait: 3000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: "https://www.zillow.com/",
          },
        }),
      });
      const scrapedText = JSON.stringify(page);
      if (/access to this page has been denied|verify you are human|captcha/i.test(scrapedText)) {
        return json({ profileUrl, listings: [], discoveryBlocked: true, message: "Zillow blocked automatic profile discovery. Paste the Zillow property links you want to import." });
      }
      const urls = discoverPropertyUrls(page);
      return json({ profileUrl, listings: urls.map((url) => ({ url, label: labelFromPropertyUrl(url) })) });
    }

    if (!body.rightsConfirmed) return json({ error: "You must confirm that you are authorized to use the listing media" }, 400);
    const listingUrls = [...new Set(body.listingUrls ?? [])].map((url) => validZillowUrl(url, "property")).filter((url): url is string => Boolean(url));
    if (!listingUrls.length || listingUrls.length > 20) return json({ error: "Select between 1 and 20 valid Zillow listings" }, 400);

    let currentIntegration = integration;
    const integrationValues = {
      status: "syncing",
      external_account_id: profileUrl,
      external_account_name: new URL(profileUrl).pathname.split("/").filter(Boolean).pop() ?? "Zillow profile",
      connected_by: user.id,
      metadata: { source: "hasdata", profile_url: profileUrl },
      last_error: null,
    };
    if (currentIntegration) {
      const { data, error } = await supabase.from("integrations").update(integrationValues).eq("id", currentIntegration.id).select().single();
      if (error) throw error;
      currentIntegration = data;
    } else {
      const { data, error } = await supabase.from("integrations").insert({ workspace_id: body.workspaceId, provider: "zillow", ...integrationValues }).select().single();
      if (error) throw error;
      currentIntegration = data;
    }

    try {
      let imported = 0;
      const failed: { url: string; error: string }[] = [];
      for (const propertyUrl of listingUrls) {
        try {
        const query = new URLSearchParams({ url: propertyUrl });
        const property = await hasDataRequest(config.hasDataKey, `/scrape/zillow/property?${query}`, { method: "GET" }, 3);
        const zpid = String(first(property, ["property.id", "property.zpid", "zpid", "data.zpid"]) ?? propertyUrl.match(/\/(\d+)_zpid/)?.[1] ?? "");
        const street = String(first(property, ["property.address.street", "property.address.addressRaw", "streetAddress", "address.streetAddress", "data.streetAddress", "property.streetAddress"]) ?? labelFromPropertyUrl(propertyUrl));
        const city = String(first(property, ["property.address.city", "city", "address.city", "data.city", "property.city"]) ?? "Unknown");
        const state = first(property, ["property.address.state", "state", "address.state", "stateOrProvince", "data.state", "property.state"]);
        const postal = first(property, ["property.address.zipcode", "zipcode", "address.zipcode", "postalCode", "data.zipcode"]);
        const photos = photoUrls(property);
        const now = new Date().toISOString();
        const { data: listing, error: listingError } = await supabase.from("listings").upsert({
          workspace_id: body.workspaceId,
          integration_id: currentIntegration.id,
          external_listing_id: zpid || propertyUrl,
          source: "zillow",
          status: mapStatus(first(property, ["property.status", "property.trueStatus", "homeStatus", "status", "data.homeStatus"])),
          address_line1: street,
          city,
          region: state == null ? null : String(state),
          postal_code: postal == null ? null : String(postal),
          country_code: "US",
          price: first(property, ["property.price", "price", "listPrice", "data.price"]),
          bedrooms: first(property, ["property.beds", "bedrooms", "beds", "data.bedrooms"]),
          bathrooms: first(property, ["property.baths", "bathrooms", "baths", "data.bathrooms"]),
          square_feet: Number(first(property, ["property.area.livingArea", "livingArea", "livingAreaValue", "data.livingArea"]) ?? 0) > 0
            ? Math.round(Number(first(property, ["property.area.livingArea", "livingArea", "livingAreaValue", "data.livingArea"])))
            : null,
          listing_url: propertyUrl,
          description: first(property, ["property.description", "description", "publicRemarks", "data.description"]),
          cover_photo_url: photos[0] ?? null,
          raw_data: property,
          last_synced_at: now,
        }, { onConflict: "workspace_id,source,external_listing_id" }).select("id").single();
        if (listingError) throw listingError;
        const { error: deleteError } = await supabase.from("listing_photos").delete().eq("listing_id", listing.id);
        if (deleteError) throw deleteError;
        if (photos.length) {
          const { error: photosError } = await supabase.from("listing_photos").insert(photos.slice(0, 50).map((url, index) => ({ listing_id: listing.id, source_url: url, thumbnail_url: url, sort_order: index, metadata: { imported_from: propertyUrl } })));
          if (photosError) throw photosError;
        }
        imported += 1;
        } catch (propertyError) {
          failed.push({ url: propertyUrl, error: propertyError instanceof Error ? propertyError.message : "Import failed" });
        }
      }
      if (!imported) throw new Error(failed[0]?.error ?? "No listings could be imported");
      const now = new Date().toISOString();
      const { data: connected, error } = await supabase.from("integrations").update({ status: "connected", last_synced_at: now, last_error: failed.length ? `${failed.length} listing imports failed` : null }).eq("id", currentIntegration.id).select().single();
      if (error) throw error;
      return json({ integration: connected, imported, failed });
    } catch (importError) {
      await supabase.from("integrations").update({ status: "error", last_error: importError instanceof Error ? importError.message.slice(0, 1000) : "Import failed" }).eq("id", currentIntegration.id);
      throw importError;
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Zillow import failed" }, 500);
  }
}
