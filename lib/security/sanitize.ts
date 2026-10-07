/**
 * Input sanitization utilities.
 */

/**
 * Basic HTML escape to prevent stored XSS in user-provided text.
 * React's JSX auto-escapes, but this is defense-in-depth for API responses.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
