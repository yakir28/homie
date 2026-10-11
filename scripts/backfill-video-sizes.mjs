// One-off: record size_bytes for finished videos uploaded before the worker stored it.
// Usage: node --env-file-if-exists=video-worker.env scripts/backfill-video-sizes.mjs [--dry-run]
import { createClient } from "@supabase/supabase-js";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { execFile } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const dryRun = process.argv.includes("--dry-run");
const { SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY: legacyServiceKey, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
const supabaseUrl = SUPABASE_URL ?? NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SECRET_KEY ?? legacyServiceKey;
if (!supabaseUrl || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase service credentials are required.");

const db = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
// Like the worker: use the S3 API when R2 keys are configured, otherwise the signed-in wrangler CLI.
const isConfiguredSecret = (value) => Boolean(value && !/^(your-|replace-|example)/i.test(value));
const r2 = [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY].every(isConfiguredSecret) ? new S3Client({ region: "auto", endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY } }) : null;
const scratch = r2 ? null : await mkdtemp(join(tmpdir(), "homie-sizes-"));

async function objectSize(bucket, key) {
  if (r2) return (await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))).ContentLength;
  const file = join(scratch, "object.mp4");
  await promisify(execFile)("npx", ["wrangler", "r2", "object", "get", `${bucket}/${key}`, "--file", file, "--remote"], { maxBuffer: 10 * 1024 * 1024 });
  return (await stat(file)).size;
}

const { data: versions, error } = await db.from("video_versions").select("id, provider_metadata").eq("status", "ready");
if (error) throw error;
let updated = 0;
for (const version of versions) {
  const meta = version.provider_metadata ?? {};
  if (!meta.r2_key || Number.isFinite(meta.size_bytes)) continue;
  try {
    const size = await objectSize(meta.bucket ?? "homie", meta.r2_key);
    console.log(`${version.id}\t${meta.r2_key}\t${size}`);
    if (!dryRun) {
      const { error: updateError } = await db.from("video_versions").update({ provider_metadata: { ...meta, size_bytes: size } }).eq("id", version.id);
      if (updateError) throw updateError;
    }
    updated += 1;
  } catch (failure) {
    console.error(`${version.id}\t${meta.r2_key}\tskipped: ${failure.name ?? failure.message}`);
  }
}
if (scratch) await rm(scratch, { recursive: true, force: true });
console.log(`${dryRun ? "Would update" : "Updated"} ${updated} of ${versions.length} ready versions.`);
