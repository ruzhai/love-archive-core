import { NextResponse } from "next/server";
import { updateEntry, deleteEntry } from "@/lib/services/entry-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const entry = await updateEntry(id, body);
    if (!entry) return NextResponse.json({ success: false, error: "条目不存在" }, { status: 404 });
    return NextResponse.json({ success: true, entry });
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
    await deleteEntry(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: "删除失败" }, { status: 500 });
  }
}
