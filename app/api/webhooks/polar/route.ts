import { ALL_CREDIT_PACKS } from "../../../../lib/credit-packs";
import { parsePolarCreditOrder } from "../../../../lib/polar-credit-order";
import { verifyPolarWebhook } from "../../../../lib/polar-webhook";
import { WebhookVerificationError } from "standardwebhooks";
import { polarSetting, polarPlanSlugFromProduct, workspaceIdFromExternalCustomerId } from "../../../../lib/polar";
import { supabaseAdmin } from "../../../../lib/supabase/server-auth";

import { parsePolarSubscriptionEvent } from "../../../../lib/polar-subscription-event";

export async function POST(request: Request) {
  const webhookSecret = polarSetting("WEBHOOK_SECRET");
  if (!webhookSecret) return Response.json({ error: "Webhook is not configured" }, { status: 503 });

  try {
    const rawBody = await request.text();
    const verified = verifyPolarWebhook(rawBody, Object.fromEntries(request.headers.entries()), webhookSecret);
    const order = parsePolarCreditOrder(verified);
    if (order) {
      if (order.productId === polarSetting("PRODUCT_FIRST_VIDEO")) {
        if (process.env.POLAR_FIRST_VIDEO_ENABLED !== "true") return new Response(null, { status: 503 });
        const workspaceId = workspaceIdFromExternalCustomerId(order.externalId);
        if (!workspaceId || !order.checkoutId || order.netAmount !== 100) throw new Error("Invalid first-video order");
        const { error } = await supabaseAdmin().rpc("fulfill_polar_first_video", {
          order_id: order.id, target_workspace_id: workspaceId, product_id: order.productId,
          checkout_id: order.checkoutId, refunded_amount: order.refundedAmount, is_paid: order.paid,
        });
        if (error) throw error;
        return new Response(null, { status: 202 });
      }
      const pack = ALL_CREDIT_PACKS.find(p => polarSetting(`PRODUCT_CREDITS_${p.credits}`) === order.productId);
      if (!pack) return new Response(null, { status: 202 });
      if (process.env.POLAR_CREDIT_PURCHASES_ENABLED !== "true") return Response.json({ error: "Credit purchases are not enabled" }, { status: 503 });
      const workspaceId = workspaceIdFromExternalCustomerId(order.externalId);
      if (!workspaceId) throw new Error("Order has no workspace mapping");
      if (order.netAmount !== pack.price * 100) throw new Error("Order price differs from catalog");
      const { error } = await supabaseAdmin().rpc("fulfill_polar_credit_order", {
        order_id: order.id, target_workspace_id: workspaceId, product_id: order.productId,
        credits: pack.credits, net_amount: order.netAmount, refunded_amount: order.refundedAmount,
        is_paid: order.paid,
      });
      if (error) throw error;
      return new Response(null, { status: 202 });
    }
    const event = parsePolarSubscriptionEvent(verified);
    if (!event) return new Response(null, { status: 202 });
    const planSlug = polarPlanSlugFromProduct(event.productId);
    const workspaceId = workspaceIdFromExternalCustomerId(event.externalId);
    if (!planSlug || !workspaceId) {
      console.warn("Ignoring Polar subscription without a Homie mapping", { type: event.type, productId: event.productId });
      return new Response(null, { status: 202 });
    }

    const eventId = request.headers.get("webhook-id") ?? `${event.type}:${event.id}:${event.timestamp}`;
    const { error } = await supabaseAdmin().rpc("sync_polar_subscription", {
      event_id: eventId,
      event_type: event.type,
      event_occurred_at: event.timestamp,
      target_workspace_id: workspaceId,
      target_plan_slug: planSlug,
      polar_customer_id: event.customerId,
      polar_subscription_id: event.id,
      subscription_status: event.status,
      billing_interval: event.interval,
      period_starts_at: event.periodStart,
      period_ends_at: event.periodEnd,
      cancel_at_period_end: event.cancelAtPeriodEnd,
      grant_allowance: event.grantAllowance,
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
