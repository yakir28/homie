import { env } from "cloudflare:workers";
import { createClient } from "@supabase/supabase-js";
import { encodeMediaKey, signMediaToken } from "../../../../lib/media-token";

export const runtime = "nodejs";

type VersionRow = {
  status: string;
  version_number: number;
  provider_metadata: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Authentication required" }, { status: 401 });

  const { projectId } = await request.json() as { projectId?: number };
  if (!Number.isSafeInteger(projectId) || Number(projectId) <= 0) return Response.json({ error: "Valid projectId required" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const signingSecret = (env as unknown as { MEDIA_SIGNING_SECRET?: string }).MEDIA_SIGNING_SECRET ?? process.env.MEDIA_SIGNING_SECRET;
  if (!supabaseUrl || !supabaseKey || !signingSecret) return Response.json({ error: "Media service is not configured" }, { status: 503 });

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: project, error } = await supabase
    .from("video_projects")
    .select("id, video_versions(status, version_number, provider_metadata)")
    .eq("id", projectId)
    .single();
  if (error || !project) return Response.json({ error: "Video not found" }, { status: 404 });

  const versions = (project.video_versions ?? []) as VersionRow[];
  const ready = versions.filter((version) => version.status === "ready").sort((a, b) => b.version_number - a.version_number)[0];
  const r2Key = ready?.provider_metadata?.r2_key;
  if (typeof r2Key !== "string" || !r2Key.startsWith("videos/")) return Response.json({ error: "Video is not ready in R2" }, { status: 409 });

  const key = encodeMediaKey(r2Key);
  const expires = Math.floor(Date.now() / 1000) + 60 * 60;
  const signature = await signMediaToken(key, expires, signingSecret);
  return Response.json({ url: `/api/media/video?key=${encodeURIComponent(key)}&expires=${expires}&signature=${encodeURIComponent(signature)}` });
}
