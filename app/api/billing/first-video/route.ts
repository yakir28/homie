import { authenticatedSupabase, supabaseAdmin } from "../../../../lib/supabase/server-auth";
import { appOrigin, polarApi, polarSetting, workspaceExternalCustomerId } from "../../../../lib/polar";
type Reservation = { reservation_id: string; checkout_id: string | null; checkout_url: string | null };
export async function POST(request: Request) {
  try {
    if (process.env.POLAR_FIRST_VIDEO_ENABLED !== "true") return Response.json({ error: "The first-video offer is not available yet" }, { status: 503 });
    const auth = await authenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json() as { workspaceId?: string | number };
    if (!body.workspaceId || !/^\d+$/.test(String(body.workspaceId))) return Response.json({ error: "Invalid workspace" }, { status: 400 });
    const workspaceId = String(body.workspaceId);
    const product = polarSetting("PRODUCT_FIRST_VIDEO");
    if (!product) throw new Error("First-video product unavailable");
    const admin = supabaseAdmin();
    const nonce = crypto.randomUUID();
    const reserve = async (expired: string | null = null) => admin.rpc("reserve_first_video", { target_user_id: auth.user.id, target_workspace_id: workspaceId, nonce, expired_checkout_id: expired });
    let result = await reserve();
    if (result.error) return Response.json({ error: "This one-time offer is already used or unavailable for this workspace" }, { status: 409 });
    let reservation = result.data as Reservation;
    if (reservation.checkout_id) {
      const origin = process.env.POLAR_SERVER === "sandbox" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";
      const response = await fetch(`${origin}/v1/checkouts/${reservation.checkout_id}`, { headers: { Authorization: `Bearer ${polarSetting("ACCESS_TOKEN")}` } });
      if (!response.ok) throw new Error("Checkout status unavailable");
      const checkout = await response.json() as { status: string; url: string };
      if (checkout.status === "open") return Response.json({ url: checkout.url });
      if (checkout.status !== "expired") return Response.json({ error: "Your first-video payment is already being processed" }, { status: 409 });
      result = await reserve(reservation.checkout_id);
      if (result.error) throw result.error;
      reservation = result.data as Reservation;
    }
    if (reservation.reservation_id !== nonce) return Response.json({ error: "A checkout is being prepared. Please try again shortly, or contact support if this persists." }, { status: 409 });
    const origin = appOrigin(request);
    // On an ambiguous network failure the reservation stays locked: never create
    // a second potentially payable checkout. Support can reconcile it in Polar.
    const checkout = await polarApi<{ id: string; url: string }>("checkouts/", {
      products: [product], external_customer_id: workspaceExternalCustomerId(workspaceId), customer_email: auth.user.email,
      metadata: { purchase_type: "first_video", reservation_id: nonce, workspace_id: workspaceId },
      allow_discount_codes: false, success_url: `${origin}/app?checkout=success&checkout_id={CHECKOUT_ID}`, return_url: `${origin}/app`,
    });
    const saved = await admin.from("polar_first_video_purchases").update({ checkout_id: checkout.id, checkout_url: checkout.url }).eq("user_id", auth.user.id).eq("reservation_id", nonce).select("checkout_id").single();
    if (saved.error) throw saved.error;
    return Response.json({ url: checkout.url });
  } catch { return Response.json({ error: "Could not start the first-video payment. Please contact support if this persists." }, { status: 503 }); }
}
