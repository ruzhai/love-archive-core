import { NextResponse } from "next/server";
import { listComments, createComment } from "@/lib/services/comment-service";
import { getSessionFromRequest } from "@/lib/auth/auth-service";
import { unauthorized } from "@/lib/auth/guard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorized();
    const { id } = await params;
    const comments = await listComments(id);
    return NextResponse.json({ success: true, comments });
  } catch (e) {
    return NextResponse.json({ success: false, error: "加载评论失败" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const { author, content } = body;
    if (!author || !["author1", "author2"].includes(author)) {
      return NextResponse.json({ success: false, error: "作者无效" }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: "评论内容不能为空" }, { status: 400 });
    }
    const comment = await createComment({
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      photoId: id,
      author,
      content: content.trim(),
    });
    return NextResponse.json({ success: true, comment });
  } catch (e) {
    return NextResponse.json({ success: false, error: "创建评论失败" }, { status: 500 });
  }
}
