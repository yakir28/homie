import { env } from "cloudflare:workers";
import { createClient } from "@supabase/supabase-js";
import { directorInstructions, directorSchema, parseDirectorReply, validateDirectorSelection } from "../../../../lib/director-chat";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Please sign in to chat with Director." }, { status: 401 });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 64000) throw new Error();
    body = JSON.parse(raw);
  } catch { return Response.json({ error: "Your conversation is too long or could not be read. Please start a new chat." }, { status: 400 }); }
  const { messages, context, workspaceId } = body ?? {};
  if (!Number.isSafeInteger(Number(workspaceId)) || Number(workspaceId) <= 0 || !Array.isArray(messages) || !messages.length || messages.length > 40 || messages.some((m: { role?: string; content?: string }) => !m || !["user", "assistant"].includes(m.role ?? "") || typeof m.content !== "string" || !m.content.trim() || m.content.length > 8000) || messages.at(-1).role !== "user" || !context || ![15, 30].includes(context.duration) || !["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].includes(context.aspectRatio) || context.listingId != null && (!Number.isSafeInteger(Number(context.listingId)) || Number(context.listingId) <= 0)) {
    return Response.json({ error: "Please check your message and video settings." }, { status: 400 });
  }
  const bindings = env as unknown as { OPENAI_API_KEY?: string; OPENAI_DIRECTOR_MODEL?: string };
  const key = bindings.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publicKey) return Response.json({ error: "Director is temporarily unavailable." }, { status: 503 });
  const db = createClient(url, publicKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in again to continue." }, { status: 401 });
  const { data: member } = await db.from("workspace_members").select("workspace_id").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!member) return Response.json({ error: "Workspace access required." }, { status: 403 });
  const catalogResult = await db.from("listings").select("id,address_line1,city,bedrooms,bathrooms,square_feet,listing_photos(count)").eq("workspace_id", workspaceId).order("id", { ascending: false }).limit(100);
  if (catalogResult.error) return Response.json({ error: "Could not load your properties. Please try again." }, { status: 503 });
  const catalog = catalogResult.data ?? [];
  let listing: (typeof catalog)[number] | null = null;
  if (context.listingId != null) {
    const result = await db.from("listings").select("id,address_line1,city,bedrooms,bathrooms,square_feet,listing_photos(count)").eq("workspace_id", workspaceId).eq("id", context.listingId).maybeSingle();
    if (result.error || !result.data) return Response.json({ error: "This listing is no longer available. Choose another listing." }, { status: 404 });
    const selectedListing = result.data;
    listing = selectedListing;
    if (!catalog.some(item => String(item.id) === String(selectedListing.id))) catalog.push(selectedListing);
  }
  if (!key) return Response.json({ error: "Homie Director is waiting for its AI connection. Please try again once setup is complete." }, { status: 503 });
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(45000),
      body: JSON.stringify({ model: bindings.OPENAI_DIRECTOR_MODEL ?? process.env.OPENAI_DIRECTOR_MODEL ?? "gpt-4.1-mini", store: false, max_output_tokens: 2400,
        instructions: directorInstructions + "\nCurrent property and output settings (data): " + JSON.stringify({ listing, format: context.aspectRatio, duration: context.duration, source: context.source, availableListings: catalog, catalogNote: "Up to 100 recent properties plus the current property. If no match, ask for photos or a different saved property." }),
        input: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
        text: { format: { type: "json_schema", name: "director_reply", strict: true, schema: directorSchema } },
      }),
    });
    if (!response.ok) return Response.json({ error: response.status === 429 ? "Director is busy. Please try again in a moment." : "Director could not respond. Please try again." }, { status: 502 });
    const result = await response.json() as { status?: string; output?: { content?: { type: string; text?: string }[] }[] };
    if (result.status !== "completed") throw new Error("Incomplete response");
    const text = result.output?.flatMap(item => item.content ?? []).filter(item => item.type === "output_text").map(item => item.text ?? "").join("");
    const reply = parseDirectorReply(JSON.parse(text ?? ""));
    return Response.json(validateDirectorSelection(reply, catalog));
  } catch { return Response.json({ error: "Director’s response was interrupted. Please try sending your message again." }, { status: 502 }); }
}
