import { NextResponse } from "next/server";
import { listEntries, createEntry } from "@/lib/services/entry-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { unauthorized } from "@/lib/auth/guard";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorized();
    const entries = await listEntries();
    return NextResponse.json({ success: true, entries });
  } catch (e) {
    return NextResponse.json({ success: false, error: "加载失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const body = await request.json();
    const entry = await createEntry(body);
    return NextResponse.json({ success: true, entry });
  } catch (e) {
    return NextResponse.json({ success: false, error: "创建失败" }, { status: 500 });
  }
}
