const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
export function parsePolarCreditOrder(value: unknown) {
  if (!record(value) || !["order.paid", "order.refunded"].includes(String(value.type))) return null;
  const o = value.data;
  if (!record(o) || typeof o.id !== "string" || !record(o.customer)) throw new Error("Invalid order");
  if (o.subscription_id) return null;
  if (typeof o.product_id !== "string") return null;
  if (typeof o.customer.external_id !== "string") return null;
  if (!Number.isSafeInteger(o.net_amount) || Number(o.net_amount) <= 0
    || !Number.isSafeInteger(o.refunded_amount) || Number(o.refunded_amount) < 0
    || o.currency !== "usd" || typeof o.paid !== "boolean") throw new Error("Invalid order amounts");
  if (value.type === "order.paid" && o.paid !== true) throw new Error("Unpaid order");
  return { checkoutId: typeof o.checkout_id === "string" ? o.checkout_id : null, id:o.id, productId:o.product_id, externalId:o.customer.external_id,
    paid:value.type === "order.paid", netAmount:Number(o.net_amount), refundedAmount:Number(o.refunded_amount) };
}
