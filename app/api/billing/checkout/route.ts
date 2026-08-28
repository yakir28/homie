import { isPolarPlanSlug, appOrigin, polarApi, polarProductId, workspaceExternalCustomerId } from "../../../../lib/polar";
import { authenticatedSupabase } from "../../../../lib/supabase/server-auth";

export async function POST(request: Request) {
  try {
    const auth = await authenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { planSlug?: unknown; workspaceId?: unknown };
    if (!isPolarPlanSlug(body.planSlug) || (typeof body.workspaceId !== "string" && typeof body.workspaceId !== "number")) {
      return Response.json({ error: "Invalid billing request" }, { status: 400 });
    }
    const workspaceId = String(body.workspaceId);
    if (!/^\d+$/.test(workspaceId)) return Response.json({ error: "Invalid workspace" }, { status: 400 });

    const { data: membership } = await auth.supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (!membership) return Response.json({ error: "Workspace access denied" }, { status: 403 });

    const productId = polarProductId(body.planSlug);
    if (!productId) return Response.json({ error: `Polar product for ${body.planSlug} is not configured` }, { status: 503 });

    const origin = appOrigin(request);
    const checkout = await polarApi<{ url: string }>("checkouts/", {
      products: [productId],
      external_customer_id: workspaceExternalCustomerId(workspaceId),
      customer_email: auth.user.email,
      customer_ip_address: request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
      metadata: { workspace_id: Number(workspaceId), plan_slug: body.planSlug },
      allow_discount_codes: true,
      success_url: `${origin}/app?checkout=success`,
      return_url: `${origin}/app`,
    });

    return Response.json({ url: checkout.url });
  } catch (error) {
    console.error("Polar checkout failed", error);
    return Response.json({ error: "Could not start secure checkout" }, { status: 500 });
  }
}
