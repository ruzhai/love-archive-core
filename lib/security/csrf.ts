import "server-only";

import { randomBytes } from "crypto";

const CSRF_COOKIE = "csrf_token";

/**
 * Generate a CSRF token and set it as a readable cookie.
 * Called from the session API so the client can pick it up.
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function getCsrfCookieName(): string {
  return CSRF_COOKIE;
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate CSRF token from header against cookie value.
 */
export function validateCsrfToken(
  headerValue: string | null,
  cookieValue: string | null
): boolean {
  if (!headerValue || !cookieValue) return false;
  return timingSafeEqual(headerValue, cookieValue);
}
