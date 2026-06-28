const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "h4",
  "ul", "ol", "li", "blockquote", "pre", "code", "a", "img",
  "table", "thead", "tbody", "tr", "th", "td", "mark", "span",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "class", "data-type", "colspan", "rowspan",
];

export function sanitizeHtml(dirty: string): string {
  return dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

export function sanitizeHtmlStrict(dirty: string): string {
  return sanitizeHtml(dirty);
}

export { ALLOWED_TAGS, ALLOWED_ATTR };
