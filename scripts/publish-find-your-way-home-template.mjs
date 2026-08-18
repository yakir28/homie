import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY before publishing the template.");
}

const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: categories, error: categoryError } = await db
  .from("template_categories")
  .select("id,name")
  .in("name", ["Casual", "Featured", "Cinematic"]);
if (categoryError) throw categoryError;

const preferredNames = ["Casual", "Featured", "Cinematic"];
const category = preferredNames
  .map((name) => categories?.find((item) => item.name === name))
  .find(Boolean);
if (!category) throw new Error("No compatible Explore category exists.");

const generationConfig = {
  version: 4,
  provider: "higgsfield",
  higgsfield_model: "seedance_2_0_mini",
  higgsfield_resolution: "720p",
  supports_generate_audio: false,
  workflow: "single_image_shots_editorial_cuts",
  base_prompt: "Photorealistic approachable real-estate film for a modest home. Natural daylight, realistic optics, stable vertical lines, restrained camera motion and warm everyday character rather than luxury styling.",
  preservation_prompt: "Animate only the supplied image for each shot. Treat it as immutable visual ground truth. Lock every wall, ceiling, doorway, window, floor, cabinet, appliance, furniture item, exterior feature and landscaping element in its original position from first frame to last. Never transition into another room inside a generated shot. No architectural transformation, invented openings, moving furniture, geometry drift, morphing, redesign, people, text or logos.",
  edit: {
    generated_clip_duration: 4,
    use_seconds_per_clip: 3,
    transition: "clean_editorial_cut",
    speed_ramps: "editor_only",
    final_duration: 18,
  },
  shots: [
    { role: "neighborhood_hook", duration: 4, reference_mode: "start", prompt: "Perform one slow controlled diagonal drone descent toward the featured home with a stable horizon and subtle natural parallax. Preserve every roof, road, tree, property boundary and building." },
    { role: "facade_arrival", duration: 4, reference_mode: "start", prompt: "Perform one subtle forward push toward the existing front entrance, no more than a five-percent camera advance. Preserve the exact facade, roofline, garage, windows, driveway and landscaping." },
    { role: "living_room", duration: 4, reference_mode: "start", prompt: "Perform one very slow four-percent forward camera push at human eye level. Keep the same living room and all furniture perfectly fixed throughout the shot." },
    { role: "kitchen", duration: 4, reference_mode: "start", prompt: "Perform one restrained three-percent lateral camera slide. Lock every cabinet, appliance, countertop, island, fixture, doorway and floorboard in place." },
    { role: "dining", duration: 4, reference_mode: "start", prompt: "Perform one slow subtle push toward the dining table. Preserve the exact table, chair count, windows, sliding doors, walls, floor and exterior view." },
    { role: "backyard_finale", duration: 4, reference_mode: "start", prompt: "Perform one very slow three-percent backward drift and finish on a calm stable hold. Animate only gentle existing foliage and slightly warmer natural light; add nothing to the yard." },
  ],
};

const template = {
  category_id: category.id,
  name: "Find Your Way Home",
  slug: "find-your-way-home",
  description: "An approachable neighborhood-to-backyard tour built from clean, stable single-image shots with authentic interiors.",
  style_label: "Casual",
  format: "9:16",
  duration_seconds: 18,
  credits_cost: 60,
  min_photos: 6,
  max_photos: 12,
  preview_url: "/api/media/template?key=templates/find-your-way-home/preview.mp4",
  thumbnail_url: "/api/media/template?key=templates/find-your-way-home/thumbnail.jpg",
  generation_config: generationConfig,
  is_featured: true,
  is_active: true,
  sort_order: 3,
  updated_at: new Date().toISOString(),
};

const { data, error } = await db
  .from("video_templates")
  .upsert(template, { onConflict: "slug" })
  .select("id,name,slug,is_active,preview_url,thumbnail_url,generation_config")
  .single();
if (error) throw error;

if (!data.is_active || data.generation_config?.shots?.length !== 6) {
  throw new Error("Template verification failed after publishing.");
}

console.log(`Published ${data.name} with ${data.generation_config.shots.length} stable single-image shots.`);
