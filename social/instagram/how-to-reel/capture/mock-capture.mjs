// Captures real Homie app screens from the local dev server, with Supabase answered by demo data.
// Usage: NODE_PATH=/opt/node-tools/node_modules node mock-capture.mjs <out-dir> <shot> [shot...]
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");
const ROOT = resolve(import.meta.dirname, "../../../..");
const APP = process.env.APP ?? "http://localhost:3100";
const [, , outDir, ...shots] = process.argv;
mkdirSync(outDir, { recursive: true });
const catalog = JSON.parse(readFileSync(join(import.meta.dirname, "catalog.json"), "utf8"));
const local = {
  "prompt%20twelve%20spin%20tour/preview-web.mp4": "prompt twelve spin tour/preview-web.mp4",
  "prompt%20twelve%20spin%20tour/thumbnail-web.jpg": "prompt twelve spin tour/thumbnail-web.jpg",
  "prompt%20eleven%20grand%20entrance/preview-web.mp4": "prompt eleven grand entrance/preview-web.mp4",
  "prompt%20eleven%20grand%20entrance/thumbnail-web.jpg": "prompt eleven grand entrance/thumbnail-web.jpg",
  "prompt%20ten%20lights%20on/preview-web.mp4": "prompt ten lights on/preview-web.mp4",
  "prompt%20ten%20lights%20on/thumbnail-web.jpg": "prompt ten lights on/thumbnail-web.jpg",
};
const previews = { 41: "41-92275d28b021", 42: "42-397fb42158d6", 43: "43-477f8ad2192b", 44: "44-cc43e94d0f4c", 45: "45-929c833bd23f", 46: "46-c8a267733038", 47: "47-2faf8f69a23f", 48: "48-42cb6900ddbc", 49: "49-f55a00f2f88b" };
const templates = catalog.templates.map((t) => {
  const p = previews[t.id];
  const g = { generation_config: { provider: "higgsfield_api", generation_mode: "reference" } };
  return p ? { ...t, ...g, preview_url: `/template-previews/${p}.mp4`, thumbnail_url: `/template-previews/${p}-640.webp` } : { ...t, ...g };
}).filter((t) => !t.preview_url.startsWith("/api/"));
const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "agent@homie.demo", user_metadata: { display_name: "Dana" }, app_metadata: {}, created_at: "2026-09-01T00:00:00Z" };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, exp: 4102444800, role: "authenticated" })}.sig`;
const session = { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: 4102444800, refresh_token: "r", user };
const listings = [
  { id: 101, address_line1: "1428 Maple Crest Dr", city: "Austin", region: "TX", price: 875000, cover_photo_url: "/homes/modern-villa.jpg", status: "active", source: "zillow", listing_photos: [{ count: 18 }], video_projects: [{ count: 2 }] },
  { id: 102, address_line1: "77 Harbor View Ln", city: "San Diego", region: "CA", price: 1240000, cover_photo_url: "/homes/living-room.jpg", status: "active", source: "zillow", listing_photos: [{ count: 24 }], video_projects: [{ count: 1 }] },
  { id: 103, address_line1: "9 Willow Bend Ct", city: "Nashville", region: "TN", price: 649000, cover_photo_url: "/homes/kitchen.jpg", status: "active", source: "manual", listing_photos: [{ count: 12 }], video_projects: [{ count: 0 }] },
  { id: 104, address_line1: "312 Juniper St", city: "Denver", region: "CO", price: 715000, cover_photo_url: "/homes/lounge.jpg", status: "pending", source: "zillow", listing_photos: [{ count: 15 }], video_projects: [{ count: 0 }] },
];
const projects = [
  { id: 501, title: "1428 Maple Crest Dr · Spin Tour", status: "awaiting_approval", output_format: "9:16", duration_seconds: 20, credits_cost: 20, generation_progress: 100, generation_error: null, created_at: "2026-10-09T15:00:00Z", generation_events: [], video_project_photos: [{ count: 7 }], video_versions: [{ status: "ready", video_url: "/demo/spin.mp4", thumbnail_url: "/homes/modern-villa.jpg", version_number: 1, provider_metadata: {} }], listings: { address_line1: "1428 Maple Crest Dr", city: "Austin", region: "TX", price: 875000, cover_photo_url: "/homes/modern-villa.jpg", listing_photos: [{ count: 18 }] }, video_templates: { style_label: "Viral Trends", thumbnail_url: "/homes/modern-villa.jpg" } },
];
const tables = {
  video_templates: templates, listings, plans: catalog.plans,
  credit_wallets: [{ balance: 80 }], template_favorites: [], profiles: [{ display_name: "Dana", bio: "", phone: "", job_title: "Realtor", company_name: "", theme: "dark" }],
  integrations: [], subscriptions: [], video_projects: projects, listing_photos: [], zones: [],
};
async function mockSupabase(route) {
  const req = route.request(); const url = new URL(req.url());
  const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  if (url.pathname.startsWith("/auth/v1/user")) return json(user);
  if (url.pathname.startsWith("/auth/v1/token")) return json(session);
  if (url.pathname.startsWith("/rest/v1/rpc/get_video_pricing")) {
    const id = JSON.parse(req.postData() ?? "{}").target_template_id; const base = templates.find((t) => t.id === id)?.credits_cost ?? 20;
    return json([{ resolution: "720p", multiplier: 1, credits_cost: base }, { resolution: "1080p", multiplier: 1.5, credits_cost: Math.round(base * 1.5) }]);
  }
  if (url.pathname.startsWith("/rest/v1/rpc/")) return json(1);
  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.split("/")[3];
    let rows = tables[table] ?? [];
    if (table === "integrations") rows = [];
    const single = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
    if (single) return rows[0] ? json(rows[0]) : json({ code: "PGRST116", message: "no rows", details: "0 rows" }, 406);
    return json(rows);
  }
  return json({});
}
async function serveLocal(route) {
  const u = route.request().url(); const key = Object.keys(local).find((k) => u.endsWith(k));
  if (!key) return route.fulfill({ status: 404, body: "" });
  const body = readFileSync(join(ROOT, local[key]));
  return route.fulfill({ status: 200, contentType: key.endsWith(".mp4") ? "video/mp4" : "image/jpeg", body });
}
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await ctx.addInitScript(([s]) => { localStorage.setItem("sb-mock-supabase-auth-token", JSON.stringify(s)); localStorage.setItem("homie_cookie_consent", "accepted"); }, [session]);
await ctx.route("http://mock-supabase.local/**", mockSupabase);
await ctx.route("https://cdn.jsdelivr.net/**", serveLocal);
await ctx.route("**/demo/spin.mp4", (r) => r.fulfill({ status: 200, contentType: "video/mp4", body: readFileSync(join(ROOT, "prompt twelve spin tour/preview-web.mp4")) }));
const page = await ctx.newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message.slice(0, 200)));
await page.goto(`${APP}/app`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(4000);
const steps = (await import(resolve(import.meta.dirname, "shots.mjs"))).default;
for (const name of shots.length ? shots : Object.keys(steps)) {
  await steps[name](page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(outDir, `${name}.png`) });
  console.log("saved", name);
}
await browser.close();
