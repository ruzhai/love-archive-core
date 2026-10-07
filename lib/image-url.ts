/**
 * Client-safe helper for requesting resized thumbnails from the uploads route.
 *
 * The photo wall / grids render hundreds of photos; loading the full-res
 * originals was the main cause of the gallery jank. Every `<img>` that shows
 * a small tile should use `thumb(src, width)` so the server returns a WebP
 * thumbnail (see app/api/uploads/photos/[filename]/route.ts) instead of the
 * multi-megabyte original. The lightbox still uses the original (or a large
 * width) for detail.
 */
export function thumb(src: string, width: number): string {
  if (!src || !src.startsWith("/api/uploads/")) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}w=${width}`;
}
