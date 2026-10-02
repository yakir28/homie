import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { makeReferencePlan, referenceInput } from '../lib/higgsfield-reference.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Run with the same server environment as sync-templates-to-r2.mjs.
// Publishes existing assets only. Never submits a video generation.
const e = process.env;
for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
  if (!e[key]) throw new Error(`Missing ${key}`);
}
const db = createClient(e.SUPABASE_URL, e.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const r2 = new S3Client({ region: 'auto', endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY } });
const bucket = e.R2_BUCKET_NAME ?? 'homie';
const slug = 'gta-drop';
const directory = new URL('../output/gta-villa-template/', import.meta.url);
const { data: category, error: categoryError } = await db.from('template_categories').select('id').eq('slug', 'viral-trends').single();
if (categoryError) throw categoryError;
const { data: baseline, error: baselineError } = await db.from('video_templates').select('generation_config,credits_cost').eq('slug', 'house-behind-the-glass').single();
if (baselineError) throw baselineError;
const sourcePrompt = await readFile(new URL('VIDEO-PROMPT.txt', directory), 'utf8');
// Reusable direction describes the supplied listing, not the demo villa's decor.
const directorPrompt = sourcePrompt
  .replace(/### WORLD \/ HERO[\s\S]*?### REFERENCE ORDER/, '### WORLD / HERO\nThe hero is the exact supplied property. Preserve its actual architecture, materials, furniture, landscape and lighting. Never copy the demo villa into another listing.\n\n### REFERENCE ORDER')
  .replace(/01-city|02-neighborhood|03-villa-aerial|04-landing|08-foyer|10-living-wide|09-dining|06-kitchen|07-bedroom|11-bathroom/g, 'supplied view')
  .replace('The house is fictional.', 'Adapt to the supplied listing; no invented property claims.')
  .replace(/cream sofa/g, 'existing sofa').replace(/six chairs/g, 'existing chairs').replace(/three stools/g, 'existing stools')
  .replace(/walnut/g, 'existing wood').replace(/travertine/g, 'existing stone');
const config = {
  version: 8, provider: baseline.generation_config.provider,
  generation_mode: baseline.generation_config.generation_mode,
  video_model: baseline.generation_config.video_model,
  reference_planner_version: 1, template_slug: slug,
  workflow: 'gta_aerial_drop_property_tour',
  higgsfield_resolution: '1080p', kling_resolution: '1080p',
  supports_generate_audio: true, generate_audio: true,
  default_aspect_ratio: '9:16', default_duration_seconds: 24,
  base_prompt: 'Photorealistic property film with a stepped GTA-inspired aerial descent and grounded arrival, followed by a calm interior tour. Use the opening effect once. Target approximately 15 seconds of interior coverage across the full film.',
  preservation_prompt: 'Keep each supplied reference unchanged in identity, architecture, furniture and surroundings. Use matched editorial cuts across incompatible viewpoints; never morph rooms or invent connecting spaces.',
  director_prompt: directorPrompt, timed_prompt: directorPrompt,
  photo_order: ['city_aerial', 'neighborhood_aerial', 'close_property_aerial', 'front_facade', 'entry', 'living_room', 'dining_room', 'kitchen', 'bedroom', 'bathroom'],
  reference_policy: 'Supply ten ordered photos of the same property: three progressively closer aerials, facade, entry, living, dining, kitchen, bedroom, bathroom.',
  preview_provenance: { model: 'seedance_2_5', duration_seconds: 24, note: 'Existing approved demo; generation follows the current catalog provider.' },
};
if (config.provider !== 'higgsfield_api' || config.generation_mode !== 'reference') throw new Error('Catalog generation route changed; inspect before publishing.');
const photos = config.photo_order.map((roomType, i) => ({ path: `reference-${i}.png`, roomType }));
const plan = makeReferencePlan({ duration_seconds: 24, output_format: '9:16', template_prompt_snapshot: config }, photos);
for (const shot of plan) referenceInput(shot, shot.referencePaths.map((_, i) => `https://example.com/${i}.png`));
if (plan.reduce((n, shot) => n + shot.duration, 0) !== 24) throw new Error('Invalid planned runtime.');
const template = {
  category_id: category.id, name: 'GTA Drop', slug,
  description: 'Drop from a high aerial view to the front door, then explore the home in a cinematic interior tour. Upload three aerial views, the facade and six interior photos in order.',
  style_label: 'Viral Trends', format: '9:16', duration_seconds: 24,
  credits_cost: baseline.credits_cost, min_photos: 10, max_photos: 10,
  preview_url: '/api/media/template?key=templates/gta-drop/preview-v1.mp4',
  thumbnail_url: '/api/media/template?key=templates/gta-drop/thumbnail-v1.jpg',
  generation_config: config, is_featured: true, is_active: true, sort_order: 9,
};
await writeFile(new URL('catalog-template.json', directory), JSON.stringify(template, null, 2));
if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify({ valid: true, template: template.name, duration: 24, chapters: plan.length, provider: config.provider }));
  process.exit(0);
}
for (const [file, key, contentType] of [
  ['gta-villa-full.mp4', 'templates/gta-drop/preview-v1.mp4', 'video/mp4'],
  ['thumbnail.jpg', 'templates/gta-drop/thumbnail-v1.jpg', 'image/jpeg'],
]) {
  const body = await readFile(new URL(file, directory));
  if (process.argv.includes('--wrangler')) {
    execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `${bucket}/${key}`, '--file', fileURLToPath(new URL(file, directory)), '--content-type', contentType, '--remote'], { stdio: 'inherit' });
    const origin = e.TEMPLATE_MEDIA_ORIGIN ?? 'https://site-creator-vinext-starter.homie-support.workers.dev';
    const response = await fetch(`${origin}/api/media/template?key=${encodeURIComponent(key)}`, { headers: { Range: 'bytes=0-31' } });
    const prefix = Buffer.from(await response.arrayBuffer());
    if (response.status !== 206 || response.headers.get('content-range') !== `bytes 0-31/${body.length}` || !prefix.equals(body.subarray(0,32))) throw new Error(`Public upload verification failed: ${file}`);
    continue;
  }
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
  const stored = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (stored.ContentLength !== body.length) throw new Error(`Upload verification failed: ${file}`);
}
const { data, error } = await db.from('video_templates').upsert({ ...template, updated_at: new Date().toISOString() }, { onConflict: 'slug' }).select('id,name,slug,is_active,preview_url,thumbnail_url,duration_seconds').single();
if (error) throw error;
if (!data.is_active || data.duration_seconds !== 24) throw new Error('Published template failed verification.');
console.log(JSON.stringify(data));
