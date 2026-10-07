import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "videos");
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB
const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mov"];

// Also accept broader MIME types that browsers may send
const ALLOWED_EXTS = [".mp4", ".webm", ".mov", ".avi", ".mkv"];

/**
 * POST /api/upload/video
 *
 * Upload a video file. Admin only. Accepts multipart/form-data with a "file" field.
 * Returns { success: true, url: "/api/uploads/videos/xxx.mp4", id: "video-xxx" }
 */
export async function POST(request: NextRequest) {
  // ---- Auth check ----
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "未授权：需要管理员登录" }, { status: 403 });
  }

  // ---- Parse multipart ----
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    console.error("[video upload] formData parse error:", e);
    return NextResponse.json({
      success: false,
      error: "请求格式错误，请确保使用 multipart/form-data 上传",
    }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({
      success: false,
      error: "未提供文件，请选择视频后上传",
    }, { status: 400 });
  }

  // ---- Validate file type ----
  const ext = "." + (file.name.split(".").pop()?.toLowerCase().replace(/[^a-zA-Z0-9]/g, "") || "mp4");
  const typeOk = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTS.includes(ext);
  if (!typeOk) {
    return NextResponse.json({
      success: false,
      error: `不支持的格式: ${file.type || ext}。支持: mp4, webm, mov, avi`,
    }, { status: 400 });
  }

  // ---- Validate size ----
  if (file.size > MAX_SIZE) {
    return NextResponse.json({
      success: false,
      error: `视频过大 (${(file.size / 1024 / 1024).toFixed(1)}MB)，最大支持 100MB`,
    }, { status: 400 });
  }

  // Ensure 0-byte files are rejected
  if (file.size === 0) {
    return NextResponse.json({ success: false, error: "文件为空" }, { status: 400 });
  }

  // ---- Save ----
  try {
    const filename = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    console.log(`[video upload] Saved: ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);

    return NextResponse.json({
      success: true,
      url: `/api/uploads/videos/${filename}`,
      id: `video-${Date.now()}`,
      filename,
    });
  } catch (e) {
    console.error("[video upload] write error:", e);
    return NextResponse.json({
      success: false,
      error: "服务器存储失败，请检查磁盘空间或稍后重试",
    }, { status: 500 });
  }
}
