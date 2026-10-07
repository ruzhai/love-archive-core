import { NextResponse } from "next/server";
import { reorderAlbums } from "@/lib/services/album-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const { orderedIds } = await request.json();
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ success: false, error: "orderedIds 必须是数组" }, { status: 400 });
    }
    await reorderAlbums(orderedIds);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: "排序失败" }, { status: 500 });
  }
}
