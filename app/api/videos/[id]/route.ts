import { NextResponse } from "next/server";
import { updateVideo, deleteVideo } from "@/lib/services/video-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const video = await updateVideo(id, body);
    if (!video) return NextResponse.json({ success: false, error: "视频不存在" }, { status: 404 });
    return NextResponse.json({ success: true, video });
  } catch (e) {
    return NextResponse.json({ success: false, error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const { id } = await params;
    await deleteVideo(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: "删除失败" }, { status: 500 });
  }
}
