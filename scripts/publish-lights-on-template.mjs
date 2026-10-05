import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { makeReferencePlan, referenceInput } from '../lib/higgsfield-reference.mjs';
import { templateDirections } from '../lib/video-prompts/template-directions.mjs';

// Run with the same server environment as sync-templates-to-r2.mjs.
// Publishes existing assets only. Never submits a video generation. Use --dry-run first.
const e = process.env;
for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
  if (!e[key]) throw new Error(`Missing ${key}`);
}
const db = createClient(e.SUPABASE_URL, e.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const r2 = new S3Client({ region: 'auto', endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY } });
const bucket = e.R2_BUCKET_NAME ?? 'homie';
const slug = 'lights-on';
const directory = new URL('../prompt ten lights on/', import.meta.url);
// Same route and price as GTA Drop, the closest 9:16 film template.
const { data: baseline, error: baselineError } = await db.from('video_templates').select('category_id,generation_config,credits_cost').eq('slug', 'gta-drop').single();
if (baselineError) throw baselineError;
const recipe = templateDirections[slug];
const config = {
  ...baseline.generation_config,
  template_slug: slug,
  creative_recipe: recipe,
  reference_planner_version: 2, prompt_recipe_version: 'adaptive-effects-v2',
  director_prompt: Object.values(recipe).join('\n\n'),
  base_prompt: 'A cinematic film of the supplied property with the selected template effect.',
  default_aspect_ratio: '9:16', default_duration_seconds: 20,
  higgsfield_resolution: '1080p', kling_resolution: '1080p',
  // Edit layer applied after assembly (lib/template-finish.mjs).
  finish: { grid_reveal: true, flash_cut: true, grade: 'lights-on' },
  preview_provenance: { model: 'seedance_2_5', duration_seconds: 20, note: 'Demo property generated for the preview; preview edit by prompt ten lights on/build.sh.' },
};
for (const key of ['shots', 'timed_prompt', 'structured_prompt', 'photo_order', 'reference_policy', 'preservation_prompt']) delete config[key];
const photos = Array.from({ length: 9 }, (_, i) => ({ path: `reference-${i}.png`, roomType: `view-${i}` }));
const plan = makeReferencePlan({ duration_seconds: 20, output_format: '9:16', template_prompt_snapshot: config }, photos);
for (const shot of plan) referenceInput(shot, shot.referencePaths.map((_, i) => `https://example.com/${i}.png`));
if (plan.reduce((n, shot) => n + shot.duration, 0) !== 20) throw new Error('Invalid planned runtime.');
const template = {
  category_id: baseline.category_id, name: 'Lights On', slug,
  description: 'Your home at blue hour: a light switches on, the facade appears tile by tile, and every room glows warm. Works best when your photos show the facade and the light fixtures.',
  style_label: 'Cinematic', format: '9:16', duration_seconds: 20,
  credits_cost: baseline.credits_cost, min_photos: 6, max_photos: 10,
  preview_url: '/api/media/template?key=templates/lights-on/preview-v1.mp4',
  thumbnail_url: '/api/media/template?key=templates/lights-on/thumbnail-v1.jpg',
  generation_config: config, is_featured: true, is_active: true, sort_order: 10,
};
if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify({ valid: true, template: template.name, duration: 20, chapters: plan.length, provider: config.provider, finish: config.finish }));
  process.exit(0);
}
for (const [file, key, contentType] of [
  ['preview-web.mp4', 'templates/lights-on/preview-v1.mp4', 'video/mp4'],
  ['thumbnail-web.jpg', 'templates/lights-on/thumbnail-v1.jpg', 'image/jpeg'],
]) {
  const body = await readFile(new URL(file, directory));
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
  const stored = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (stored.ContentLength !== body.length) throw new Error(`Upload verification failed: ${file}`);
}
const { data, error } = await db.from('video_templates').upsert({ ...template, updated_at: new Date().toISOString() }, { onConflict: 'slug' }).select('id,name,slug,is_active,preview_url,thumbnail_url,duration_seconds').single();
if (error) throw error;
if (!data.is_active || data.duration_seconds !== 20) throw new Error('Published template failed verification.');
console.log(JSON.stringify(data));
