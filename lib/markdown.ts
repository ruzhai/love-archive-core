/**
 * Minimal Markdown → HTML renderer.
 *
 * Supports: headings (h1-h3), bold, italic, unordered lists,
 * links, paragraphs, and line breaks. Escapes HTML entities.
 *
 * No dependencies. ~60 lines.  Suitable for diary entries.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const INLINE_RULES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/(?<!\\)\*\*(.+?)(?<!\\)\*\*/g, (m) => `<strong>${m[1]}</strong>`],
  [/(?<!\\)\*(.+?)(?<!\\)\*/g, (m) => `<em>${m[1]}</em>`],
  [/(?<!\\)`(.+?)(?<!\\)`/g, (m) => `<code>${m[1]}</code>`],
  [/\[(.+?)\]\((.+?)\)/g, (m) => `<a href="${m[2]}" target="_blank" rel="noopener">${m[1]}</a>`],
];

function applyInline(text: string): string {
  let result = escapeHtml(text);
  for (const [regex, replacer] of INLINE_RULES) {
    result = result.replace(regex, (sub, ...args) => {
      return replacer([sub, ...args] as unknown as RegExpMatchArray);
    });
  }
  return result;
}

export function renderMarkdown(md: string): string {
  if (!md) return "";

  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Empty line → close list
    if (line.trim() === "") {
      if (inList) { html.push("</ul>"); inList = false; }
      continue;
    }

    // Headings
    let m = line.match(/^### (.+)/);
    if (m) { html.push(`<h3>${applyInline(m[1])}</h3>`); continue; }
    m = line.match(/^## (.+)/);
    if (m) { html.push(`<h2>${applyInline(m[1])}</h2>`); continue; }
    m = line.match(/^# (.+)/);
    if (m) { html.push(`<h1>${applyInline(m[1])}</h1>`); continue; }

    // Unordered list
    m = line.match(/^- (.+)/);
    if (m) {
      if (!inList) { html.push('<ul class="md-list">'); inList = true; }
      html.push(`<li>${applyInline(m[1])}</li>`);
      continue;
    }

    // Close list if we were in one
    if (inList) { html.push("</ul>"); inList = false; }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      html.push("<hr />");
      continue;
    }

    // Regular paragraph
    html.push(`<p>${applyInline(line)}</p>`);
  }

  if (inList) html.push("</ul>");

  return html.join("\n");
}
