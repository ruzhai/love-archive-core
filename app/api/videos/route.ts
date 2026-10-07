import { NextResponse } from "next/server";
import { listVideos, createVideo } from "@/lib/services/video-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { unauthorized } from "@/lib/auth/guard";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorized();
    const videos = await listVideos();
    return NextResponse.json({ success: true, videos });
  } catch (e) {
    return NextResponse.json({ success: false, error: "加载失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const body = await request.json();
    const video = await createVideo(body);
    return NextResponse.json({ success: true, video });
  } catch (e) {
    return NextResponse.json({ success: false, error: "创建失败" }, { status: 500 });
  }
}
