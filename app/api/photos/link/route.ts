import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { standalonePhotos } from "@/lib/db/schema";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/photos/link
 *
 * Bulk-link many standalone photos to one diary entry (or unlink them by
 * passing entryId: null). A single request + a single saveDb replaces the old
 * Promise.all(photoIds.map(linkPhotoToEntry)) fan-out that fired N PATCHes and
 * N saveDb() calls per diary save — one of the causes of the "save stalls"
 * when a diary had many photos.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }

    const body = await request.json();
    const { entryId, photoIds } = body as { entryId: string | null; photoIds: string[] };
    if ((typeof entryId !== "string" && entryId !== null) || !Array.isArray(photoIds)) {
      return NextResponse.json({ success: false, error: "参数错误" }, { status: 400 });
    }

    const db = await getDb();
    for (const photoId of photoIds) {
      if (typeof photoId !== "string") continue;
      const rows = db.select().from(standalonePhotos).where(eq(standalonePhotos.id, photoId)).all();
      if (rows[0]) {
        db.update(standalonePhotos).set({ entryId }).where(eq(standalonePhotos.id, photoId)).run();
      }
    }
    saveDb();
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: "关联失败" }, { status: 500 });
  }
}
