export const POLAR_PLAN_SLUGS = ["starter", "pro", "business"] as const;
export type PolarPlanSlug = (typeof POLAR_PLAN_SLUGS)[number];

export function isPolarPlanSlug(value: unknown): value is PolarPlanSlug {
  return typeof value === "string" && POLAR_PLAN_SLUGS.includes(value as PolarPlanSlug);
}

export function polarProductId(planSlug: PolarPlanSlug) {
  const products: Record<PolarPlanSlug, string | undefined> = {
    starter: process.env.POLAR_PRODUCT_STARTER,
    pro: process.env.POLAR_PRODUCT_PRO,
    business: process.env.POLAR_PRODUCT_BUSINESS,
  };
  return products[planSlug];
}

export function polarPlanSlugFromProduct(productId: string) {
  return POLAR_PLAN_SLUGS.find((slug) => polarProductId(slug) === productId) ?? null;
}

export async function polarApi<T>(path: string, body: Record<string, unknown>) {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
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
