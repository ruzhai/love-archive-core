import { NextResponse } from "next/server";
import { listCapsules, createCapsule } from "@/lib/services/capsule-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { unauthorized } from "@/lib/auth/guard";
import { isUnlocked } from "@/lib/time";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorized();
    const capsules = await listCapsules();
    // 未拆的信只给信封 + 倒计时，管理员始终可见全文。
    const isAdmin = session.user.role === "admin";
    const visible = capsules.map((c) => {
      if (!isAdmin && !isUnlocked(c.unlockAt)) {
        return { ...c, content: "", locked: true };
      }
      return { ...c, locked: false };
    });
    return NextResponse.json({ success: true, capsules: visible });
  } catch (e) {
    return NextResponse.json({ success: false, error: "加载时间胶囊失败" }, { status: 500 });
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
      return NextResponse.json({ success: false, error: "信的名称不能为空" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.unlockAt || "")) {
      return NextResponse.json({ success: false, error: "解锁日期格式应为 YYYY-MM-DD" }, { status: 400 });
    }
    if (!["author1", "author2"].includes(body.author)) {
      return NextResponse.json({ success: false, error: "作者无效" }, { status: 400 });
    }
    const capsule = await createCapsule({
      id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: body.title.trim(),
      content: body.content || "",
      author: body.author,
      mood: body.mood || undefined,
      unlockAt: body.unlockAt,
    });
    return NextResponse.json({ success: true, capsule });
  } catch (e) {
    return NextResponse.json({ success: false, error: "写信失败" }, { status: 500 });
  }
}
