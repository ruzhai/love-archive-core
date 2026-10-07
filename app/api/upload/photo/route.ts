import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { generateThumbnail, THUMB_WIDTHS } from "@/lib/thumbnails";

// Store outside public/ — Next.js production snapshots public/ at build time
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "photos");
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
// Some browsers send non-standard MIME types for PNG files with special-name chars
const TYPE_ALIASES: Record<string, string> = {
  "image/x-png": "image/png",
  "image/jpg": "image/jpeg",
};

/**
 * POST /api/upload/photo
 *
 * Upload a photo. Admin only. Accepts multipart/form-data with a "file" field.
 * Returns { success: true, url: "/uploads/photos/xxx.jpg", id: "photo-xxx" }
 */
export async function POST(request: NextRequest) {
  // ---- Auth check ----
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "未授权" }, { status: 403 });
  }

  // ---- Parse multipart ----
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "请求格式错误" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, error: "未提供文件" }, { status: 400 });
  }

  // ---- Validate ----
  // Accept standard MIME types and common aliases (some browsers send x-png for Chinese filenames)
  const mimeType = TYPE_ALIASES[file.type] || file.type;
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { success: false, error: `不支持的图片格式: ${file.type}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { success: false, error: `图片不能超过 ${MAX_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  // ---- Save ----
  // Robust extension extraction — handles names like "照片(1)(2).png"
  const nameParts = file.name.split(".");
  const rawExt = nameParts.length > 1 ? nameParts.pop()!.toLowerCase() : "";
  const ext = rawExt.replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(UPLOAD_DIR, filename);
  await writeFile(filePath, buffer);

  // Warm the thumbnail cache eagerly so the new photo renders fast on first
  // view. Best-effort: generateThumbnail swallows its own failures (HEIC on
  // some builds, etc.) and the serving route falls back to the original.
  await Promise.all(THUMB_WIDTHS.map((w) => generateThumbnail(filePath, filename, w)));

  const url = `/api/uploads/photos/${filename}`;
  const id = `photo-${Date.now()}`;

  return NextResponse.json({ success: true, url, id });
}
