const eventTypes = new Set([
  "subscription.created", "subscription.active", "subscription.updated",
  "subscription.canceled", "subscription.uncanceled", "subscription.cycled",
  "subscription.past_due", "subscription.paused", "subscription.resumed", "subscription.revoked",
]);
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const date = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));

/** Only verified webhook bodies may enter this parser. Unknown events are ignored. */
export function parsePolarSubscriptionEvent(value: unknown) {
  if (!record(value) || typeof value.type !== "string") throw new Error("Invalid Polar event");
  if (!eventTypes.has(value.type)) return null;
  const s = value.data;
  if (!date(value.timestamp) || !record(s) || !record(s.customer)
    || ![s.id, s.product_id, s.customer_id].every(x => typeof x === "string" && x.length > 0)
    || !date(s.current_period_start) || !date(s.current_period_end)
    || Date.parse(s.current_period_end) <= Date.parse(s.current_period_start)
    || !["month", "year"].includes(String(s.recurring_interval))
    || typeof s.cancel_at_period_end !== "boolean") throw new Error("Invalid Polar subscription");
  const statuses: Record<string, string> = {
    active: "active", trialing: "trialing", past_due: "past_due",
    unpaid: "past_due", paused: "paused", canceled: "expired", incomplete_expired: "expired",
  };
  const status = typeof s.status === "string" ? statuses[s.status] : undefined;
  if (!status) throw new Error("Unsupported Polar subscription status");
  return {
    type: value.type, timestamp: value.timestamp,
    id: s.id as string, productId: s.product_id as string, customerId: s.customer_id as string,
    externalId: typeof s.customer.external_id === "string" ? s.customer.external_id : null,
    status, interval: s.recurring_interval === "year" ? "yearly" : "monthly",
    periodStart: s.current_period_start, periodEnd: s.current_period_end,
    cancelAtPeriodEnd: s.cancel_at_period_end,
    // Renewals also arrive as subscription.updated. The DB ledger makes any
    // active snapshot safe to replay without replenishing an already-used grant.
    grantAllowance: status === "active",
  };
}
