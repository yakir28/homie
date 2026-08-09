import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME ?? "homie";

if (!supabaseUrl || !supabaseKey || !accountId || !accessKeyId || !secretAccessKey) {
  throw new Error("Set Supabase server credentials and all R2 credentials before syncing template assets.");
}

const db = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const contentTypes = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
};

function extension(source, contentType) {
  const pathname = source.startsWith("http") ? new URL(source).pathname : source;
  const suffix = extname(pathname).toLowerCase();
  if (suffix) return suffix;
  if (contentType?.includes("video/mp4")) return ".mp4";
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("png")) return ".png";
  return ".jpg";
}

async function loadAsset(source) {
  if (source.startsWith("/api/media/template")) return null;
  if (source.startsWith("/")) {
    const bytes = await readFile(join(process.cwd(), "public", source.slice(1)));
    return { bytes, contentType: contentTypes[extname(source).toLowerCase()] ?? "application/octet-stream" };
  }
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Could not download ${source} (${response.status}).`);
  return { bytes: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream" };
}

async function upload(slug, kind, source) {
  const asset = await loadAsset(source);
  if (!asset) return source;
  const key = `templates/${slug}/${kind}${extension(source, asset.contentType)}`;
  await r2.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: asset.bytes,
    ContentType: asset.contentType,
    CacheControl: "public, max-age=31536000, immutable",
    Metadata: { template_slug: slug, asset_kind: kind },
  }));
  return `/api/media/template?key=${encodeURIComponent(key)}`;
}

const { data: templates, error } = await db.from("video_templates").select("id, slug, preview_url, thumbnail_url").eq("is_active", true).order("sort_order");
if (error) throw error;

for (const template of templates ?? []) {
  const thumbnailUrl = await upload(template.slug, "thumbnail", template.thumbnail_url);
  const previewUrl = template.preview_url === template.thumbnail_url
    ? thumbnailUrl
    : await upload(template.slug, "preview", template.preview_url);
  const { error: updateError } = await db.from("video_templates").update({ thumbnail_url: thumbnailUrl, preview_url: previewUrl }).eq("id", template.id);
  if (updateError) throw updateError;
  console.log(`Synced ${template.slug}`);
}

console.log(`Synced ${(templates ?? []).length} templates to Cloudflare R2.`);
