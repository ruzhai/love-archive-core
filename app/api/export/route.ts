import { NextResponse } from "next/server";
import { exportAllData } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/auth-service";

/**
 * GET /api/export — 应用内自助备份（仅管理员）。
 * 把 sql.js 内存库里的全量表数据 dump 成 JSON 并作为文件下载，
 * 供随时留档/还原参考。这是数据安全的一道「用户可自行触发的」保险。
 */
export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }

    const data = await exportAllData();

    const payload = {
      _meta: {
        exportedAt: new Date().toISOString(),
        tables: Object.keys(data),
        note: "数据库全量导出。照片/视频等媒体文件请另行备份 data/ 与 public/ 目录。",
      },
      ...data,
    };

    const body = JSON.stringify(payload, null, 2);
    const filename = `love-archive-export-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("导出数据失败:", e);
    return NextResponse.json({ success: false, error: "导出数据失败" }, { status: 500 });
  }
}
