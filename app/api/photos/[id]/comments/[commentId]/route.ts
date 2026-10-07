import { NextResponse } from "next/server";
import { deleteComment } from "@/lib/services/comment-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const { commentId } = await params;
    await deleteComment(commentId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: "删除评论失败" }, { status: 500 });
  }
}
