import { creditPack } from "../../../../lib/credit-packs";
import { appOrigin, polarApi, polarSetting, workspaceExternalCustomerId } from "../../../../lib/polar";
import { authenticatedSupabase, supabaseAdmin } from "../../../../lib/supabase/server-auth";

export async function POST(request: Request) {
  try {
    if (process.env.POLAR_CREDIT_PURCHASES_ENABLED !== "true") return Response.json({ error: "Credit purchases are not available yet" }, { status: 503 });
    const auth = await authenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { credits?: unknown; workspaceId?: unknown };
    if (!creditPack(body.credits) || (typeof body.workspaceId !== "string" && typeof body.workspaceId !== "number")) {
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

    if (body.credits === 90) {
      const { data, error } = await supabaseAdmin().rpc("first_video_offer_state", { target_user_id: auth.user.id, target_workspace_id: workspaceId });
      if (error) throw error;
      if (!data?.eligible) return Response.json({ error: "Complete your paid first video to unlock this pack" }, { status: 403 });
    }
    const productId = polarSetting(`PRODUCT_CREDITS_${body.credits}`);
    if (!productId) return Response.json({ error: "This credit pack is not configured" }, { status: 503 });

    const origin = appOrigin(request);
    const checkout = await polarApi<{ url: string }>("checkouts/", {
      products: [productId],
      external_customer_id: workspaceExternalCustomerId(workspaceId),
      customer_email: auth.user.email,
      customer_ip_address: request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
      metadata: { workspace_id: workspaceId, purchase_type: "credits" },
      allow_discount_codes: false,
      success_url: `${origin}/app?checkout=success&checkout_id={CHECKOUT_ID}`,
      return_url: `${origin}/app`,
    });

    return Response.json({ url: checkout.url });
  } catch (error) {
    console.error("Polar checkout failed", error);
    return Response.json({ error: "Could not start secure checkout" }, { status: 500 });
  }
}
