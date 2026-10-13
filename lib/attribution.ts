// Marketing attribution: remember where a visitor came from until they sign up.
// First touch is kept forever; last touch is replaced by every new campaign visit.
// The app sends both to record_signup_attribution once, right after signup.

const FIRST_KEY = "homie-attribution-first";
const LAST_KEY = "homie-attribution-last";
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "ttclid"] as const;

export type Touch = Partial<Record<(typeof PARAMS)[number] | "referrer" | "landing_path" | "seen_at", string>>;

function read(key: string): Touch | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Touch) : null;
  } catch {
    return null;
  }
}

function write(key: string, touch: Touch) {
  try { localStorage.setItem(key, JSON.stringify(touch)); } catch { /* Storage blocked: attribution is best-effort. */ }
}

function externalReferrer() {
  try {
    if (!document.referrer) return "";
    const url = new URL(document.referrer);
    return url.host === window.location.host ? "" : url.origin + url.pathname;
  } catch {
    return "";
  }
}

export function captureTouch() {
  const params = new URLSearchParams(window.location.search);
  const touch: Touch = {};
  for (const key of PARAMS) {
    const value = params.get(key)?.trim();
    if (value) touch[key] = value.slice(0, 300);
  }
  const referrer = externalReferrer();
  const isCampaign = Object.keys(touch).length > 0;
  if (!isCampaign && !referrer) {
    // A direct or internal visit only seeds first touch; it never overwrites a campaign.
    if (!read(FIRST_KEY)) write(FIRST_KEY, { landing_path: window.location.pathname, seen_at: new Date().toISOString() });
    return;
  }
  if (referrer) touch.referrer = referrer.slice(0, 300);
  touch.landing_path = window.location.pathname.slice(0, 300);
  touch.seen_at = new Date().toISOString();
  if (!read(FIRST_KEY)) write(FIRST_KEY, touch);
  write(LAST_KEY, touch);
}

export function storedTouches() {
  const first = read(FIRST_KEY);
  return first ? { first, last: read(LAST_KEY) ?? first } : null;
}

export function clearTouches() {
  try {
    localStorage.removeItem(FIRST_KEY);
    localStorage.removeItem(LAST_KEY);
  } catch { /* Nothing to clear. */ }
}
