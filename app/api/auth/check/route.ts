import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt-core";

/**
 * Auth check for nginx auth_request.
 *
 * Returns 200 only when the session cookie carries a valid, unexpired, signed
 * token; 401 otherwise. 早先这里为了「快」只判断 cookie 是否存在，
 * 那等于没鉴权——伪造 cookie 就能让 nginx 放行静态文件。
 * jose 验签只是一次 HMAC，microsecond 级，不值得为它把门开着。
 *
 * 目前 nginx 已不再引用（旧的磁盘 alias 路由已废弃），保留是为了万一
 * 重新启用 auth_request 时它仍是安全的。
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("la_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
