/** Sandbox credentials and products must never fall back to live values. */
export function polarSetting(name: string) {
  const prefix = process.env.POLAR_SERVER === "sandbox" ? "POLAR_SANDBOX_" : "POLAR_";
  return process.env[`${prefix}${name}`];
}

export const POLAR_PLAN_SLUGS = ["starter", "pro", "business"] as const;
export type PolarPlanSlug = (typeof POLAR_PLAN_SLUGS)[number];
export type PolarBillingInterval = "monthly" | "yearly";

export function isPolarPlanSlug(value: unknown): value is PolarPlanSlug {
  return typeof value === "string" && POLAR_PLAN_SLUGS.includes(value as PolarPlanSlug);
}

export function isPolarBillingInterval(value: unknown): value is PolarBillingInterval {
  return value === "monthly" || value === "yearly";
}

export function polarProductId(planSlug: PolarPlanSlug, billingInterval: PolarBillingInterval = "monthly") {
  const products: Record<PolarBillingInterval, Record<PolarPlanSlug, string | undefined>> = {
    monthly: {
      starter: polarSetting("PRODUCT_STARTER"),
      pro: polarSetting("PRODUCT_PRO"),
      business: polarSetting("PRODUCT_BUSINESS"),
    },
    yearly: {
      starter: polarSetting("PRODUCT_STARTER_ANNUAL"),
      pro: polarSetting("PRODUCT_PRO_ANNUAL"),
      business: polarSetting("PRODUCT_BUSINESS_ANNUAL"),
    },
  };
  return products[billingInterval][planSlug];
}

export function polarPlanSlugFromProduct(productId: string) {
  return POLAR_PLAN_SLUGS.find((slug) => polarProductId(slug, "monthly") === productId || polarProductId(slug, "yearly") === productId) ?? null;
}

export async function polarApi<T>(path: string, body: Record<string, unknown>) {
  const accessToken = polarSetting("ACCESS_TOKEN");
  if (!accessToken) throw new Error("POLAR_ACCESS_TOKEN is not configured");
  const apiOrigin = process.env.POLAR_SERVER === "sandbox" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";
  const response = await fetch(`${apiOrigin}/v1/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Polar API ${response.status}: ${message.slice(0, 500)}`);
  }
  return response.json() as Promise<T>;
}

export function appOrigin(request: Request) {
  return (process.env.APP_URL?.replace(/\/$/, "") || new URL(request.url).origin);
}

export function workspaceExternalCustomerId(workspaceId: string | number) {
  return `workspace:${workspaceId}`;
}

export function workspaceIdFromExternalCustomerId(externalId: string | null | undefined) {
  const match = externalId?.match(/^workspace:(\d+)$/);
  return match?.[1] ?? null;
}
