const mediaOrigin = process.env.NEXT_PUBLIC_MEDIA_ORIGIN?.replace(/\/$/, "") ?? "";
const imageTransformationsEnabled = process.env.NEXT_PUBLIC_IMAGE_TRANSFORMATIONS === "1";

/** Resolve legacy template API URLs to the cacheable R2 custom domain. */
export function resolveMediaUrl(source: string) {
  if (!mediaOrigin || !source.startsWith("/api/media/template?")) return source;
  const query = source.slice(source.indexOf("?") + 1);
  const key = new URLSearchParams(query).get("key");
  return key?.startsWith("templates/") ? `${mediaOrigin}/${key}` : source;
}

/** Build a Cloudflare Images URL while keeping local development functional. */
export function optimizedImageUrl(source: string, width: number, quality = 78) {
  const resolved = resolveMediaUrl(source);
  if (!imageTransformationsEnabled || resolved.startsWith("blob:")) return resolved;
  const sourcePath = resolved.startsWith("http") ? resolved : resolved.replace(/^\/+/, "");
  return `/cdn-cgi/image/width=${width},quality=${quality},format=auto,fit=scale-down/${sourcePath}`;
}

export function responsiveImageProps(source: string, sizes: string, widths = [320, 640, 960, 1280]) {
  const resolved = resolveMediaUrl(source);
  if (!imageTransformationsEnabled || resolved.startsWith("blob:")) return { src: resolved };
  return {
    src: optimizedImageUrl(resolved, widths[1] ?? widths[0]),
    srcSet: widths.map((width) => `${optimizedImageUrl(resolved, width)} ${width}w`).join(", "),
    sizes,
  };
}
