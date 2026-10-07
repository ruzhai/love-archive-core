import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync } from "fs";
import { readFile, stat } from "fs/promises";
import { Readable } from "stream";
import path from "path";
import { cachePathFor, createLimiter, generateThumbnail, PHOTO_DIR } from "@/lib/thumbnails";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { unauthorized } from "@/lib/auth/guard";

// Cap thumbnail width so a malicious ?w=100000 can't balloon CPU/disk.
const MAX_THUMB_WIDTH = 2560;

const IMMUTABLE = "public, max-age=31536000, immutable";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

// Cap concurrent on-demand resize jobs. Right after a deploy the cache is
// empty; the first gallery visit would otherwise fire one sharp() per image
// and pin the 2-core server. (The warm-up script + upload-time generation keep
// the vast majority of requests from ever reaching this path.)
const thumbLimiter = createLimiter(3);

/**
 * Generate (and cache) a resized WebP thumbnail for the given source file.
 * Returns null on any failure so the caller can gracefully fall back to the
 * original — e.g. an unsupported HEIC payload should never turn into a 500.
 */
async function getThumbnail(
  filePath: string,
  safe: string,
  width: number
): Promise<NextResponse | null> {
  const ok = await thumbLimiter(() => generateThumbnail(filePath, safe, width));
  if (!ok) return null;

  try {
    const buf = await readFile(cachePathFor(safe, width));
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": IMMUTABLE,
        "Content-Length": String(buf.length),
      },
    });
  } catch {
    return null; // cache read failed (shouldn't happen) → serve original
  }
}

/**
 * GET /api/uploads/photos/:filename[?w=<width>]
 *
 * Serves uploaded photos. Files are stored in /uploads/photos/ (outside
 * public/) so they survive production builds.
 *
 * - `?w=<width>` returns a resized WebP thumbnail (cached on disk). This is
 *   what the photo wall / grids use — loading 335 full-res originals was the
 *   main cause of the gallery jank.
 * - No `?w` streams the original file (no full-buffer read).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  // 照片是最该守住的东西，这里不依赖 middleware 兜底。
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();

  const { filename } = await params;

  // Sanitize filename
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe || safe.length > 128) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(PHOTO_DIR, safe);
  if (!existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(safe).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  // Optional thumbnail
  const wParam = request.nextUrl.searchParams.get("w");
  if (wParam) {
    const width = Math.min(Math.max(parseInt(wParam, 10) || 0, 1), MAX_THUMB_WIDTH);
    if (width > 0) {
      const thumb = await getThumbnail(filePath, safe, width);
      if (thumb) return thumb;
      // fall through to original on failure
    }
  }

  // Serve the original — streamed, so a burst of full-res requests doesn't
  // buffer the whole file into memory at once.
  try {
    const st = await stat(filePath);
    const stream = createReadStream(filePath);
    return new NextResponse(
      Readable.toWeb(stream) as unknown as ReadableStream,
      {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": IMMUTABLE,
          "Content-Length": String(st.size),
        },
      }
    );
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
