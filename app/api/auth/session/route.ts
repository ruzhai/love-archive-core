import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/auth-service";
import {
  generateCsrfToken,
  getCsrfCookieName,
} from "@/lib/security/csrf";

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookies();

  const response = NextResponse.json(
    session
      ? {
          authenticated: true,
          user: session.user,
        }
      : {
          authenticated: false,
          user: null,
        }
  );

  // Only issue a CSRF token if one isn't already set. Middleware now issues it
  // on every response where it's missing, so this is a fallback for direct
  // API hits. Rotating it on every GET would invalidate an in-flight form's
  // token (the login page previously raced this and got intermittent 403s).
  if (!request.cookies.get(getCsrfCookieName())) {
    response.cookies.set(getCsrfCookieName(), generateCsrfToken(), {
      httpOnly: false, // Must be readable by JS to send as header
      secure:
        process.env.NODE_ENV === "production" &&
        process.env.SECURE_COOKIES !== "false",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }

  return response;
}
