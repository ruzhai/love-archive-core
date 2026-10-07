import { NextResponse } from "next/server";
import { listSongs, createSong } from "@/lib/services/song-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { unauthorized } from "@/lib/auth/guard";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorized();
    const songs = await listSongs();
    return NextResponse.json({ success: true, songs });
  } catch (e) {
    return NextResponse.json({ success: false, error: "加载歌单失败" }, { status: 500 });
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
      return NextResponse.json({ success: false, error: "歌名不能为空" }, { status: 400 });
    }
    const song = await createSong({
      id: `song-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: body.title.trim(),
      artist: body.artist || "",
      dedication: body.dedication || "",
      cover: body.cover || "🎵",
      url: body.url || undefined,
    });
    return NextResponse.json({ success: true, song });
  } catch (e) {
    return NextResponse.json({ success: false, error: "添加歌曲失败" }, { status: 500 });
  }
}
