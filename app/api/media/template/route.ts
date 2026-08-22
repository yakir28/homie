import { env } from "cloudflare:workers";

export const runtime = "nodejs";

type TemplateBucket = {
  put(key: string, value: ReadableStream, options?: {
    httpMetadata?: { contentType?: string; cacheControl?: string };
    customMetadata?: Record<string, string>;
  }): Promise<unknown>;
  get(key: string, options?: { range?: Headers }): Promise<{
    body?: ReadableStream;
    size: number;
    range?: { offset: number; length: number };
    httpEtag: string;
    writeHttpMetadata(headers: Headers): void;
  } | null>;
};

const productionTemplateOrigin =
  process.env.TEMPLATE_MEDIA_ORIGIN ??
  "https://site-creator-vinext-starter.homie-support.workers.dev";

async function proxyProductionTemplate(request: Request, key: string) {
  if (process.env.NODE_ENV === "production") return null;
  const url = new URL("/api/media/template", productionTemplateOrigin);
  url.searchParams.set("key", key);
  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("range", range);
  const response = await fetch(url, { method: request.method, headers });
  if (!response.ok) return null;
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    headers: response.headers,
  });
}

async function serve(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!key.startsWith("templates/") || key.includes("..")) return new Response("Invalid template key", { status: 400 });
  const bucket = (env as unknown as { MEDIA?: TemplateBucket }).MEDIA;
  if (!bucket) return new Response("Template storage is not configured", { status: 503 });
  const object = await bucket.get(key, request.headers.has("range") ? { range: request.headers } : undefined);
  if (!object?.body) {
    const proxied = await proxyProductionTemplate(request, key);
    return proxied ?? new Response("Template asset not found", { status: 404 });
  }
  const headers = new Headers({ "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable", ETag: object.httpEtag });
  object.writeHttpMetadata(headers);
  let status = 200;
  if (object.range && request.headers.has("range")) {
    const start = object.range.offset;
    headers.set("Content-Range", `bytes ${start}-${start + object.range.length - 1}/${object.size}`);
    status = 206;
  }
  if (request.method === "HEAD") return new Response(null, { status, headers });
  return new Response(object.body, { status, headers });
}

export const GET = serve;
export const HEAD = serve;

export async function PUT(request: Request) {
  const runtimeEnv = env as unknown as { MEDIA?: TemplateBucket; ALLOW_LOCAL_MEDIA_SEED?: string };
  if (runtimeEnv.ALLOW_LOCAL_MEDIA_SEED !== "1") return new Response("Not found", { status: 404 });
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!key.startsWith("templates/") || key.includes("..") || !request.body) {
    return new Response("Invalid template upload", { status: 400 });
  }
  const bucket = runtimeEnv.MEDIA;
  if (!bucket) return new Response("Template storage is not configured", { status: 503 });
  await bucket.put(key, request.body, {
    httpMetadata: {
      contentType: request.headers.get("content-type") ?? "application/octet-stream",
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: { source: "homie-local-seed" },
  });
  return Response.json({ key });
}
