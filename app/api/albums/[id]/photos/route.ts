import { NextResponse } from "next/server";
import { listAlbumPhotos, addPhotosToAlbum, removePhotosFromAlbum } from "@/lib/services/album-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { unauthorized } from "@/lib/auth/guard";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorized();
    const { id } = await params;
    const photos = await listAlbumPhotos(id);
    return NextResponse.json({ success: true, photos });
  } catch (e) {
    return NextResponse.json({ success: false, error: "加载照片失败" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const { id } = await params;
    const { photoIds } = await request.json();
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ success: false, error: "photoIds 不能为空" }, { status: 400 });
    }
    await addPhotosToAlbum(id, photoIds);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: "添加照片失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const { id } = await params;
    const { photoIds } = await request.json();
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ success: false, error: "photoIds 不能为空" }, { status: 400 });
    }
    await removePhotosFromAlbum(id, photoIds);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: "移除照片失败" }, { status: 500 });
  }
}
