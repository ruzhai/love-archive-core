import { existsSync } from "fs";
import { readdir } from "fs/promises";
import path from "path";
import {
  PHOTO_DIR,
  THUMB_WIDTHS,
  cachePathFor,
  createLimiter,
  generateThumbnail,
} from "../thumbnails";

/**
 * Pre-warm the thumbnail cache for every uploaded photo.
 *
 * Usage: npx tsx lib/scripts/warm-thumbnails.ts
 *
 * The photo wall requests ?w=160/480/1920 for all images. Generating them up
 * front means the first gallery visit after a deploy hits warm cache instead of
 * spawning one sharp() resize per image on a 2-core box. Idempotent — skips
 * files that already exist, so re-running is cheap and safe (only fills gaps).
 */

const LIMIT = 4;

async function main() {
  let files: string[];
  try {
    files = await readdir(PHOTO_DIR);
  } catch {
    console.log(`[warm] no photos dir at ${PHOTO_DIR} — nothing to warm`);
    return;
  }

  const targets = files.filter(
    (f) => !f.startsWith(".") && /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f)
  );
  if (targets.length === 0) {
    console.log(`[warm] no image files in ${PHOTO_DIR}`);
    return;
  }

  const run = createLimiter(LIMIT);
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const t0 = Date.now();

  const jobs = targets.flatMap((name) =>
    THUMB_WIDTHS.map((w) =>
      run(async () => {
        const cacheFile = cachePathFor(name, w);
        if (existsSync(cacheFile)) {
          skipped += 1;
          return;
        }
        const ok = await generateThumbnail(path.join(PHOTO_DIR, name), name, w);
        if (ok) generated += 1;
        else failed += 1;
      })
    )
  );

  await Promise.all(jobs);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `[warm] ${targets.length} photos × ${THUMB_WIDTHS.length} widths done in ${secs}s — generated ${generated}, skipped ${skipped}, failed ${failed}`
  );
}

main().catch((e) => {
  console.error("[warm] failed:", e);
  process.exit(1);
});
