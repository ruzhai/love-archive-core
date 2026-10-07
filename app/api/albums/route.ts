import { NextResponse } from "next/server";
import { listAlbums, createAlbum } from "@/lib/services/album-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { unauthorized } from "@/lib/auth/guard";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorized();
    const albums = await listAlbums();
    return NextResponse.json({ success: true, albums });
  } catch (e) {
    return NextResponse.json({ success: false, error: "加载相簿失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const body = await request.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ success: false, error: "相簿名称不能为空" }, { status: 400 });
    }
    const album = await createAlbum({
      id: `album-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: body.title.trim(),
    });
    return NextResponse.json({ success: true, album });
  } catch (e) {
    return NextResponse.json({ success: false, error: "创建相簿失败" }, { status: 500 });
  }
}
