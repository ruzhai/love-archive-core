import { NextResponse } from "next/server";
import { updateCapsule, deleteCapsule } from "@/lib/services/capsule-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    if (body.unlockAt && !/^\d{4}-\d{2}-\d{2}$/.test(body.unlockAt)) {
      return NextResponse.json({ success: false, error: "解锁日期格式应为 YYYY-MM-DD" }, { status: 400 });
    }
    const capsule = await updateCapsule(id, body);
    if (!capsule) return NextResponse.json({ success: false, error: "信不存在" }, { status: 404 });
    return NextResponse.json({ success: true, capsule });
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
    await deleteCapsule(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: "删除失败" }, { status: 500 });
  }
}
