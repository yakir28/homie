import { authenticatedSupabase, supabaseAdmin } from "../../../../lib/supabase/server-auth";
import { polarSetting, workspaceExternalCustomerId } from "../../../../lib/polar";
export async function POST(request: Request) {
  try {
    const auth = await authenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { workspaceId, checkoutId } = await request.json() as { workspaceId?: string | number; checkoutId?: string };
    if ((typeof workspaceId !== "string" && typeof workspaceId !== "number") || !/^\d+$/.test(String(workspaceId)) || typeof checkoutId !== "string" || !/^[\da-f-]{36}$/i.test(checkoutId)) return Response.json({ error: "Invalid request" }, { status: 400 });
    const { data: member } = await auth.supabase.from("workspace_members").select("workspace_id").eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
    if (!member) return Response.json({ error: "Forbidden" }, { status: 403 });
    const origin = process.env.POLAR_SERVER === "sandbox" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";
    const headers = { Authorization: `Bearer ${polarSetting("ACCESS_TOKEN")}` };
    const response = await fetch(`${origin}/v1/checkouts/${checkoutId}`, { headers });
    if (!response.ok) throw new Error("Checkout lookup failed");
    const checkout = await response.json() as { external_customer_id?: string; status?: string };
    if (checkout.external_customer_id !== workspaceExternalCustomerId(workspaceId)) return Response.json({ error: "Forbidden" }, { status: 403 });
    if (checkout.status !== "succeeded") return Response.json({ confirmed: false });
    const ordersResponse = await fetch(`${origin}/v1/orders/?checkout_id=${checkoutId}&limit=10`, { headers });
    if (!ordersResponse.ok) throw new Error("Order lookup failed");
    const orders = (await ordersResponse.json() as { items: { id: string; paid: boolean; refunded_amount: number; subscription_id: string | null }[] }).items;
    const paid = orders.find((order: { paid: boolean; refunded_amount: number }) => order.paid && order.refunded_amount === 0);
    if (!paid) return Response.json({ confirmed: false });
    const admin = supabaseAdmin();
    let confirmed = false;
    if (paid.subscription_id) {
      const { data, error } = await admin.from("subscriptions").select("status").eq("workspace_id", workspaceId).eq("provider_subscription_id", paid.subscription_id).maybeSingle();
      if (error) throw error;
      const { data: grants, error: grantError } = await admin.from("credit_ledger").select("id").eq("workspace_id", workspaceId).like("idempotency_key", `polar-subscription:${paid.subscription_id}:period:%`).limit(1);
      if (grantError) throw grantError;
      confirmed = data?.status === "active" && Boolean(grants?.length);
    } else {
      const { data, error } = await admin.from("polar_credit_orders").select("granted,refunded_credits").eq("id", paid.id).eq("workspace_id", workspaceId).maybeSingle();
      if (error) throw error;
      confirmed = data?.granted === true && data.refunded_credits === 0;
    }
    return Response.json({ confirmed, kind: paid.subscription_id ? "subscription" : "credits" });
  } catch { return Response.json({ error: "Payment confirmation is temporarily unavailable" }, { status: 503 }); }
}
