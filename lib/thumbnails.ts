import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

// Shared thumbnail pipeline used by the serving route, the upload route, and
// the warm-up script. Deliberately free of `server-only` and `@/` imports so
// the standalone `npx tsx lib/scripts/warm-thumbnails.ts` script can import it.

export const PHOTO_DIR = path.join(process.cwd(), "uploads", "photos");
// Generated thumbnails live under uploads/cache so they survive redeploys:
// back up uploads/photos and uploads/videos, the cache is regenerable.
export const THUMB_CACHE_DIR = path.join(process.cwd(), "uploads", "cache", "photos");

// Widths the photo wall requests in bulk: lightbox strip / grid / lightbox
// main + gallery hero. The admin editor (320) is a single/few-image use and is
// generated on demand instead. 1600 (not 1920) is the lightbox main width —
// 1920 was ~30% larger while the image is displayed at ~800–1200px, and the
// server's ~1 Mbps link makes every KB matter.
export const THUMB_WIDTHS = [160, 480, 1600] as const;

/** Cache filename for a given source basename + width. */
export function cachePathFor(safe: string, width: number): string {
  return path.join(THUMB_CACHE_DIR, `${safe}.w${width}.webp`);
}

/**
 * Minimal concurrency limiter (semaphore). The 2-core server cannot absorb a
 * burst of hundreds of simultaneous sharp() jobs — the first gallery visit
 * after a deploy would spawn one resize per image and pin the CPU to 100%.
 * Capping concurrent resize jobs keeps the wall responsive while the cache
 * warms. `active` is incremented synchronously inside `acquire` so the cap is
 * never exceeded under contention.
 */
export function createLimiter(limit: number) {
  let active = 0;
  const waiters: Array<() => void> = [];

  const release = () => {
    active -= 1;
    const next = waiters.shift();
    if (next) next();
  };

  const acquire = (): Promise<void> => {
    if (active < limit) {
      active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      waiters.push(() => {
        active += 1;
        resolve();
      });
    });
  };

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  };
}

/**
 * Generate (and cache) one resized WebP thumbnail. Idempotent — returns true
 * without doing work when the cache file already exists. Returns false only
 * when sharp can't decode the source (HEIC on some builds, corrupt file, etc.)
 * so callers can fall back to the original instead of erroring.
 */
export async function generateThumbnail(
  filePath: string,
  safe: string,
  width: number
): Promise<boolean> {
  const out = cachePathFor(safe, width);
  if (existsSync(out)) return true;

  try {
    await mkdir(THUMB_CACHE_DIR, { recursive: true });
    const data = await sharp(filePath)
      .rotate() // apply EXIF orientation
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    await writeFile(out, data);
    return true;
  } catch {
    return false;
  }
}
