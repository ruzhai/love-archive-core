import "server-only";

import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, saveDb } from "@/lib/db/index";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "./password";
import { signToken, verifyToken } from "./jwt";
import { logAction } from "@/lib/security/audit-logger";
import type { Session, LoginResult, LoginError, SessionUser } from "./auth-types";

const COOKIE_NAME = "la_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/** Cookies are Secure only when running with HTTPS. */
function isSecure(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.SECURE_COOKIES !== "false"
  );
}

// ==================== Login ====================

export async function login(
  username: string,
  password: string,
  ip?: string,
  userAgent?: string
): Promise<LoginResult | LoginError> {
  const db = await getDb();
  const now = new Date().toISOString();

  // Find user
  const user = db
    .select()
    .from(users)
    .where(and(eq(users.username, username), eq(users.isActive, 1)))
    .get();

  if (!user) {
    await logAction({
      action: "login_failed",
      details: JSON.stringify({ username, reason: "user_not_found" }),
      ipAddress: ip,
      userAgent,
      createdAt: now,
    });
    return { success: false, error: "用户名或密码错误" };
  }

  // Verify password
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await logAction({
      action: "login_failed",
      userId: user.id,
      details: JSON.stringify({ username, reason: "wrong_password" }),
      ipAddress: ip,
      userAgent,
      createdAt: now,
    });
    return { success: false, error: "用户名或密码错误" };
  }

  // Update last login
  db.update(users)
    .set({ lastLoginAt: now })
    .where(eq(users.id, user.id))
    .run();
  saveDb();

  // Sign JWT
  const token = await signToken({
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  });

  // Set httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  await logAction({
    userId: user.id,
    action: "login",
    ipAddress: ip,
    userAgent,
    createdAt: now,
  });

  return {
    success: true,
    user: {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role as SessionUser["role"],
    },
  };
}

// ==================== Logout ====================

export async function logout(userId?: number): Promise<void> {
  const cookieStore = await cookies();

  // Read session before clearing for audit
  if (!userId) {
    const session = await getSessionFromCookies();
    userId = session?.user.userId;
  }

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: isSecure(),
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  if (userId) {
    await logAction({
      userId,
      action: "logout",
      createdAt: new Date().toISOString(),
    });
  }
}

// ==================== Session ====================

export async function getSessionFromCookies(): Promise<Session | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(COOKIE_NAME);
  if (!tokenCookie?.value) return null;

  const payload = await verifyToken(tokenCookie.value);
  if (!payload) return null;

  // Verify user still exists and is active
  const db = await getDb();
  const user = db
    .select()
    .from(users)
    .where(and(eq(users.id, payload.userId), eq(users.isActive, 1)))
    .get();

  if (!user) return null;

  return {
    user: {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role as SessionUser["role"],
    },
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSessionFromCookies();
  return session?.user ?? null;
}

/**
 * Get token from request headers (for API routes that don't use cookies()).
 */
export async function getSessionFromRequest(
  request: Request
): Promise<Session | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  // Parse the la_token cookie from the header string
  const match = cookieHeader.match(
    /(?:^|;\s*)la_token=([^;]*)/
  );
  if (!match) return null;

  const payload = await verifyToken(match[1]);
  if (!payload) return null;

  const db = await getDb();
  const user = db
    .select()
    .from(users)
    .where(and(eq(users.id, payload.userId), eq(users.isActive, 1)))
    .get();

  if (!user) return null;

  return {
    user: {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role as SessionUser["role"],
    },
  };
}
