import { authenticatedSupabase, supabaseAdmin } from "../../../../lib/supabase/server-auth";
export async function POST(request: Request) {
  try {
    const auth = await authenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { workspaceId } = await request.json() as { workspaceId?: string | number };
    if (!workspaceId || !/^\d+$/.test(String(workspaceId))) return Response.json({ error: "Invalid workspace" }, { status: 400 });
    const { data, error } = await supabaseAdmin().rpc("first_video_offer_state", { target_user_id: auth.user.id, target_workspace_id: String(workspaceId) });
    if (error) throw error;
    if (!data) return Response.json({ error: "Forbidden" }, { status: 403 });
    return Response.json(data);
  } catch { return Response.json({ error: "Offer status unavailable" }, { status: 503 }); }
}
