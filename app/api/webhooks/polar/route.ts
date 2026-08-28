import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { polarPlanSlugFromProduct, workspaceIdFromExternalCustomerId } from "../../../../lib/polar";
import { supabaseAdmin } from "../../../../lib/supabase/server-auth";

const subscriptionEventTypes = [
  "subscription.created",
  "subscription.active",
  "subscription.updated",
  "subscription.canceled",
  "subscription.uncanceled",
  "subscription.cycled",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.revoked",
] as const;

type PolarSubscription = {
  id: string;
  product_id: string;
  customer_id: string;
  status: string;
  recurring_interval: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  customer: { external_id?: string | null };
};
type PolarEvent = { type: string; timestamp: string; data: unknown };
type SubscriptionEvent = PolarEvent & { type: (typeof subscriptionEventTypes)[number]; data: PolarSubscription };

function isSubscriptionEvent(event: PolarEvent): event is SubscriptionEvent {
  return subscriptionEventTypes.includes(event.type as SubscriptionEvent["type"])
    && typeof event.data === "object" && event.data !== null
    && "id" in event.data && "product_id" in event.data && "customer" in event.data;
}

function homieStatus(type: string) {
  if (type === "subscription.past_due") return "past_due";
  if (type === "subscription.paused") return "paused";
  if (type === "subscription.revoked") return "expired";
  return "active";
}

export async function POST(request: Request) {
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) return Response.json({ error: "Webhook is not configured" }, { status: 503 });

  try {
    const rawBody = await request.text();
    const verifier = new Webhook(Buffer.from(webhookSecret, "utf8").toString("base64"));
    const event = verifier.verify(rawBody, Object.fromEntries(request.headers.entries())) as PolarEvent;
    if (!isSubscriptionEvent(event)) return new Response(null, { status: 202 });

    const subscription = event.data;
    if (typeof subscription.product_id !== "string") return new Response(null, { status: 202 });
    const planSlug = polarPlanSlugFromProduct(subscription.product_id);
    const workspaceId = workspaceIdFromExternalCustomerId(subscription.customer.external_id);
    if (!planSlug || !workspaceId) {
      console.warn("Ignoring Polar subscription without a Homie mapping", { type: event.type, productId: subscription.product_id });
      return new Response(null, { status: 202 });
    }

    const eventId = request.headers.get("webhook-id") ?? `${event.type}:${subscription.id}:${event.timestamp}`;
    const { error } = await supabaseAdmin().rpc("sync_polar_subscription", {
      event_id: eventId,
      event_type: event.type,
      target_workspace_id: Number(workspaceId),
      target_plan_slug: planSlug,
      polar_customer_id: subscription.customer_id,
      polar_subscription_id: subscription.id,
      subscription_status: homieStatus(event.type),
      billing_interval: subscription.recurring_interval === "year" ? "yearly" : "monthly",
      period_starts_at: subscription.current_period_start,
      period_ends_at: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      grant_allowance: ["subscription.active", "subscription.cycled", "subscription.resumed"].includes(event.type),
    });
    if (error) throw error;
    return new Response(null, { status: 202 });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return Response.json({ error: "Invalid webhook signature" }, { status: 403 });
    }
    console.error("Polar webhook failed", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
