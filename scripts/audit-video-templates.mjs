import { makeReferencePlan } from "../lib/higgsfield-reference.mjs";
import { createClient } from "@supabase/supabase-js";
import { makeShotPlan, validateShotPlan } from "../lib/video-shot-plan.mjs";
import { makeKlingShotPlan } from "../lib/kling-shot-plan.mjs";
const useKling = process.argv.includes("--kling");
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Server-side Supabase credentials are required.");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await db.from("video_templates").select("slug,name,duration_seconds,min_photos,max_photos,format,generation_config").eq("is_active", true).order("sort_order");
if (error) throw error;
if (!data.length) throw new Error("No active templates found.");
const directions = new Set();
for (const template of data) {
  try {
    const config = template.generation_config;
    const custom = config.workflow === "prompt_property_film";
    const direction = JSON.stringify(config.shots ?? config.director_prompt ?? config.structured_prompt ?? config.timed_prompt);
    if (!custom && directions.has(direction)) throw new Error("Duplicate template direction.");
    if (!custom) directions.add(direction);
    for (const count of [template.min_photos, template.max_photos]) {
      const project = { duration_seconds: template.duration_seconds, output_format: template.format, template_prompt_snapshot: { ...config, template_slug: template.slug, ...(custom ? { user_prompt: "Audit fixture: a calm tour.", prompt_skill_version: "real-estate-ai-video-v1" } : {}) } };
      const kling = useKling || ["kling", "higgsfield_api"].includes(config.provider);
      const shots = (config.generation_mode === "reference" ? makeReferencePlan : kling ? makeKlingShotPlan : makeShotPlan)(project, Array.from({ length: count }, (_, i) => ({ path: `reference-${i}.jpg` })));
      if (!kling) validateShotPlan(shots, project.output_format);
      if (Math.abs(shots.reduce((sum, shot) => sum + (shot.editDuration ?? shot.duration), 0) - project.duration_seconds) > 0.01) throw new Error("Shot timeline does not match final duration.");
    }
    console.log(`PASS ${template.name}`);
  } catch (error) {
    process.exitCode = 1;
    console.error(`FAIL ${template.name}: ${error.message}`);
  }
}
console.log("Read-only audit finished; no generation jobs submitted.");
