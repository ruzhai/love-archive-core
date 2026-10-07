import { NextRequest, NextResponse } from "next/server";
import { stat } from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { existsSync } from "fs";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { unauthorized } from "@/lib/auth/guard";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "videos");

const MIME: Record<string, string> = {
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".avi": "video/x-msvideo",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();

  const { filename } = await params;
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe || safe.length > 128) return new NextResponse("Not found", { status: 404 });

  const filePath = path.join(UPLOAD_DIR, safe);
  if (!existsSync(filePath)) return new NextResponse("Not found", { status: 404 });

  try {
    const fileStat = await stat(filePath);
    const ext = path.extname(safe).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";

    // Support range requests for video seeking
    const range = request.headers.get("range");
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileStat.size - 1;
      const chunkSize = end - start + 1;

      const stream = createReadStream(filePath, { start, end });
      const readable = new ReadableStream({
        start(controller) {
          stream.on("data", chunk => controller.enqueue(chunk));
          stream.on("end", () => controller.close());
          stream.on("error", e => controller.error(e));
        },
      });

      return new NextResponse(readable, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": contentType,
        },
      });
    }

    const stream = createReadStream(filePath);
    const readable = new ReadableStream({
      start(controller) {
        stream.on("data", chunk => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", e => controller.error(e));
      },
    });

    return new NextResponse(readable, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileStat.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
