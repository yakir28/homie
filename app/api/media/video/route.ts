import { env } from "cloudflare:workers";
import { decodeMediaKey, verifyMediaToken } from "../../../../lib/media-token";

export const runtime = "nodejs";

type MediaBucket = {
  get(key: string, options?: { range?: Headers }): Promise<MediaObject | null>;
};
type MediaObject = {
  body?: ReadableStream;
  size: number;
  range?: { offset: number; length: number };
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
};

async function serve(request: Request) {
  const url = new URL(request.url);
  const encodedKey = url.searchParams.get("key") ?? "";
  const expires = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("signature") ?? "";
  const runtimeEnv = env as unknown as { MEDIA?: MediaBucket; MEDIA_SIGNING_SECRET?: string };
  const secret = runtimeEnv.MEDIA_SIGNING_SECRET ?? process.env.MEDIA_SIGNING_SECRET;
  if (!runtimeEnv.MEDIA || !secret) return new Response("Media service is not configured", { status: 503 });
  if (!await verifyMediaToken(encodedKey, expires, signature, secret)) return new Response("Link expired or invalid", { status: 403 });

  const key = decodeMediaKey(encodedKey);
  if (!key.startsWith("videos/") || key.includes("..")) return new Response("Invalid media key", { status: 400 });
  const object = await runtimeEnv.MEDIA.get(key, request.headers.has("range") ? { range: request.headers } : undefined);
  if (!object?.body) return new Response("Video not found", { status: 404 });

  const headers = new Headers({ "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600", ETag: object.httpEtag });
  object.writeHttpMetadata(headers);
  let status = 200;
  if (object.range && request.headers.has("range")) {
    const start = object.range.offset;
    const end = start + object.range.length - 1;
    headers.set("Content-Range", `bytes ${start}-${end}/${object.size}`);
    status = 206;
  }
  if (request.method === "HEAD") return new Response(null, { status, headers });
  return new Response(object.body, { status, headers });
}

export const GET = serve;
export const HEAD = serve;
