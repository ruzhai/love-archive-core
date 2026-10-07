import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth/auth-service";
import { checkRateLimit, resetRateLimit } from "@/lib/security/rate-limiter";
import { validateCsrfToken, getCsrfCookieName } from "@/lib/security/csrf";

/**
 * The client IP that rate limiting counts against.
 *
 * X-Real-IP comes first because nginx *overwrites* it with $remote_addr, the
 * real TCP peer — a client cannot forge it. X-Forwarded-For must never be read
 * from the front: nginx uses $proxy_add_x_forwarded_for, which appends the real
 * address to whatever the client sent, so a forged value lands in position 0.
 * Reading that first let an attacker send a fresh made-up value on every
 * request, mint a new rate-limit bucket each time, and guess passwords without
 * limit. From the end the list is trustworthy (that entry is nginx's own).
 */
function clientIp(request: NextRequest): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const chain = request.headers.get("x-forwarded-for");
  if (chain) {
    const hops = chain.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return "127.0.0.1";
}

export async function POST(request: NextRequest) {
  // ---- Rate limit check ----
  const ip = clientIp(request);

  const rateCheck = await checkRateLimit(ip, "login_attempt");
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `登录尝试过多，请 ${rateCheck.retryAfter} 秒后重试`,
        retryAfter: rateCheck.retryAfter,
      },
      { status: 429 }
    );
  }

  // ---- CSRF check ----
  const csrfHeader = request.headers.get("x-csrf-token");
  const csrfCookie = request.cookies.get(getCsrfCookieName())?.value ?? null;
  if (!validateCsrfToken(csrfHeader, csrfCookie)) {
    return NextResponse.json(
      { success: false, error: "CSRF 验证失败" },
      { status: 403 }
    );
  }

  // ---- Parse body ----
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "请求格式错误" },
      { status: 400 }
    );
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: "请输入用户名和密码" },
      { status: 400 }
    );
  }

  // Only allow letters, numbers, underscores in username
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return NextResponse.json(
      { success: false, error: "用户名格式错误" },
      { status: 400 }
    );
  }

  // ---- Login ----
  const userAgent = request.headers.get("user-agent")?.slice(0, 256) ?? undefined;
  const result = await login(username, password, ip, userAgent);

  if (!result.success) {
    return NextResponse.json(result, { status: 401 });
  }

  // Reset rate limit on success
  await resetRateLimit(ip, "login_attempt");

  return NextResponse.json(result);
}
