// Image CDNs we will proxy. Instagram / Threads serve from fbcdn / cdninstagram and
// block hotlinking from the browser, so we fetch server-side and stream same-origin.
const ALLOWED_IMAGE_HOSTS = [
  /(^|\.)cdninstagram\.com$/i,
  /(^|\.)fbcdn\.net$/i,
  /(^|\.)fbsbx\.com$/i,
  /(^|\.)twimg\.com$/i,
  /(^|\.)ytimg\.com$/i,
  /(^|\.)xhscdn\.com$/i,
  /(^|\.)unsplash\.com$/i,
  /(^|\.)picsum\.photos$/i,
];

/** SSRF guard: only https URLs on known image CDNs may be proxied. */
export function isAllowedImageUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    ALLOWED_IMAGE_HOSTS.some((host) => host.test(url.hostname))
  );
}

/** Same-origin proxy URL for an external image (falls through to the raw URL if not allowed). */
export function proxiedImage(url: string): string {
  if (!isAllowedImageUrl(url)) {
    return url;
  }
  return `/api/img?url=${encodeURIComponent(url)}`;
}
