import { NextResponse } from "next/server";
import { getAnniversary, updateAnniversary, deleteAnniversary } from "@/lib/services/anniversary-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    if (body.date && !/^\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json({ success: false, error: "日期格式应为 MM-DD" }, { status: 400 });
    }
    const anniversary = await updateAnniversary(id, body);
    if (!anniversary) return NextResponse.json({ success: false, error: "纪念日不存在" }, { status: 404 });
    return NextResponse.json({ success: true, anniversary });
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
    await deleteAnniversary(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: "删除失败" }, { status: 500 });
  }
}
