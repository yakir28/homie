import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { join } from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { loadMusicLibrary } from "../lib/music.mjs";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME ?? "homie";
const libraryDir = process.env.MUSIC_LIBRARY_DIR ?? new URL("../assets/music/", import.meta.url).pathname;

const exec = promisify(execFile);
const isConfiguredSecret = (value) => Boolean(value && !/^(your-|replace-|example)/i.test(value));
// Same rule as the video worker: without real S3 credentials, use the logged-in Wrangler session.
const r2 = [accountId, accessKeyId, secretAccessKey].every(isConfiguredSecret) ? new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
}) : null;

// Uploads every library track the video worker may pick, skipping ones already in R2.
for (const track of await loadMusicLibrary()) {
  const key = `music/${track.file}`;
  if (!r2) {
    await exec("npx", ["wrangler", "r2", "object", "put", `${bucket}/${key}`, "--file", join(libraryDir, track.file), "--content-type", "audio/mp4", "--cache-control", "private, max-age=31536000, immutable", "--remote"], { maxBuffer: 10 * 1024 * 1024 });
    console.log(`uploaded ${key} (wrangler)`);
    continue;
  }
  const exists = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key })).then(() => true, () => false);
  if (exists) {
    console.log(`skip ${key}`);
    continue;
  }
  await r2.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: await readFile(join(libraryDir, track.file)),
    ContentType: "audio/mp4",
    CacheControl: "private, max-age=31536000, immutable",
  }));
  console.log(`uploaded ${key}`);
}
