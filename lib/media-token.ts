const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export function encodeMediaKey(key: string) {
  return base64Url(encoder.encode(key));
}

export function decodeMediaKey(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

async function hmacKey(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usage);
}

export async function signMediaToken(encodedKey: string, expires: number, secret: string) {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret, ["sign"]), encoder.encode(`${encodedKey}.${expires}`));
  return base64Url(new Uint8Array(signature));
}

export async function verifyMediaToken(encodedKey: string, expires: number, signature: string, secret: string) {
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  try {
    const normalized = signature.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return crypto.subtle.verify("HMAC", await hmacKey(secret, ["verify"]), bytes, encoder.encode(`${encodedKey}.${expires}`));
  } catch {
    return false;
  }
}
