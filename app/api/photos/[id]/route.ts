import { NextResponse } from "next/server";
import { updatePhoto, deletePhoto } from "@/lib/services/photo-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const photo = await updatePhoto(id, body);
    if (!photo) return NextResponse.json({ success: false, error: "照片不存在" }, { status: 404 });
    return NextResponse.json({ success: true, photo });
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
    await deletePhoto(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: "删除失败" }, { status: 500 });
  }
}
