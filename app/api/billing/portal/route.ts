import { appOrigin, polarApi, workspaceExternalCustomerId } from "../../../../lib/polar";
import { authenticatedSupabase } from "../../../../lib/supabase/server-auth";

export async function POST(request: Request) {
  try {
    const auth = await authenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json() as { workspaceId?: unknown };
    if ((typeof body.workspaceId !== "string" && typeof body.workspaceId !== "number") || !/^\d+$/.test(String(body.workspaceId))) {
      return Response.json({ error: "Invalid workspace" }, { status: 400 });
    }
    const workspaceId = String(body.workspaceId);
    const { data: membership } = await auth.supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (!membership) return Response.json({ error: "Workspace access denied" }, { status: 403 });

    const session = await polarApi<{ customer_portal_url: string }>("customer-sessions/", {
      external_customer_id: workspaceExternalCustomerId(workspaceId),
      return_url: `${appOrigin(request)}/app`,
    });
    return Response.json({ url: session.customer_portal_url });
  } catch (error) {
    console.error("Polar customer portal failed", error);
    return Response.json({ error: "No Polar billing account is available yet" }, { status: 404 });
  }
}
