import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { standalonePhotos } from "@/lib/db/schema";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const body = await request.json();
    const { orderedIds } = body as { orderedIds: string[] };
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ success: false, error: "orderedIds 必须是数组" }, { status: 400 });
    }
    const db = await getDb();
    for (let i = 0; i < orderedIds.length; i++) {
      const rows = db.select().from(standalonePhotos).where(eq(standalonePhotos.id, orderedIds[i])).all();
      if (rows[0]) {
        const updated = { ...rows[0], sort_order: i };
        db.update(standalonePhotos).set(updated).where(eq(standalonePhotos.id, orderedIds[i])).run();
      }
    }
    saveDb();
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: "重新排序失败" }, { status: 500 });
  }
}
