import { NextResponse } from "next/server";
import { listAnniversaries, createAnniversary } from "@/lib/services/anniversary-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { unauthorized } from "@/lib/auth/guard";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorized();
    const anniversaries = await listAnniversaries();
    return NextResponse.json({ success: true, anniversaries });
  } catch (e) {
    return NextResponse.json({ success: false, error: "加载纪念日失败" }, { status: 500 });
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
      return NextResponse.json({ success: false, error: "纪念日名称不能为空" }, { status: 400 });
    }
    if (!/^\d{2}-\d{2}$/.test(body.date || "")) {
      return NextResponse.json({ success: false, error: "日期格式应为 MM-DD" }, { status: 400 });
    }
    const anniversary = await createAnniversary({
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: body.title.trim(),
      date: body.date,
      year: body.year || undefined,
      type: body.type || "custom",
      description: body.description || "",
      emoji: body.emoji || "📅",
    });
    return NextResponse.json({ success: true, anniversary });
  } catch (e) {
    return NextResponse.json({ success: false, error: "创建纪念日失败" }, { status: 500 });
  }
}
