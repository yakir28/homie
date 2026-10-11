import { Webhook, WebhookVerificationError } from "standardwebhooks";

// Polar switched to Standard Webhooks keys in September 2026. Existing
// endpoints can still use the older scheme; both paths verify the signature.
export function verifyPolarWebhook(body: string, headers: Record<string, string>, secret: string): unknown {
  try {
    return new Webhook(secret).verify(body, headers);
  } catch (error) {
    if (!(error instanceof WebhookVerificationError)) throw error;
    return new Webhook(Buffer.from(secret, "utf8").toString("base64")).verify(body, headers);
  }
}
