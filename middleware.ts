import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt-core";

/**
 * Next.js Edge Middleware
 *
 * - Full-site auth wall: all pages + APIs require a valid session cookie
 *   (签名 + 过期时间都验，不能只看 cookie 在不在).
 * - Validates CSRF token on mutating requests (POST, PATCH, DELETE).
 * - Adds security headers to all responses.
 */

const MUTATING_METHODS = ["POST", "PATCH", "DELETE", "PUT"];
const CSRF_EXEMPT_PATHS = ["/api/auth/session"];
const CSRF_COOKIE = "csrf_token";
const CSRF_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * Generate a random CSRF token using Web Crypto (available in both the Node
 * and Edge runtimes). `crypto.randomBytes` from Node is NOT available in the
 * Edge runtime, so we can't reuse lib/security/csrf.ts here.
 */
function generateCsrfToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Paths that do NOT require authentication
const AUTH_FREE_PREFIXES = [
  "/api/auth/",
  "/login",
  "/_next/",
  "/favicon.ico",
];

function isAuthFree(pathname: string): boolean {
  for (const prefix of AUTH_FREE_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // ---- Full-site auth wall ----
  if (!isAuthFree(pathname)) {
    const token = request.cookies.get("la_token")?.value;
    // 必须验签。以前只判断 cookie 存在，于是 `document.cookie="la_token=x"`
    // 或一条 curl 就能读到全部日记和照片——鉴权墙等于没有。
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      // API: 401. Page: redirect to login.
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: "需要登录" },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ---- CSRF check for mutating API requests ----
  if (
    pathname.startsWith("/api/") &&
    MUTATING_METHODS.includes(method) &&
    !CSRF_EXEMPT_PATHS.includes(pathname)
  ) {
    const csrfHeader = request.headers.get("x-csrf-token");
    const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return NextResponse.json(
        { success: false, error: "CSRF 验证失败" },
        { status: 403 }
      );
    }
  }

  // 把 pathname 透传给 layout，用于按路由切换 chrome。
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Guarantee a CSRF cookie exists before any form renders. Previously the
  // token was only issued by /api/auth/session, and the login page re-fetched
  // that endpoint then read document.cookie in the same tick — a race that
  // intermittently 403'd with "CSRF 验证失败". Issuing it here (on every
  // response where it's missing) removes the race entirely.
  if (!request.cookies.get(CSRF_COOKIE)) {
    response.cookies.set(CSRF_COOKIE, generateCsrfToken(), {
      httpOnly: false, // must be readable by JS to echo back as a header
      secure:
        process.env.NODE_ENV === "production" &&
        process.env.SECURE_COOKIES !== "false",
      sameSite: "strict",
      path: "/",
      maxAge: CSRF_COOKIE_MAX_AGE,
    });
  }

  addSecurityHeaders(response);
  return response;
}

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
