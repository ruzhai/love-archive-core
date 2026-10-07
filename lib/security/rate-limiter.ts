import "server-only";

import { getDb, saveDb } from "@/lib/db/index";
import { rateLimits } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // seconds
}

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if an action is rate limited using the SQLite-backed store.
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number = LOGIN_MAX_ATTEMPTS,
  windowMs: number = LOGIN_WINDOW_MS
): Promise<RateLimitResult> {
  const db = await getDb();
  const now = new Date();
  const nowIso = now.toISOString();

  // Get existing record
  const record = db
    .select()
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.identifier, identifier),
        eq(rateLimits.action, action)
      )
    )
    .get();

  if (!record) {
    // First attempt — create record
    db.insert(rateLimits)
      .values({
        identifier,
        action,
        attempts: 1,
        windowStart: nowIso,
      })
      .run();
    saveDb();
    return { allowed: true };
  }

  const windowStart = new Date(record.windowStart);
  const elapsed = now.getTime() - windowStart.getTime();

  if (elapsed > windowMs) {
    // Window expired — reset
    db.update(rateLimits)
      .set({ attempts: 1, windowStart: nowIso })
      .where(
        and(
          eq(rateLimits.identifier, identifier),
          eq(rateLimits.action, action)
        )
      )
      .run();
    saveDb();
    return { allowed: true };
  }

  if (record.attempts >= maxAttempts) {
    // Rate limited
    const retryAfter = Math.ceil((windowMs - elapsed) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment attempts
  db.update(rateLimits)
    .set({ attempts: record.attempts + 1 })
    .where(
      and(
        eq(rateLimits.identifier, identifier),
        eq(rateLimits.action, action)
      )
    )
    .run();
  saveDb();

  return { allowed: true };
}

/**
 * Reset rate limit for an identifier (e.g. after successful login).
 */
export async function resetRateLimit(
  identifier: string,
  action: string
): Promise<void> {
  const db = await getDb();
  db.delete(rateLimits)
    .where(
      and(
        eq(rateLimits.identifier, identifier),
        eq(rateLimits.action, action)
      )
    )
    .run();
  saveDb();
}
