import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile, mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Run: node --env-file=.env.local scripts/build-template-previews.mjs
// Creates local, versioned card assets; does not modify the live catalog.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const { data, error } = await db.from('video_templates').select('id,preview_url,thumbnail_url').eq('is_active', true).order('sort_order');
if (error) throw error;
const origin = process.env.TEMPLATE_MEDIA_ORIGIN ?? 'https://site-creator-vinext-starter.homie-support.workers.dev';
const out = 'public/template-previews';
await mkdir(out, { recursive: true });
const temp = await mkdtemp(join(tmpdir(), 'homie-previews-'));
const manifest = {};
try {
  for (const template of data) {
    if (!template.preview_url) continue;
    const response = await fetch(new URL(template.preview_url, origin));
    if (!response.ok) throw new Error(`Template ${template.id}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    const name = `${template.id}-${hash}`;
    const input = join(temp, `${template.id}.mp4`);
    await writeFile(input, bytes);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-t', '4', '-an', '-vf', 'scale=480:-2,fps=24', '-c:v', 'libx264', '-preset', 'fast', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${out}/${name}.mp4`]);
    // Use a matching first frame so the poster-to-playback transition is seamless.
    for (const width of [320, 640, 960]) {
      execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-frames:v', '1', '-vf', `scale=${width}:-2`, join(temp, 'poster.png')]);
      execFileSync('cwebp', ['-quiet', '-q', '78', join(temp, 'poster.png'), '-o', `${out}/${name}-${width}.webp`]);
    }
    manifest[template.preview_url] = { preview: `/template-previews/${name}.mp4`, image: `/template-previews/${name}-640.webp`, srcSet: [320, 640, 960].map(w => `/template-previews/${name}-${w}.webp ${w}w`).join(', ') };
    const size = (await readFile(`${out}/${name}.mp4`)).length;
    console.log(`Template ${template.id}: ${(bytes.length / 1e6).toFixed(2)} MB -> ${(size / 1e6).toFixed(2)} MB`);
  }
  await writeFile('lib/template-preview-assets.json', JSON.stringify(manifest, null, 2) + '\n');
} finally { await rm(temp, { recursive: true, force: true }); }
