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
  .in("name", ["Casual", "Cinematic", "Featured"]);
if (categoryError) throw categoryError;

const category = ["Casual", "Cinematic", "Featured"]
  .map((name) => categories?.find((item) => item.name === name))
  .find(Boolean);
if (!category) throw new Error("No compatible Explore category exists.");

const generationConfig = {
  version: 5,
  provider: "higgsfield",
  higgsfield_model: "seedance_2_0_mini",
  higgsfield_resolution: "720p",
  supports_generate_audio: false,
  workflow: "foreground_reveal_then_single_image_shots",
  base_prompt: "Photorealistic approachable real-estate film for the exact supplied property. Natural daylight, realistic stabilized-camera optics, stable verticals, restrained motion and authentic everyday character.",
  preservation_prompt: "Treat each supplied image as immutable visual ground truth. Lock every wall, ceiling, doorway, window, floor, cabinet, appliance, furniture item, exterior feature and landscaping element in its original position from first frame to last. Keep the exact same scene throughout each shot. Never invent the next room or pass through unseen geometry. No architectural transformation, moving furniture, object changes, geometry drift, morphing, redesign, people, text or logos.",
  photo_order: ["facade_with_foreground", "entry", "living_room", "kitchen", "dining_room", "backyard"],
  edit: {
    generated_clip_duration: 4,
    use_seconds_per_clip: 3,
    transition: "clean_editorial_cut",
    hook_speed_ramp: { editor_only: true, ease_in_seconds: 0.6, middle_speed: 1.5, hero_hold_seconds: 1.2 },
    final_duration: 18,
  },
  shots: [
    { role: "foreground_reveal_hook", duration: 4, reference_mode: "start", prompt: "Use an existing tree trunk, hedge, mailbox, porch column or other real foreground object already visible near an edge of the supplied facade photo. Perform one controlled lateral slider reveal with realistic foreground parallax, gradually exposing the exact complete facade, then settle into a stable centered hero composition. If no suitable foreground object exists, use a restrained three-percent lateral slide without inventing one. Preserve the exact roofline, siding, garage, front door, porch, windows, driveway, walkway, lawn, landscaping, neighboring edges, materials, colors and shadows." },
    { role: "entry", duration: 4, reference_mode: "start", prompt: "Perform one slow three-percent forward push at human eye level. Lock the exact entry, door, console, mirror, stairs, railing, rug, walls, openings and visible furniture. Stop before entering another room." },
    { role: "living_room", duration: 4, reference_mode: "start", prompt: "Perform one restrained three-percent lateral slider move with subtle natural parallax. Lock the exact sofa, chairs, tables, rug, lighting, artwork, windows, doors, walls and floor." },
    { role: "kitchen", duration: 4, reference_mode: "start", prompt: "Perform one smooth eight-degree micro-arc around the existing island or primary counter. Lock every cabinet, appliance, countertop, fixture, stool, doorway and floorboard in place." },
    { role: "dining_room", duration: 4, reference_mode: "start", prompt: "Perform one subtle three-percent pedestal rise toward the existing dining table. Preserve the exact table, chair count, pendant, decor, windows, doors, walls and floor." },
    { role: "backyard_finale", duration: 4, reference_mode: "start", prompt: "Perform one gentle three-percent pullback and finish on a stable composed hold. Preserve the exact rear facade, patio, furniture, lawn, fence, trees and shrubs. Animate only subtle existing foliage in a light breeze." },
  ],
};

const template = {
  category_id: category.id,
  name: "Hidden in Plain Sight",
  slug: "foreground-reveal",
  description: "A cinematic foreground reveal that slides past real landscaping before settling into an authentic, continuity-safe home tour.",
  style_label: "Casual",
  format: "9:16",
  duration_seconds: 18,
  credits_cost: 60,
  min_photos: 6,
  max_photos: 12,
  preview_url: "/templates/foreground-reveal/preview.mp4",
  thumbnail_url: "/templates/foreground-reveal/poster.jpg",
  generation_config: generationConfig,
  is_featured: true,
  is_active: true,
  sort_order: 2,
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

console.log(`Published ${data.name} with ${data.generation_config.shots.length} continuity-safe shots.`);
