// Cookie / local-storage consent. Essential storage (sign-in, this choice) is always
// allowed; marketing attribution only runs after the visitor opts in.
// Bump CONSENT_VERSION when the categories change so everyone is asked again.

export const CONSENT_KEY = "homie_cookie_consent";
export const CONSENT_VERSION = 2;
export const CONSENT_EVENT = "homie:consent-changed";
export const OPEN_SETTINGS_EVENT = "homie:open-cookie-settings";

export type Consent = { version: number; analytics: boolean; decidedAt: string };

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    if (parsed.version !== CONSENT_VERSION || typeof parsed.analytics !== "boolean") return null;
    return parsed as Consent;
  } catch {
    // Older builds stored a bare "accepted"/"declined" string: ask again.
    return null;
  }
}

export function saveConsent(analytics: boolean): Consent {
  const consent: Consent = { version: CONSENT_VERSION, analytics, decidedAt: new Date().toISOString() };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch { /* Storage blocked: choice applies to this page only. */ }
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
  return consent;
}

// Global Privacy Control is a legally recognised opt-out signal (e.g. under the CCPA).
export function hasGlobalPrivacyControl() {
  return typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export function analyticsAllowed() {
  if (hasGlobalPrivacyControl()) return false;
  return readConsent()?.analytics === true;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
